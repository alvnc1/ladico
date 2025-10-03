"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { useRouter } from "next/navigation";
import { skillsInfo } from "@/components/data/digcompSkills";
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress";

/* ========= Config puntaje/sesión (P3) ========= */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "avanzado";   // para levelProgress
const LEVEL_FS = "Avanzado";      // para Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 2; // P3 (0-based) para Firestore
const Q_ONE_BASED  = 3; // P3 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

type StratKey =
  | "quotes"
  | "site"
  | "filetype"
  | "date"
  | "inSite"
  | "findPDF"
  | "regionLang";

/* ========= Componente ========= */
export default function LadicoP3EstrategiasBusquedaAvanzado() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  /* ----- Progreso UI ----- */
  const [currentIndex] = useState(2);
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  /* ----- Sesión por-usuario ----- */
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

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
        console.error("No se pudo asegurar la sesión (P3 1.1):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ----- Estado del ejercicio: tácticas por caso ----- */
  const [stratsA, setStratsA] = useState<Record<StratKey, boolean>>({
    quotes: false,
    site: false,
    filetype: false,
    date: false,
    inSite: false,
    findPDF: false,
    regionLang: false,
  });
  const [stratsB, setStratsB] = useState<Record<StratKey, boolean>>({
    quotes: false,
    site: false,
    filetype: false,
    date: false,
    inSite: false,
    findPDF: false,
    regionLang: false,
  });

  const toggleA = (k: StratKey) => setStratsA(s => ({ ...s, [k]: !s[k] }));
  const toggleB = (k: StratKey) => setStratsB(s => ({ ...s, [k]: !s[k] }));

  /* ----- Validación (solo tácticas) ----- */
  // Caso A (plantillas de ventas): ≥2 de {quotes, filetype, regionLang}
  const passA = useMemo(() => {
    const core: StratKey[] = ["quotes", "filetype", "regionLang"];
    const hits = core.filter(k => stratsA[k]).length;
    return hits >= 2;
  }, [stratsA]);

  // Caso B (guía oficial): site obligatorio + ≥2 de {quotes, filetype, date, inSite}
  const passB = useMemo(() => {
    if (!stratsB.site) return false;
    const core: StratKey[] = ["quotes", "filetype", "date", "inSite"];
    const hits = core.filter(k => stratsB[k]).length;
    return hits >= 2;
  }, [stratsB]);

  const passed = passA && passB;

  const handleValidate = async () => {
    const point: 0 | 1 = passed ? 1 : 0;

    // 1) Local
    try {
      setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);
    } catch (e) {
      console.warn("No se pudo guardar el punto local:", e);
    }

    // Recalcular progreso
    const prog = getProgress(COMPETENCE, LEVEL_LOCAL);
    const totalPts = levelPoints(prog);
    const levelPassedNow = isLevelPassed(prog);
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100);
    const q1 = getPoint(prog, 1);
    const q2 = getPoint(prog, 2);
    const q3 = getPoint(prog, 3);

    // Modo profesor (opcional)
    const isTeacher = (userData as any)?.role === "profesor";
    const finalTotalPts = isTeacher ? TOTAL_QUESTIONS : totalPts;
    const finalPassed   = isTeacher ? true : levelPassedNow;
    const finalScore    = isTeacher ? 100 : score;

    // 2) Firestore
    let sid = sessionId;
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid);
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
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
      console.warn("No se pudo marcar P3 respondida:", e);
    }
    try { if (user) localStorage.removeItem(sessionKeyFor(user.uid)); } catch {}

    // 3) Ir a resultados
    const qs = new URLSearchParams({
      score: String(finalScore),
      passed: String(finalPassed),
      correct: String(finalTotalPts),
      total: String(TOTAL_QUESTIONS),
      competence: COMPETENCE,            // ej. "1.1" o "1.2"
      level: LEVEL_LOCAL,                 // ej. "intermedio" | "avanzado" | "basico"
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      sid: sid ?? "",
      passMin: "2",                       // (opcional) mínimo para aprobar
      compPath: "comp-1-1",               // <- necesario para rutas de “retry/next level”
      retryBase: "/exercises/comp-1-1/avanzado", // (opcional) si quieres forzarlo
      // Etiquetas opcionales
      ex1Label: "Ejercicio 1: Alerta de Búsqueda",
      ex2Label: "Ejercicio 2: Estrategia de búsqueda",
      ex3Label: "Ejercicio 3: Selecciona tácticas de búsqueda",
      // Métricas opcionales (si aplica)
      // pairs: `${correctPairs}/${totalPairs}`,
      // kscore: String(percent),
    })

    // 2) Empuja SIEMPRE a la misma página:
    router.push(`/test/results?${qs.toString()}`)
  };

  /* ----- UI ----- */
  const TacticRow = ({
    value,
    onToggle,
    label,
  }: {
    value: boolean;
    onToggle: () => void;
    label: React.ReactNode;
  }) => (
    <label className="inline-flex items-center gap-2">
      <input type="checkbox" checked={value} onChange={onToggle} />
      <span>{label}</span>
    </label>
  );

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
            {/* Enunciado */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Selecciona tácticas de búsqueda</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  Tienes <b>dos necesidades de información</b>. Para cada una, <b>marca las tácticas</b> que aplicarías.
                </p>
              </div>
            </div>

            {/* Caso A */}
            <div className="mb-6">
              <div className="text-[15px] font-semibold text-gray-900">
                A) Recursos prácticos: plantillas de ventas (Excel/Sheets), en español
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                <TacticRow value={stratsA.quotes} onToggle={() => toggleA("quotes")} label={<>Usar comillas para frases exactas ("…")</>} />
                <TacticRow value={stratsA.site} onToggle={() => toggleA("site")} label={<>Restringir por sitio (site:)</>} />
                <TacticRow value={stratsA.filetype} onToggle={() => toggleA("filetype")} label={<>Restringir tipo de archivo (filetype:xlsx / filetype:pdf)</>} />
                <TacticRow value={stratsA.date} onToggle={() => toggleA("date")} label={<>Filtrar por fecha (reciente)</>} />
                <TacticRow value={stratsA.inSite} onToggle={() => toggleA("inSite")} label={<>Buscar dentro del sitio (buscador interno)</>} />
                <TacticRow value={stratsA.findPDF} onToggle={() => toggleA("findPDF")} label={<>Abrir documentos y usar <b>Ctrl+F</b> para “plantilla/ventas”</>} />
                <TacticRow value={stratsA.regionLang} onToggle={() => toggleA("regionLang")} label={<>Ajustar región/idioma a Español (LatAm)</>} />
              </div>
            </div>

            {/* Caso B */}
            <div className="mb-2">
              <div className="text-[15px] font-semibold text-gray-900">
                B) Normativa oficial: guía de facturación electrónica en un sitio gubernamental (LATAM)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-2">
                <TacticRow value={stratsB.quotes} onToggle={() => toggleB("quotes")} label={<>Usar comillas para “facturación electrónica”</>} />
                <TacticRow value={stratsB.site} onToggle={() => toggleB("site")} label={<>Restringir por sitio (site:)</>} />
                <TacticRow value={stratsB.filetype} onToggle={() => toggleB("filetype")} label={<>Restringir tipo de archivo (filetype:pdf)</>} />
                <TacticRow value={stratsB.date} onToggle={() => toggleB("date")} label={<>Filtrar por fecha (último año)</>} />
                <TacticRow value={stratsB.inSite} onToggle={() => toggleB("inSite")} label={<>Buscar dentro del sitio (menú o buscador institucional)</>} />
                <TacticRow value={stratsB.findPDF} onToggle={() => toggleB("findPDF")} label={<>Abrir guías y usar <b>Ctrl+F</b> para “requisitos/CFDI/boleta”</>} />
                <TacticRow value={stratsB.regionLang} onToggle={() => toggleB("regionLang")} label={<>Ajustar región/idioma a Español (LatAm)</>} />
              </div>
            </div>

            {/* Validar */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleValidate}
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
