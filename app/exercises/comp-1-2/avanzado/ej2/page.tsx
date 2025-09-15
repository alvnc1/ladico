"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

/* ========= Config puntaje/sesión ========= */
const COMPETENCE = "1.2";
const LEVEL_LOCAL = "avanzado";   // para levelProgress
const LEVEL_FS = "Avanzado";      // para Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 1;           // P2 (0-based) para Firestore
const Q_ONE_BASED  = 2;           // P2 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.2:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ========= Dataset (LATAM · Deforestación Amazonía) ========= */
type Source = {
  id: number;
  title: string;
  url: string;
  domain: string;
  country?: string;
  kind: "Gobierno" | "Organismo internacional" | "Universidad/Revista" | "ONG/Medio" | "Blog/Opinión" | "Comercial" | "Red social";
  snippet: string;
  badges: string[];
  details: string[];
  reliable: boolean;
};

const SOURCES: Source[] = [
  {
    id: 1,
    title: "Monitoreo PRODES 2023/2024 — Amazonía Legal",
    url: "https://terrabrasilis.dpi.inpe.br/",
    domain: "inpe.br",
    country: "Brasil",
    kind: "Gobierno",
    snippet:
      "Serie histórica de deforestación con metodología pública y datos descargables (INPE).",
    badges: [".br (gobierno)", "Metodología pública", "Datos abiertos", "Serie temporal"],
    details: [
      "Autoría institucional: INPE (Instituto Nacional de Pesquisas Espaciais).",
      "Publica metodología, define márgenes de error, ofrece descarga de capas.",
      "Actualizaciones periódicas; contacto institucional disponible.",
    ],
    reliable: true,
  },
  {
    id: 2,
    title: "SelvaViva News — 'La deforestación ya no es un problema'",
    url: "https://selvavivanews.example/blog",
    domain: "example",
    kind: "Blog/Opinión",
    snippet:
      "Artículo sin autor identificado ni referencias. Asegura que 'todo está resuelto' sin evidencias.",
    badges: ["Sin autoría clara", "Sin fecha exacta", "Sin referencias"],
    details: [
      "No hay política de correcciones ni transparencia de financiación.",
      "Afirmaciones categóricas; carece de enlaces a datos primarios.",
    ],
    reliable: false,
  },
  {
    id: 3,
    title: "FAO — Evaluaciones de recursos forestales",
    url: "https://www.fao.org/forest-resources-assessment",
    domain: "fao.org",
    kind: "Organismo internacional",
    snippet:
      "Informes comparables por país, definiciones estandarizadas y notas metodológicas (FAO, ONU).",
    badges: ["Organismo ONU", "Metodología", "Comparabilidad internacional", "Referencias"],
    details: [
      "Revisión técnica y glosarios; fichas por país.",
      "Transparencia sobre fuentes nacionales; publicaciones periódicas.",
    ],
    reliable: true,
  },
  {
    id: 4,
    title: "SciELO — Artículo revisado por pares sobre cobertura forestal",
    url: "https://scielo.org/articulo-amazonia",
    domain: "scielo.org",
    kind: "Universidad/Revista",
    snippet:
      "Estudio con DOI; detalla métodos (teledetección) y limita inferencias; incluye bibliografía extensa.",
    badges: ["Revisión por pares", "DOI", "Metodología detallada", "Bibliografía"],
    details: [
      "Autoría y filiación institucional; fechas de recibido/aceptado/publicado.",
      "Datos suplementarios y enlace a repositorio.",
    ],
    reliable: true,
  },
  {
    id: 5,
    title: "AmazonForestryCorp — 'El sector está reduciendo su impacto'",
    url: "https://amazonforestrycorp.com/prensa",
    domain: "amazonforestrycorp.com",
    kind: "Comercial",
    snippet:
      "Comunicado corporativo; prioriza reputación de la empresa. Enlaces a auditorías internas.",
    badges: ["Conflicto de interés", "Selección de datos", "Sin revisión independiente"],
    details: [
      "Carece de indicadores comparables y límites metodológicos.",
      "No enlaza a datos primarios públicos; lenguaje promocional.",
    ],
    reliable: false,
  },
  {
    id: 6,
    title: "EcoViral (video corto) — '5 datos que no te contaron'",
    url: "https://tiktok.com/@ecoviral",
    domain: "tiktok.com",
    kind: "Red social",
    snippet:
      "Video viral sin fuentes visibles en descripción; cifras redondeadas y sin contexto.",
    badges: ["Formato corto", "Sin referencias", "Sensacionalista"],
    details: [
      "No hay autoría verificable ni enlaces a informes.",
      "No presenta metodología ni fecha exacta de los datos.",
    ],
    reliable: false,
  },
];

/* ========= Página ========= */
export default function LadicoP2FuentesFiables() {
  const [currentIndex] = useState(Q_ZERO_BASED);
  const progress = useMemo(() => ((currentIndex + 1) / TOTAL_QUESTIONS) * 100, [currentIndex]);

  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Carga sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Asegura/crea sesión
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
        console.error("No se pudo asegurar la sesión (P2):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ========= Estado de selección ========= */
  const CORRECT_SET = useMemo(() => new Set([1, 3, 4]), []);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<React.ReactNode>("");

  const toggleOpen = (id: number) =>
    setOpenIds((s) => ({ ...s, [id]: !s[id] }));

  const toggleSelect = (id: number) => {
    setFeedback("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // máximo 3 seleccionadas
      if (prev.length >= 3) return prev; 
      return [...prev, id];
    });
  };

  const selectedCount = selected.length;
  const correctChosen = selected.filter((id) => CORRECT_SET.has(id)).length;

  /* ========= Validar + Puntaje ========= */
  const handleValidate = async () => {
    if (selectedCount !== 3) {
      setFeedback(
        <p className="text-orange-700">
          Debes seleccionar exactamente <b>3</b> fuentes.
        </p>
      );
      return;
    }

    const ok = correctChosen >= 2; // ✅ aprueba con 2/3 correctas
    setFeedback(
      ok ? (
        <div className="text-green-700">
          ¡Bien! Seleccionaste {correctChosen}/3 confiables. Las más sólidas eran:
          <ul className="list-disc pl-5 mt-1">
            <li>INPE (Gobierno de Brasil, metodología pública, datos abiertos).</li>
            <li>FAO (organismo ONU con comparabilidad y referencias).</li>
            <li>Revista SciELO (revisión por pares, DOI, bibliografía).</li>
          </ul>
        </div>
      ) : (
        <div className="text-red-700">
          Casi. Elegiste {correctChosen}/3 confiables. Revisa señales de calidad:
          <ul className="list-disc pl-5 mt-1">
            <li>Autoría y filiación verificables (institucional o académica).</li>
            <li>Metodología, datos abiertos, glosarios y comparabilidad.</li>
            <li>Transparencia (conflictos de interés, correcciones, contacto).</li>
          </ul>
        </div>
      )
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
      console.warn("No se pudo marcar P2 respondida:", e);
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
                | 1.2 Evaluar datos, información y contenidos digitales - Nivel Avanzado
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
                Valorar la fiabilidad de fuentes (Amazonía)
              </h2>
              <p className="text-gray-800">
                Debes preparar un informe sobre <b>deforestación en la Amazonía</b>. A continuación verás
                seis fuentes diversas. Lee sus señales de calidad (dominio, autoría, metodología, transparencia,
                conflicto de interés, referencia a datos, etc.) y <b>selecciona las 3 más confiables</b>.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Apruebas si aciertas <b>al menos 2 de las 3</b>.
              </p>
            </div>

            {/* Lista de fuentes */}
            <div className="space-y-4">
              {SOURCES.map((s) => {
                const isOpen = !!openIds[s.id];
                const isChecked = selected.includes(s.id);
                const canAdd = isChecked || selected.length < 3;
                return (
                  <div key={s.id} className="border rounded-xl">
                    <div className="p-3 sm:p-4 flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 w-5 h-5 accent-[#286575]"
                        checked={isChecked}
                        onChange={() => canAdd && toggleSelect(s.id)}
                        disabled={!canAdd && !isChecked}
                        title={!canAdd && !isChecked ? "Solo puedes elegir 3" : "Seleccionar fuente"}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700">
                            {s.kind}
                          </span>
                          {s.country && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700">
                              {s.country}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{s.domain}</span>
                        </div>

                        <div className="mt-1">
                          <a
                            href={s.url}
                            onClick={(e) => e.preventDefault()}
                            className="text-lg font-semibold text-blue-700 hover:underline"
                            title="(Demo) En ejercicios no abrimos enlaces reales"
                          >
                            {s.title}
                          </a>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{s.snippet}</p>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {s.badges.map((b, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-white border text-gray-600"
                            >
                              {b}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={() => toggleOpen(s.id)}
                          className="mt-2 text-sm text-[#286575] hover:underline"
                        >
                          {isOpen ? "Ocultar detalles" : "Ver detalles"}
                        </button>

                        {isOpen && (
                          <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
                            {s.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Seleccionadas: {selected.length}/3
              </div>
              <Button
                onClick={handleValidate}
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
