// app/exercises/comp-4-2/intermedio/ej3/page.tsx
"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  setPoint,
  getProgress,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress"

import { useEffect, useMemo, useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { useRouter } from "next/navigation"

// ====== Configuración del ejercicio (4.2 Intermedio • P3) ======
const COMPETENCE = "4.2" as const
const LEVEL = "intermedio" as const
const LEVEL_FS = "Intermedio" as const
const TOTAL_QUESTIONS = 3
const Q_ONE_BASED = 3       // P3 -> setPoint
const Q_ZERO_BASED = 2      // P3 -> markAnswered

/** Clave de sesión por-usuario para evitar duplicados */
const SESSION_PREFIX = "session:4.2:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// Afirmaciones (en el orden solicitado)
const OPTIONS = [
  {
    key: "A",
    text: "El usuario puede decidir si sus resultados de evaluación son visibles para otros compañeros.",
    correct: false, // distractor (no se deduce)
  },
  {
    key: "B",
    text: "Los datos se eliminan si el usuario elimina su cuenta.",
    correct: false, // distractor (no se deduce)
  },
  {
    key: "C",
    text: "La plataforma recopila información personal como nombre, correo institucional y nivel educativo.",
    correct: true,
  },
  {
    key: "D",
    text: "Los resultados de evaluaciones se utilizan para personalizar la experiencia del usuario.",
    correct: true,
  },
  {
    key: "E",
    text: "La plataforma comparte datos agregados y anónimos con instituciones asociadas para fines de investigación.",
    correct: true,
  },
] as const

type Key = typeof OPTIONS[number]["key"]

// Extracto (ficticio de Ladico)
const EXCERPT = `“La plataforma recopila datos personales como el nombre completo, dirección de correo electrónico institucional, país de residencia y nivel educativo para gestionar el acceso a sus servicios. Además, se almacenan métricas de uso de la plataforma, como resultados de evaluaciones y progreso en las competencias, con el fin de personalizar la experiencia y generar reportes académicos.
La plataforma puede compartir información agregada y anonimizada con instituciones asociadas para fines de investigación educativa y mejora de los servicios. No comercializamos con datos personales ni los transferimos a terceros ajenos a la relación educativa.
El usuario puede revisar, actualizar o eliminar parte de su información desde la configuración de su cuenta y ejercer sus derechos de protección de datos a través de los canales de contacto habilitados.”`

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  // Sesión Firestore
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // === Estado con Set (igual que el ejercicio de referencia) ===
  const [selected, setSelected] = useState<Set<Key>>(new Set())

  const toggle = (k: Key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // Puntaje: 1 solo si C, D, E exactamente; 0 en cualquier otro caso
  const point: 0 | 1 = useMemo(() => {
    const chosen = Array.from(selected)
    const correctSet = new Set<Key>(["C", "D", "E"])
    if (chosen.length !== correctSet.size) return 0
    for (const c of chosen) if (!correctSet.has(c)) return 0
    return 1
  }, [selected])

  // 1) Carga sesión cacheada (si existe) apenas conocemos el uid
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const LS_KEY = sessionKeyFor(user.uid)
    const sid = localStorage.getItem(LS_KEY)
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Crea/asegura sesión UNA VEZ por usuario (evita duplicados)
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
          level: LEVEL_FS,
          totalQuestions: TOTAL_QUESTIONS,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test:", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // Finalizar → guardar, marcar en FS y enviar a /test/results
  const handleFinish = async () => {
    // Guardar puntaje local de la P3
    setPoint(COMPETENCE, LEVEL, Q_ONE_BASED, point)

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
            level: LEVEL_FS,
            totalQuestions: TOTAL_QUESTIONS,
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
        await markAnswered(sid, Q_ZERO_BASED, point === 1)
      }

      // Armar querystring para /test/results
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
        passMin: "2", // regla: aprobar con 2/3
        compPath: "comp-4-2",
        retryBase: "/exercises/comp-4-2/intermedio",
        ex1Label: "Ejercicio 1: Fundamentos de datos personales",
        ex2Label: "Ejercicio 2: Configuraciones y permisos",
        ex3Label: "Ejercicio 3: Comprensión de políticas de privacidad",
      })

      router.push(`/test/results?${qs.toString()}`)
    } catch (e) {
      console.warn("No se pudo marcar P3 respondida o navegar a resultados:", e)
      // Fallback suave (no ideal, pero evita bloqueo)
      router.push("/dashboard")
    }
  }

  const progressPct = 100 // Pregunta 3 de 3

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
                | 4.2 Protección de datos personales y privacidad - Nivel Intermedio
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Comprensión de políticas de privacidad
            </h2>

            {/* Contexto (más específico) */}
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Lee el siguiente extracto de la política de privacidad de una suscripción en línea
                  y selecciona todas las afirmaciones correctas.
                </p>
              </div>
            </div>

            {/* Extracto */}
            <div className="mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-base text-gray-700 whitespace-pre-line">
                  {EXCERPT}
                </div>
              </div>
            </div>

            {/* Afirmaciones — mismo look & feel del ejercicio de referencia */}
            <div className="space-y-3 sm:space-y-4">
              {OPTIONS.map((opt) => {
                const active = selected.has(opt.key)
                return (
                  <label
                    key={opt.key}
                    className={`flex items-start space-x-3 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      active
                        ? "border-[#286575] bg-[#e6f2f3] shadow-md"
                        : "border-gray-200 hover:border-[#286575] hover:bg-gray-50"
                    }`}
                    onClick={() => toggle(opt.key)}
                  >
                    {/* Checkbox oculto + recuadro con check (igual al patrón) */}
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={active}
                        onChange={() => toggle(opt.key)}
                        aria-label="Opción"
                      />
                      <div
                        className={`w-5 h-5 rounded-md border-2 ${
                          active ? "bg-[#286575] border-[#286575]" : "border-gray-300"
                        }`}
                      >
                        {active && (
                          <svg viewBox="0 0 24 24" className="text-white w-4 h-4 m-[2px]">
                            <path
                              fill="currentColor"
                              d="M20.285 6.708a1 1 0 0 1 0 1.414l-9.193 9.193a1 1 0 0 1-1.414 0l-5.657-5.657a1 1 0 1 1 1.414-1.414l4.95 4.95 8.486-8.486a1 1 0 0 1 1.414 0z"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <span className="text-gray-700">{opt.text}</span>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Footer / acciones */}
            <div className="mt-6 flex items-center justify-end">
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
