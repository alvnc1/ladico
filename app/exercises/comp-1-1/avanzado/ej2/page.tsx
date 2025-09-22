"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

// ⬇️ JSON con múltiples escenarios (Chile, Colombia, etc.)
import RAW from "./tacticas/tacticas.json";

/* ===== Config sesión/puntaje ===== */
const COMPETENCE = "1.1";
const LEVEL_FS = "Avanzado";      // Firestore
const LEVEL_LOCAL = "avanzado";   // levelProgress
const TOTAL_QUESTIONS = 3;
const Q_ZERO_BASED = 1; // P2 para Firestore
const Q_ONE_BASED  = 2; // P2 para levelProgress

const SESSION_PREFIX = "session:1.1:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ===== Tipos del JSON (mínimos) ===== */
type PassRule = { minCorrectPicked: number; maxWrongPicked: number };
type Scenario = {
  id: string;
  title: string;
  description?: string;
  criteria?: {
    countries?: string[]; // ["Chile"] | ["Colombia"] | ["global"] | ["any"]
    genders?: string[];   // ["Masculino","Femenino","any",...]
    ageGroups?: string[]; // ["teen","young_adult","adult","older_adult","any"]
  };
  passRule?: PassRule;
};
type Tactic = { id: number; text: string; correct: boolean };
type RawItem = { scenario: Scenario; tactics: Tactic[] };
type RawShape = { schemaVersion?: number; items?: RawItem[] };

/* ===== Helpers de perfil ===== */
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

function profileMatches(s: Scenario, country: string, gender: string, ageGroup: string): boolean {
  const cc = (s.criteria?.countries ?? ["any"]).map((x) => x.toLowerCase());
  const gg = (s.criteria?.genders ?? ["any"]).map((x) => x.toLowerCase());
  const aa = (s.criteria?.ageGroups ?? ["any"]).map((x) => x.toLowerCase());

  const countryOk = cc.includes("any") || cc.includes("global") || cc.includes(country.toLowerCase());
  const genderOk  = gg.includes("any") || gg.includes(gender.toLowerCase());
  const ageOk     = aa.includes("any") || aa.includes(ageGroup.toLowerCase());

  return countryOk && genderOk && ageOk;
}

/* ===== Componente ===== */
export default function P2EstrategiaBusquedaAvanzado() {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [currentIndex] = useState(1); // P2 (0-based)
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // Perfil del usuario
  const country = userData?.country || "global";
  const gender = normalizeGender(userData?.gender);
  const ageGroup = getAgeGroup(userData?.age);

  // ===== Seleccionar escenario/tácticas según perfil =====
  const { activeScenario, TACTICS, passRule } = useMemo(() => {
    const data = (RAW as RawShape) || {};
    const items = Array.isArray(data.items) ? data.items : [];

    // 1) Filtra por perfil
    const preferred: RawItem[] = items.filter((it) =>
      profileMatches(it.scenario, country, gender, ageGroup)
    );

    // 2) Si no hay match, intenta “global” o “any”
    let chosen: RawItem | undefined = preferred[0];
    if (!chosen) {
      chosen = items.find(
        (it) =>
          (it.scenario.criteria?.countries ?? []).some((c) =>
            ["any", "global"].includes(c.toLowerCase())
          )
      );
    }

    // 3) Fallback al primero disponible
    if (!chosen && items.length > 0) chosen = items[0];

    const activeScenario = chosen?.scenario ?? {
      id: "default",
      title: "Estrategia de búsqueda",
      description:
        "Selecciona las tácticas de búsqueda más adecuadas para el escenario.",
      passRule: { minCorrectPicked: 6, maxWrongPicked: 1 },
    };

    const TACTICS = chosen?.tactics ?? [];
    const passRule: PassRule = activeScenario.passRule ?? {
      minCorrectPicked: 6,
      maxWrongPicked: 1,
    };

    return { activeScenario, TACTICS, passRule };
  }, [country, gender, ageGroup]);

  // ===== Estado selección
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (id: number) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // ===== Sesión por-usuario (igual que tu versión)
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

  // ===== Lógica de validación (ahora usando passRule del JSON)
  const correctIds = useMemo(
    () => new Set(TACTICS.filter((t) => t.correct).map((t) => t.id)),
    [TACTICS]
  );
  const incorrectIds = useMemo(
    () => new Set(TACTICS.filter((t) => !t.correct).map((t) => t.id)),
    [TACTICS]
  );

  const correctChosen = picked.filter((id) => correctIds.has(id)).length;
  const wrongChosen = picked.filter((id) => incorrectIds.has(id)).length;

  const validar = async () => {
    const passed =
      correctChosen >= passRule.minCorrectPicked &&
      wrongChosen <= passRule.maxWrongPicked;
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
    router.push("/exercises/comp-1-1/avanzado/ej3");
  };

  // ===== UI
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duración-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Enunciado dinámico */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {activeScenario.title || "Estrategia de búsqueda"}
                  </h2>
                </div>
              </div>
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                  <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                    {activeScenario.description ??
                      "Selecciona todas las tácticas de búsqueda más adecuadas para el escenario propuesto."}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de tácticas (del JSON filtrado) */}
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
