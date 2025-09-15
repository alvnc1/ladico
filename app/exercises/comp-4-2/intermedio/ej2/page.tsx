// app/exercises/comp-4-2/intermedio/ej2/page.tsx
"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"

// Hooks & helpers
import { useEffect, useMemo, useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { useRouter } from "next/navigation"

// ====== Configuración del ejercicio (4.2 Intermedio • P2) ======
const COMPETENCE = "4.2"
const LEVEL = "intermedio"
/** Clave de sesión por-usuario para evitar duplicados */
const SESSION_PREFIX = "session:4.2:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// Opciones de privacidad (sin "Personalizado")
const PRIVACY_OPTS = [
  { value: "nadie", label: "Nadie" },              // 🚫
  { value: "solo-yo", label: "Solo yo" },          // 🔒
  { value: "amigos", label: "Amigos" },            // 👤
  { value: "amigos-de-amigos", label: "Amigos de amigos" }, // 👥
  { value: "publico", label: "Público" },          // 🌍
] as const
type PrivacyValue = typeof PRIVACY_OPTS[number]["value"]

// Respuestas correctas según los íconos mostrados en el perfil ficticio
// ⚠️ "Código postal" no aparece explícito → "Solo yo".
const CORRECT: Record<"codigoPostal" | "listaAmigos" | "cumpleanos", PrivacyValue> = {
  codigoPostal: "solo-yo",
  listaAmigos: "amigos-de-amigos",
  cumpleanos: "amigos",
}

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // Sesión Firestore
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // Estado de las tres selecciones
  const [codigoPostal, setCodigoPostal] = useState<PrivacyValue | "">("")
  const [listaAmigos, setListaAmigos] = useState<PrivacyValue | "">("")
  const [cumpleanos, setCumpleanos] = useState<PrivacyValue | "">("")

  // Resultado
  const { correctCount } = useMemo(() => {
    let ok = 0
    if (codigoPostal && codigoPostal === CORRECT.codigoPostal) ok++
    if (listaAmigos && listaAmigos === CORRECT.listaAmigos) ok++
    if (cumpleanos && cumpleanos === CORRECT.cumpleanos) ok++
    return { correctCount: ok }
  }, [codigoPostal, listaAmigos, cumpleanos])

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

  // ===== Navegación =====
  const handleNext = async () => {
    const point: 0 | 1 = correctCount >= 2 ? 1 : 0 // ✅ punto si tiene 2 o más correctas
    // P2 de 3 → index 1 en markAnswered, y guardamos punto
    setPoint(COMPETENCE, LEVEL, 2, point)

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
            level: "Intermedio",
            totalQuestions: 3,
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
        await markAnswered(sid, 1, point === 1) // índice 1 = P2
      }
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e)
    }

    router.push("/exercises/comp-4-2/intermedio/ej3")
  }

  const progressPct = (2 / 3) * 100 // Pregunta 2 de 3

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
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Configuraciones de privacidad en redes sociales
            </h2>

            {/* Contexto breve */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed mt-2">
                  Según la configuración de privacidad mostrada en el perfil, responde a las siguientes preguntas.
                </p>
              </div>
            </div>

            {/* Ventana de "Perfil de Facebook" en cuadrícula 2x2 */}
            <div className="mb-6">
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-[#1877f2] text-white px-4 py-2 text-sm font-medium">
                  Perfil — Vista general
                </div>

                <div className="bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* 1) Información personal */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 font-medium text-gray-800">
                      Información personal
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span>👤 <strong>Carolina Soto</strong></span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </div>
                      <div className="flex items-center justify-between">
                        {/* fecha completa: día, mes (texto), año */}
                        <span>🎂 <strong>14 de mayo de 1996</strong></span>
                        <span className="text-xs text-gray-500">👤</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>📍 <strong>Santiago, Chile</strong></span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>✉️ <strong>caro.soto@example.com</strong></span>
                        <span className="text-xs text-gray-500">👤</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>📱 <strong>+56 9 5555 1234</strong></span>
                        <span className="text-xs text-gray-500">🔒</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>🏠 <strong>Av. Los Leones 1234, Providencia</strong></span>
                        <span className="text-xs text-gray-500">🔒</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>💍 <strong>En una relación</strong></span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </div>
                      {/* Trampa: NO hay "código postal" explícito */}
                    </div>
                  </div>

                  {/* 2) Visibilidad de contenido */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 font-medium text-gray-800">
                      Visibilidad de contenido
                    </div>
                    <ul className="p-3 space-y-2">
                      <li className="flex items-center justify-between">
                        <span>📝 Publicaciones</span>
                        <span className="text-xs text-gray-500">👤</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>🖼️ Fotos</span>
                        <span className="text-xs text-gray-500">🔒</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>🎞️ Historias</span>
                        <span className="text-xs text-gray-500">👥</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>👥 Lista de amigos: <strong>324</strong></span>
                        <span className="text-xs text-gray-500">👥</span>
                      </li>
                    </ul>
                  </div>

                  {/* 3) Interacciones */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 font-medium text-gray-800">
                      Interacciones
                    </div>
                    <ul className="p-3 space-y-2">
                      <li className="flex items-center justify-between">
                        <span>💬 Quién puede enviarte mensajes</span>
                        <span className="text-xs text-gray-500">👥</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>📌 Quién puede etiquetarte</span>
                        <span className="text-xs text-gray-500">👤</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>👤 Quién puede seguirte</span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>🧩 Invitarte a grupos/eventos</span>
                        <span className="text-xs text-gray-500">👥</span>
                      </li>
                    </ul>
                  </div>

                  {/* 4) Información de contacto (sección adicional) */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 font-medium text-gray-800">
                      Información de contacto
                    </div>
                    <ul className="p-3 space-y-2">
                      <li className="flex items-center justify-between">
                        <span>🌐 Sitio web: <strong>carosoto.dev</strong></span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>📧 Correo alternativo: <strong>caro.alt@example.com</strong></span>
                        <span className="text-xs text-gray-500">👤</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>📞 Trabajo: <strong>+56 2 2345 6789</strong></span>
                        <span className="text-xs text-gray-500">🔒</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>📍 Ciudad actual: <strong>Providencia</strong></span>
                        <span className="text-xs text-gray-500">🌍</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Preguntas con dropdowns */}
            <div className="space-y-4">
              {/* Código postal */}
              <div className="rounded-2xl border-2 border-gray-200 p-3 bg-white hover:border-[#286575] transition-colors">
                <div className="text-sm text-gray-700 mb-2">
                  <strong>¿Quién puede acceder a tu código postal?</strong>
                </div>
                <select
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={codigoPostal}
                  onChange={(e) => setCodigoPostal(e.target.value as PrivacyValue)}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {PRIVACY_OPTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Lista de amigos */}
              <div className="rounded-2xl border-2 border-gray-200 p-3 bg-white hover:border-[#286575] transition-colors">

                <div className="text-sm text-gray-700 mb-2">
                  <strong>¿Quién puede acceder a tu red de contactos?</strong>
                </div>
                <select
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={listaAmigos}
                  onChange={(e) => setListaAmigos(e.target.value as PrivacyValue)}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {PRIVACY_OPTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Cumpleaños */}
              <div className="rounded-2xl border-2 border-gray-200 p-3 bg-white hover:border-[#286575] transition-colors">
                <div className="text-sm text-gray-700 mb-2">
                  <strong>¿Quién puede saber el año de nacimiento?</strong>
                </div>
                <select
                  className="w-full rounded-2xl border-2 border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                  value={cumpleanos}
                  onChange={(e) => setCumpleanos(e.target.value as PrivacyValue)}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {PRIVACY_OPTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer / acciones */}
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
