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

// ⬇️ IMPORTA EL JSON (tsconfig: "resolveJsonModule": true)
import RAW from "./orden/steps.json";

/* ================== Config Puntaje/Sesión (P3 · 1.1 Intermedio) ================== */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";
const LEVEL_FS = "Intermedio";
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 2;  // P3 (0-based) para Firestore
const Q_ONE_BASEED_FALLBACK = 3;
const Q_ONE_BASED  = 3;  // P3 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================== Tipos JSON ================== */
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
    minPctCorrectPairs?: number; // 0..1
  };
  steps: { id: string; text: string }[];
};

type StepsJson = { schemaVersion: number; scenarios: Scenario[] };

/* ================== Perfil utils ================== */
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

function pickScenarioForProfile(all: Scenario[], country: string, gender: string, ageGroup: string): Scenario {
  // Filtrar los escenarios que cumplen criterios exactos
  const preferred = all.filter((s) => {
    const c = s.criteria || {};
    return matchList(c.countries, country) &&
           matchList(c.genders, gender) &&
           matchList(c.ageGroups, ageGroup);
  });

  // Fallback: escenarios del mismo país
  const countryOnly = all.filter((s) => {
    const c = s.criteria || {};
    return matchList(c.countries, country);
  });

  // Si no hay match exacto, usar fallback o todos
  const pool = preferred.length > 0 ? preferred : (countryOnly.length > 0 ? countryOnly : all);

  // --- ROTACIÓN con localStorage ---
  let index = 0;
  if (typeof window !== "undefined") {
    const key = `ladico:rotation:${country.toLowerCase()}`;
    const prev = localStorage.getItem(key);
    index = prev ? (parseInt(prev) + 1) % pool.length : 0;
    localStorage.setItem(key, String(index));
  }

  return pool[index];
}


/* ================== Página ================== */
export default function P3OrdenarEstrategiaBusquedaFromJson() {
  const router = useRouter();
  const [currentIndex] = useState(Q_ZERO_BASED);
  const totalQuestions = TOTAL_QUESTIONS;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Perfil
  const country = (userData?.country as string) || "global";
  const gender = normalizeGender(userData?.gender);
  const ageGroup = getAgeGroup(userData?.age);

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
        console.error("No se pudo asegurar la sesión (P3 1.1):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  /* ============== Escenario por perfil desde JSON ============== */
  const SCENARIO: Scenario = useMemo(() => {
    const data = RAW as StepsJson;
    return pickScenarioForProfile(data.scenarios || [], country, gender, ageGroup);
  }, [country, gender, ageGroup]);

  const CANONICAL_STEPS = SCENARIO.steps;
  const MIN_PCT = SCENARIO.passRule?.minPctCorrectPairs ?? 0.7;

  /* ============== Estado: lista reordenable ============== */
  const [steps, setSteps] = useState(() =>
    [...CANONICAL_STEPS].sort(() => Math.random() - 0.5)
  );

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

  /* ============== Validación por pares (Kendall-like) ============== */
  const validateOrder = async () => {
    const canonicalPos: Record<string, number> = {};
    CANONICAL_STEPS.forEach((s, i) => (canonicalPos[s.id] = i));

    const ids = CANONICAL_STEPS.map((s) => s.id);
    let totalPairs = 0;
    let correctPairs = 0;

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        totalPairs++;
        const canonAB = canonicalPos[a] < canonicalPos[b];
        const userAB  = positions[a] < positions[b];
        if (canonAB === userAB) correctPairs++;
      }
    }

    const pct = correctPairs / totalPairs;
    const passedRelative = pct >= MIN_PCT;

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

    // → Resultados universales
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
      compPath: "comp-1-1",
      retryBase: "/exercises/comp-1-1/intermedio",
      ex1Label: "Ejercicio 1: Consultas precisas",
      ex2Label: "Ejercicio 2: Búsqueda en Internet",
      ex3Label: "Ejercicio 3: Ordenar estrategia de búsqueda"
    });

    router.push(`/test/results?${qs.toString()}`);
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duración-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Ordenar estrategia de búsqueda</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  {SCENARIO.description}
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
