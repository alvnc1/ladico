"use client"

import { useMemo, useState, useEffect, useRef} from "react"
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

const COMPETENCE = "4.3" as const
const LEVEL = "intermedio" as const
const SESSION_PREFIX = "session:4.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

// Tecnologías
const TECHNOLOGIES = [
  { id: 1, text: "Juego en línea multijugador con instrucciones." },
  { id: 2, text: "Botón físico de emergencia con llamada automática a un familiar." },
  { id: 3, text: "Aplicación de comunicación por mensajes de voz grabados." },
  { id: 4, text: "Red social comunitaria para eventos y avisos locales con navegación guiada." },
  { id: 5, text: "Portal de trámites digitales con pictogramas." },
] as const

// Orden correcto (solo referencia visual)
const CORRECT_ORDER: ReadonlyArray<number> = [2, 3, 4, 5, 1]

type Tech = typeof TECHNOLOGIES[number]
type SlotId = number | null

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // 1) Cargar sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar sesión
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
          level: "Intermedio",
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

  // ====== Estado Drag & Drop ======
  const [pool, setPool] = useState<number[]>(() => shuffle(TECHNOLOGIES.map(t => t.id)))
  const [slots, setSlots] = useState<SlotId[]>([null, null, null, null, null])

  const techById = (id: number) => TECHNOLOGIES.find(t => t.id === id) as Tech
  const [dragData, setDragData] = useState<{ from: "pool" | "slot"; index: number } | null>(null)

  function onDragStart(from: "pool" | "slot", index: number) {
    setDragData({ from, index })
  }
  function onDragEnd() {
    setDragData(null)
  }

  function onDropToSlot(slotIndex: number) {
    if (!dragData) return
    let newPool = [...pool]
    let newSlots = [...slots] as SlotId[]

    if (dragData.from === "pool") {
      const id = pool[dragData.index]
      if (id == null) return
      const target = newSlots[slotIndex]
      newPool.splice(dragData.index, 1)
      if (target !== null) newPool.push(target)
      newSlots[slotIndex] = id
    } else {
      const id = slots[dragData.index]
      const target = newSlots[slotIndex]
      newSlots[dragData.index] = target
      newSlots[slotIndex] = id
    }

    setPool(newPool)
    setSlots(newSlots)
    setDragData(null)
  }

  function onDropToPool() {
    if (!dragData || dragData.from !== "slot") return
    let newPool = [...pool]
    let newSlots = [...slots] as SlotId[]
    const id = newSlots[dragData.index]
    if (id !== null) {
      newPool.push(id)
      newSlots[dragData.index] = null
    }
    setPool(newPool)
    setSlots(newSlots)
    setDragData(null)
  }

  function allowDrop(e: React.DragEvent) {
    e.preventDefault()
  }

  function removeFromSlot(slotIndex: number) {
    let newPool = [...pool]
    let newSlots = [...slots] as SlotId[]
    const id = newSlots[slotIndex]
    if (id !== null) {
      newPool.push(id)
      newSlots[slotIndex] = null
    }
    setPool(newPool)
    setSlots(newSlots)
  }

  // ====== Nuevo puntaje: deben estar en el top 3 los ids 2,3,4 (sin importar el orden) ======
  const point: 0 | 1 = useMemo(() => {
    const top3 = slots.slice(0, 3)
    const REQUIRED = [2, 3, 4]
    const hasAllRequired = REQUIRED.every(id => top3.includes(id))
    return hasAllRequired ? 1 : 0
  }, [slots])

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
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          })
          sid = id
          setSessionId(id)
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
        }
      }

      if (sid) {
        await markAnswered(sid, 2, point === 1)
        await finalizeSession(sid, { correctCount: finalTotalPts, total: 3, passMin: 2 })
      }
    } catch (e) {
      console.warn("Error al registrar/finalizar la sesión:", e)
    }

    try {
      if (user) localStorage.removeItem(sessionKeyFor(user.uid))
    } catch {}

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
      sid: sid ?? "",
      passMin: "2",
      compPath: "comp-4-3",
      retryBase: "/exercises/comp-4-3/intermedio",
      ex1Label: "Ejercicio 1: Prevención de riesgos para la salud y el bienestar en entornos digitales",
      ex2Label: "Ejercicio 2: Seleccionar formas sencillas de proteger el bienestar digital",
      ex3Label: "Ejercicio 3: Tecnologías digitales para el bienestar e inclusión social",
    })

    router.push(`/test/results?${qs.toString()}`)
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Tecnologías digitales para el bienestar e inclusión social
            </h2>

            {/* Escenario */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Una comunidad desea implementar tecnologías digitales para facilitar la participación 
                  de personas adultas con baja alfabetización digital. A continuación, se presentan cinco 
                  opciones tecnológicas.
                </p>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Su tarea es ordenarlas de mayor a menor prioridad, considerando el nivel de accesibilidad 
                  y facilidad de uso que cada opción ofrece a este grupo de usuarios.
                </p>
              </div>
            </div>

            {/* Layout DnD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pool */}
              <section
                className="bg-white border-2 border-gray-200 rounded-2xl p-4"
                onDragOver={allowDrop}
                onDrop={onDropToPool}
              >
                <h3 className="font-semibold text-gray-900 mb-3">Tecnologías disponibles</h3>
                <div className="space-y-3 min-h-[220px]">
                  {pool.map((id, idx) => {
                    const t = techById(id)
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => onDragStart("pool", idx)}
                        onDragEnd={onDragEnd}
                        className="relative cursor-grab active:cursor-grabbing bg-white p-3 rounded-2xl border-2 border-gray-200 text-sm transition-all hover:border-[#286575] hover:bg-gray-50"
                      >
                        {t.text}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Orden final */}
              <section className="bg-white border border-gray-200 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Orden de mayor a menor prioridad</h3>
                <div className="space-y-3">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      onDragOver={allowDrop}
                      onDrop={() => onDropToSlot(i)}
                      className={`rounded-xl transition relative ${
                        slot
                          ? "border-2 border-transparent bg-transparent p-0"
                          : "min-h-[56px] border-2 border-dashed border-gray-300 bg-white p-3"
                      } ${dragData ? "ring-1 ring-[#286575]/40" : ""}`}
                    >
                      {slot ? (
                        <div
                          draggable
                          onDragStart={() => onDragStart("slot", i)}
                          onDragEnd={onDragEnd}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-2 bg-white border border-blue-400 rounded-xl p-3 text-sm">
                            <button
                              onClick={() => removeFromSlot(i)}
                              className="leading-none text-gray-500 hover:text-gray-700"
                              aria-label="Quitar"
                              type="button"
                              title="Quitar"
                            >
                              ×
                            </button>
                            <span>{techById(slot).text}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Suelta aquí</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
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

/* ===== Utils ===== */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
