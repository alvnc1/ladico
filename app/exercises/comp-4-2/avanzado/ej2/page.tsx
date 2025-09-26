// app/exercises/comp-4-2/avanzado/ej2/page.tsx
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
const COMPETENCE = "4.2" as const
const LEVEL = "avanzado" as const
const SESSION_PREFIX = "session:4.2:Avanzado:P2_ProfilePrivacy"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ===== Opciones =====
type Visibility = "publico" | "registrados" | "contactos" | "solo_yo" | ""
type InfoShare = "nombre_correo" | "nombre_correo_tel" | "nombre_correo_tel_dir" | ""
type TwoFA = "si" | "no" | ""
type Consent = "todo" | "nada" | "personalizo" | ""

// Justificación (multi-select)
type JustKey = "ctrl_acceso_proposito" | "todo_publico" | "seguridad_total" | "evitar_sensibles" | "utile_2fa"

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // ===== Sesión =====
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

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
        console.error("No se pudo asegurar la sesión (4.2 Avanzado P2):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ===== Estado =====
  const [visibility, setVisibility] = useState<Visibility>("")
  const [infoShare, setInfoShare] = useState<InfoShare>("")
  const [twofa, setTwofa] = useState<TwoFA>("")
  const [consent, setConsent] = useState<Consent>("")
  const [justifs, setJustifs] = useState<JustKey[]>([])

  // ===== Corrección =====
  // Buenas elecciones (4 primeras preguntas → 1 punto c/u)
  const goodVisibility = visibility === "contactos" // (privacidad alta manteniendo interacción académica)
  const goodInfoShare = infoShare === "nombre_correo"
  const goodTwofa = twofa === "si"
  const goodConsent = consent === "personalizo"

  // Justificaciones correctas (puede marcar varias) → 3 puntos posibles
  const GOOD_JUSTS: JustKey[] = [
    "ctrl_acceso_proposito", // ✅ Prefiero controlar quién accede a mis datos y con qué propósito.
    "evitar_sensibles",      // ✅ Evité entregar datos sensibles que podrían usarse para suplantación de identidad.
    "utile_2fa",             // ✅ Es útil si alguien obtiene mi contraseña por error o engaño. (relacionado a 2FA)
  ]

  const goodJustCount = useMemo(
    () => justifs.filter(j => GOOD_JUSTS.includes(j)).length,
    [justifs]
  )

  const totalGood =
    (goodVisibility ? 1 : 0) +
    (goodInfoShare ? 1 : 0) +
    (goodTwofa ? 1 : 0) +
    (goodConsent ? 1 : 0) +
    goodJustCount // 0..3

  const point: 0 | 1 = totalGood >= 4 ? 1 : 0

  // ===== Handlers =====
  const toggleJust = (k: JustKey) => {
    setJustifs(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]))
  }

  const handleNext = async () => {
    // Guardar punto de la P2
    setPoint(COMPETENCE, LEVEL, 2, point)
    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        await markAnswered(sid, 1, point === 1) // P2 => índice 1
      } catch (e) {
        console.warn("No se pudo marcar respuesta (P2):", e)
      }
    }
    router.push("/exercises/comp-4-2/avanzado/ej3")
  }

  const progressPct = (2 / 3) * 100

  // ===== UI =====
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
        <Card className="bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 ring-2 ring-[#286575]/30">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Configuración de privacidad y uso de datos personales
            </h2>

            {/* Contexto */}
            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
              <p className="text-gray-700 leading-relaxed">
                Estás configurando tu perfil en una plataforma educativa. Define tus ajustes de privacidad y seguridad
                y luego selecciona las afirmaciones que justifican mejor tus decisiones.
              </p>
            </div>

            {/* Preguntas 1 a 4 (dropdowns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Quién puede ver tu perfil */}
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  ¿Quién puede ver tu perfil?
                </div>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as Visibility)}
                >
                  <option value="">Selecciona…</option>
                  <option value="publico">Público</option>
                  <option value="registrados">Solo usuarios registrados</option>
                  <option value="contactos">Solo mis contactos</option>
                  <option value="solo_yo">Solo yo</option>
                </select>
              </div>

              {/* 2. Qué información compartes */}
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  ¿Qué información decides compartir al registrarte?
                </div>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={infoShare}
                  onChange={(e) => setInfoShare(e.target.value as InfoShare)}
                >
                  <option value="">Selecciona…</option>
                  <option value="nombre_correo">Nombre y correo únicamente</option>
                  <option value="nombre_correo_tel">Nombre, correo y teléfono</option>
                  <option value="nombre_correo_tel_dir">Nombre, correo, teléfono y dirección</option>
                </select>
              </div>

              {/* 3. 2FA */}
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  ¿Activarías la verificación en dos pasos (2FA)?
                </div>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={twofa}
                  onChange={(e) => setTwofa(e.target.value as TwoFA)}
                >
                  <option value="">Selecciona…</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* 4. Gestión del consentimiento */}
              <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  ¿Cómo gestionas el consentimiento para el uso de tus datos?
                </div>
                <select
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={consent}
                  onChange={(e) => setConsent(e.target.value as Consent)}
                >
                  <option value="">Selecciona…</option>
                  <option value="todo">Acepto todo</option>
                  <option value="nada">Rechazo todo</option>
                  <option value="personalizo">Personalizo qué datos autorizo y para qué uso</option>
                </select>
              </div>
            </div>

            {/* Pregunta de justificación final (multi-select) */}
            <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white hover:border-[#286575] hover:bg-gray-50 transition-colors shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Justificación de tus elecciones</h3>
              <fieldset className="space-y-2">
                {[
                  { key: "ctrl_acceso_proposito", text: "Prefiero controlar quién accede a mis datos y con qué propósito." },
                  { key: "todo_publico", text: "Quiero que toda mi información esté visible públicamente para facilitar contactos." },
                  { key: "seguridad_total", text: "No importa la información compartida porque la plataforma siempre garantiza la seguridad." },
                  { key: "evitar_sensibles", text: "Evité entregar datos sensibles que podrían usarse para suplantación de identidad." },
                  { key: "utile_2fa", text: "Es útil si alguien obtiene mi contraseña por error o engaño." },
                ].map(opt => {
                  const checked = justifs.includes(opt.key as JustKey)
                  return (
                    <label
                      key={opt.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        checked ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-[#286575]"
                        checked={checked}
                        onChange={() => toggleJust(opt.key as JustKey)}
                      />
                      <span className="text-sm text-gray-800">{opt.text}</span>
                    </label>
                  )
                })}
              </fieldset>
            </div>

            {/* Acciones */}
            <div className="mt-2 flex items-center justify-end">
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
