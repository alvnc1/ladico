// app/exercises/comp-4-1/intermedio/ej2/page.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"

// ===== Config =====
const COMPETENCE = "4.1"
const LEVEL = "intermedio"
const SESSION_PREFIX = "session:4.1:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// Valores normalizados (internos)
type Threat = "smishing" | "phishing" | "malware" | "virus"

// Etiquetas visibles tal como pediste
const OPTIONS: { value: Threat; label: string }[] = [
  { value: "smishing", label: "smishing" },
  { value: "phishing", label: "pishing" },
  { value: "malware", label: "malware" },
  { value: "virus", label: "virus" },
]

// Correcta para esta imagen (SMS falso Netflix)
const CORRECT: Threat = "smishing"

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Estado del select
  const [answer, setAnswer] = useState<Threat | "">("")

  const isCorrect = useMemo(() => answer === CORRECT, [answer])

  // Carga/asegura sesión
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const LS_KEY = sessionKeyFor(user.uid)
    const sid = localStorage.getItem(LS_KEY)
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
          level: "Intermedio",
          totalQuestions: 3,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión:", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // Envío
  const handleNext = async () => {
    const point: 0 | 1 = isCorrect ? 1 : 0
    setPoint(COMPETENCE, LEVEL, 2, point)

    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        await markAnswered(sid, 1, point === 1) // P2 → índice 1
      } catch (e) {
        console.warn("No se pudo marcar la respuesta:", e)
      }
    }
    router.push("/exercises/comp-4-1/intermedio/ej3")
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
            Pregunta 2 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
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
              Identificación de amenazas digitales
            </h2>
           {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700">
                  Observa la imagen y selecciona la categoría de amenaza que lo describe mejor.
                </p>
              </div>
            </div>
            {/* Imagen pequeña sin recuadro */}
            <div className="w-full flex justify-center mb-4">
              <Image
                src="/Smishing.jpg" // en /public
                alt="SMS fraudulento de Netflix"
                width={360}
                height={270}
                className="object-contain"
                priority
              />
            </div>

            {/* Recuadro solo para el dropdown */}
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
              
              <select
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                value={answer}
                onChange={(e) => setAnswer(e.target.value as Threat)}
              >
                <option value="">Selecciona una opción…</option>
                {OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer */}
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
