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

/* ========= Normalizador ========= */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/* ========= Chequeos de consulta ========= */
// P3-A: plantillas de ventas (recursos prácticos)
const A_GROUPS: string[][] = [
  ["plantilla", "plantillas", "template", "modelo", "modelos"],
  ["ventas", "venta", "comercial", "punto de venta", "pos"],
  ["excel", "xlsx", "hoja de calculo", "google sheets", "sheet", "sheets"],
];

// P3-B: guía oficial de facturación electrónica (normativa, sitio gubernamental)
const GOV_DOMAINS = [
  // MX / CL / AR / CO / PE / BR (algunos ejemplos frecuentes)
  "sat.gob.mx", "sii.cl", "afip.gob.ar", "argentina.gob.ar", "dian.gov.co",
  "gob.pe", "sunat.gob.pe", "gov.br", "receita.economia.gov.br", "gob.mx",
  "gob.cl", "gob.ar", "gob.co"
];

const hasSiteGov = (q: string) => {
  const nq = norm(q);
  if (!nq.includes("site:")) return false;
  return GOV_DOMAINS.some(d => nq.includes(`site:${d}`) || nq.includes(`site:*${d}`) || nq.includes(d));
};

const hasPhraseFactura = (q: string) => {
  const nq = norm(q);
  return (
    nq.includes('"facturacion electronica"') ||
    nq.includes("facturacion electronica") ||
    nq.includes("cfdi") || // MX
    nq.includes("comprobante fiscal digital") ||
    nq.includes("boleta electronica") || // CL
    nq.includes("nota fiscal electronica") // BR
  );
};

const matchesAtLeastNGroups = (q: string, groups: string[][], n: number) => {
  const nq = norm(q);
  let hits = 0;
  for (const g of groups) {
    if (g.some(token => nq.includes(norm(token)))) hits++;
  }
  return hits >= n;
};

/* ========= Componente ========= */
export default function LadicoP3EstrategiasBusquedaAvanzado() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  /* ----- Progreso UI ----- */
  const [currentIndex] = useState(2); // Ejercicio 1 (0-based)
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

  /* ----- Estado del ejercicio ----- */
  const [qA, setQA] = useState(""); // Consulta A
  const [qB, setQB] = useState(""); // Consulta B

  // Estrategias marcadas
  type StratKey =
    | "quotes"
    | "site"
    | "filetype"
    | "date"
    | "inSite"
    | "findPDF"
    | "regionLang";

  const [strats, setStrats] = useState<Record<StratKey, boolean>>({
    quotes: false,
    site: false,
    filetype: false,
    date: false,
    inSite: false,
    findPDF: false,
    regionLang: false,
  });

  const toggle = (k: StratKey) => setStrats(s => ({ ...s, [k]: !s[k] }));

  /* ----- Validación ----- */
  const passA = useMemo(() => matchesAtLeastNGroups(qA, A_GROUPS, 2), [qA]);
  const passB = useMemo(() => hasSiteGov(qB) && hasPhraseFactura(qB), [qB]);
  const passStrats = useMemo(() => {
    const total = Object.values(strats).filter(Boolean).length;
    // Al menos 3 tácticas, y debe estar presente la de "site" para evidenciar restricción por fuente oficial
    return total >= 3 && strats.site === true;
  }, [strats]);

  const passed = passA && passB && passStrats;

  const [feedback, setFeedback] = useState<React.ReactNode>("");

  const handleValidate = async () => {
    // Puntaje
    const point: 0 | 1 = passed ? 1 : 0;

    // 1) Local
    try {
      setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);
    } catch (e) {
      console.warn("No se pudo guardar el punto local:", e);
    }

    // Recalcular progreso del nivel después de guardar el punto de esta pregunta
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
        competence: COMPETENCE,
        level: LEVEL_LOCAL,
        q1: String(q1),
        q2: String(q2),
        q3: String(q3),
        sid: sid ?? "",
    });

    router.push(`/test/comp-1-1-avanzado/results?${qs.toString()}`);
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
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Crear búsquedas efectivas
                    </h2>
                    </div>
                </div>
                {/* Instrucciones */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                    <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        Tienes <b>dos necesidades de información distintas</b> y debes adaptar tu estrategia:
                    </p>
                    <ul className="list-disc pl-5 text-gray-800 mt-2 space-y-1">
                        <li>
                        <b>A) Recursos prácticos</b>: localizar <i>plantillas</i> de <i>ventas</i> para PyMEs en
                        <i> Excel/Sheets</i>, en español.
                        </li>
                        <li>
                        <b>B) Normativa oficial</b>: encontrar una <i>guía de facturación electrónica</i> en un
                        <i> sitio gubernamental</i> de un país latinoamericano que elijas (p. ej., SAT/AFIP/SII/DIAN/SUNAT).
                        </li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-2">
                        Escribe <b>dos consultas</b> (una por cada necesidad) y marca las <b>tácticas</b> que aplicarías.
                    </p>
                    </div>
                </div>
            </div>
              
            {/* Consultas */}
            <div className="grid gap-4">
              <label className="text-sm text-gray-700 block">
                <span className="font-medium">Consulta A (plantillas de ventas):</span>
                <input
                  value={qA}
                  onChange={(e) => setQA(e.target.value)}
                  className="mt-1 w-full sm:w-[720px] px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                />
              </label>

              <label className="text-sm text-gray-700 block">
                <span className="font-medium">Consulta B (guía oficial de facturación electrónica):</span>
                <input
                  value={qB}
                  onChange={(e) => setQB(e.target.value)}
                  className="mt-1 w-full sm:w-[720px] px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                />
              </label>
            </div>

            {/* Tácticas */}
            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Tácticas que aplicarías</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.quotes} onChange={() => toggle("quotes")} />
                  Usar comillas para frases exactas ("…")
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.site} onChange={() => toggle("site")} />
                  Restringir por sitio (site:)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.filetype} onChange={() => toggle("filetype")} />
                  Restringir tipo de archivo (filetype:pdf)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.date} onChange={() => toggle("date")} />
                  Filtrar por fecha (último año)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.inSite} onChange={() => toggle("inSite")} />
                  Buscar dentro del sitio (buscador interno)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.findPDF} onChange={() => toggle("findPDF")} />
                  Abrir PDF y usar <b>Ctrl+F</b> para “requisitos/registro”
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={strats.regionLang} onChange={() => toggle("regionLang")} />
                  Ajustar región/idioma a Español (LatAm)
                </label>
              </div>
            </div>


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
