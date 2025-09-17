"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";
import { skillsInfo } from "@/components/data/digcompSkills"
import { useRouter } from "next/navigation";

/* ================== Config Puntaje/Sesión ================== */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";   // levelProgress
const LEVEL_FS = "Intermedio";      // Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 0;             // P1 (0-based) para Firestore
const Q_ONE_BASED  = 1;             // P1 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================== Utils ================== */
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

type GroupRule = {
  label: string;      // etiqueta visible para feedback
  alts: string[];     // alternativas aceptadas (normalizadas)
  required?: boolean; // si esta señal es obligatoria
};
type CaseSpec = {
  id: string;
  title: string;
  need: string;
  hint?: string;
  groups: GroupRule[];  // señales
  minGroups: number;    // cuántas señales deben cumplirse
};

/* ================== Casos (CHILE) ================== */
const CASES: CaseSpec[] = [
  {
    id: "pasaporte-cl",
    title: "Renovación de pasaporte (Chile)",
    need:
      "Debes renovar tu pasaporte chileno en 2025. Quieres los requisitos actualizados desde el sitio oficial y, si es posible, en un PDF descargable.",
    groups: [
      { label: "Concepto (pasaporte/renovar)", alts: ["pasaporte", "renovar", "renovacion", "renovación"], required: true },
      { label: "Dominio oficial (site:registrocivil.cl o site:gob.cl)", alts: ["site:registrocivil.cl", "site:gob.cl"], required: true },
      { label: "Palabra clave (requisitos)", alts: ["requisitos", "requisito"] },
      { label: "Formato PDF (filetype:pdf)", alts: ["filetype:pdf", "pdf"] },
      { label: "Año (2025)", alts: ["2025"] },
    ],
    minGroups: 3, // Debe tener: concepto + site + (alguna extra)
  },
  {
    id: "beca-junaeb",
    title: "Beca de Alimentación (Chile, JUNAEB)",
    need:
      "Buscas los requisitos 2025 de la Beca de Alimentación para la Educación Superior (JUNAEB), directamente en la web oficial.",
    groups: [
      { label: "Concepto (beca/BAES)", alts: ["beca", "baes"], required: true },
      { label: "Alcance (alimentacion)", alts: ["alimentacion", "alimentación"] },
      { label: "Dominio oficial (site:junaeb.cl)", alts: ["site:junaeb.cl"], required: true },
      { label: "Año (2025)", alts: ["2025"] },
      { label: "Palabra clave (requisitos)", alts: ["requisitos", "requisito"] },
    ],
    minGroups: 3, // concepto + site + (alguna extra)
  },
  {
    id: "ipc-cl",
    title: "IPC de Chile (INE)",
    need:
      "Necesitas el boletín mensual oficial del IPC 2024 de Chile, preferentemente en PDF, desde el Instituto Nacional de Estadísticas.",
    groups: [
      { label: "Concepto (IPC/Inflación)", alts: ["ipc", "inflacion", "inflación"], required: true },
      { label: "Dominio oficial (site:ine.gob.cl)", alts: ["site:ine.gob.cl"], required: true },
      { label: "Formato PDF (filetype:pdf)", alts: ["filetype:pdf", "pdf"] },
      { label: "Año (2024)", alts: ["2024"] },
      { label: "Palabra clave (boletín/informe/comunicado)", alts: ["boletin", "boletín", "informe", "comunicado", "prensa"] },
    ],
    minGroups: 3, // concepto + site + (alguna extra)
  },
];


/* ===== Evalúa una consulta contra las señales del caso ===== */
function evaluateQuery(rawQuery: string, spec: CaseSpec) {
  const q = normalize(rawQuery);
  const matched: string[] = [];
  const missingRequired: string[] = [];
  let hits = 0;

  for (const g of spec.groups) {
    const ok = g.alts.some((alt) => q.includes(normalize(alt)));
    if (ok) {
      matched.push(g.label);
      hits++;
    } else if (g.required) {
      missingRequired.push(g.label);
    }
  }

  const okRequired = missingRequired.length === 0;
  const okMin = hits >= spec.minGroups;
  const ok = okRequired && okMin;

  return {
    ok,
    hits,
    matched,
    missingRequired,
    needed: spec.minGroups,
  };
}

/* ================== Página ================== */
export default function LadicoP1InfoNeedsOpen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

    const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Cargar sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Asegurar sesión por-usuario
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
        console.error("No se pudo asegurar la sesión (P1):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ================== Estado del ejercicio ================== */
  const [queries, setQueries] = useState<string[]>(Array(CASES.length).fill(""));
  const [results, setResults] = useState<
    Array<ReturnType<typeof evaluateQuery> | null>
  >(Array(CASES.length).fill(null));
  const [validated, setValidated] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const setQuery = (idx: number, value: string) => {
    setQueries((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    // limpiar feedback de ese caso si cambia
    setResults((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const handleValidate = async () => {
    const evals = queries.map((q, i) => evaluateQuery(q, CASES[i]));
    setResults(evals);

    const count = evals.reduce((acc, r) => acc + (r.ok ? 1 : 0), 0);
    setCorrectCount(count);
    setValidated(true);

    const ok = count >= 2; // ✅ aprueba con 2/3
    const point: 0 | 1 = ok ? 1 : 0;

    // 1) progreso local
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);

    // 2) Firestore
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
      console.warn("No se pudo marcar P1 respondida:", e);
    }
    router.push("/exercises/comp-1-1/intermedio/ej2");
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
                  className="w-20 h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
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

      {/* Tarjeta Ladico */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
            <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Enunciado */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Escribir Consultas Precisas en Buscadores
                  </h2>
                </div>
              </div>
              {/* Instrucciones */}
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                  <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                    Para cada caso, <b>escribe la consulta</b> que usarías en un buscador. 
                    Demuestra tu estrategia con operadores como <code>site:</code>,{" "}
                    <code>filetype:</code>, comillas y/o el año.
                  </p>
                </div>
              </div>
            </div>
            {/* Casos */}
            <div className="space-y-6">
              {CASES.map((c, idx) => {
                const res = results[idx];
                const ok = res?.ok;
                return (
                  <div key={c.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-4 sm:p-5 bg-gray-50">
                      <div className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                        Caso {idx + 1} · {c.title}
                      </div>
                      <p className="mt-1 text-gray-800">{c.need}</p>
                      {c.hint && (
                        <p className="mt-2 text-xs text-gray-500">Sugerencia: {c.hint}</p>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <label className="text-sm text-gray-700 block">
                        Tu consulta
                        <input
                          value={queries[idx]}
                          onChange={(e) => setQuery(idx, e.target.value)}
                          className="mt-1 w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleValidate}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
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
