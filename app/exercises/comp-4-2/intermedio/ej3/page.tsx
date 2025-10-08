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

// ==== Carga de configuración desde JSON ====
import exerciseData from "@/app/exercises/comp-4-2/intermedio/ej3/ej3.json"

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

// ===== Tipos (coherentes con el JSON final) =====
type OptionKey = "A" | "B" | "C" | "D" | "E"
type AgeKey = "<20" | "20-40" | "40+"
type Country = "Chile" | "Argentina" | "Uruguay" | "Colombia" | "Perú"

type OptionItem = { key: OptionKey; text: string; correct: boolean }

type VariantPayload = {
  stem?: string
  excerpt?: string
  /** En las variantes se envía el arreglo completo de opciones personalizadas */
  options?: OptionItem[]
}

type ExerciseJSON = {
  id: string
  baseVersion: string
  base: {
    title: string
    /** stem es opcional en el JSON que enviamos */
    stem?: string
    excerpt: string
    options: OptionItem[]
  }
  variantsByCountry?: Partial<Record<Country, Partial<Record<AgeKey, VariantPayload>>>>
}

const EXERCISE = exerciseData as ExerciseJSON

// ===== Helpers de personalización =====
function ageToKey(age?: number | null): AgeKey {
  if (age == null) return "20-40"
  if (age < 20) return "<20"
  if (age <= 40) return "20-40"
  return "40+"
}

function normalizeCountry(input?: string | null): Country | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  if (s.includes("chile")) return "Chile"
  if (s.includes("argentin")) return "Argentina"
  if (s.includes("uruguay")) return "Uruguay"
  if (s.includes("colombia")) return "Colombia"
  if (s.includes("peru") || s.includes("perú")) return "Perú"
  return null
}

const DEFAULT_STEM =
  "Lee el siguiente extracto de la política de privacidad y selecciona todas las afirmaciones correctas."

function pickStem(country: Country | null, age: AgeKey): string {
  const baseStem = EXERCISE.base.stem ?? DEFAULT_STEM
  if (!country) return baseStem
  const v = EXERCISE.variantsByCountry?.[country]?.[age]
  return v?.stem ?? baseStem
}

function pickExcerpt(country: Country | null, age: AgeKey): string {
  const baseEx = EXERCISE.base.excerpt
  if (!country) return baseEx
  const v = EXERCISE.variantsByCountry?.[country]?.[age]
  return v?.excerpt ?? baseEx
}

/** Si la variante trae opciones completas, se usan; si no, se usan las base */
function pickOptions(country: Country | null, age: AgeKey): OptionItem[] {
  const baseOpts = EXERCISE.base.options
  if (!country) return baseOpts
  const v = EXERCISE.variantsByCountry?.[country]?.[age]
  return v?.options && v.options.length > 0 ? v.options : baseOpts
}

export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth()

  // Personalización (país + edad)
  const country = useMemo<Country | null>(
    () => normalizeCountry((userData as any)?.country),
    [userData]
  )
  const ageKey = useMemo<AgeKey>(
    () => ageToKey((userData as any)?.age),
    [userData]
  )
  const personalizedStem = useMemo(
    () => pickStem(country, ageKey),
    [country, ageKey]
  )
  const personalizedExcerpt = useMemo(
    () => pickExcerpt(country, ageKey),
    [country, ageKey]
  )
  const OPTIONS = useMemo(
    () => pickOptions(country, ageKey),
    [country, ageKey]
  )

  // Sesión Firestore
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Estado selección
  const [selected, setSelected] = useState<Set<OptionKey>>(new Set())
  const toggle = (k: OptionKey) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // Puntaje según opciones correctas de la variante
  const point: 0 | 1 = useMemo(() => {
    const correctSet = new Set<OptionKey>(OPTIONS.filter(o => o.correct).map(o => o.key))
    let subpoints = 0
    for (const k of selected) if (correctSet.has(k)) subpoints++
    return subpoints >= 2 ? 1 : 0
  }, [selected, OPTIONS])

  // 1) Carga sesión cacheada
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const LS_KEY = sessionKeyFor(user.uid)
    const sid = localStorage.getItem(LS_KEY)
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar sesión una vez
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

  // Finalizar → guardar, marcar y navegar a resultados
  const handleFinish = async () => {
    setPoint(COMPETENCE, LEVEL, Q_ONE_BASED, point)

    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog)
    const levelPassed = isLevelPassed(prog)
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    const isTeacher = (userData as any)?.role === "profesor"
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
        passMin: "2",
        compPath: "comp-4-2",
        retryBase: "/exercises/comp-4-2/intermedio",
        ex1Label: "Ejercicio 1: Fundamentos de datos personales",
        ex2Label: "Ejercicio 2: Configuraciones y permisos",
        ex3Label: "Ejercicio 3: Comprensión de políticas de privacidad",
      })
      router.push(`/test/results?${qs.toString()}`)
    } catch (e) {
      console.warn("No se pudo marcar P3 respondida o navegar a resultados:", e)
      router.push("/dashboard")
    }
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
              {EXERCISE.base.title}
            </h2>

            {/* Contexto personalizado */}
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  {personalizedStem}
                </p>
              </div>
            </div>

            {/* Extracto (puede ser personalizado) */}
            <div className="mb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-base text-gray-700 whitespace-pre-line">
                  {personalizedExcerpt}
                </div>
              </div>
            </div>

            {/* Afirmaciones personalizadas */}
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
