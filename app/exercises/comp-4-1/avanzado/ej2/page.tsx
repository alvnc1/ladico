// app/exercises/comp-4-1/avanzado/ej2/page.tsx
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
const COMPETENCE = "4.1"
const LEVEL = "avanzado"
const SESSION_PREFIX = "session:4.1:Avanzado:P2_RedAbierta"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ===== Tipos =====
type RiskLevel = "alto" | "bajo" | "seguro"
type MeasureId = "vpn" | "no_auto" | "https" | "horario" | "logout"

// ===== Acciones a clasificar (orden y layout solicitados) =====
const ACTIONS: Array<{ id: number; text: string }> = [
  { id: 1, text: "Acceder a la aplicación del banco y realizar transferencias" },
  { id: 2, text: "Descargar documentos adjuntos desde el correo electrónico" },
  { id: 4, text: "Actualizar aplicaciones del sistema desde la tienda oficial" },
  { id: 5, text: "Enviar mensajes por una aplicación de mensajería cifrada" },
]

// Solo usamos estos IDs (se eliminó la acción de “leer noticias…”)
const USED_IDS = ACTIONS.map(a => a.id) as (1 | 2 | 4 | 5)[]

// ===== Respuestas correctas =====
// 1: banco → alto | 2: descargar adjuntos → alto | 4: actualizar apps → alto | 5: mensajería cifrada → bajo
const correctRisks: Record<1 | 2 | 4 | 5, RiskLevel> = {
  1: "alto",
  2: "alto",
  4: "alto",
  5: "bajo",
}

const correctMeasures: MeasureId[] = ["vpn", "no_auto", "https"]

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Estado de las 4 acciones
  const [actions, setActions] = useState<Record<1 | 2 | 4 | 5, RiskLevel | "">>({
    1: "",
    2: "",
    4: "",
    5: "",
  })

  // Estado medidas (checkboxes)
  const [measures, setMeasures] = useState<MeasureId[]>([])

  // ===== Evaluación =====
  const risksCorrectCount = useMemo(() => {
    let ok = 0
    for (const id of USED_IDS) {
      if (actions[id] && actions[id] === correctRisks[id]) ok++
    }
    return ok
  }, [actions])

  // Cada medida correcta suma 1 punto; las incorrectas no restan.
  const measuresCorrectCount = useMemo(() => {
    return correctMeasures.reduce((acc, m) => acc + (measures.includes(m) ? 1 : 0), 0)
  }, [measures])

  // Total de puntos: 0–7 (4 riesgos + 3 medidas correctas)
  const totalPoints = risksCorrectCount + measuresCorrectCount

  // Punto global de la pregunta: 1 si total >= 4, si no 0
  const point: 0 | 1 = totalPoints >= 4 ? 1 : 0

  // ===== Sesión =====
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
        console.error("No se pudo asegurar la sesión (P2 Avanzado):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ===== Envío =====
  const handleNext = async () => {
    setPoint(COMPETENCE, LEVEL, 2, point)

    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        await markAnswered(sid, 1, point === 1) // P2 => índice 1
      } catch (e) {
        console.warn("No se pudo marcar la respuesta (P2):", e)
      }
    }
    router.push("/exercises/comp-4-1/avanzado/ej3")
  }

  const progressPct = (2 / 3) * 100 // Pregunta 2 de 3

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between">
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
            Pregunta 2 de 3
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

      {/* Tarjeta principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Riesgos de conectarse a una red Wi-Fi abierta
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Analiza la situación de conexión a una red Wi-Fi abierta y clasifica el nivel de riesgo de las siguientes acciones.
                </p>
              </div>
            </div>

            {/* Acciones con dropdowns — grid 2×2 en el orden solicitado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {ACTIONS.map(({ id, text }) => (
                <div
                  key={id}
                  className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">{text}</div>
                  <select
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                    value={actions[id as 1 | 2 | 4 | 5]}
                    onChange={(e) =>
                      setActions((prev) => ({
                        ...prev,
                        [id]: e.target.value as RiskLevel,
                      }))
                    }
                  >
                    <option value="">Selecciona…</option>
                    <option value="alto">Riesgo alto</option>
                    <option value="bajo">Riesgo bajo</option>
                    <option value="seguro">Seguro</option>
                  </select>
                </div>
              ))}
            </div>

            {/* Medidas adicionales (sin cambios) */}
            <div className="mt-8">
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Medidas adicionales para reducir la exposición
                </h3>
                <div className="space-y-2">
                  {(
                    [
                      { id: "vpn", text: "Usar una conexión VPN para cifrar el tráfico de red." },
                      { id: "no_auto", text: "Desactivar la conexión automática a redes Wi-Fi abiertas." },
                      { id: "https", text: "Acceder únicamente a sitios web que utilicen HTTPS." },
                      { id: "horario", text: "Conectarse solo en horarios de baja concurrencia para reducir las probabilidades de ataque." },
                      { id: "logout", text: "Cerrar sesión en todas las aplicaciones antes de conectarse a la red abierta." },
                    ] as { id: MeasureId; text: string }[]
                  ).map((opt) => {
                    const active = measures.includes(opt.id)
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                          active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-[#286575]"
                          checked={active}
                          onChange={(e) =>
                            setMeasures((prev) =>
                              e.target.checked
                                ? [...prev, opt.id]
                                : prev.filter((m) => m !== opt.id)
                            )
                          }
                        />
                        <span className="text-sm text-gray-800">{opt.text}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex items-center justify-end">
              <Button
                onClick={handleNext}
                className="w/all sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
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
