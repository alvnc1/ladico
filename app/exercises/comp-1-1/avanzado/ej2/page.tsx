"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

/* ===== Config sesión/puntaje ===== */
const COMPETENCE = "1.1";
const LEVEL_FS = "Avanzado";      // Firestore
const LEVEL_LOCAL = "avanzado";   // levelProgress
const TOTAL_QUESTIONS = 3;
const Q_ZERO_BASED = 1; // P2 para Firestore
const Q_ONE_BASED  = 2; // P2 para levelProgress

const SESSION_PREFIX = "session:1.1:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ===== Ítems de estrategia =====
   Escenario: Debes localizar CONVOCATORIAS OFICIALES 2024 para
   subsidios o fondos para microempresas en Chile, priorizando
   bases y requisitos (PDF) y navegando fuentes confiables. */
type Tactic = { id: number; text: string; correct: boolean; hint?: string };
const TACTICS: Tactic[] = [
  { id: 1,  correct: true,  text: "Limitar a sitios oficiales: site:gob.cl (y subdominios como sercotec.cl, corfo.cl)" },
  { id: 2,  correct: true,  text: "Usar sinónimos con OR: (subsidio OR fondo OR convocatoria) microempresas 2024" },
  { id: 3,  correct: true,  text: "Buscar documentos con bases: filetype:pdf (intitle:bases OR “bases de postulación”)" },
  { id: 4,  correct: true,  text: "Filtrar por fecha: ‘Último año’ en las herramientas del buscador" },
  { id: 5,  correct: true,  text: "Excluir ruido publicitario: -blog -curso -ads -plantillas" },
  { id: 6,  correct: true,  text: "Navegar luego a portales oficiales: ChileAtiende, SERCOTEC, CORFO (menús Convocatorias/Programas)" },
  { id: 7,  correct: true,  text: "Usar intitle:convocatoria OR intitle:postulación para acotar títulos relevantes" },
  { id: 8,  correct: false, text: "Priorizar TikTok/Instagram porque ‘siempre es lo más actual’" },
  { id: 9,  correct: false, text: "Buscar ‘códigos de descuento’ e ‘influencers’ para acelerar el hallazgo" },
  { id: 10, correct: true,  text: "Revisar secciones ‘Transparencia’, ‘Normativa’ o ‘Bases y requisitos’ de los sitios" },
  { id: 11, correct: false, text: "Ordenar por ‘más antiguos primero’ para asegurar legitimidad histórica (2015–2017)" },
  { id: 12, correct: true,  text: "Combinar país/idioma en el buscador (Ubicación: Chile / Idioma: Español) para pertinencia" },
];

export default function P2EstrategiaBusquedaAvanzado() {
  const router = useRouter();
  const { user } = useAuth();

  const [currentIndex] = useState(1); // Ejercicio 1 (0-based)
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Estado selección
  const [picked, setPicked] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<React.ReactNode>("");

  /* ===== Sesión por-usuario ===== */
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) { setSessionId(null); return; }
    const LS_KEY = sessionKeyFor(user.uid);
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (cached) { if (!sessionId) setSessionId(cached); return; }
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
        console.error("No se pudo asegurar la sesión (P2 1.1):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ===== Lógica de validación =====
     Regla: aprueba si selecciona ≥6 tácticas correctas y ≤1 incorrecta. */
  const correctIds = useMemo(() => new Set(TACTICS.filter(t => t.correct).map(t => t.id)), []);
  const incorrectIds = useMemo(() => new Set(TACTICS.filter(t => !t.correct).map(t => t.id)), []);

  const correctChosen = picked.filter(id => correctIds.has(id)).length;
  const wrongChosen   = picked.filter(id => incorrectIds.has(id)).length;

  const toggle = (id: number) => {
    setFeedback("");
    setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const validar = async () => {
    const passed = correctChosen >= 6 && wrongChosen <= 1;
    const point: 0 | 1 = passed ? 1 : 0;

    // Puntaje local
    try {
      setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);
    } catch (e) {
      console.warn("No se pudo guardar el punto local:", e);
    }

    // Firestore
    try {
      let sid = sessionId;
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid);
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
        if (cached) {
          sid = cached; setSessionId(cached);
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: LEVEL_FS,
            totalQuestions: TOTAL_QUESTIONS,
          });
          sid = id; setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
        }
      }
      if (sid) await markAnswered(sid, Q_ZERO_BASED, passed);
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e);
    }
    // Avanzar a P3
    router.push("/exercises/comp-1-1/avanzado/ej3");
  };

  /* ===== UI ===== */
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
                | {COMPETENCE} Navegar, buscar y filtrar datos, información y contenidos digitales - Nivel {LEVEL_FS}
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
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Estrategia de búsqueda
                    </h2>
                    </div>
                </div>
                {/* Instrucciones */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                    <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        Necesitas ubicar <b>convocatorias oficiales 2024</b> de
                        <b> subsidios/fondos para microempresas en Chile</b>, con acceso a
                        <b> bases y requisitos (PDF)</b>. Selecciona todas las <b>tácticas de búsqueda</b> más adecuadas.
                    </p>
                    </div>
                </div>
            </div>
            {/* Lista de tácticas */}
            <div className="space-y-2">
              {TACTICS.map((t) => {
                const checked = picked.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      checked ? "bg-teal-50 border-teal-300" : "bg-gray-50 border-gray-200"
                    } cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 accent-[#286575]"
                      checked={checked}
                      onChange={() => toggle(t.id)}
                    />
                    <span className="text-[15px] leading-relaxed">{t.text}</span>
                  </label>
                );
              })}
            </div>

            {/* Botón validar */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={validar}
                className="bg-[#286575] hover:bg-[#1f4e58] text-white px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
