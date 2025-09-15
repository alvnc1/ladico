"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered, finalizeSession } from "@/lib/testSession"

const COMPETENCE = "4.4"
const LEVEL = "intermedio"
/** ⚠️ CLAVE POR-USUARIO: evita pisar sesiones entre cuentas */
const SESSION_PREFIX = "session:4.4:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

// === Opciones (A..E) según tu contexto ===
const OPTIONS = [
  { key: "A", text: "App de compra conjunta de alimentos locales.", correct: true },
  { key: "B", text: "App que recomienda ofertas de supermercados cercanos.", correct: false },
  { key: "C", text: "App de alquiler de bicicletas compartidas.", correct: true },
  { key: "D", text: "App de trueque y donaciones comunitarias.", correct: true },
  { key: "E", text: "App que sugiere rutas de transporte público optimizadas para ahorrar tiempo.", correct: false },
] as const

type Key = typeof OPTIONS[number]["key"]

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)

  /* ==== Sesión por-usuario (evita mezclar) ==== */
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
        console.error("No se pudo asegurar la sesión de test (P3):", e);
      }
    })();
  }, [user?.uid, sessionId]);

  const [selected, setSelected] = useState<Set<Key>>(new Set())

  const toggle = (k: Key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // Puntaje local (exacto): A, C y D
  const point: 0 | 1 = useMemo(() => {
    const chosen = Array.from(selected)
    const correctSet = new Set<Key>(["A", "C", "D"])
    if (chosen.length !== correctSet.size) return 0
    for (const c of chosen) if (!correctSet.has(c)) return 0
    return 1
  }, [selected])

  // === Finalizar (P3) ===
  const handleFinish = async () => {
    const isTeacher = userData?.role === "profesor"

    // Guarda el punto local para P3
    setPoint(COMPETENCE, LEVEL, 3, point)

    // Cálculo de resultado para la pantalla de resultados
    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog)
    const passed = isLevelPassed(prog)
    const score = Math.round((totalPts / 3) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    const finalTotalPts = isTeacher ? 3 : totalPts
    const finalPassed = isTeacher ? true : passed
    const finalScore = isTeacher ? 100 : score

    // Asegurar/usar sesión y marcar P3, luego finalizar
    let sid = sessionId
    try {
      if (!sid && user) {
        const cached = typeof window !== "undefined" ? localStorage.getItem(sessionKeyFor(user.uid)) : null;
        if (cached) {
          sid = cached;
        } else {
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

      if (sid) {
        try {
          await markAnswered(sid, 2, point === 1) // P3 = index 2
        } catch (e) {
          console.warn("No se pudo registrar P3:", e)
        }
        try {
          await finalizeSession(sid, { correctCount: finalTotalPts, total: 3, passMin: 2 })
        } catch (e) {
          console.warn("No se pudo finalizar la sesión en P3:", e)
        }
      }
    } catch (e) {
      console.warn("Error al finalizar P3:", e)
    }

    // Limpia referencia local a la sesión
    try {
      if (user) localStorage.removeItem(sessionKeyFor(user.uid))
    } catch {}

    // Redirigir a resultados
    const qs = new URLSearchParams({
      score: String(finalScore),
      passed: String(finalPassed),
      correct: String(finalTotalPts),
      total: "3",
      competence: COMPETENCE,
      level: LEVEL,
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
    })
    if (sid) qs.set("sid", sid)
    router.push(`/test/comp-4-4-intermedio/results?${qs.toString()}`)
  }

  const progressPct = 100

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
                | 4.4 Protección del medioambiente - Nivel Intermedio
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta 3 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-[#286575] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Indicar impactos medioambientales positivos de aplicaciones y servicios digitales de uso rutinario
            </h2>

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Una persona quiere reducir su impacto ambiental mediante el uso de aplicaciones digitales. Se presentan cinco alternativas.
                  Seleccione aquellas que representan un impacto ambiental claramente positivo y significativo.
                </p>
              </div>
            </div>
            {/* Lista de opciones (estructura intacta) */}
            <div className="space-y-3 sm:space-y-4">
              {OPTIONS.map((opt) => {
                const active = selected.has(opt.key)
                return (
                  <label
                    key={opt.key}
                    className={`flex items-start space-x-3 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      active ? "border-[#286575] bg-[#e6f2f3] shadow-md" : "border-gray-200 hover:border-[#286575] hover:bg-gray-50"
                    }`}
                    onClick={() => toggle(opt.key)}
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={active}
                        onChange={() => toggle(opt.key)}
                        aria-label={`Opción ${opt.key}`}
                      />
                      <div className={`w-5 h-5 rounded-md border-2 ${active ? "bg-[#286575] border-[#286575]" : "border-gray-300"}`}>
                        {active && (
                          <svg viewBox="0 0 24 24" className="text-white w-4 h-4 m-[2px]">
                            <path
                              fill="currentColor"
                              d="M20.285 6.708a1 1 0 0 1 0 1.414l-9.193 9.193a1 1 0 0 1-1.414 0l-5.657-5.657a1 1 0 1 1 1.414-1.414l4.95 4.95 8.486-8.486a1 1 0 0 1 1.414 0z"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-700">{opt.text}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="mt-6 flex items-center justify-end">
              <Button
                onClick={handleFinish}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
