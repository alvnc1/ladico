// app/exercises/comp-4-3/intermedio/ej2/page.tsx
"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

const COMPETENCE = "4.3"
const LEVEL = "intermedio"
const SESSION_KEY = "session:4.3:Intermedio"

const OPTIONS = [
  {
    key: "A",
    text: "Configurar límites de uso en el dispositivo para reducir el tiempo de exposición a la aplicación.",
    correct: true,
  },
  {
    key: "B",
    text: "Silenciar notificaciones específicas del juego en lugar de desinstalar la aplicación por completo.",
    correct: true,
  },
  {
    key: "C",
    text: "Aceptar las notificaciones como parte normal del juego y simplemente ignorarlas cuando aparezcan.",
    correct: false,
  },
  {
    key: "D",
    text: "Aprovechar las recompensas y promociones cuando aparezcan, pero compensar luego con más horas de descanso.",
    correct: false,
  },
  {
    key: "E",
    text: "Conversar con tu amigo sobre cómo se siente al jugar y proponer actividades conjuntas fuera de línea.",
    correct: true,
  },
] as const

type Key = typeof OPTIONS[number]["key"]

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)

  // Carga sesión cacheada (si existe)
  useEffect(() => {
    if (typeof window === "undefined") return
    const sid = localStorage.getItem(SESSION_KEY)
    if (sid) setSessionId(sid)
  }, [])

  // Crea/asegura sesión tempranamente
  useEffect(() => {
    if (!user) return
    if (sessionId) return
    ;(async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: "4.3",
          level: "Intermedio",
          totalQuestions: 3,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test (P2):", e)
      }
    })()
  }, [user, sessionId])

  const [selected, setSelected] = useState<Set<Key>>(new Set())

  const toggle = (k: Key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // Puntaje local (para resultados): 1 si A,B,E exactamente; 0 en otro caso
  const point: 0 | 1 = useMemo(() => {
    const chosen = Array.from(selected)
    const correctSet = new Set<Key>(["A", "B", "E"])
    if (chosen.length !== correctSet.size) return 0
    for (const c of chosen) if (!correctSet.has(c)) return 0
    return 1
  }, [selected])

  const handleNext = async () => {
    // Guarda el punto local (para anillo/resultados)
    setPoint(COMPETENCE, LEVEL, 2, point)

    // Asegura tener sesión fresca SIEMPRE en este clic (evita carreras)
    let sid = sessionId
    try {
      if (!sid && user) {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: "4.3",
          level: "Intermedio",
          totalQuestions: 3,
        })
        sid = id
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, id)
      }
    } catch (e) {
      console.error("No se pudo (re)asegurar la sesión al guardar P2:", e)
    }

    // Marcamos siempre como respondida para avanzar a P3
    try {
      if (sid) {
        await markAnswered(sid, 1, true)
      }
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e)
    }

    router.push("/exercises/comp-4-3/intermedio/ej3")
  }

  const progressPct = (2 / 3) * 100

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
                | 4.3 Protección de la salud y el bienestar - Nivel Intermedio
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta 2 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
            <div className="w-3 h-3 rounded-full bg-[#dde3e8]" />
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
              Estrategias de bienestar digital en juegos en línea
            </h2>

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  En una aplicación de juegos móviles, después de cada partida aparece una oferta limitada que dura 30 segundos y
                  mensajes insistentes sobre qué tanto te superan tus amigos. Un amigo menor de edad dedica cada vez más horas a
                  jugar y experimenta ansiedad cuando no puede ingresar. Tú también recibes estas notificaciones y reconoces que
                  afectan tu concentración diaria. 
                </p>
                <p className="text-gray-700 leading-relaxed font-medium">
                ¿Cuáles de las siguientes acciones representan formas adecuadas de proteger la salud y el bienestar digital en este escenario?
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 mb-6 bg-blue-50 px-3 py-2 rounded-full inline-block">
              <b>Selección múltiple</b>
            </p>

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
                        aria-label={`Opción`}
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
                onClick={handleNext}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
