// app/exercises/comp-4-2/avanzado/ej1/page.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint, getProgress, getPoint, levelPoints, isLevelPassed } from "@/lib/levelProgress"

// ====== Configuración ======
const STORAGE_KEY = "ladico:4.2:avanzado:ej1" // estado del SIM (correo)
const COMPETENCE = "4.2" as const
const LEVEL = "avanzado" as const
const QUESTION_INDEX = 1 // Pregunta 1 de 3 (1-based para setPoint)
const SESSION_PREFIX = "session:4.2:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// Estado esperado desde el SIM (puedes ajustar si tu SIM usa otras claves)
type PersistedSim = {
  security?: {
    changedPassword?: boolean
    enabled2FA?: boolean
    signedOutAllSessions?: boolean
    reviewedRecentActivity?: boolean
  }
}

// Helpers de SIM
function loadPersisted(): PersistedSim {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedSim) : {}
  } catch {
    return {}
  }
}

export default function Advanced42Ej1Page() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor"
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Cargar/crear sesión por-usuario (evita duplicados)
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
        console.error("No se pudo asegurar la sesión (4.2 Avanzado P1):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // Puntaje según acciones de seguridad aplicadas en el SIM
  const point: 0 | 1 = useMemo(() => {
    const p = loadPersisted()
    const s = p.security || {}
    let sub = 0
    if (s.changedPassword) sub += 1
    if (s.enabled2FA) sub += 1
    if (s.signedOutAllSessions) sub += 1
    if (s.reviewedRecentActivity) sub += 1
    // Reglas: 1 punto si realizó 3 o más acciones recomendadas
    return sub >= 3 ? 1 : 0
  }, [])

  const handleNext = useCallback(async () => {
    // Guardar punto local
    setPoint(COMPETENCE, LEVEL, QUESTION_INDEX, point)

    // Marcar P1 respondida en sesión (índice 0-based: 0)
    try {
      const sid =
        sessionId ||
        (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)
      if (sid) {
        await markAnswered(sid, QUESTION_INDEX - 1, point === 1)
      }
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e)
    }

    // (No finalizamos sesión porque es P1 de 3) → continuar a P2
    router.push("/exercises/comp-4-2/avanzado/ej2")
  }, [point, router, sessionId, user?.uid])

  // UI
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
                | 4.2 Protección de datos personales y privacidad - Nivel Avanzado
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

      {/* Enunciado */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/20 w-full max-w-[840px] mx-auto">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Título y descriptor del indicador */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Elegir las formas más adecuadas de proteger datos personales y privacidad
              </h2>
            </div>

            {/* Contexto / Instrucciones */}
            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
              <p className="text-gray-700 leading-relaxed">
                Han adivinado tu contraseña y no has recibido ninguna alerta de seguridad.
                Actúa sobre las configuraciones de tu cuenta para proteger tu privacidad.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Ingresa al entorno simulado de correo y aplica medidas de seguridad en tu cuenta (por ejemplo:
                cambiar la contraseña, habilitar la verificación en dos pasos, cerrar sesiones activas y revisar
                actividad reciente).
              </p>
              <p className="text-sm">
                <Link
                  href="/exercises/comp-4-2/avanzado/ej1/sim"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Ir a correo
                </Link>
              </p>
            </div>

            {/* Acción */}
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
