"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress";
import { skillsInfo } from "@/components/data/digcompSkills";
import { useRouter } from "next/navigation";

// ⬇️ IMPORTA JSON (tsconfig: "resolveJsonModule": true)
import RAW from "./claims/items.json";

/* ========= Config puntaje/sesión (P3) ========= */
const COMPETENCE = "1.2";
const LEVEL_LOCAL = "avanzado";   // levelProgress
const LEVEL_FS = "Avanzado";      // Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 2;  // P3 (0-based) Firestore
const Q_ONE_BASED  = 3;  // P3 (1-based) levelProgress

const SESSION_PREFIX = "session:1.2:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ========= Tipos del JSON ========= */
type Scenario = {
  id: string;
  title: string;
  description: string;
  criteria?: {
    countries?: string[];
    genders?: string[];
    ageGroups?: string[];
  };
  passRule?: {
    minCorrect?: number;
  };
};

type TableColumn = { key: string; label: string };
type TableRow = Record<string, string | number>;
type Claim = { id: number; text: string; supported: boolean; hint?: string };

type Item = {
  scenario: Scenario;
  meta: { fuente: string; ambito: string; metodologia: string; periodo: string };
  table: { columns: TableColumn[]; rows: TableRow[] };
  claims: Claim[];
};

type ItemsJson = { schemaVersion: number; items: Item[] };

/* ========= Utils de perfil ========= */
const normalizeGender = (
  g?: string | null
): "Masculino" | "Femenino" | "Prefiero no decir" | "any" => {
  const v = (g || "").toLowerCase();
  if (v.includes("masc")) return "Masculino";
  if (v.includes("fem")) return "Femenino";
  if (v.includes("prefiero") || v.includes("no decir")) return "Prefiero no decir";
  return "any";
};

const getAgeGroup = (
  age?: number | null
): "teen" | "young_adult" | "adult" | "older_adult" | "any" => {
  if (typeof age !== "number" || Number.isNaN(age)) return "any";
  if (age >= 13 && age <= 17) return "teen";
  if (age >= 18 && age <= 24) return "young_adult";
  if (age >= 25 && age <= 54) return "adult";
  if (age >= 55) return "older_adult";
  return "any";
};

function matchList(pref: string[] | undefined, val: string) {
  const list = (pref ?? ["any"]).map((x) => x.toLowerCase());
  return list.includes("any") || list.includes(val.toLowerCase());
}

function pickScenarioForProfile(all: Item[], country: string, gender: string, ageGroup: string): Item {
  // 1) match completo por país, género y edad
  const exact =
    all.find((it) => {
      const c = it.scenario.criteria || {};
      return matchList(c.countries, country) &&
             matchList(c.genders, gender) &&
             matchList(c.ageGroups, ageGroup);
    }) ||
    // 2) fallback por país
    all.find((it) => {
      const c = it.scenario.criteria || {};
      return matchList(c.countries, country);
    }) ||
    // 3) primero
    all[0];

  return exact;
}

/* ============================ Página ============================ */
export default function P3ClaimsFromJson() {
  const [currentIndex] = useState(Q_ZERO_BASED);
  const progress = useMemo(
    () => ((currentIndex + 1) / TOTAL_QUESTIONS) * 100,
    [currentIndex]
  );

  const router = useRouter();
  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Perfil usuario
  const country = (userData?.country as string) || "global";
  const gender = normalizeGender(userData?.gender);
  const ageGroup = getAgeGroup(userData?.age);

  // Sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Asegura/crea sesión
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
        console.error("No se pudo asegurar la sesión (P3 1.2):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  // Cargar escenario por perfil
  const { scenario, meta, table, claims } = useMemo(() => {
    const data = RAW as ItemsJson;
    const chosen = pickScenarioForProfile(data.items || [], country, gender, ageGroup);
    return chosen;
  }, [country, gender, ageGroup]);

  const minCorrect = scenario.passRule?.minCorrect ?? 3;

  /* ======= Estado de respuestas ======= */
  // selected[id] = true → SUSTENTADA, false → NO SUSTENTADA, undefined → sin responder
  const [selected, setSelected] = useState<Record<number, boolean | undefined>>({});

  const setChoice = (id: number, val: boolean) =>
    setSelected((s) => ({ ...s, [id]: val }));

  const correctCount = useMemo(() => {
    return claims.reduce((acc, c) => acc + ((selected[c.id] === c.supported) ? 1 : 0), 0);
  }, [selected, claims]);

  /* ======= Validar + Puntaje ======= */
  const handleValidate = async () => {
    const questionPassed = correctCount >= minCorrect;
    const point: 0 | 1 = questionPassed ? 1 : 0;

    // 1) Progreso local
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);

    // Recalcular progreso del nivel
    const prog = getProgress(COMPETENCE, LEVEL_LOCAL);
    const totalPts = levelPoints(prog);
    const levelPassedNow = isLevelPassed(prog);
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100);
    const q1 = getPoint(prog, 1);
    const q2 = getPoint(prog, 2);
    const q3 = getPoint(prog, 3);

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
        if (cached) { sid = cached; setSessionId(cached); }
        else {
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
      if (sid) await markAnswered(sid, Q_ZERO_BASED, questionPassed);
    } catch (e) {
      console.warn("No se pudo marcar P3 respondida:", e);
    }

    try { if (user) localStorage.removeItem(sessionKeyFor(user.uid)); } catch {}

    // 3) Resultados universales
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
      passMin: "2",
      compPath: "comp-1-2",
      retryBase: "/exercises/comp-1-2/avanzado",
      ex1Label: "Ejercicio 1: Verificación de artículos en la web",
      ex2Label: "Ejercicio 2: Valorar la fiabilidad de fuentes",
      ex3Label: "Ejercicio 3: ¿Qué afirmaciones están sustentadas por los datos?"
    });

    router.push(`/test/results?${qs.toString()}`);
  };

  /* ============================ UI ============================ */
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

      {/* Tarjeta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Enunciado */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">¿Qué afirmaciones están sustentadas por los datos?</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  {scenario.description} Marca <b>Sustentada</b> si la afirmación se sostiene con la
                  ficha y la tabla; o <b>No sustentada</b> si no se puede sostener con la evidencia.
                </p>
              </div>
            </div>

            {/* Ficha técnica + Tabla dinámica */}
            <div className="grid gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-sm text-gray-700">
                  <div><b>Fuente:</b> {meta.fuente}</div>
                  <div><b>Ámbito:</b> {meta.ambito}</div>
                  <div><b>Metodología:</b> {meta.metodologia}</div>
                  <div><b>Periodo:</b> {meta.periodo}</div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      {table.columns.map((c) => (
                        <th key={c.key} className="py-2">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {table.columns.map((c) => (
                          <td key={c.key} className="py-2">
                            {typeof r[c.key] === "number"
                              ? (r[c.key] as number).toString()
                              : (r[c.key] as string)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Afirmaciones */}
            <div className="mt-6 space-y-3">
              {claims.map((c) => {
                const val = selected[c.id];
                return (
                  <div key={c.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                    <div className="text-[15px] text-gray-900 mb-2">
                      <b>#{c.id}.</b> {c.text}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1.5 rounded-2xl border ${
                          val === true
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-800 hover:bg-green-50 border-gray-300"
                        }`}
                        onClick={() => setChoice(c.id, true)}
                      >
                        Sustentada
                      </button>
                      <button
                        className={`px-3 py-1.5 rounded-2xl border ${
                          val === false
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-800 hover:bg-red-50 border-gray-300"
                        }`}
                        onClick={() => setChoice(c.id, false)}
                      >
                        No sustentada
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validar */}
            <div className="px-3 py-3 bg-white flex items-center justify-end">
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
