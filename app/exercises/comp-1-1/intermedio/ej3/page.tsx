"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { skillsInfo } from "@/components/data/digcompSkills";
import { useRouter } from "next/navigation";
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress";

/* ================== Config Puntaje/Sesión (P3 · 1.1 Intermedio · CHILE) ================== */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";
const LEVEL_FS = "Intermedio";
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 2;  // P3 (0-based) para Firestore
const Q_ONE_BASED  = 3;  // P3 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================== Pasos (CHILE · JUNAEB BAES 2025) ================== */
type Step = { id: string; text: string };

const CANONICAL_STEPS: Step[] = [
  { id: "A", text: "Definir la necesidad y palabras clave (p. ej., “Beca Alimentación JUNAEB 2025 requisitos PDF”)." },
  { id: "B", text: "Lanzar la búsqueda con operadores (site:junaeb.cl \"Beca Alimentación 2025\" requisitos filetype:pdf)." },
  { id: "C", text: "Elegir un resultado del dominio oficial (junaeb.cl)." },
  { id: "D", text: "Navegar dentro del sitio: Becas → BAES/Alimentación → Requisitos/Convocatoria 2025." },
  { id: "E", text: "Abrir o descargar la convocatoria/requisitos (PDF o página oficial)." },
  { id: "F", text: "Verificar fecha/vigencia 2025 y si existe versión actualizada." },
];

/* ================== Página ================== */
export default function P3OrdenarEstrategiaBusquedaCL() {
  const router = useRouter();
  const [currentIndex] = useState(Q_ZERO_BASED);
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Cargar sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Asegurar/crear sesión por-usuario
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      return;
    }
    const LS_KEY = sessionKeyFor(user.uid);
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (cached) {
      if (!sessionId) setSessionId(cached);
      return;
    }
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    (async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: LEVEL_FS,
          totalQuestions: TOTAL_QUESTIONS,
        });
        setSessionId(id);
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
      } catch (e) {
        console.error("No se pudo asegurar la sesión (P3 1.1 CL):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ============== Estado: lista reordenable ============== */
  const [steps, setSteps] = useState<Step[]>(() => {
    const shuffled = [...CANONICAL_STEPS].sort(() => Math.random() - 0.5);
    return shuffled;
  });

  const move = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const positions = useMemo(() => {
    const map: Record<string, number> = {};
    steps.forEach((s, idx) => (map[s.id] = idx));
    return map;
  }, [steps]);

  /* ============== Validación por orden relativo (todos los pares) ============== */
  const validateOrder = async () => {
    // Mapa del orden canónico
    const canonicalPos: Record<string, number> = {};
    CANONICAL_STEPS.forEach((s, i) => (canonicalPos[s.id] = i));

    const ids = CANONICAL_STEPS.map((s) => s.id);
    let totalPairs = 0;
    let correctPairs = 0;

    // Compara cada par (Kendall-like)
    const pairChecks: Array<{ pair: string; ok: boolean }> = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        totalPairs++;
        const canonAB = canonicalPos[a] < canonicalPos[b];
        const userAB  = positions[a] < positions[b];
        const ok = canonAB === userAB;
        if (ok) correctPairs++;
        pairChecks.push({ pair: `${a}→${b}`, ok });
      }
    }

    const percent = Math.round((correctPairs / totalPairs) * 100);
    const minCorrectPairs = Math.ceil(0.7 * totalPairs); // umbral 70%
    const passedRelative = correctPairs >= minCorrectPairs;

    // Puntaje local
    const point: 0 | 1 = passedRelative ? 1 : 0;
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);

    // Resumen de progreso
    const prog = getProgress(COMPETENCE, LEVEL_LOCAL);
    const totalPts = levelPoints(prog);
    const levelPassed = isLevelPassed(prog);
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100);
    const q1 = getPoint(prog, 1);
    const q2 = getPoint(prog, 2);
    const q3 = getPoint(prog, 3);

    // Modo profesor
    const isTeacher = userData?.role === "profesor";
    const finalTotalPts = isTeacher ? TOTAL_QUESTIONS : totalPts;
    const finalPassed   = isTeacher ? true : levelPassed;
    const finalScore    = isTeacher ? 100 : score;

    // Firestore
    let sid = sessionId;
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid);
        const cached =
          typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
        if (cached) {
          sid = cached;
          setSessionId(cached);
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: LEVEL_FS,
            totalQuestions: TOTAL_QUESTIONS,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
        }
      }
      if (sid) await markAnswered(sid, Q_ZERO_BASED, point === 1);
    } catch (e) {
      console.warn("No se pudo marcar la P3 respondida:", e);
    }

    // Redirige a resultados (puedes incluir percent si lo quieres mostrar allí)
    const qs = new URLSearchParams({
      score: String(finalScore),
      passed: String(finalPassed),
      correct: String(finalTotalPts),
      total: String(TOTAL_QUESTIONS),
      competence: COMPETENCE,
      level: LEVEL_LOCAL,
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      pairs: String(`${correctPairs}/${totalPairs}`),
      kscore: String(percent),
      sid: sid ?? "",
    });

    router.push(`/test/comp-1-1-intermedio/results?${qs.toString()}`);
  };

  /* ================== UI ================== */
  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                | {COMPETENCE} {skillsInfo[COMPETENCE].title} - Nivel {LEVEL_FS}
              </span>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-1">
            <div className="flex items-center justify-between text-[#286575] mb-2">
              <span className="text-xs sm:text-sm font-medium bg-white/40 px-2 sm:px-3 py-1 rounded-full">
                Pregunta {currentIndex + 1} de {totalQuestions}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: totalQuestions }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      index <= currentIndex ? "bg-[#286575] shadow-lg" : "bg-[#dde3e8]"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 bg-[#dde3e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#286575] rounded-full transition-all duration-500 ease-in-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Ordenar estrategia de búsqueda</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  Debes encontrar los <b>requisitos 2025</b> de la <b>Beca de Alimentación para la Educación Superior (BAES)</b> en <b>Chile</b>, desde la fuente oficial. <b>Organiza tu estrategia</b> ordenando los pasos de búsqueda, acceso y navegación.
                </p>
              </div>
            </div>

            {/* Lista reordenable */}
            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3"
                >
                  <div className="w-6 h-6 rounded-full bg-white border grid place-items-center text-xs font-semibold text-gray-700">
                    {idx + 1}
                  </div>
                  <div className="flex-1 text-[15px] text-gray-900">{s.text}</div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 text-xs border rounded-xl hover:bg-white"
                      onClick={() => move(idx, -1)}
                    >
                      ↑ Subir
                    </button>
                    <button
                      className="px-2 py-1 text-xs border rounded-xl hover:bg-white"
                      onClick={() => move(idx, +1)}
                    >
                      ↓ Bajar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Validar */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={validateOrder}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
