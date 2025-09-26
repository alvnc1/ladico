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

const COMPETENCE = "1.1";
const LEVEL_LOCAL = "intermedio";   // para levelProgress
const LEVEL_FS = "Intermedio";      // para Firestore
const TOTAL_QUESTIONS = 3;

const Q_ZERO_BASED = 1;  // índice 0-based para Firestore (aquí P2)
const Q_ONE_BASED  = 2;  // índice 1-based para levelProgress

const SESSION_PREFIX = "session:1.1:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

// Normaliza: sin tildes, minúsculas, trim
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/* === Palabras “correctas” para este ejercicio (empanadas de carne) ===
   Pasa si encuentra 2 de estos 3 grupos:
   1) “receta” (con variantes útiles)
   2) “empanadas” (variantes comunes en la región)
   3) “carne” / “res” / “vacuno” / “picada” / “molida”
*/
const KEYWORD_GROUPS: string[][] = [
  // Grupo 1: receta
  ["receta", "recetas", "preparacion", "preparación", "guia", "guía"],
  // Grupo 2: empanadas
  ["empanada", "empanadas", "empanadillas", "saltenas", "salteñas", "pasteles"],
  // Grupo 3: carne
  ["carne", "res", "vacuno", "picada", "molida"],
];

export default function LadicoKeywordsExercise() {
  const [currentIndex] = useState(Q_ZERO_BASED); // muestra P2/3 en la UI
  const totalQuestions = 3;
  const progress = (2 / 3) * 100;

  const { user } = useAuth();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false);

  // --- cargar/asegurar sesión por-usuario ---
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
        console.error("No se pudo asegurar la sesión:", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  // --- estado del ejercicio ---
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<React.ReactNode>("");

  const tokens = useMemo(() => {
    const norm = normalize(answer);
    // separa por cualquier no-letra (ya sin tildes). Ñ pasa a "n" tras normalize, así que basta [a-z]
    const arr = norm.split(/[^a-z]+/g).filter(Boolean);
    return arr;
  }, [answer]);

  const matchedGroupsCount = useMemo(() => {
    let count = 0;
    for (const group of KEYWORD_GROUPS) {
      const ok = group.some((kw) => tokens.includes(normalize(kw)));
      if (ok) count++;
    }
    return count;
  }, [tokens]);

  const handleValidate = async () => {
    const ok = matchedGroupsCount >= 2; // ✅ 2/3 aprueba
    const point: 0 | 1 = ok ? 1 : 0;

    // 1) progreso local
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point);

    // 2) Firestore (marcar respondida)
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
      console.warn("No se pudo marcar la respuesta:", e);
    }

    router.push("/exercises/comp-1-1/intermedio/ej3");
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
            {/* Instrucciones */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Búsqueda en Internet</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  Haces una búsqueda en Internet sobre cocina latinoamericana. Obtienes{" "}
                  <Link
                    href="/exercises/comp-1-1/intermedio/ej2/resultados"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1a73e8] underline font-medium"
                  >
                    estos resultados
                  </Link>
                  .<br />
                  <b>¿Cuáles son las tres palabras clave</b> que mejor se ajustan a la búsqueda?
                </p>
              </div>
            </div>
            {/* Respuesta + Finalizar (fuera del desktop, dentro de la tarjeta) */}
            <div className="mt-4 px-0 sm:px-0 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Tres palabras clave:
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder=""
                  className="ml-2 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm w-60"
                />
                </label>

                <Button
                  onClick={handleValidate}
                  className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                  Siguiente
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
