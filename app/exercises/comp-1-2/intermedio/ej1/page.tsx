"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SESSION_PREFIX = "session:1.2:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;


type Category = "enciclopedico" | "institucional" | "periodistico" | "satirico";
type Option = Category | "";

type Site = {
  id: string;
  name: string;
  url: string;
  correct: Category;
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "enciclopedico", label: "Enciclopédico" },
  { value: "institucional", label: "Institucional" },
  { value: "periodistico", label: "Periodístico" },
  { value: "satirico", label: "Satírico" },
];

const SITES: Site[] = [
  {
    id: "wikipedia",
    name: "Wikipedia (español)",
    url: "https://es.wikipedia.org/",
    correct: "enciclopedico",
  },
  {
    id: "lanacionar",
    name: "La Nación (Argentina)",
    url: "https://www.lanacion.com.ar/",
    correct: "periodistico",
  },
  {
    id: "gobcl",
    name: "Gobierno de Chile",
    url: "https://www.gob.cl/",
    correct: "institucional",
  },
  {
    id: "eldeforma",
    name: "El Deforma (México)",
    url: "https://eldeforma.com/",
    correct: "satirico",
  },
];

export default function LadicoSitesClassificationQ() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalQuestions = 3;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const router = useRouter();
  const { user } = useAuth();
  const [done, setDone] = useState(false);

  // ---- sesión/puntaje (1.2 Intermedio) ----
  const COMPETENCE = "1.2";
  const LEVEL = "intermedio";
  const Q_IDX_ZERO = 0; // 0-based en este módulo
  const Q_IDX_ONE = 1;  // 1-based para setPoint

  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false); // evita dobles llamados en StrictMode


  // 1) Carga sesión cacheada (si existe) apenas conocemos el uid
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const LS_KEY = sessionKeyFor(user.uid);
    const sid = localStorage.getItem(LS_KEY);
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // 2) Crea/asegura sesión UNA VEZ por usuario (evita duplicados)
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      return;
    }

    const LS_KEY = sessionKeyFor(user.uid);
    const cached =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    if (cached) {
      // ya existe para este usuario
      if (!sessionId) setSessionId(cached);
      return;
    }

    // Evita que se dispare doble en StrictMode o por renders repetidos
    if (ensuringRef.current) return;
    ensuringRef.current = true;

    (async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Intermedio",
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

  // ---- estado de selecciones ----
  const [answers, setAnswers] = useState<Record<string, Option>>(
    Object.fromEntries(SITES.map((s) => [s.id, ""]))
  );
  const [validated, setValidated] = useState(false);
  const [resultMsg, setResultMsg] = useState<null | { score: number; pass: boolean }>(null);

  const setAnswer = (id: string, value: Category) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const correctCount = () =>
    SITES.reduce((acc, s) => (answers[s.id] === s.correct ? acc + 1 : acc), 0);

  const validate = async () => {
    const score = correctCount(); // 0..4
    const pass = score >= 2;      // regla ≥2/4 => 1 punto
    setValidated(true);
    setResultMsg({ score, pass });
    const point: 0 | 1 = pass ? 1 : 0;

    // progreso local
    setPoint(COMPETENCE, LEVEL, Q_IDX_ONE, point);

    // Firestore
    try {
      const LS_KEY = user ? sessionKeyFor(user.uid) : null;

      // Usa la sesión existente (estado o LS); NO vuelvas a crear si ya hay una
      let sid =
        sessionId ||
        (LS_KEY && typeof window !== "undefined"
          ? localStorage.getItem(LS_KEY)
          : null);

      // Si aún no hay sesión (primer uso en este usuario), créala una sola vez
      if (!sid && user && !ensuringRef.current) {
        ensuringRef.current = true;
        try {
          const created = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          sid = created.id;
          setSessionId(created.id);
          if (typeof window !== "undefined")
            localStorage.setItem(LS_KEY!, created.id);
        } finally {
          ensuringRef.current = false;
        }
      }

      if (sid) {
        await markAnswered(sid, 0, point === 1); // índice 0 = P1
      }
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e);
    }

    setDone(true);
    router.push("/exercises/comp-1-2/intermedio/ej2");
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

      {/* Tarjeta pregunta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Clasificar sitios web
                  </h2>
                </div>
              </div>
              {/* Instrucciones */}
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                  <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                    Los sitios web se pueden clasificar según el tipo de información que comunican.
                    Relaciona cada uno de los siguientes sitios con su categoría:
                    <b> enciclopédico</b>, <b> institucional</b>, <b> periodístico</b> o
                    <b> satírico</b>. Los enlaces se abrirán en una pestaña nueva.
                  </p>
                </div>
              </div>
            </div>

            {/* Ejercicio */}
            <div className="space-y-4">
            {SITES.map((s) => {
                const sel = answers[s.id];
                const rowValidated = validated && sel !== "";
                const ok = rowValidated && sel === s.correct;
                const border = rowValidated

                return (
                <div
                    key={s.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-xl border border-gray-200`}
                >
                    <div className="flex-1 text-sm sm:text-base text-gray-800">
                    <span className="font-medium">{s.name}</span>{" "}
                    <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1a73e8] hover:underline break-all"
                    >
                        ({s.url.replace(/^https?:\/\//, "")})
                    </a>
                    </div>

                    <div className="w-full sm:w-72">
                    <Select
                        value={(answers[s.id] as Category) || ""}
                        onValueChange={(v: Category) => setAnswer(s.id, v)}
                    >
                        <SelectTrigger className="justify-between bg-white border border-gray-300 rounded-xl">
                        <SelectValue placeholder="- Seleccionar -" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                            {c.label}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
                );
            })}
            </div>
            {/* Footer / acciones */}
            <div className="px-3 py-3 bg-white flex items-center justify-end">
            <Button
                onClick={validate}
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
