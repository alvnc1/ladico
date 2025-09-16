// app/exercises/comp-4-1/intermedio/ej2/page.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
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

type Threat =
  | "phishing"
  | "malware"
  | "estafa-viral"
  | "falsa-actualizacion"
  | "suplantacion"

const OPTIONS: { value: Threat; label: string }[] = [
  { value: "phishing", label: "Phishing" },
  { value: "malware", label: "Malware" },
  { value: "estafa-viral", label: "Estafa viral" },
  { value: "falsa-actualizacion", label: "Falsa actualización" },
  { value: "suplantacion", label: "Suplantación de identidad" },
]

const CORRECT = {
  s1: "phishing",
  s2: "malware",
  s3: "estafa-viral",
  s4: "falsa-actualizacion",
  s5: "suplantacion",
} as const

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Estado de selects
  const [s1, setS1] = useState<Threat | "">("")
  const [s2, setS2] = useState<Threat | "">("")
  const [s3, setS3] = useState<Threat | "">("")
  const [s4, setS4] = useState<Threat | "">("")
  const [s5, setS5] = useState<Threat | "">("")

  const correctCount = useMemo(() => {
    let ok = 0
    if (s1 && s1 === CORRECT.s1) ok++
    if (s2 && s2 === CORRECT.s2) ok++
    if (s3 && s3 === CORRECT.s3) ok++
    if (s4 && s4 === CORRECT.s4) ok++
    if (s5 && s5 === CORRECT.s5) ok++
    return ok
  }, [s1, s2, s3, s4, s5])

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
    const point: 0 | 1 = correctCount >= 3 ? 1 : 0
    // P2 → guarda en índice visible 2
    setPoint(COMPETENCE, LEVEL, 2, point)

    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        // P2 → índice 0-based = 1
        await markAnswered(sid, 1, point === 1)
      } catch (e) {
        console.warn("No se pudo marcar la respuesta:", e)
      }
    }
    // navega a la P3 del mismo bloque
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
                  Lee cada escenario y selecciona en el desplegable la categoría de amenaza que lo describe mejor.
                </p>
              </div>
            </div>

            {/* Escenarios con hover consistente */}
            <div className="space-y-4">
              <Scenario
                emoji=""
                text="Correo de un banco pidiendo tu contraseña con un enlace sospechoso."
                value={s1}
                onChange={setS1}
                options={OPTIONS}
              />
              <Scenario
                emoji=""
                text="Aplicación gratuita que solicita acceso a ubicación y contactos."
                value={s2}
                onChange={setS2}
                options={OPTIONS}
              />
              <Scenario
                emoji=""
                text="Mensaje de WhatsApp: “Gana un iPhone si reenvías este mensaje”."
                value={s3}
                onChange={setS3}
                options={OPTIONS}
              />
              <Scenario
                emoji=""
                text="Instalador que aparenta ser una actualización de Adobe Flash Player."
                value={s4}
                onChange={setS4}
                options={OPTIONS}
              />
              <Scenario
                emoji=""
                text="Perfil en redes sociales creado con fotos robadas de otra persona."
                value={s5}
                onChange={setS5}
                options={OPTIONS}
              />
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

/* ====== UI pieces ====== */
function Scenario({
  emoji,
  text,
  value,
  onChange,
  options,
}: {
  emoji: string
  text: string
  value: Threat | ""
  onChange: (v: Threat | "") => void
  options: { value: Threat; label: string }[]
}) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
      <div className="text-sm text-gray-800 mb-2">
        <span className="mr-2">{emoji}</span>
        {text}
      </div>
      <select
        className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
        value={value}
        onChange={(e) => onChange(e.target.value as Threat)}
      >
        <option value="">Selecciona una categoría…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
