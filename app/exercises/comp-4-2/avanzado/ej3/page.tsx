// app/exercises/comp-4-2/avanzado/ej1/page.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  setPoint,
  getProgress,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

// ====== Carga de contexto (base + variantes por país/edad) ======
import exerciseData from "@/app/exercises/comp-4-2/avanzado/ej3/ej3.json"

// ===== Config =====
const COMPETENCE = "4.2"
const LEVEL = "avanzado"
const LEVEL_FS = "Avanzado"
const TOTAL_QUESTIONS = 3
const Q_ONE_BASED = 1       // P1 -> setPoint
const Q_ZERO_BASED = 0      // P1 -> markAnswered
const SESSION_PREFIX = "session:4.2:Avanzado:P1_Terms"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ===== Tipos JSON para el contexto =====
type Country = "Argentina" | "Perú" | "Uruguay" | "Colombia" | "Chile"
type AgeVariant = "under20" | "20to40" | "over40"

type ExerciseJSON = {
  id: string
  baseVersion: string
  base: {
    title: string
    stem: string // contexto base si no hay variante
  }
  variantsByCountry?: Partial<
    Record<
      Country,
      Partial<
        Record<
          AgeVariant,
          {
            stem?: string // contexto personalizado (solo cambia esto)
          }
        >
      >
    >
  >
}

const EXERCISE = exerciseData as ExerciseJSON

// ===== Helpers país/edad para escoger contexto =====
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

// ===== Data (T&C) =====
type ParaId = 1 | 2 | 3 | 4 | 5 | 6 | 7
const PARAGRAPHS: { id: ParaId; title: string; text: string }[] = [
  {
    id: 1,
    title: "Recolección de datos",
    text:
      "Recopilamos información básica como nombre, correo electrónico y contraseña, necesaria para el funcionamiento de la plataforma.",
  },
  {
    id: 2,
    title: "Datos adicionales",
    text:
      "También podemos solicitar tu ubicación y situación socioeconómica con fines de investigación y personalización de contenidos. Estos datos no son obligatorios para registrarte.",
  },
  {
    id: 3,
    title: "Uso de la información",
    text:
      "Utilizamos tu información personal para administrar tu cuenta, mejorar los servicios y enviarte comunicaciones relacionadas con el aprendizaje.",
  },
  {
    id: 4,
    title: "Compartición con terceros",
    text:
      "Parte de la información recopilada, como tu correo electrónico y actividad en la plataforma, puede ser compartida con colaboradores externos para fines de investigación de mercado y desarrollo de nuevos servicios.",
  },
  {
    id: 5,
    title: "Consentimiento",
    text:
      "Al completar tu registro, confirmas la aceptación de esta política y de las condiciones descritas, lo que incluye el uso de tus datos conforme a lo indicado.",
  },
  {
    id: 6,
    title: "Derechos del usuario",
    text:
      "Puedes solicitar la eliminación de tu cuenta en cualquier momento. Sin embargo, algunos datos podrán mantenerse almacenados por un período indefinido para cumplir con obligaciones administrativas y legales.",
  },
]

// correct: select 4,5,6; classify "bajo"; right justification for "bajo"
const CORRECT_PARAS: ParaId[] = [4, 5, 6] as const

type LevelChoice = "alto" | "medio" | "bajo" | ""
type JustKey = "ok" | "d1" | "d2" | ""

const JUST_OPTIONS: Record<Exclude<LevelChoice, "">, { key: JustKey; text: string }[]> = {
  bajo: [
    { key: "ok", text: "La plataforma comparte datos con terceros y el consentimiento se da de manera implícita, lo que deja al usuario con poco control." }, // ✅
    { key: "d1", text: "La información del usuario queda visible públicamente en el perfil sin posibilidad de ocultarla." },
    { key: "d2", text: "El servicio conservará y usará los mensajes privados entre usuarios con fines comerciales." },
  ],
  medio: [
    { key: "ok", text: "Hay medidas técnicas de seguridad y algunas opciones de control, pero persisten limitaciones en la eliminación de datos." }, // ✅
    { key: "d1", text: "El servicio podrá usar el contenido académico creado por los estudiantes para fines de marketing sin restricción." },
    { key: "d2", text: "La plataforma limita estrictamente la recolección a datos anónimos, garantizando un control total al usuario." },
  ],
  alto: [
    { key: "ok", text: "Solo se recogen datos básicos necesarios para el funcionamiento y se aplican protocolos de cifrado y autenticación." }, // ✅
    { key: "d1", text: "El servicio obliga a instalar software adicional en el dispositivo del usuario que recopila toda la actividad en segundo plano." },
    { key: "d2", text: "La política indica que la empresa puede transferir libremente datos personales a autoridades extranjeras sin notificación." },
  ],
}

// ===== Page =====
export default function Page() {
  const router = useRouter()
  const { user, userData } = useAuth() as {
    user: { uid: string } | null
    userData?: { age?: number; country?: string; role?: string } | null
  }

  // ===== Personalización de contexto =====
  const country = useMemo(
    () => normalizeCountry(userData?.country ?? null),
    [userData?.country]
  )
  const ageVariant = useMemo(
    () => ageToVariant(userData?.age ?? null),
    [userData?.age]
  )
  const personalizedStem = useMemo(
    () => pickStem(country, ageVariant),
    [country, ageVariant]
  )

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Modal state
  const [open, setOpen] = useState(false)

  // Selections
  const [selectedParas, setSelectedParas] = useState<ParaId[]>([])
  const [level, setLevel] = useState<LevelChoice>("")
  const [just, setJust] = useState<JustKey>("")

  // ===== Session bootstrap =====
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
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
          userId: user.uid!,
          competence: COMPETENCE,
          level: LEVEL_FS,
          totalQuestions: TOTAL_QUESTIONS,
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

  // ===== Evaluation =====
  const parasCorrect = useMemo(() => {
    const a = [...selectedParas].sort().join(",")
    const b = [...CORRECT_PARAS].sort().join(",")
    return a === b
  }, [selectedParas])

  const levelCorrect = level === "bajo"
  const justCorrect =
    (level === "bajo" && just === "ok") ||
    (level === "medio" && just === "ok") ||
    (level === "alto" && just === "ok")

  // Full point only if exact paragraphs + expected global level (bajo) + correcto para ese nivel
  const point: 0 | 1 = parasCorrect && levelCorrect && justCorrect ? 1 : 0

  // ===== Handlers =====
  const togglePara = (id: ParaId) => {
    setSelectedParas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleLevelChange = (v: LevelChoice) => {
    setLevel(v)
    setJust("") // reset justification when level changes
  }

  const handleFinish = async () => {
    // Guardar punto local (P1)
    setPoint(COMPETENCE, LEVEL, Q_ONE_BASED, point)

    // Calcular progreso y score (para /test/results)
    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog)
    const levelPassed = isLevelPassed(prog)
    const score = Math.round((totalPts / TOTAL_QUESTIONS) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    // Modo profesor
    const isTeacher = userData?.role === "profesor"
    const finalTotalPts = isTeacher ? TOTAL_QUESTIONS : totalPts
    const finalPassed = isTeacher ? true : levelPassed
    const finalScore = isTeacher ? 100 : score

    // Marcar respondida en Firestore
    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid!)) : null)
    if (sid) {
      try {
        await markAnswered(sid, Q_ZERO_BASED, point === 1)
      } catch (e) {
        console.warn("No se pudo marcar la respuesta (P1):", e)
      }
    }

    // → Enviar a /test/results
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
      retryBase: "/exercises/comp-4-2/avanzado",
      ex1Label: "Ejercicio 1: Términos y condiciones",
      ex2Label: "Ejercicio 2: Configuraciones y permisos avanzados",
      ex3Label: "Ejercicio 3: Políticas de privacidad (avanzado)",
    })

    router.push(`/test/results?${qs.toString()}`)
  }

  const progressPct = (3 / 3) * 100

  // ===== UI =====
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
                | 4.2 Protección de datos personales y privacidad — Nivel Avanzado
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
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
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
        <Card className="bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Evaluación de términos y condiciones
            </h2>

            {/* Contexto personalizado + instrucciones unidas (fluido) */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  {personalizedStem} Antes de continuar, debes abrir los Términos y condiciones y revisarlos cuidadosamente.
                  En la ventana emergente encontrarás la política de privacidad en párrafos numerados. Clasifica el nivel de 
                  protección y selecciona los párrafos que justifiquen tu decisión. Luego, explica tu elección.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-blue-600 hover:underline font-medium p-0 h-auto bg-transparent"
                >
                  Ir a términos y condiciones
                </button>
              </div>
            </div>

            {/* Controles de clasificación y justificación */}
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border-2 border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Clasificación global</div>
                <select
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value as LevelChoice)}
                >
                  <option value="">Selecciona…</option>
                  <option value="alto">Alto nivel de protección</option>
                  <option value="medio">Medio nivel de protección</option>
                  <option value="bajo">Bajo nivel de protección</option>
                </select>
              </div>

              {level && (
                <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Justifica tu clasificación</h3>
                  <fieldset className="space-y-2">
                    {JUST_OPTIONS[level as Exclude<LevelChoice, "">].map((opt) => {
                      const active = just === opt.key
                      return (
                        <label
                          key={opt.key}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                            active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="justificacion"
                            className="mt-1 accent-[#286575]"
                            checked={active}
                            onChange={() => setJust(opt.key)}
                          />
                          <span className="text-sm text-gray-800">{opt.text}</span>
                        </label>
                      )
                    })}
                  </fieldset>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="mt-8 flex items-center justify-end">
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

      {/* ===== Modal T&C ===== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-3xl max-h-[85vh] overflow-hidden ring-2 ring-[#286575]/20">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Términos y condiciones</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-900 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 64px - 72px)" }}>
              <div className="space-y-3">
                {PARAGRAPHS.map((p) => {
                  const checked = selectedParas.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        checked ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-[#286575]"
                        checked={checked}
                        onChange={() => togglePara(p.id)}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.title}</div>
                        <p className="text-sm text-gray-800">{p.text}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Marca los párrafos que justifican tu evaluación y cierra para continuar.
              </div>
              <Button onClick={() => setOpen(false)} className="bg-[#286675] hover:bg-[#3a7d89] text-white rounded-xl">
                Listo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
