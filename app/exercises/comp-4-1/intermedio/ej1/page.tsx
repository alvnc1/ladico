// app/exercises/comp-4-1/intermedio/ej1/page.tsx
"use client"

import { useMemo, useState, useEffect, useRef} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  setPoint,
} from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

const COMPETENCE = "4.1" as const
const LEVEL = "intermedio" as const
// Clave de sesión por-usuario (aislada para este ejercicio)
const SESSION_PREFIX = "session:4.1:Intermedio:P1_Order"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ============ Pasos/tecnologías (mostrar EXACTAMENTE en este orden inicial) ============
const TECHNOLOGIES = [
  { id: 1, text: "Instalar un programa antimalware complementario desde una fuente confiable." },
  { id: 2, text: "Activar el firewall del sistema operativo para bloquear conexiones no autorizadas." },
  { id: 3, text: "Descargar un antivirus reconocido desde su sitio oficial." },
  { id: 4, text: "Verificar que el sistema operativo esté actualizado mediante las herramientas oficiales." },
  { id: 5, text: "Instalar y activar el antivirus, configurando las actualizaciones automáticas." },
] as const

/**
 * Orden correcto (por ID) para la instalación y activación adecuada:
 * 1) Verificar SO actualizado         -> id 4
 * 2) Activar firewall                  -> id 2
 * 3) Descargar antivirus (sitio oficial)-> id 3
 * 4) Instalar y activar antivirus      -> id 5
 * 5) Instalar antimalware complementario-> id 1
 */
const CORRECT_ORDER: ReadonlyArray<number> = [4, 2, 3, 5, 1]

type Tech = typeof TECHNOLOGIES[number]
type SlotId = number | null

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // ====== Sesión Firestore (única y aislada) ======
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false) // evita dobles llamados

  // 1) Cargar sesión cacheada por-usuario
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar/crear sesión por-usuario si no hay cache
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
        console.error("No se pudo asegurar la sesión de test (P1_Order 4.1):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ====== Estado Drag & Drop ======
  // Pool inicial: EXACTAMENTE en el orden solicitado (sin barajar)
  const [pool, setPool] = useState<number[]>(TECHNOLOGIES.map(t => t.id))
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

    // Calcular nueva foto de pool/slots de forma atómica
    let newPool = [...pool]
    let newSlots = [...slots] as SlotId[]

    if (dragData.from === "pool") {
      const id = pool[dragData.index]
      if (id == null) return
      const target = newSlots[slotIndex]
      // 1) quitar del pool por índice original
      newPool.splice(dragData.index, 1)
      // 2) si había algo en el slot, devolverlo al pool
      if (target !== null) newPool.push(target)
      // 3) colocar en slot
      newSlots[slotIndex] = id
    } else {
      // mover entre slots (intercambio)
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

  // Quitar un item del slot con “×”
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

  // ====== Puntaje: coincidencia exacta del orden ======
  const point: 0 | 1 = useMemo(() => {
    const filled = slots.every(s => s !== null)
    if (!filled) return 0
    for (let i = 0; i < CORRECT_ORDER.length; i++) {
      if (slots[i] !== CORRECT_ORDER[i]) return 0
    }
    return 1
  }, [slots])

  // ====== Continuar ======
  const handleNext = async () => {
    // Guardar punto local (P1)
    setPoint(COMPETENCE, LEVEL, 1, point)

    // Registrar respuesta en sesión (índice 0 = P1)
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
            level: "Intermedio",
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

      if (sid) {
        await markAnswered(sid, 0, point === 1) // índice 0 = P1
      }
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e)
    }

    router.push("/exercises/comp-4-1/intermedio/ej2")
  }

  const progressPct = (1 / 3) * 100 // Pregunta 1 de 3

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
                | 4.1 Protección de dispositivos - Nivel Intermedio
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
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Organizar formas de proteger mis dispositivos y contenidos digitales
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Has adquirido un computador nuevo, con el sistema operativo
                  recién instalado y sin ninguna medida de protección activa. Para protegerlo
                  contra virus, malware y accesos no autorizados, dispones de diferentes opciones
                  de configuración y software.
                </p>
                <p className="text-gray-700 leading-relaxed font-medium">
                  Organiza los pasos según el nivel de prioridad: primero los más vitales para 
                  la seguridad inmediata del computador, y luego los complementarios.
                </p>
              </div>
            </div>

            {/* Layout DnD — dos recuadros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pool (lista inicial en el ORDEN solicitado) */}
              <section
                className="bg-white border-2 border-gray-200 rounded-2xl p-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropToPool}
                aria-label="Pasos disponibles para arrastrar"
              >
                <h3 className="font-semibold text-gray-900 mb-3">Pasos disponibles</h3>
                <div className="space-y-3 min-h-[220px]">
                  {pool.map((id, idx) => {
                    const t = techById(id)
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => onDragStart("pool", idx)}
                        onDragEnd={onDragEnd}
                        className="relative cursor-grab active:cursor-grabbing bg-white p-3 rounded-2xl border-2 border-gray-200 text-sm transition-all duration-200 hover:border-[#286575] hover:bg-gray-50"
                        role="button"
                        tabIndex={0}
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
                  {slots.map((slot, i) => {
                    const isFilled = !!slot
                    return (
                      <div
                        key={i}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropToSlot(i)}
                        className={`rounded-xl transition relative
                          ${
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
                              <span>{techById(slot!).text}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Suelta aquí</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
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
