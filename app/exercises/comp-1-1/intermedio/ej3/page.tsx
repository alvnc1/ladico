"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

/* ================== Config Puntaje/Sesión ================== */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";   // levelProgress
const LEVEL_FS = "Intermedio";      // Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 2;             // P3 (0-based) para Firestore
const Q_ONE_BASED  = 3;             // P3 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================== Utils ================== */
const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const tokenSet = (s: string) =>
  new Set(
    normalize(s)
      .split(/[^a-zñ]+/i)
      .filter(Boolean)
  );

const hasOperator = (q: string) => {
  // mantén comillas y operadores para detectar
  const pairQuotes = (q.match(/"/g) || []).length >= 2;
  return (
    /\bOR\b/.test(q) ||
    pairQuotes ||
    /\s-/.test(q) ||
    /site:/.test(q) ||
    /filetype:/.test(q) ||
    /intitle:/.test(q) ||
    /inurl:/.test(q)
  );
};

/* ================== Léxicos para evaluación ================== */
const WORDS_BECAS = ["beca","becas","scholarship","scholarships","convocatoria","convocatorias","financiamiento"];
const WORDS_STEM = ["stem","ciencia","cientific","tecnolog","ingenier","matematic"];
const WORDS_REGION = [
  "latinoamerica","latinoamérica","america latina","américa latina","latam",
  "mexico","méxico","peru","perú","bolivia","chile","argentina","colombia",
  "ecuador","uruguay","paraguay","centroamerica","centroamérica","brasil","brasil","brasil"
];

const SOURCE_HINTS = [
  "conacyt","conahcyt","anid","conicet","icetex","colfuturo","becas benito juarez",
  "senescyt","oea","unesco","capes","cnpq","minedu","ministerio de educacion",
  "gob","gobierno",".edu",".gob",".gov","who","paho","ops"
];

const NAV_VERBS = ["suscrib","configur","filtr","revis","program","automatiz","export","naveg","acced","descarg","organ"];

/* ================== Página P3 ================== */
export default function LadicoP3BecasSTEM() {
  const [currentIndex] = useState(Q_ZERO_BASED);
  const progress = useMemo(() => ((currentIndex + 1) / TOTAL_QUESTIONS) * 100, [currentIndex]);

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
        console.error("No se pudo asegurar la sesión (P3):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ================== Estado del ejercicio ================== */
  // 1) Exponer necesidad
  const [need, setNeed] = useState("");

  // 2) Consulta base (con operadores)
  const [query, setQuery] = useState("");

  // 3) Canales/estrategia (checkboxes)
  const [channels, setChannels] = useState({
    alerts: false,   // Alertas (p. ej., Google Alerts)
    rss: false,      // RSS/Atom
    newsletters: false, // Newsletters/boletines
    social: false,   // Redes profesionales (LinkedIn, X, grupos)
  });

  // 4) Acceso/navegación (fuentes objetivo + plan de pasos)
  const [navPlan, setNavPlan] = useState("");

  const [feedback, setFeedback] = useState<React.ReactNode>(null);

  const toggleChannel = (k: keyof typeof channels) =>
    setChannels((s) => ({ ...s, [k]: !s[k] }));

  /* ================== Validación ================== */
  const validate = async () => {
    const needTokens = tokenSet(need);
    const qTokens = tokenSet(query);
    const navTokens = tokenSet(navPlan);

    const containsAny = (tokens: Set<string>, list: string[]) =>
      list.some((w) => {
        const n = normalize(w);
        // match por prefijo (tecnolog* / ingenier*)
        return [...tokens].some((t) => t.startsWith(n));
      });

    // A) La necesidad expone correctamente el tema (≥2 de 3 grupos)
    const A = [
      containsAny(needTokens, WORDS_BECAS),
      containsAny(needTokens, WORDS_STEM),
      containsAny(needTokens, WORDS_REGION),
    ].filter(Boolean).length >= 2;

    // B) La consulta base usa al menos 1 operador y cubre el tema (≥2 de 3)
    const B =
      hasOperator(query) &&
      [
        containsAny(qTokens, WORDS_BECAS),
        containsAny(qTokens, WORDS_STEM),
        containsAny(qTokens, WORDS_REGION),
      ].filter(Boolean).length >= 2;

    // C) Canales: elige al menos 2 (p. ej., Alertas + RSS)
    const C = Object.values(channels).filter(Boolean).length >= 2;

    // D) Plan de acceso/navegación: ≥100 chars, incluye verbos de acción y menciona ≥1 fuente/institución
    const hasVerb = NAV_VERBS.some((v) => normalize(navPlan).includes(v));
    const hasSource = SOURCE_HINTS.some((s) => normalize(navPlan).includes(normalize(s)));
    const D = navPlan.trim().length >= 100 && hasVerb && hasSource;

    const met = [
      { key: "Necesidad de información bien expuesta", ok: A },
      { key: "Consulta base con operadores y foco temático", ok: B },
      { key: "Estrategia: al menos 2 canales seleccionados", ok: C },
      { key: "Acceso y navegación: plan con fuentes y acciones", ok: D },
    ];
    const passedCount = met.filter(m => m.ok).length;
    const ok = passedCount >= 3; // ✅ aprueba con 3/4

    setFeedback(
      <div className="space-y-2">
        <p className={ok ? "text-green-700" : "text-red-700"}>
          {ok
            ? `¡Excelente! Cumpliste ${passedCount}/4 criterios.`
            : `Aún no: cumpliste ${passedCount}/4 (se requieren 3).`}
        </p>
        <ul className="text-sm">
          {met.map((m, i) => (
            <li key={i} className={`flex items-start gap-2 ${m.ok ? "text-green-700" : "text-red-700"}`}>
              <span>{m.ok ? "✅" : "❌"}</span>
              <span>{m.key}</span>
            </li>
          ))}
        </ul>
        {!ok && (
          <div className="text-xs text-gray-600">
            Pistas:
            <ul className="list-disc pl-5">
              <li>En la consulta, combina comillas/OR/-palabra/ <code>site:</code> / <code>filetype:</code>.</li>
              <li>Activa al menos 2 canales (ej.: Alertas + RSS o Newsletters).</li>
              <li>Menciona una fuente (ej.: <i>CONACYT</i>, <i>ANID</i>, <i>CONICET</i>, <i>ICETEX</i>, <i>OEA</i>, <i>UNESCO</i>) y describe acciones: <i>configurar</i>, <i>filtrar</i>, <i>suscribirme</i>, <i>descargar</i>.</li>
            </ul>
          </div>
        )}
      </div>
    );

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
      console.warn("No se pudo marcar P3 respondida:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-20 h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
                | 1.1 Navegar, buscar y filtrar datos - Nivel Intermedio
              </span>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-1">
            <div className="flex items-center justify-between text-[#286575] mb-1">
              <span className="text-xs font-medium bg-white/40 px-2 py-1 rounded-full">
                Pregunta {currentIndex + 1} de {TOTAL_QUESTIONS}
              </span>
              <div className="flex space-x-1">
                {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i <= currentIndex ? "bg-[#286575]" : "bg-[#dde3e8]"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="h-1.5 bg-[#dde3e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#286575] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Ladico */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones */}
            <div className="mb-6 bg-gray-50 p-4 sm:p-6 rounded-xl border-l-4 border-[#286575]">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Estrategia de búsqueda: Becas STEM en Latinoamérica
              </h2>
              <p className="text-gray-800">
                Tu grupo necesita identificar <b>becas para estudiantes STEM</b> en países de LATAM
                y seguir nuevas convocatorias. Define la necesidad, crea una consulta con operadores,
                elige canales de monitoreo y describe cómo acceder/navegar hasta las fuentes oficiales.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Apruebas cumpliendo <b>3 de 4</b> criterios.
              </p>
            </div>

            {/* Campos */}
            <div className="space-y-5">
              {/* 1) Necesidad */}
              <label className="block text-sm text-gray-700">
                1) Expón tu necesidad de información
                <textarea
                  value={need}
                  onChange={(e) => setNeed(e.target.value)}
                  rows={3}
                  placeholder='Ej.: "Mapear becas para estudiantes de ingeniería y ciencias en México y Perú para el próximo semestre"'
                  className="mt-1 w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Incluye al menos dos de: <i>becas/convocatorias</i>, <i>STEM/ciencia/ingeniería</i>, <i>país o región LATAM</i>.
                </span>
              </label>

              {/* 2) Consulta con operadores */}
              <label className="block text-sm text-gray-700">
                2) Consulta base (usa operadores)
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Ej.: "becas STEM" OR "becas ingenieria" site:gob.mx -posgrado filetype:pdf'
                  className="mt-1 w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Operadores: <code>"..."</code>, <code>OR</code>, <code>-palabra</code>, <code>site:</code>, <code>filetype:</code>, <code>intitle:</code>, <code>inurl:</code>.
                </span>
              </label>

              {/* 3) Canales */}
              <fieldset className="mt-2">
                <legend className="text-sm font-medium mb-1">3) Canales de monitoreo (elige ≥ 2)</legend>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={channels.alerts} onChange={() => toggleChannel("alerts")} />
                    Alertas de búsqueda
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={channels.rss} onChange={() => toggleChannel("rss")} />
                    RSS / Atom
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={channels.newsletters} onChange={() => toggleChannel("newsletters")} />
                    Newsletters/boletines
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={channels.social} onChange={() => toggleChannel("social")} />
                    Redes profesionales
                  </label>
                </div>
              </fieldset>

              {/* 4) Acceso / Navegación */}
              <label className="block text-sm text-gray-700">
                4) Fuentes y plan de navegación/acceso
                <textarea
                  value={navPlan}
                  onChange={(e) => setNavPlan(e.target.value)}
                  rows={4}
                  placeholder='Ej.: "Configurar alerta y RSS de CONACYT y ANID; filtrar por pregrado; revisar newsletters semanales; en ICETEX buscar convocatorias vigentes y descargar PDFs."'
                  className="mt-1 w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#286675]"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Menciona al menos una fuente (p. ej., <i>CONACYT</i>, <i>ANID</i>, <i>CONICET</i>, <i>ICETEX</i>, <i>OEA</i>, <i>UNESCO</i>) y acciones como <i>configurar</i>, <i>filtrar</i>, <i>suscribirme</i>, <i>descargar</i>.
                </span>
              </label>
            </div>

            {/* Acciones */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={validate}
                className="px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                Validar
              </Button>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="mt-3 bg-gray-50 border rounded-xl p-3 text-sm">
                {feedback}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
