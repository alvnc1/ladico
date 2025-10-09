"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";

const SESSION_PREFIX = "session:1.2:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

export default function LadicoPhotoMontageQ() {
    const [currentIndex, setCurrentIndex] = useState(1);
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

    const router = useRouter();
    const { user } = useAuth();

    const COMPETENCE = "1.2";
    const LEVEL = "intermedio";
    const SESSION_KEY = "session:1.2:Intermedio";
    const Q_IDX_ZERO = 1;
    const Q_IDX_ONE = 2;

    const [sessionId, setSessionId] = useState<string | null>(null);

    // Carga sesión cacheada (si existe) cuando conocemos el uid
    useEffect(() => {
        if (!user || typeof window === "undefined") return;
        const sid = localStorage.getItem(sessionKeyFor(user.uid));
        if (sid) setSessionId(sid);
    }, [user?.uid]);

    // Si no hay cache, crear/asegurar una sesión y guardarla con clave por-usuario
    useEffect(() => {
        if (!user) return;
        if (sessionId) return;
        (async () => {
            try {
            const { id } = await ensureSession({
                userId: user.uid,
                competence: COMPETENCE,
                level: "Intermedio",
                totalQuestions: 3,
            });
            setSessionId(id);
            if (typeof window !== "undefined") {
                localStorage.setItem(sessionKeyFor(user.uid), id);
            }
            } catch (e) {
            console.error("No se pudo asegurar la sesión de test (P2):", e);
            }
        })();
    }, [user?.uid, sessionId]);

    const [input, setInput] = useState("");
    const [validated, setValidated] = useState<null | boolean>(null);

    // Normalizador: quita tildes, pasa a minúsculas y recorta espacios
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();

    // Lista de respuestas válidas (puedes expandirla si quieres más variantes)
    const VALID_ANSWERS = [
      "calhoun",
      "john calhoun",
      "john c calhoun",
      "john calhoun", // sin punto medio
    ];

    // Responde correcto si el texto contiene "calhoun" (nombre o apellido, mayús/minús, con/sin inicial)
    const isCorrectAnswer = (raw: string) => {
      const norm = normalize(raw).replace(/\./g, " "); // tolera puntos en iniciales
      return /\bcalhoun\b/.test(norm);                 // "calhoun" en cualquier posición
    };
    
    const handleValidate = async () => {
      const ok = isCorrectAnswer(input);

      // 1 punto si es correcto, 0 si no
      const point: 0 | 1 = ok ? 1 : 0;

      // Guarda progreso local (UI)
      setPoint(COMPETENCE, LEVEL, Q_IDX_ONE, point);

      // 2) Firestore — usa sesión por-usuario y guarda el acierto (true/false)
      let sid = sessionId;
      try {
        if (!sid && user) {
          // intenta recuperar de LS por-usuario
          const cached = typeof window !== "undefined" ? localStorage.getItem(sessionKeyFor(user.uid)) : null;
          if (cached) {
            sid = cached;
          } else {
            // crear si no existe todavía
            const { id } = await ensureSession({
              userId: user.uid,
              competence: COMPETENCE,
              level: "Intermedio",
              totalQuestions: 3,
            });
            sid = id;
            setSessionId(id);
            if (typeof window !== "undefined") localStorage.setItem(sessionKeyFor(user.uid), id);
          }
        }
      } catch (e) {
        console.error("No se pudo (re)asegurar la sesión al guardar P2:", e);
      }

      try {
        if (sid) {
          // Guarda en answers[1] = true/false, NO “true” fijo
          await markAnswered(sid, Q_IDX_ZERO, point === 1);
        }
      } catch (e) {
        console.warn("No se pudo marcar P2 respondida:", e);
      }

      // 3) Avanzar
      router.push("/exercises/comp-1-2/intermedio/ej3");
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
                | 1.2 Evaluar datos, información y contenidos digitales - Nivel Intermedio
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

      {/* Tarjeta con la pregunta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
            <CardContent className="p-4 sm:p-6 lg:p-8">
                {/* Instrucciones */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Montaje Fotográfico
                        </h2>
                        </div>
                    </div>
                    {/* Instrucciones */}
                    <div className="mb-6 sm:mb-8">
                        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                        <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                            La fotografía que verás a continuación
                            suele compartirse como si fuera un retrato auténtico de <b>Abraham Lincoln</b>. Sin embargo, en realidad
                            es un <b>montaje fotográfico histórico</b>. Tu objetivo es <b>reconocer la manipulación</b> y escribir el <b>nombre del personaje
                            al que realmente corresponde el cuerpo</b> que aparece en la imagen (puedes utilizar el buscador).
                        </p>
                        </div>
                    </div>
                </div>

                {/* Foto (usa tu imagen subida en public/) */}
                <div className="flex justify-center mb-6">
                <img
                    src="/Abraham20Lincoln.png"
                    alt="Ejercicio de montaje"
                    className="max-h-72 rounded-lg shadow"
                />
                </div>
                {/* Respuesta + Finalizar (fuera del desktop, dentro de la tarjeta) */}
                <div className="mt-4 px-0 sm:px-0 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    Nombre del personaje:
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
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