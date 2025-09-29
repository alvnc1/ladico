"use client"

import { useMemo, useState, useEffect, useRef } from "react"
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

const COMPETENCE = "4.4" as const
const LEVEL = "avanzado" as const
const SESSION_PREFIX = "session:4.4:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

type Id = "A" | "B" | "C" | "D" | "E"
type Item = { id: Id; title: string; text: string }

// Proveedores definidos DIRECTAMENTE y mostrados en este orden: A, B, C, D, E
const PROVIDERS: Item[] = [
  {
    id: "A",
    title: "Proveedor A",
    text:
      "Ha migrado parte importante de su infraestructura a energías renovables, cuenta con hardware optimizado que reduce el consumo eléctrico por tarea procesada, aplica planes de reutilización de equipos y mantiene prácticas de refrigeración tradicionales.",
  },
  {
    id: "B",
    title: "Proveedor B",
    text:
      "Se distingue por contar con servidores de bajo consumo energético en tareas de IA. Su infraestructura depende casi por completo de energía de origen fósil, la renovación de hardware es frecuente y el sistema de refrigeración exige altos niveles de electricidad.",
  },
  {
    id: "C",
    title: "Proveedor C",
    text:
      "Sus centros de datos funcionan con una combinación de energías fósiles y renovables, dispone de equipos con eficiencia estándar y aplica programas de reciclaje limitados, pero no siempre garantiza eficiencia en refrigeración.",
  },
  {
    id: "D",
    title: "Proveedor D",
    text:
      "Utiliza energía fósil en la totalidad de sus operaciones, su hardware es de corta vida, no optimiza el consumo energético en los procesos y emplea sistemas de refrigeración tradicionales.",
  },
  {
    id: "E",
    title: "Proveedor E",
    text:
      "Opera centros de datos abastecidos con energía renovable certificada, utiliza servidores de alta eficiencia de cómputo, implementa programas de reacondicionamiento y reciclaje de hardware, y emplea sistemas de refrigeración de bajo consumo de agua y electricidad.",
  },
]

// Respuesta correcta (del más recomendable al menos): E-A-C-B-D
const CORRECT_ORDER: readonly Id[] = ["E", "A", "C", "B", "D"] as const

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  // ====== Sesión Firestore ======
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  useEffect(() => {
    if (!user) {
      setSessionId(null)
      return
    }
    const LS_KEY = sessionKeyFor(user.uid)
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
    if (cached) {
      if (!sessionId) setSessionId(cached)
      return
    }
    if (ensuringRef.current) return
    ensuringRef.current = true
    ;(async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Avanzado",
          totalQuestions: 3,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test (P3):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ====== Entrada del usuario: 5 casillas separadas por guiones ======
  const [boxes, setBoxes] = useState<string[]>(["", "", "", "", ""])
  const setBox = (idx: number, val: string) => {
    const v = (val || "").toUpperCase().slice(0, 1).replace(/[^A-E]/g, "")
    setBoxes(prev => {
      const next = [...prev]
      next[idx] = v
      return next
    })
  }

  const userOrder = useMemo(() => boxes.map(b => b.trim().toUpperCase()).join("-"), [boxes])
  const correctOrderStr = CORRECT_ORDER.join("-")
  const point: 0 | 1 = userOrder === correctOrderStr ? 1 : 0

  // ====== Finalizar ======
  const handleFinish = async () => {
    const isTeacher = userData?.role === "profesor"
    setPoint(COMPETENCE, LEVEL, 3, point)

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

    let sid = sessionId
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
        if (cached) {
          sid = cached
        } else if (!ensuringRef.current) {
          ensuringRef.current = true
          try {
            const { id } = await ensureSession({
              userId: user.uid,
              competence: COMPETENCE,
              level: "Avanzado",
              totalQuestions: 3,
            })
            sid = id
            setSessionId(id)
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
          } finally {
            ensuringRef.current = false
          }
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

    // Avisar al dashboard para refrescar el anillo de progreso
    try {
      localStorage.setItem("ladico:progress:version", String(Date.now()))
      window.dispatchEvent(new CustomEvent("ladico:progress:refresh"))
    } catch {}

    try {
      if (user) localStorage.removeItem(sessionKeyFor(user.uid))
    } catch {}

    // → Results universales
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
      passMin: "2",
      compPath: "comp-4-4",
      retryBase: "/exercises/comp-4-4/avanzado",
      ex1Label: "Ejercicio 1: Términos y condiciones",
      ex2Label: "Ejercicio 2: Hábitos y consumo (avanzado)",
      ex3Label: "Ejercicio 3: Selección sostenible de proveedores",
    })
    if (sid) qs.set("sid", sid)

    router.push(`/test/results?${qs.toString()}`)
  }

  const progressPct = 100

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white">
            <Link href="/dashboard">
              <img src="/ladico_green.png" alt="Ladico Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
            </Link>
            <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
              | 4.4 Protección del medioambiente - Nivel Avanzado
            </span>
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
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2.5 overflow-hidden">
          <div className="h-full bg-[#286575] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Elegir entre diferentes alternativas tecnológicas según su sostenibilidad
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Usted forma parte de un comité que debe seleccionar un proveedor de servicios de inteligencia artificial para
                  análisis de imágenes médicas.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  A continuación, se presentan cinco posibles proveedores con distintas prácticas ambientales. Ordénelos del más
                  recomendable al menos recomendable considerando su impacto sobre el medio ambiente.
                </p>
              </div>
            </div>
            {/* Lista A, B, C, D, E */}
            <div className="space-y-3 mb-6">
              {PROVIDERS.map(p => (
                <div key={p.id} className="bg-white border border-gray-300 rounded-xl p-3">
                  <div className="font-semibold text-gray-900 mb-1">{p.title}</div>
                  <div className="text-sm text-gray-700">{p.text}</div>
                </div>
              ))}
            </div>

            {/* Recuadro con 5 casillas separadas por guiones (sin textos extra) */}
            <div className="bg-gray-50 border border-gray-300 rounded-2xl p-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="text"
                      value={boxes[i]}
                      onChange={(e) => setBox(i, e.target.value)}
                      className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-semibold rounded-xl border border-gray-300 focus:border-[#286575] focus:ring-[#286575] uppercase"
                      maxLength={1}
                    />
                    {i < 4 && <span className="mx-2 sm:mx-3 text-gray-500 font-bold select-none">-</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex items-center justify-end">
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
