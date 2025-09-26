// app/exercises/comp-4-1/intermedio/ej3/page.tsx
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

type OptId = "wifi_ok" | "wifi_priv" | "wifi_movil"
type OptId2 = "auto_seg" | "auto_riesgo" | "auto_no_mejoras"
type OptId3 = "nube_cifra" | "nube_riesgo" | "nube_hackers"

type GlobalLevel = "alto" | "bajo"
type JustId = "just_auto" | "just_dos_vuln" | "just_apps"

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // ===== Estado =====
  const [wifi, setWifi] = useState<OptId | "">("")
  const [auto, setAuto] = useState<OptId2 | "">("")
  const [nube, setNube] = useState<OptId3 | "">("")
  const [nivel, setNivel] = useState<GlobalLevel | "">("")
  const [justif, setJustif] = useState<JustId | "">("")

  // ===== Corrección =====
  const wifiOk = wifi === "wifi_priv"
  const autoOk = auto === "auto_seg"
  const nubeOk = nube === "nube_riesgo"
  const nivelOk = nivel === "bajo"
  const justOk = justif === "just_dos_vuln"

  const point: 0 | 1 = useMemo(() => {
    const allAnswered = wifi && auto && nube && nivel && justif
    if (!allAnswered) return 0
    return wifiOk && autoOk && nubeOk && nivelOk && justOk ? 1 : 0
  }, [wifi, auto, nube, nivel, justif, wifiOk, autoOk, nubeOk, nivelOk, justOk])

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
          level: "Intermedio",
          totalQuestions: 3,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión (4.1 ej3):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ===== Envío =====
  const handleFinish = async () => {
    setPoint(COMPETENCE, LEVEL, 3, point)

    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        await markAnswered(sid, 2, point === 1) // P3 => índice 2
      } catch (e) {
        console.warn("No se pudo marcar la respuesta (P3):", e)
      }
    }
    router.push("/dashboard")
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
              Fiabilidad y privacidad en la configuración de un smartphone
            </h2>

            {/* Contexto */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575] space-y-2">
                <p className="text-gray-700 leading-relaxed">
                  Has adquirido un nuevo smartphone. Durante la primera configuración del dispositivo aparecen varios
                  ajustes de seguridad y privacidad activados por defecto. Analiza su impacto, clasifica el nivel global
                  de protección y justifica tu decisión.
                </p>
              </div>
            </div>

            {/* Preguntas 1-3: ahora con dropdown */}
            <div className="space-y-4 mb-6">
              <SelectField<OptId>
                label="Conexión automática a redes Wi-Fi abiertas"
                value={wifi}
                onChange={setWifi}
                options={[
                  { id: "wifi_ok", text: "Permite una conexión rápida y estable sin necesidad de contraseñas." },
                  { id: "wifi_priv", text: "Expone los datos del usuario a posibles accesos no autorizados en redes inseguras." }, // ✅
                  { id: "wifi_movil", text: "Mejora la privacidad porque evita el uso de redes móviles." },
                ]}
              />

              <SelectField<OptId2>
                label="Actualización automática del sistema operativo"
                value={auto}
                onChange={setAuto}
                options={[
                  { id: "auto_seg", text: "Mantiene el dispositivo protegido contra vulnerabilidades recientes al instalar parches de seguridad." }, // ✅
                  { id: "auto_riesgo", text: "Aumenta la exposición del dispositivo porque se descargan archivos sin control del usuario." },
                  { id: "auto_no_mejoras", text: "Reduce la fiabilidad ya que impide recibir las últimas mejoras del sistema." },
                ]}
              />

              <SelectField<OptId3>
                label="Copias de seguridad en nube sin cifrado"
                value={nube}
                onChange={setNube}
                options={[
                  { id: "nube_cifra", text: "Garantiza la protección total porque la nube siempre cifra la información por defecto." },
                  { id: "nube_riesgo", text: "Riesgo para la privacidad, ya que los datos almacenados podrían ser leídos por terceros." }, // ✅
                  { id: "nube_hackers", text: "Aumenta la fiabilidad del sistema porque bloquea el acceso de hackers a la nube." },
                ]}
              />
            </div>

            {/* Clasificación + Justificación dentro del MISMO recuadro */}
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
              <div className="text-sm font-medium text-gray-900 mb-2">
                Evalúa el nivel de protección y justifica tu elección.
              </div>

              {/* Clasificación (select) */}
              <div className="mb-4">
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value as GlobalLevel)}
                >
                  <option value="">Selecciona…</option>
                  <option value="alto">Alto nivel de protección</option>
                  <option value="bajo">Bajo nivel de protección</option>
                </select>
              </div>

              {/* Justificación (radios) */}
              <div className="space-y-2">
                {(
                  [
                    { id: "just_auto", text: "La información del usuario queda siempre protegida por las actualizaciones automáticas, lo que elimina cualquier riesgo." },
                    { id: "just_dos_vuln", text: "Hay configuraciones activadas que implican vulnerabilidades graves." }, // ✅
                    { id: "just_apps", text: "El dispositivo solo es vulnerable si el usuario instala aplicaciones sospechosas, no por sus configuraciones iniciales." },
                  ] as { id: JustId; text: string }[]
                ).map((opt) => {
                  const active = justif === opt.id
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="justificacion"
                        className="mt-1 accent-[#2e6372]"
                        checked={active}
                        onChange={() => setJustif(opt.id)}
                      />
                      <span className="text-sm text-gray-800">{opt.text}</span>
                    </label>
                  )
                })}
              </div>
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

/* ====== UI pieces ====== */
function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string
  value: T | ""
  onChange: (v: T) => void
  options: { id: T; text: string }[]
}) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
      {label && <div className="text-sm font-medium text-gray-900 mb-2">{label}</div>}
      <select
        className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        <option value="">Selecciona…</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.text}
          </option>
        ))}
      </select>
    </div>
  )
}
