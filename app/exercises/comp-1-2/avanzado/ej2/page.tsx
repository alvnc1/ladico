"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";
import { skillsInfo } from "@/components/data/digcompSkills";
import { useRouter } from "next/navigation";

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

  const router = useRouter();
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
    const ok = correctChosen >= 2; // ✅ aprueba con 2/3 correctas
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
    router.push("/exercises/comp-1-2/avanzado/ej3");
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
                Pregunta {currentIndex + 1} de {TOTAL_QUESTIONS}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: TOTAL_QUESTIONS }, (_, index) => (
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
            {/* Instrucciones */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Valorar la fiabilidad de fuentes</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  Debes preparar un informe sobre <b>deforestación en la Amazonía</b>. A continuación verás
                  seis fuentes diversas. Lee sus señales de calidad (dominio, autoría, metodología, transparencia,
                  conflicto de interés, referencia a datos, etc.) y <b>selecciona las 3 más confiables</b>.
                </p>
              </div>
            </div>

            {/* Lista de fuentes */}
            <div className="space-y-4">
              {SOURCES.map((s) => {
                const isOpen = !!openIds[s.id];
                const isChecked = selected.includes(s.id);
                const canAdd = isChecked || selected.length < 3;
                return (
                  <div key={s.id} className="border border-gray-200 bg-gray-50 rounded-2xl">
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

            {/* Botón fuera del explorador, dentro de la tarjeta */}
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
