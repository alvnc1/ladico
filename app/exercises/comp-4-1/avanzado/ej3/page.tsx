// app/exercises/comp-4-1/avanzado/ej3/page.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import {
  setPoint,
  getProgress,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress"

// ===== Config =====
const COMPETENCE = "4.1" as const
const LEVEL = "avanzado" as const
const LEVEL_FS = "Avanzado" as const
const TOTAL_QUESTIONS = 3
const QUESTION_NUM = 3 // P3 de 3 (1-based en setPoint)
const Q_ZERO_BASED = 2  // índice 0-based para Firestore
const SESSION_PREFIX = "session:4.1:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// Opciones para los selects
type Method = "A" | "B"
const METHOD_OPTIONS: { value: Method; label: string }[] = [
  { value: "A", label: "Método A – Cifrado completo del disco duro" },
  { value: "B", label: "Método B – Nube con cifrado de extremo a extremo" },
]

// Respuestas esperadas (ajustadas a A/B)
const EXPECT = {
  reliability: "B" as Method, // Fiabilidad -> Nube E2E
  privacy: "A" as Method,     // Privacidad -> Cifrado de disco
}

// Justificación (1 correcta + 2 distractores)
type JustKey = "ok" | "same" | "none" | ""
const JUST_TEXT: Record<Exclude<JustKey, "">, string> = {
  ok:   "Cada método fortalece un aspecto distinto: uno asegura la fiabilidad con la continuidad del acceso a los datos y el otro asegura la privacidad con la protección frente a accesos no autorizados.",
  same: "Ambos métodos ofrecen el mismo nivel de protección sin diferencias relevantes.",
  none: "Ninguno de los métodos contribuye realmente a la fiabilidad ni a la privacidad.",
}

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  // ===== Sesión =====
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

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
          level: LEVEL_FS,
          totalQuestions: TOTAL_QUESTIONS,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión (4.1 Avanzado P3):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ===== Estados de respuesta =====
  const [reliability, setReliability] = useState<Method | "">("")
  const [privacy, setPrivacy] = useState<Method | "">("")
  const [justKey, setJustKey] = useState<JustKey>("")

  // ===== Puntaje =====
  const subpoints = useMemo(() => {
    let s = 0
    if (reliability && reliability === EXPECT.reliability) s += 1
    if (privacy && privacy === EXPECT.privacy) s += 1
    if (justKey === "ok") s += 1
    return s
  }, [reliability, privacy, justKey])

  // punto final (≥2 subpuntos)
  const point: 0 | 1 = subpoints >= 2 ? 1 : 0

  // ===== Finalizar y enviar a resultados =====
  const handleFinish = async () => {
    // Guardar puntaje local de la P3
    setPoint(COMPETENCE, LEVEL, QUESTION_NUM, point)

    // Calcular progreso y score
    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog)
    const levelPassed = isLevelPassed(prog)
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    // Modo profesor: override de resultados para pasar el nivel
    const isTeacher = userData?.role === "profesor"
    const finalTotalPts = isTeacher ? TOTAL_QUESTIONS : totalPts
    const finalPassed = isTeacher ? true : levelPassed
    const finalScore = isTeacher ? 100 : score

    // Marcar P3 (índice 2) en Firestore
    let sid = sessionId
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
        if (cached) {
          sid = cached
          setSessionId(cached)
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: LEVEL_FS,
            totalQuestions: TOTAL_QUESTIONS,
          })
          sid = id
          setSessionId(id)
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
        }
      }
      if (sid) {
        await markAnswered(sid, Q_ZERO_BASED, point === 1)
      }
    } catch (e) {
      console.warn("No se pudo marcar P3 respondida:", e)
    }

    // Ir a /test/results con parámetros
    const qs = new URLSearchParams({
      score: String(finalScore),
      passed: String(finalPassed),
      correct: String(finalTotalPts),
      total: String(TOTAL_QUESTIONS),
      competence: COMPETENCE,
      level: LEVEL,
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      sid: sid ?? "",
      passMin: "2", // regla de aprobación
      compPath: "comp-4-1",
      retryBase: "/exercises/comp-4-1/avanzado",
      ex1Label: "Ejercicio 1: Evaluación de riesgos en dispositivos",
      ex2Label: "Ejercicio 2: Políticas y configuraciones avanzadas",
      ex3Label: "Ejercicio 3: Comparación de métodos de almacenamiento",
    })

    router.push(`/test/results?${qs.toString()}`)
  }

  const progressPct = 100 // P3 de 3

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
        <Card className="bg-white shadow-2xl sm:rounded-3xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Comparación de métodos de almacenamiento seguro
            </h2>

            {/* Contexto */}
            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
              <p className="text-gray-700 leading-relaxed">
                Tu organización debe decidir cómo almacenar información sensible de clientes en los dispositivos
                de trabajo. Se presentan dos métodos y debes evaluarlos considerando fiabilidad y privacidad.
              </p>
            </div>

            {/* Métodos (A y B) */}
            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-2">Método A — Cifrado completo del disco duro</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>Todos los datos se procesan con un sistema de cifrado aplicado al disco.</li>
                  <li>El acceso depende de claves criptográficas configuradas en el arranque.</li>
                  <li>Puede generar un impacto leve en el rendimiento del sistema.</li>
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-2">Método B — Nube con cifrado de extremo a extremo</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>Los archivos se cifran antes de salir del dispositivo.</li>
                  <li>El almacenamiento se distribuye en servidores remotos.</li>
                  <li>La sincronización se realiza automáticamente cuando hay conexión a internet.</li>
                </ul>
              </div>
            </div>

            {/* Selecciones: Fiabilidad y Privacidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] transition-colors">
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  ¿Cuál método ofrece mejor <span className="font-semibold">fiabilidad</span>?
                </label>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={reliability}
                  onChange={(e) => setReliability(e.target.value as Method)}
                >
                  <option value="">Selecciona un método…</option>
                  {METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] transition-colors">
                <label className="block text-sm text-gray-700 mb-2 font-medium">
                  ¿Cuál método ofrece mejor <span className="font-semibold">privacidad</span>?
                </label>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as Method)}
                >
                  <option value="">Selecciona un método…</option>
                  {METHOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Justificación final */}
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] transition-colors">
              <h3 className="font-semibold text-gray-900 mb-3">Justificación de tu elección</h3>
              <fieldset className="space-y-3">
                {(["ok", "same", "none"] as Exclude<JustKey, "">[]).map((k) => (
                  <label key={k} className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="just"
                      value={k}
                      checked={justKey === k}
                      onChange={() => setJustKey(k)}
                      className="mt-1 accent-[#2e6372]"
                    />
                    <span className="text-sm text-gray-800">{JUST_TEXT[k]}</span>
                  </label>
                ))}
              </fieldset>
            </div>

            {/* Acciones */}
            <div className="flex justify-end pt-2">
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
