"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

const SESSION_PREFIX = "session:1.1:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

export default function LadicoFiltersExercise() {
  const [currentIndex] = useState(0); // Ejercicio 1 (0-based)
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const router = useRouter();
  const { user } = useAuth();

  // Config de competencia/nivel
  const COMPETENCE = "1.1";
  const LEVEL_FS = "Avanzado";   // Firestore
  const LEVEL_LOCAL = "avanzado"; // levelProgress
  const Q_IDX_ZERO = 0; // índice 0-based para markAnswered (P1)
  const Q_IDX_ONE  = 1; // índice 1-based para setPoint (P1)

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Estado de respuesta
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [helper, setHelper] = useState<string>("");

  // Guard contra dobles ejecuciones
  const ensuringRef = useRef(false);

  // Carga sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const LS_KEY = sessionKeyFor(user.uid);
    const sid = localStorage.getItem(LS_KEY);
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Asegura/crea sesión por-usuario
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
          totalQuestions: 3,
        });
        setSessionId(id);
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test:", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  // Normalizador (quita tildes, signos, colapsa espacios y pasa a minúsculas)
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita diacríticos
      .replace(/[^\p{L}\p{N}\s]/gu, "") // quita signos/puntuación
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const EXPECTED = "La famosa invasión de los osos en Sicilia";
  const onFinalize = async () => {
    const ok = normalize(answer) === normalize(EXPECTED);
    const point: 0 | 1 = ok ? 1 : 0;

    // Feedback UI
    setStatus(ok ? "ok" : "err");

    // Puntaje local
    try {
      setPoint(COMPETENCE, LEVEL_LOCAL, Q_IDX_ONE, point);
    } catch (e) {
      console.warn("No se pudo guardar el punto local:", e);
    }

    // Firestore
    try {
      let sid = sessionId;
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
            totalQuestions: 3,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
        }
      }
      if (sid) {
        await markAnswered(sid, Q_IDX_ZERO, ok);
      }
    } catch (e) {
      console.warn("No se pudo marcar la pregunta respondida:", e);
    }

    router.push("/exercises/comp-1-1/avanzado/ej2");
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

      {/* Tarjeta Ladico */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
            <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Alerta de Búsqueda
                    </h2>
                    </div>
                </div>
                {/* Instrucciones */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                    <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        Te interesa la actualidad del <b>cine de animación</b> en América Latina. Ya usas
                        herramientas de monitoreo, pero los resultados no son precisos. Abre{" "}
                        <Link
                          href="/exercises/comp-1-1/avanzado/ej1/alerta"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1a73e8] underline font-medium"
                        >
                          esta alerta de búsqueda
                        </Link>{" "}
                        y configura los filtros.
                    </p>
                    <p className="mt-2">
                      Debe buscar sobre <b>cine de animación</b>, con frecuencia <b>una vez al día</b>,{" "}
                      <b>todos los resultados</b>, solo en <b>Blogs</b> y en <b>Español (LatAm)</b>.
                    </p>
                    <p className="mt-2">
                      Luego revisa la <b>vista previa</b> y responde: <i>¿Cuál es el primer resultado?</i>
                    </p>
                    </div>
                </div>
            </div>
            {/* Respuesta + Finalizar (fuera del desktop, dentro de la tarjeta) */}
            <div className="mt-4 px-0 sm:px-0 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Primer resultado:
                <input
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    setStatus("idle");
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 text-sm`}
                />
                </label>

                <Button
                  onClick={onFinalize}
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
