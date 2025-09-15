"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"

const STORAGE_KEY = "ladico:4.4:avanzado:ej2"
const COMPETENCE = "4.4" as const
const LEVEL = "avanzado" as const
const QUESTION_INDEX = 2 // Pregunta 2 de 3 (1-based)
const SESSION_KEY = "session:4.4:Avanzado"

/** Limpia el estado del SIM de P2 */
function clearSimStorage() {
  try {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

type Persisted = {
  settings?: {
    autoBrightness?: boolean
    batterySaver?: boolean
    darkMode?: boolean
    preferWifi?: boolean
    disableBackgroundRefresh?: boolean
    locationAlwaysOn?: boolean // penaliza si está activado "siempre"
  }
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : {}
  } catch {
    return {}
  }
}

export default function AdvancedEj2Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Evitar dobles creaciones en StrictMode/carreras
  const ensuringRef = useRef(false)

  // 0) Reset por CAMBIO DE USUARIO (evita arrastrar estado entre cuentas)
  useEffect(() => {
    if (typeof window === "undefined" || !user) return
    const lastUser = localStorage.getItem("ladico:lastUser")
    if (lastUser !== user.uid) {
      clearSimStorage()
      localStorage.setItem("ladico:lastUser", user.uid)
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sim:4.4:avanzado:ej2:reset:"))
        .forEach((k) => localStorage.removeItem(k))
    }
  }, [user])

  // 1) crea/recupera sesión Avanzado (4.4) POR USUARIO
  useEffect(() => {
    if (!user) return

    const cached = localStorage.getItem(SESSION_KEY + ":" + user.uid)
    if (cached) {
      setSessionId(cached)
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
        localStorage.setItem(SESSION_KEY + ":" + user.uid, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión Avanzado (P2):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid])

  // 2) Reset por SESIÓN (solo una vez por id de sesión)
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return
    const resetFlagKey = `sim:4.4:avanzado:ej2:reset:${sessionId}`
    const alreadyReset = localStorage.getItem(resetFlagKey)
    if (!alreadyReset) {
      clearSimStorage()
      localStorage.setItem(resetFlagKey, "1")
    }
  }, [sessionId])

  const progressPct = 66 // Pregunta 2 de 3

  const handleNext = useCallback(async () => {
    // 1) Leer el estado del SIM (teléfono)
    const persisted = loadPersisted()
    const s = persisted.settings || {}

    // 2) Calcular subpuntos
    // Acciones positivas: preferWifi, autoBrightness, batterySaver, darkMode, disableBackgroundRefresh
    // Penaliza si locationAlwaysOn está true
    let sub = 0
    if (s.preferWifi) sub += 1
    if (s.autoBrightness) sub += 1
    if (s.batterySaver) sub += 1
    if (s.darkMode) sub += 1
    if (s.disableBackgroundRefresh) sub += 1
    if (s.locationAlwaysOn) sub -= 1

    // Reglas: 3+ → correcto (1), si no 0
    const p2: 0 | 1 = sub >= 3 ? 1 : 0

    // 3) Guardar punto local (nivel/competencia)
    setPoint(COMPETENCE, LEVEL, QUESTION_INDEX, p2)

    // 4) Marcar P2 en testSessions (índice 0-based → 1)
    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(SESSION_KEY + ":" + user.uid) : null)

    if (sid) {
      try {
        await markAnswered(sid, QUESTION_INDEX - 1, p2 === 1)
      } catch (e) {
        console.warn("No se pudo marcar P2 como respondida:", e)
      }
    }

    // 5) Ir a P3 (no finaliza sesión aquí)
    router.push("/exercises/comp-4-4/avanzado/ej3")
  }, [router, sessionId, user?.uid])

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
                | 4.4 Protección del medioambiente - Nivel Avanzado
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

      {/* Enunciado */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/20 w-full max-w-[840px] mx-auto">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Elegir configuraciones digitales que reduzcan el impacto ambiental en el uso rutinario del teléfono
            </h2>

            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
              <p className="text-gray-700 leading-relaxed">
                Usted está configurando su teléfono móvil y quiere reducir al máximo el consumo de energía y el impacto ambiental
                sin perder acceso a las funciones esenciales.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Su tarea es navegar por las configuraciones y ajustarlas correctamente.
              </p>

              {/* Link al SIM (nueva pestaña o misma, según prefieras) */}
              <p className="text-sm mt-2">
                <Link
                  href="/exercises/comp-4-4/avanzado/ej2/sim"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Ir a configuración
                </Link>
              </p>
            </div>
            {/* Acción: Siguiente (NO finaliza; evalúa P2 y navega a P3) */}
            <div className="flex justify-end pt-2">
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
