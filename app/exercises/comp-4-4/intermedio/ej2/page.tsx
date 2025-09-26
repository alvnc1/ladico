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
// (Opcional) Si tienes lucide-react instalado, puedes usar íconos reales.
// import { Wifi, Signal, Plane, Sun, Moon, Battery, Bluetooth, MapPin } from "lucide-react"

const COMPETENCE = "4.4" as const
const LEVEL = "intermedio" as const
const SESSION_PREFIX = "session:4.4:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

type Tile = {
  id: number
  key: string
  label: string
  // Usa emoji para universalidad (puedes cambiar por <Icon /> si prefieres lucide-react)
  emoji: string
}

// 8 controles del panel rápido
const TILES: Tile[] = [
  { id: 1, key: "wifi",           label: "Wi-Fi",               emoji: "📶" },
  { id: 2, key: "mobileData",     label: "Datos móviles",       emoji: "📡" },
  { id: 3, key: "airplane",       label: "Modo avión",          emoji: "✈️" },
  { id: 4, key: "autoBrightness", label: "Brillo automático",   emoji: "🔆" },
  { id: 5, key: "bluetooth",      label: "Bluetooth",           emoji: "🅱️" },
  { id: 6, key: "location",       label: "Localización (GPS)",  emoji: "📍" },
  { id: 7, key: "batterySaver",   label: "Ahorro de batería",   emoji: "🔋" },
  { id: 8, key: "darkMode",       label: "Modo oscuro",         emoji: "🌙" },
] as const

// Selección correcta (exacta): activar SOLO estos
const CORRECT_SET = new Set<number>([3, 4, 6, 7, 8])

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  // ====== Sesión Firestore ======
// ...
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // 1) Cargar sesión cacheada por-usuario
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar/crear sesión si no hay cache
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
        console.error("No se pudo asegurar la sesión de test (P2):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ====== Estado de selección ======
  // ids activados por el usuario
  const [active, setActive] = useState<Set<number>>(() => new Set())

  const toggleTile = (id: number) => {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ====== Puntaje (selección exacta) ======
  const point: 0 | 1 = useMemo(() => {
    if (active.size !== CORRECT_SET.size) return 0
    for (const id of CORRECT_SET) if (!active.has(id)) return 0
    return 1
  }, [active])

  // ====== Finalizar ======
  const handleFinish = async () => {
    const isTeacher = userData?.role === "profesor"

    // Guardar punto de la P2
    setPoint(COMPETENCE, LEVEL, 2, point)

    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog)
    const passed = isLevelPassed(prog)
    const score = Math.round((totalPts / 3) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    // Profesor: forzar “aprobado”
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
              level: "Intermedio",
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
          await markAnswered(sid, 1, point === 1) // P2 = index 1
        } catch (e) {
          console.warn("No se pudo registrar P2:", e)
        }
        try {
          await finalizeSession(sid, { correctCount: finalTotalPts, total: 3, passMin: 2 })
        } catch (e) {
          console.warn("No se pudo finalizar la sesión en P2:", e)
        }
      }
    } catch (e) {
      console.warn("Error al finalizar P2:", e)
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
    })
    if (sid) qs.set("sid", sid)
    router.push(`/exercises/comp-4-4/intermedio/ej3`)
  }

  const progressPct = 66

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
                | 4.4 Protección medioambiental - Nivel Intermedio
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
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
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
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Indicar configuraciones digitales rutinarias que reducen el consumo energético de un dispositivo móvil
            </h2>

            {/* Escenario */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  En el menú de configuración rápida de un teléfono móvil aparecen iconos que permiten activar o desactivar
                  distintas funciones. 
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Selecciona todas las configuraciones que ayudan a reducir el consumo energético. 
                </p>
              </div>
            </div>
            {/* Panel rápido estilo iPhone */}
            <div className="bg-[#f6f7f9] border border-gray-300 rounded-2xl p-4">
              {/* Barra de estado */}
              <div className="flex items-center justify-between text-gray-600 text-xs mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">9:41</span>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">Centro de control</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📶</span>
                  <span>📍</span>
                  <span>🛜</span>
                  <span>🔋 82%</span>
                </div>
              </div>

              {/* Grid de controles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TILES.map(tile => {
                  const selected = active.has(tile.id)
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => toggleTile(tile.id)}
                      className={`relative rounded-2xl p-4 text-center border transition
                        ${selected ? "bg-[#e6f4f4] border-[#286575]" : "bg-white border-gray-300 hover:border-gray-400"}`}
                      aria-pressed={selected}
                    >
                      {/* círculo de selección arriba-derecha */}
                      <span
                        className={`absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full border
                          ${selected ? "bg-[#286575] border-[#286575] text-white" : "bg-white border-gray-300 text-transparent"}`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <div className="text-3xl mb-2">{tile.emoji}</div>
                      <div className="text-xs font-medium text-gray-800 leading-tight">{tile.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex items-center justify-end">
              <Button
                onClick={handleFinish}
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
