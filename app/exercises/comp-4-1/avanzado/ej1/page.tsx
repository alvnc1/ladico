// app/exercises/comp-4-1/avanzado/ej1/page.tsx
"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

// 👉 Carga de datos (base + variantes) desde JSON
import exerciseData from "@/app/exercises/comp-4-1/avanzado/ej1/ej1.json"

// ================= Configuración general =================
const COMPETENCE = "4.1" as const
const LEVEL = "avanzado" as const

// Clave de sesión única por usuario/ejercicio (no se mezcla con otros)
const SESSION_PREFIX = "session:4.1:Avanzado:P1_Prioritize"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ===== Tipos del JSON =====
type Audience = "school" | "university" | "work"
type Measure = { id: number; text: string }

type ExerciseJSON = {
  id: string
  baseVersion: string
  correctOrderIds: number[]
  base: { title: string; stem: string; measures: Measure[] }
  variants?: Partial<Record<Audience, { stem?: string; measures?: Measure[] }>>
}

const EXERCISE = exerciseData as ExerciseJSON

// ===== Helpers de variantes =====
function audienceFromAge(age?: number): Audience {
  if (age == null) return "work"
  if (age < 18) return "school"
  if (age <= 25) return "university"
  return "work"
}

/**
 * Mezcla base + variante por ID:
 * - Mantiene SIEMPRE las 5 medidas base (IDs 1..5).
 * - Si la variante trae overrides, reemplaza SOLO el texto de los IDs indicados.
 * - El orden inicial en la UI es SIEMPRE el orden de los IDs base (1..5),
 *   NO el orden correcto de evaluación, para no hacerlo obvio.
 */
function applyVariant(
  base: ExerciseJSON["base"],
  variants: ExerciseJSON["variants"],
  audience: Audience
) {
  const v = variants?.[audience]
  if (!v) return base

  const overrideMap = new Map((v.measures ?? []).map(m => [m.id, m.text]))
  const measures = base.measures.map(m => ({
    ...m,
    text: overrideMap.get(m.id) ?? m.text,
  }))
  return {
    title: base.title,
    stem: v.stem ?? base.stem,
    measures,
  }
}

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth() // usamos edad del perfil si existe

  // Derivar audiencia desde la edad del usuario (fallback: work)
  const audience = useMemo(() => audienceFromAge((userData as any)?.age), [userData])

  // Tomar base + aplicar variante (si existe)
  const selected = useMemo(
    () => applyVariant(EXERCISE.base, EXERCISE.variants, audience),
    [audience]
  )

  // Orden correcto (por IDs) — NO es 0..1..2..3..4
  const CORRECT_ORDER_IDS = EXERCISE.correctOrderIds

  // ============== Sesión Firestore aislada ==============
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // 1) Cargar sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar/crear sesión por usuario si no hay cache
  useEffect(() => {
    if (!user) {
      setSessionId(null)
      return
    }
    const LS_KEY = sessionKeyFor(user.uid)
    const cached =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
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
        console.error("No se pudo asegurar la sesión (P1 Avanzado):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ============== Estado: drag & drop ==============
  // Pool inicial: SIEMPRE en el orden de los IDs base (1..5) para no revelar la solución
  const [pool, setPool] = useState<number[]>(selected.measures.map(m => m.id))
  const [slots, setSlots] = useState<Array<number | null>>(
    Array(selected.measures.length).fill(null)
  )

  // Si cambia la audiencia (edad llegó más tarde), reinicializamos
  useEffect(() => {
    setPool(selected.measures.map(m => m.id))
    setSlots(Array(selected.measures.length).fill(null))
  }, [selected])

  const measureById = (id: number) =>
    selected.measures.find(m => m.id === id) as Measure

  const [dragData, setDragData] = useState<{
    from: "pool" | "slot"
    index: number
  } | null>(null)
  function onDragStart(from: "pool" | "slot", index: number) {
    setDragData({ from, index })
  }
  function onDragEnd() {
    setDragData(null)
  }
  function allowDrop(e: React.DragEvent) {
    e.preventDefault()
  }

  function onDropToSlot(slotIndex: number) {
    if (!dragData) return
    let newPool = [...pool]
    let newSlots = [...slots]

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
    let newSlots = [...slots]
    const id = newSlots[dragData.index]
    if (id !== null) {
      newPool.push(id)
      newSlots[dragData.index] = null
    }
    setPool(newPool)
    setSlots(newSlots)
    setDragData(null)
  }

  function removeFromSlot(slotIndex: number) {
    let newPool = [...pool]
    let newSlots = [...slots]
    const id = newSlots[slotIndex]
    if (id !== null) {
      newPool.push(id)
      newSlots[slotIndex] = null
    }
    setPool(newPool)
    setSlots(newSlots)
  }

  // ============== Justificación (radio) ==============
  type JustKey = "correcta" | "distractor1" | "distractor2" | ""
  const [justificacion, setJustificacion] = useState<JustKey>("")

  const JUST_OPTIONS: Record<JustKey, string> = {
    correcta:
      "La prioridad debe estar en acciones inmediatas que corrigen vulnerabilidades ya explotadas.",
    distractor1:
      "Activar el cifrado completo del disco es lo primero porque asegura que los datos siempre estén protegidos.",
    distractor2:
      "Las auditorías de seguridad deberían ser el primer paso para detectar fallos antes de aplicar cualquier otra medida.",
    "": "",
  }

  // ============== Evaluación ==============
  const orderCorrect = useMemo(() => {
    const filled = slots.every(s => s !== null)
    if (!filled) return false
    for (let i = 0; i < CORRECT_ORDER_IDS.length; i++) {
      if (slots[i] !== CORRECT_ORDER_IDS[i]) return false
    }
    return true
  }, [slots, CORRECT_ORDER_IDS])

  const justificationCorrect = justificacion === "correcta"
  const point: 0 | 1 = orderCorrect && justificationCorrect ? 1 : 0

  // ============== Continuar ==============
  const handleNext = async () => {
    setPoint(COMPETENCE, LEVEL, 1, point)
    try {
      const LS_KEY = user ? sessionKeyFor(user.uid) : null
      let sid =
        sessionId ||
        (LS_KEY && typeof window !== "undefined"
          ? localStorage.getItem(LS_KEY)
          : null)

      if (!sid && user && !ensuringRef.current) {
        ensuringRef.current = true
        try {
          const created = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Avanzado",
            totalQuestions: 3,
          })
          sid = created.id
          setSessionId(created.id)
          if (typeof window !== "undefined")
            localStorage.setItem(LS_KEY!, created.id)
        } finally {
          ensuringRef.current = false
        }
      }

      if (sid) await markAnswered(sid, 0, point === 1)
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e)
    }
    router.push("/exercises/comp-4-1/avanzado/ej2")
  }

  const progressPct = (1 / 3) * 100 // Pregunta 1 de 3

  // ======================= UI =======================
  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
                | 4.1 Protección de dispositivos — Nivel Avanzado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
<div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
  <div className="flex items-center justify-between text-white mb-4">
    <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
      Pregunta 1 de 3
    </span>
    <div className="flex space-x-2">
      <div className="w-3 h-3 rounded-full bg-[#286575]" />
      <div className="w-3 h-3 rounded-full bg-[#dde3e8]" />
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
        <Card className="bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              {selected.title}
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">{selected.stem}</p>
              </div>
            </div>

            {/* Layout DnD — dos recuadros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pool (orden inicial = IDs base) */}
              <section
                className="bg-white border-2 border-gray-200 rounded-2xl p-4"
                onDragOver={allowDrop}
                onDrop={onDropToPool}
                aria-label="Medidas disponibles"
              >
                <h3 className="font-semibold text-gray-900 mb-3">
                  Medidas disponibles
                </h3>
                <div className="space-y-3 min-h-[220px]">
                  {pool.map((id, idx) => {
                    const m = measureById(id)
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => onDragStart("pool", idx)}
                        onDragEnd={onDragEnd}
                        className="cursor-grab active:cursor-grabbing bg-white p-3 rounded-2xl border-2 border-gray-200 text-sm transition-all duration-200 hover:border-[#286575] hover:bg-gray-50"
                        role="button"
                        tabIndex={0}
                      >
                        {m.text}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Orden final */}
              <section className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Orden de mayor a menor prioridad
                </h3>
                <div className="space-y-3">
                  {slots.map((slot, i) => {
                    const isFilled = !!slot
                    return (
                      <div
                        key={i}
                        onDragOver={allowDrop}
                        onDrop={() => onDropToSlot(i)}
                        className={`rounded-xl transition relative ${
                          isFilled
                            ? "border-2 border-transparent bg-transparent p-0 min-h-0"
                            : "min-h-[56px] border-2 border-dashed border-gray-300 bg-white p-3"
                        }`}
                        aria-label={`Caja destino ${i + 1}`}
                      >
                        {isFilled ? (
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
                              <span>{measureById(slot!).text}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Suelta aquí</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Estado del orden — sin spoiler */}
                <div className="mt-4" />
              </section>
            </div>

            {/* Justificación final (dropdown) */}
            <div className="mt-8">
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#1f6b74] hover:bg-gray-50 transition-colors shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Justifica tu elección de orden
                </h3>
                <select
                  id="justificacion"
                  className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f6b74]"
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value as "correcta" | "distractor1" | "distractor2" | "")}
                >
                  <option value="" disabled>Elige una opción…</option>
                  <option value="correcta">{JUST_OPTIONS.correcta}</option>
                  <option value="distractor1">{JUST_OPTIONS.distractor1}</option>
                  <option value="distractor2">{JUST_OPTIONS.distractor2}</option>
                </select>
              </div>
              <div className="mt-3" />
            </div>


            {/* Acciones */}
            <div className="mt-8 flex items-center justify-end">
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
