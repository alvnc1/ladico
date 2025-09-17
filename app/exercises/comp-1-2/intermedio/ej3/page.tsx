"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ensureSession, markAnswered } from "@/lib/testSession";
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress";

/* ========= Config sesión/puntaje (P3 de 1.2 Intermedio) ========= */
const COMPETENCE = "1.2";
const LEVEL = "intermedio";      // para progreso local
const LEVEL_FS = "Intermedio";   // para Firestore
const TOTAL_QUESTIONS = 3;
const Q_IDX_ZERO = 2;            // P3 (0-based) para markAnswered
const Q_IDX_ONE  = 3;            // P3 (1-based) para setPoint
const SESSION_PREFIX = "session:1.2:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ===================== Datos del gráfico ===================== */
type Slice = { etiqueta: string; valor: number; color: string };
const DATA: Slice[] = [
  { etiqueta: "Maleta",                 valor: 25, color: "#FFF59D" }, // Suitcase
  { etiqueta: "Portafolio",             valor: 3,  color: "#9AD0F5" }, // Briefcase
  { etiqueta: "Riñonera",               valor: 4,  color: "#7E57C2" }, // Hip bag
  { etiqueta: "Bolsa para portátil",    valor: 3,  color: "#E0BBFF" }, // Laptop bag
  { etiqueta: "Bolso de mano",          valor: 11, color: "#F57C00" }, // Handbag
  { etiqueta: "Mochila",                valor: 30, color: "#F4B266" }, // Backpack
  { etiqueta: "Bolsa de fin de semana", valor: 20, color: "#E64A19" }, // Weekend bag
  { etiqueta: "Mochila escolar",        valor: 2,  color: "#66BB6A" }, // School bag
  { etiqueta: "Maletín",                valor: 1,  color: "#388E3C" }, // Attaché-case
  { etiqueta: "Otro",                   valor: 1,  color: "#90A4AE" }, // Other
];

const EXPECTED_ANSWER = 25;

/* ==================== Página del ejercicio ==================== */

export default function LuggageChartExerciseP3() {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // P3 fijo
  const [currentIndex, setCurrentIndex] = useState(2);
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // Estado de respuesta
  const [answer, setAnswer] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

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
        console.error("No se pudo asegurar la sesión de test (P3):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ----- Validar + puntaje + navegar a Results ----- */
  const handleFinalize = async () => {
    const numeric = Number(String(answer).replace(/[^\d.-]/g, ""));
    const ok = Number.isFinite(numeric) && numeric === EXPECTED_ANSWER;
    setStatus(ok ? "ok" : "err");

    const point: 0 | 1 = ok ? 1 : 0;

    // 1) Progreso local
    setPoint(COMPETENCE, LEVEL, Q_IDX_ONE, point);
    const prog = getProgress(COMPETENCE, LEVEL);
    const totalPts = levelPoints(prog);
    const passed = isLevelPassed(prog);
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100);
    const q1 = getPoint(prog, 1);
    const q2 = getPoint(prog, 2);
    const q3 = getPoint(prog, 3);

    // Modo profesor: forzar aprobado (opcional, igual que otros ejercicios)
    const isTeacher = userData?.role === "profesor";
    const finalTotalPts = isTeacher ? TOTAL_QUESTIONS : totalPts;
    const finalPassed   = isTeacher ? true : passed;
    const finalScore    = isTeacher ? 100 : score;

    // 2) Firestore
    let sid = sessionId;
    try {
      if (!sid && user) {
        const cached =
          typeof window !== "undefined" ? localStorage.getItem(sessionKeyFor(user.uid)) : null;
        if (cached) {
          sid = cached;
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: LEVEL_FS,
            totalQuestions: TOTAL_QUESTIONS,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(sessionKeyFor(user.uid), id);
        }
      }
    } catch (e) {
      console.warn("No se pudo (re)asegurar la sesión al guardar P3:", e);
    }

    try {
      if (sid) await markAnswered(sid, Q_IDX_ZERO, point === 1);
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
      competence: COMPETENCE,
      level: LEVEL,
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      sid: sid ?? "",
      passMin: "2",                       // (opcional) mínimo para aprobar
      compPath: "comp-1-2",               // <- necesario para rutas de “retry/next level”
      retryBase: "/exercises/comp-1-2/intermedio", // (opcional) si quieres forzarlo
      // Etiquetas opcionales
      ex1Label: "Ejercicio 1: Clasificar sitios web",
      ex2Label: "Ejercicio 2: Montaje Fotográfico",
      ex3Label: "Ejercicio 3: Gráfico de equipaje por tipo",
      // Métricas opcionales (si aplica)
      // pairs: `${correctPairs}/${totalPairs}`,
      // kscore: String(percent),
    })

    // 2) Empuja SIEMPRE a la misma página:
    router.push(`/test/results?${qs.toString()}`)
  };

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
                | 1.2 Evaluar datos, información y contenidos digitales - Nivel Intermedio
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

      {/* Tarjeta Ladico */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
            <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Enunciado */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Gráfico de equipaje por tipo
                    </h2>
                    </div>
                </div>
                {/* Instrucciones */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                    <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        La siguiente gráfica muestra la cantidad de equipaje encontrado en un año en una importante
                        estación de tren. <br />
                        <strong>¿Cuántas maletas se encontraron?</strong>
                    </p>
                    </div>
                </div>
            </div>

            {/* Leyenda arriba del gráfico (como en la imagen) */}
            <LegendAbove />

            {/* Gráfico */}
            <div className="mt-3 flex justify-center">
              <PieInteractive size={420} data={DATA} />
            </div>

            {/* Respuesta + Finalizar */}
            <div className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <span>Número de maletas:</span>
                <input
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setStatus("idle");
                  }}
                  className={`px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm w-52`}
                  inputMode="numeric"
                />
              </label>

              <Button
                onClick={handleFinalize}
                className="w-full sm:w-auto px-8 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
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

/* ================== Leyenda (arriba del gráfico) ================== */
function LegendAbove() {
  // Orden y colores sincronizados con DATA
  const items = DATA.map(({ etiqueta, color }) => ({ etiqueta, color }));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {items.map((it) => (
        <div key={it.etiqueta} className="flex items-center gap-2 text-sm text-gray-700">
          <span className="inline-block w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: it.color }} />
          <span>{it.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

/* ================== Gráfico de torta interactivo (SVG) ================== */
function PieInteractive({ size = 380, data = DATA }: { size?: number; data?: Slice[] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.valor, 0), [data]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; text: string }>(
    { show: false, x: 0, y: 0, text: "" }
  );
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const baseR = size / 2 - 2;

  const arcPath = (start: number, end: number, r: number) => {
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  let acc = 0;
  const sectors = data.map((s, i) => {
    const start = acc;
    const angle = (s.valor / total) * Math.PI * 2;
    const end = start + angle;
    acc = end;
    return { i, start, end, ...s };
  });

  const onMove = (e: React.MouseEvent, i: number, etiqueta: string, valor: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);
    const pct = Math.round((valor / total) * 100);
    setTooltip({ show: true, x, y, text: `${etiqueta}: ${valor} (${pct}%)` });
    setHoverIdx(i);
  };
  const onLeave = () => {
    setTooltip((t) => ({ ...t, show: false }));
    setHoverIdx(null);
  };

  return (
    <div className="relative" style={{ width: size, height: size }} ref={wrapRef}>
      <svg width={size} height={size} role="img" aria-label="Gráfico de equipaje por tipo">
        {sectors.map((s) => {
          const isHover = hoverIdx === s.i;
          const r = isHover ? baseR + 6 : baseR;
          return (
            <path
              key={s.i}
              d={arcPath(s.start, s.end, r)}
              fill={s.color}
              className="transition-all duration-150"
              onMouseMove={(e) => onMove(e, s.i, s.etiqueta, s.valor)}
              onMouseLeave={onLeave}
            />
          );
        })}
      </svg>

      {tooltip.show && (
        <div
          className="absolute pointer-events-none bg-black/75 text-white text-xs px-2 py-1 rounded shadow"
          style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
