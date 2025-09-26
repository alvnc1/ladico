// app/exercises/comp-4-2/avanzado/ej1/page.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

// ===== Config =====
const COMPETENCE = "4.2"
const LEVEL = "avanzado"
const SESSION_PREFIX = "session:4.2:Avanzado:P1_Terms"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ===== Data =====
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
  {
    id: 7,
    title: "Seguridad técnica",
    text:
      "Empleamos protocolos de cifrado y sistemas de autenticación para proteger la confidencialidad y seguridad de la información almacenada en nuestros servidores.",
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
  const { user } = useAuth()

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
    setPoint(COMPETENCE, LEVEL, 1, point) // P1
    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)
    if (sid) {
      try {
        await markAnswered(sid, 0, point === 1)
      } catch (e) {
        console.warn("No se pudo marcar la respuesta (P1):", e)
      }
    }
    router.push("/exercises/comp-4-2/avanzado/ej2")
  }

  const progressPct = (3 / 3) * 100

  // ===== UI =====
  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header (igual que el ejemplo) */}
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

      {/* Progreso (misma estructura que el ejemplo) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta 3 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575] shadow-lg" />
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

      {/* Tarjeta principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Evaluación de términos y condiciones
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Has creado una cuenta en una plataforma de aprendizaje en línea. Antes de continuar,
                  debes abrir los <strong>Términos y condiciones</strong> y revisarlos cuidadosamente.
                </p>
                <p className="text-gray-700">
                  En la ventana emergente encontrarás la política de privacidad en párrafos numerados.
                  Lee, <strong>marca los párrafos que justifican tu evaluación</strong> y, al final,
                  <strong> clasifica el nivel de protección</strong>.
                </p>
                {/* Botón con estilo de enlace, abre el modal (igual apariencia que "Ir a panel") */}
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="text-blue-600 hover:underline font-medium p-0 h-auto bg-transparent"
                >
                  Ir a términos y condiciones
                </button>
              </div>
            </div>

            {/* Resumen de selección */}
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

              {/* Justificación según nivel elegido */}
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
