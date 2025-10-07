"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

const COMPETENCE = "4.4" as const
const LEVEL = "avanzado" as const
const SESSION_PREFIX = "session:4.4:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

type Key = "A" | "B" | "C" | "D" | "E"

const OPTIONS: { key: Key; text: string }[] = [
  { key: "A", text: "Reducir la resolución de streaming a calidad estándar o inferior para bajar el consumo energético sin perder acceso al contenido." },
  { key: "B", text: "Evitar enviar correos con archivos adjuntos pesados, usando enlaces de nube cuando sea posible." },
  { key: "C", text: "Minimizar el uso de datos móviles sobre redes 4G y preferir Wi-Fi optimizado o conexiones cableadas." },
  { key: "D", text: "Prefiere enviar varios correos con archivos pequeños en lugar de un adjunto grande." },
  { key: "E", text: "Usar redes móviles solo para correos cortos y guardar todos los archivos en la nube." },
] as const

// Respuestas correctas: A, B y C
const CORRECT_SET = new Set<Key>(["A", "B", "C"])

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // ====== Sesión Firestore (por-usuario) ======
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Cargar cache
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // Asegurar sesión si no hay cache
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
        console.error("No se pudo asegurar la sesión de test (P1 Avanzado):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ====== Estado de selección ======
  const [selected, setSelected] = useState<Set<Key>>(() => new Set())
  const toggle = (k: Key) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  // ====== Puntaje (cada correcta suma 1; punto si ≥ 2 correctas) ======
  const point: 0 | 1 = useMemo(() => {
    let correctCount = 0
    selected.forEach(k => {
      if (CORRECT_SET.has(k)) correctCount++
    })
    return correctCount >= 2 ? 1 : 0
  }, [selected])

  // ====== Siguiente (no finaliza; P1 -> P2) ======
  const handleNext = async () => {
    // Guarda P1 local
    setPoint(COMPETENCE, LEVEL, 1, point)

    // Marca P1 respondida en sesión
    try {
      let sid = sessionId
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
        if (cached) {
          sid = cached
        } else if (!ensuringRef.current) {
          ensuringRef.current = true
          try {
            const { id } = await ensureSession({
              userId: user.uid,
              competence: COMPETENCE,
              level: "Avanzado",
              totalQuestions: 3,
            })
            sid = id
            setSessionId(id)
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
          } finally {
            ensuringRef.current = false
          }
        }
      }
      if (sid) {
        try {
          await markAnswered(sid, 0, point === 1) // P1 = índice 0
        } catch (e) {
          console.warn("No se pudo registrar P1 Avanzado:", e)
        }
      }
    } catch (e) {
      console.warn("Error al marcar P1:", e)
    }

    router.push("/exercises/comp-4-4/avanzado/ej2")
  }

  const progressPct = 33

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-2xl">
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
            Pregunta 1 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
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

      {/* Tarjeta principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Elegir las acciones digitales más sostenible.
            </h2>

            {/* Escenario (contexto) */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-3">
                <p className="text-gray-700 leading-relaxed">
                  Un amigo busca reducir su impacto ambiental sin renunciar al uso de tecnología en su día a día. Usted dispone de un
                  informe comparativo que presenta datos sobre el consumo energético y emisiones de CO₂ asociadas a tres hábitos
                  digitales frecuentes.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Seleccione las recomendaciones que permiten reducir el impacto ambiental de forma significativa sin comprometer
                  gravemente el acceso a la tecnología.
                </p>
              </div>
            </div>

            {/* Tabla de datos */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-left border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-sm font-semibold text-gray-700">Hábito digital</th>
                    <th className="px-4 py-2 text-sm font-semibold text-gray-700">Intensidad de CO₂ (aprox.)</th>
                    <th className="px-4 py-2 text-sm font-semibold text-gray-700">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-gray-800">Streaming de video (calidad estándar)</td>
                    <td className="px-4 py-2 text-gray-800">~36 g CO₂ por hora</td>
                    <td className="px-4 py-2 text-gray-600">IEA</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-800">Correo electrónico con adjunto (1&nbsp;MB)</td>
                    <td className="px-4 py-2 text-gray-800">~19 g CO₂ (≈4 g sin adjunto)</td>
                    <td className="px-4 py-2 text-gray-600">TCTEC® Innovation</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-800">Transferencia de datos por red móvil (4G)</td>
                    <td className="px-4 py-2 text-gray-800">~54 g CO₂ por GB</td>
                    <td className="px-4 py-2 text-gray-600">The Green Stars Project</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Opciones */}
            <div className="space-y-3 sm:space-y-4">
              {OPTIONS.map((opt) => {
                const active = selected.has(opt.key)
                return (
                  <label
                    key={opt.key}
                    className={`flex items-start space-x-3 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                      active ? "border-[#286575] bg-[#e6f2f3] shadow-md" : "border-gray-200 hover:border-[#286575] hover:bg-gray-50"
                    }`}
                    onClick={() => toggle(opt.key)}
                  >
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={active}
                        onChange={() => toggle(opt.key)}
                        aria-label={`Opción ${opt.key}`}
                      />
                      <div className={`w-5 h-5 rounded-md border-2 ${active ? "bg-[#286575] border-[#286575]" : "border-gray-300"}`}>
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
