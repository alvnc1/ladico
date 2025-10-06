"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

// ====== Carga del JSON con variantes por país y edad ======
import exerciseData from "@/app/exercises/comp-4-3/intermedio/ej2/ej2.json"

// ====== Constantes del ejercicio ======
const COMPETENCE = "4.3" as const
const LEVEL = "intermedio" as const
const SESSION_PREFIX = "session:4.3:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ====== Tipos (alineados al JSON) ======
type Key = "A" | "B" | "C" | "D" | "E"
type Country = "Chile" | "Argentina" | "Uruguay" | "Colombia" | "Perú"
type AgeVariant = "under20" | "20to40" | "over40"

type OptionItem = { key: Key; text: string; correct: boolean }

type ExerciseJSON = {
  id: string
  baseVersion: string
  base: {
    title: string
    stem: string
    options: OptionItem[]
  }
  variantsByCountry?: Partial<
    Record<
      Country,
      Partial<
        Record<
          AgeVariant,
          {
            stem?: string
          }
        >
      >
    >
  >
}

const EXERCISE = exerciseData as ExerciseJSON

// ====== Helpers de personalización ======
function ageToVariant(age?: number | null): AgeVariant {
  if (age == null) return "20to40"
  if (age < 20) return "under20"
  if (age <= 40) return "20to40"
  return "over40"
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

function pickStem(country: Country | null, variant: AgeVariant): string {
  const baseStem = EXERCISE.base.stem
  if (!country) return baseStem
  const v = EXERCISE.variantsByCountry?.[country]?.[variant]
  return v?.stem ?? baseStem
}

// ====== Página ======
export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth() as {
    user: { uid: string } | null
    userData?: { age?: number; country?: string } | null
  }

  // Personalización (país + edad)
  const country = useMemo<Country | null>(
    () => normalizeCountry(userData?.country),
    [userData?.country]
  )
  const ageVariant = useMemo<AgeVariant>(
    () => ageToVariant(userData?.age ?? null),
    [userData?.age]
  )
  const personalizedStem = useMemo(
    () => pickStem(country, ageVariant),
    [country, ageVariant]
  )

  // Opciones (desde base JSON; no varían por país/edad en esta pregunta)
  const OPTIONS = EXERCISE.base.options

  // ==== Sesión por-usuario (evita mezclar) ====
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

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
          level: "Intermedio",
          totalQuestions: 3,
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

  // ====== Estado de selección ======
  const [selected, setSelected] = useState<Set<Key>>(new Set())

  const toggle = (k: Key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // ====== Nuevo puntaje: cada alternativa correcta suma 1; punto final si >= 2 ======
  const correctKeys = useMemo(() => {
    return new Set<Key>(OPTIONS.filter(o => o.correct).map(o => o.key))
  }, [OPTIONS])

  const correctCount = useMemo(() => {
    let cnt = 0
    for (const k of selected) if (correctKeys.has(k)) cnt++
    return cnt
  }, [selected, correctKeys])

  const point: 0 | 1 = useMemo(() => (correctCount >= 2 ? 1 : 0), [correctCount])

  const handleNext = async () => {
    // Guarda el punto local (para anillo/resultados)
    setPoint(COMPETENCE, LEVEL, 2, point)

    // Asegura tener sesión y marca respondida
    let sid = sessionId
    try {
      if (!sid && user) {
        const cached =
          typeof window !== "undefined"
            ? localStorage.getItem(sessionKeyFor(user.uid))
            : null
        if (cached) {
          sid = cached
        } else {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          })
          sid = id
          setSessionId(id)
          if (typeof window !== "undefined")
            localStorage.setItem(sessionKeyFor(user.uid), id)
        }
      }
    } catch (e) {
      console.error("No se pudo (re)asegurar la sesión al guardar P2:", e)
    }

    try {
      if (sid) {
        await markAnswered(sid, 1, point === 1) // P2: correcta si alcanzó el umbral
      }
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e)
    }

    router.push("/exercises/comp-4-3/intermedio/ej3")
  }

  const progressPct = (2 / 3) * 100

  // ====== UI ======
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
                | 4.3 Protección de la salud y el bienestar - Nivel Intermedio
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
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
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
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              {EXERCISE.base.title}
            </h2>

            {/* Contexto personalizado por país + edad */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  {personalizedStem}
                </p>
              </div>
            </div>

            {/* Opciones */}
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

            {/* Acciones */}
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
