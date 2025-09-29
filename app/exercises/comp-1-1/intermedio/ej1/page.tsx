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

// ⬇️ IMPORTA EL JSON (asegura tsconfig: "resolveJsonModule": true)
import RAW_CASES from "./casos/info.json";

/* ================== Config Puntaje/Sesión ================== */
const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";   // levelProgress
const LEVEL_FS = "Intermedio";      // Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 0;             // P1 (0-based) para Firestore
const Q_ONE_BASED  = 1;             // P1 (1-based) para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================== Tipos ================== */
type GroupRule = {
  label: string;
  alts: string[];
  required?: boolean;
};
type CaseSpec = {
  id: string;
  title: string;
  need: string;
  hint?: string;
  groups: GroupRule[];
  minGroups: number;
};
type CaseJson = CaseSpec & {
  criteria?: {
    countries?: string[]; // ["Chile"] | ["global"] | ["any"]
    genders?: string[];   // ["Masculino"] | ["Femenino"] | ["Prefiero no decir"] | ["any"]
    ageGroups?: string[]; // ["teen","young_adult","adult","older_adult","any"]
  }
};

/* ================== Utils ================== */
const normalizeText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const normalizeGender = (g?: string | null): "Masculino" | "Femenino" | "Prefiero no decir" | "any" => {
  const v = (g || "").toLowerCase();
  if (v.includes("masc")) return "Masculino";
  if (v.includes("fem")) return "Femenino";
  if (v.includes("prefiero") || v.includes("no decir")) return "Prefiero no decir";
  return "any";
};

const getAgeGroup = (age?: number | null): "teen" | "young_adult" | "adult" | "older_adult" | "any" => {
  if (typeof age !== "number" || Number.isNaN(age)) return "any";
  if (age >= 13 && age <= 17) return "teen";
  if (age >= 18 && age <= 24) return "young_adult";
  if (age >= 25 && age <= 54) return "adult";
  if (age >= 55) return "older_adult";
  return "any";
};

/* ===== Evalúa una consulta contra las señales del caso ===== */
function evaluateQuery(rawQuery: string, spec: CaseSpec) {
  const q = normalizeText(rawQuery);
  const matched: string[] = [];
  const missingRequired: string[] = [];
  let hits = 0;

  for (const g of spec.groups) {
    const ok = g.alts.some((alt) => q.includes(normalizeText(alt)));
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

/* ================== Filtrado por perfil ================== */
function profileMatches(c: CaseJson, country: string, gender: string, ageGroup: string): boolean {
  const cc = (c.criteria?.countries ?? ["any"]).map((x) => x.toLowerCase());
  const gg = (c.criteria?.genders ?? ["any"]).map((x) => x.toLowerCase());
  const aa = (c.criteria?.ageGroups ?? ["any"]).map((x) => x.toLowerCase());

  const countryOk = cc.includes("any") || cc.includes("global") || cc.includes(country.toLowerCase());
  const genderOk  = gg.includes("any") || gg.includes(gender.toLowerCase());
  const ageOk     = aa.includes("any") || aa.includes(ageGroup.toLowerCase());

  return countryOk && genderOk && ageOk;
}

function pickThreeCasesForProfile(
  all: CaseJson[],
  country: string,
  gender: string,
  ageGroup: string
): CaseSpec[] {
  const preferred = all.filter((c) => profileMatches(c, country, gender, ageGroup))
  const globalPool = all.filter((c) =>
    (c.criteria?.countries ?? []).map((s) => s.toLowerCase()).includes("global")
  )

  // 🔄 Combina: perfil → global → todos
  const pool: CaseJson[] = [...preferred, ...globalPool, ...all]

  // --- ROTACIÓN con localStorage ---
  let offset = 0
  if (typeof window !== "undefined") {
    const key = `ladico:rotation:${country.toLowerCase()}`
    const prev = localStorage.getItem(key)
    offset = prev ? (parseInt(prev) + 1) % pool.length : 0
    localStorage.setItem(key, String(offset))
  }

  // --- Selecciona 3 a partir del offset (cíclico) ---
  const out: CaseJson[] = []
  for (let i = 0; i < pool.length && out.length < 3; i++) {
    const idx = (offset + i) % pool.length
    const c = pool[idx]
    if (!out.find((x) => x.id === c.id)) {
      out.push(c)
    }
  }

  return out.slice(0, 3).map(({ id, title, need, hint, groups, minGroups }) => ({
    id, title, need, hint, groups, minGroups
  }))
}


/* ================== Página ================== */
export default function LadicoP1InfoNeedsOpen() {
  const [currentIndex] = useState(0);
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const router = useRouter();
  const { user, userData } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Perfil del usuario
  const country = userData?.country || "global";
  const gender = normalizeGender(userData?.gender);
  const ageGroup = getAgeGroup(userData?.age);

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

  /* ================== Casos desde JSON (filtrados por perfil) ================== */
  const CASES: CaseSpec[] = useMemo(() => {
    const all = (RAW_CASES?.cases ?? []) as CaseJson[];
    return pickThreeCasesForProfile(all, country, gender, ageGroup);
  }, [country, gender, ageGroup]);

  /* ================== Estado del ejercicio ================== */
  const [queries, setQueries] = useState<string[]>(Array(CASES.length).fill(""));
  const [results, setResults] = useState<Array<ReturnType<typeof evaluateQuery> | null>>(
    Array(CASES.length).fill(null)
  );
  const [, setValidated] = useState(false);

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

    const count = evals.reduce((acc, r) => acc + (r?.ok ? 1 : 0), 0);
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Consultas Precisas</h2>
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

            {/* Casos (desde JSON filtrado) */}
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
                          value={queries[idx] || ""}
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
