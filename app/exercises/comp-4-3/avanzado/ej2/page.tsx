// app/exercises/comp-4-3/avanzado/ej3/page.tsx
"use client"

import Link from "next/link"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

const COMPETENCE = "4.3"
const LEVEL_LOCAL = "avanzado"
const SESSION_PREFIX = "session:4.3:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

// ✅ Esta es la Pregunta 2 de 3
const QUESTION_NUM_LOCAL = 2        // (1-based) para setPoint
const QUESTION_IDX_SESSION = 1      // (0-based) para markAnswered

// Claves de almacenamiento
const STORAGE_KEY = "ladico:4.3:avanzado:ej2"
const storageKeyFor = (uid?: string | null) => `${STORAGE_KEY}:u:${uid ?? "anon"}`

// ===== Opciones =====
type CompKey = "footer" | "form" | "buttons" | "menu" | "notices"
type ChangeKey = "biggerTextContrast" | "bigButtons" | "colorfulBackground" | "labelsExamples"

const COMPONENTS: { key: CompKey; label: string }[] = [
  { key: "footer",  label: "Pie de página" },
  { key: "form",    label: "Formulario" },                     // ✅
  { key: "buttons", label: "Botones y enlaces interactivos" }, // ✅
  { key: "menu",    label: "Menú de navegación" },
  { key: "notices", label: "Avisos (barras de mensajes)" },    // ✅
]

// ⬇️ "Disminuir..." es INCORRECTA (cambiaste el texto), por lo tanto NO suma punto
const CHANGES: { key: ChangeKey; label: string }[] = [
  { key: "biggerTextContrast", label: "Disminuir tamaño y contraste de los textos." }, // ❌ incorrecta
  { key: "bigButtons",         label: "Hacer botones grandes." },                      // ✅
  { key: "colorfulBackground", label: "Agregar un fondo de color más vistoso para que la página se vea moderna." }, // ❌
  { key: "labelsExamples",     label: "Colocar siempre etiquetas visibles en los formularios y dar ejemplos de formato." }, // ✅
]

// Claves correctas
const CORRECT_COMPONENTS = new Set<CompKey>(["form", "buttons", "notices"])
const CORRECT_CHANGES   = new Set<ChangeKey>(["bigButtons", "labelsExamples"]) // ⬅️ SIN "biggerTextContrast"

// Tipo para las respuestas guardadas
type SavedResponses = {
  selComponents: Record<CompKey, boolean>
  selChanges: Record<ChangeKey, boolean>
  lastSaved: number
}

// Función para cargar respuestas guardadas
const loadSavedResponses = (uid?: string | null): SavedResponses | null => {
  if (typeof window === "undefined") return null
  
  try {
    const raw = localStorage.getItem(storageKeyFor(uid))
    if (raw) {
      const parsed = JSON.parse(raw) as SavedResponses
      console.log("✅ Respuestas cargadas desde localStorage")
      return parsed
    }
  } catch (error) {
    console.error("❌ Error cargando respuestas guardadas:", error)
  }
  
  return null
}

// Función para guardar respuestas
const saveResponses = (responses: SavedResponses, uid?: string | null) => {
  if (typeof window === "undefined") return
  
  try {
    const serialized = JSON.stringify(responses)
    localStorage.setItem(storageKeyFor(uid), serialized)
    console.log("✅ Respuestas guardadas en localStorage")
  } catch (error) {
    console.error("❌ Error guardando respuestas:", error)
  }
}

// Función para sincronizar con Firebase
const syncWithFirebase = async (responses: SavedResponses, uid?: string | null) => {
  if (!uid || !db) return
  
  try {
    const docRef = doc(db, "exerciseResponses", `${uid}_4.3_avanzado_ej2`)
    await setDoc(docRef, {
      userId: uid,
      competence: "4.3",
      level: "avanzado",
      exercise: "ej2",
      responses: responses,
      lastUpdated: new Date(),
      timestamp: Date.now()
    })
    console.log("✅ Respuestas sincronizadas con Firebase")
  } catch (error) {
    console.error("❌ Error sincronizando con Firebase:", error)
  }
}

export default function AdvancedEj3Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Estado: selecciones (checkboxes) - inicializar con valores por defecto
  const [selComponents, setSelComponents] = useState<Record<CompKey, boolean>>({
    footer: false,
    form: false,
    buttons: false,
    menu: false,
    notices: false,
  })
  const [selChanges, setSelChanges] = useState<Record<ChangeKey, boolean>>({
    biggerTextContrast: false,
    bigButtons: false,
    colorfulBackground: false,
    labelsExamples: false,
  })

  // Contar respuestas correctas seleccionadas (suma entre los dos bloques)
  const correctSelectedTotal = useMemo(() => {
    let total = 0
    ;(Object.keys(selComponents) as CompKey[]).forEach(k => {
      if (selComponents[k] && CORRECT_COMPONENTS.has(k)) total++
    })
    ;(Object.keys(selChanges) as ChangeKey[]).forEach(k => {
      if (selChanges[k] && CORRECT_CHANGES.has(k)) total++
    })
    return total
  }, [selComponents, selChanges])

  // ===== Cargar respuestas guardadas =====
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const loadData = async () => {
      try {
        // Cargar respuestas desde localStorage
        const saved = loadSavedResponses(user?.uid)
        if (saved) {
          setSelComponents(saved.selComponents)
          setSelChanges(saved.selChanges)
          console.log("✅ Respuestas cargadas desde almacenamiento local")
        }
        
        // Intentar cargar desde Firebase si no hay datos locales
        if (!saved && user?.uid && db) {
          try {
            const docRef = doc(db, "exerciseResponses", `${user.uid}_4.3_avanzado_ej2`)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
              const data = docSnap.data()
              const responses = data.responses as SavedResponses
              setSelComponents(responses.selComponents)
              setSelChanges(responses.selChanges)
              console.log("✅ Respuestas cargadas desde Firebase")
              
              // Sincronizar con localStorage
              saveResponses(responses, user.uid)
            }
          } catch (error) {
            console.error("❌ Error cargando desde Firebase:", error)
          }
        }
      } catch (error) {
        console.error("❌ Error cargando datos:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [user?.uid])

  // ===== Sesión por-usuario =====
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const LS_KEY = sessionKeyFor(user.uid)
    const sid = localStorage.getItem(LS_KEY)
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
        console.error("No se pudo asegurar la sesión de test:", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ===== Guardado automático de respuestas =====
  useEffect(() => {
    if (isLoading) return // No guardar mientras se está cargando
    
    const saveData = async () => {
      setIsSaving(true)
      try {
        const responses: SavedResponses = {
          selComponents,
          selChanges,
          lastSaved: Date.now()
        }
        
        // Guardar en localStorage
        saveResponses(responses, user?.uid)
        
        // Sincronizar con Firebase en segundo plano
        if (user?.uid) {
          syncWithFirebase(responses, user.uid)
        }
      } catch (error) {
        console.error("❌ Error guardando respuestas:", error)
      } finally {
        // Reset saving state after a short delay
        setTimeout(() => setIsSaving(false), 1000)
      }
    }
    
    saveData()
  }, [selComponents, selChanges, user?.uid, isLoading])

  // ===== Navegación / Guardado =====
  const handleNext = async () => {
    // ✅ Punto si hay 3 o más respuestas correctas entre ambos bloques
    const point: 0 | 1 = correctSelectedTotal >= 3 ? 1 : 0
    setPoint(COMPETENCE, LEVEL_LOCAL, QUESTION_NUM_LOCAL, point)

    const sid = sessionId || (typeof window !== "undefined" ? localStorage.getItem(SESSION_PREFIX) : null)
    if (sid) {
      try {
        await markAnswered(sid, QUESTION_IDX_SESSION, point === 1)
      } catch (e) {
        console.error("markAnswered P2 falló:", e)
      }
    }

    // ➡️ Avanza a la P3
    router.push("/exercises/comp-4-3/avanzado/ej3")
  }

  const progressPct = (2 / 3) * 100 // Pregunta 2 de 3

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3fbfb] flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#286575] mx-auto mb-4"></div>
            <p className="text-gray-600">Recuperando tus respuestas guardadas</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img src="/ladico_green.png" alt="Ladico Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
                | 4.3 Protección de la salud y el bienestar - Nivel Avanzado
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Uso de tecnologías digitales inclusivas para adultos mayores
            </h2>

            {/* Instrucciones */}
            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
              <p className="text-gray-700 leading-relaxed">
                Observa el sitio web. Identifica los componentes que presentan problemas de accesibilidad para adultos mayores
                y selecciona las mejoras más adecuadas para que la página sea más inclusiva.
              </p>
              <p className="mt-2">
                <Link
                  href="/exercises/comp-4-3/avanzado/ej2/web"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Ir a sitio web
                </Link>
              </p>
            </div>

            {/* Bloque 1: Componentes con problemas */}
            <section className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">
                ¿Cuáles de los siguientes componentes de la página tienen problemas de accesibilidad para adultos mayores?
              </h3>
              <div className="space-y-2">
                {COMPONENTS.map((c) => {
                  const active = selComponents[c.key]
                  return (
                    <label
                      key={c.key}
                      htmlFor={`comp-${c.key}`}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                      }`}
                    >
                      <input
                        id={`comp-${c.key}`}
                        type="checkbox"
                        className="mt-1 accent-[#286575]"
                        checked={active}
                        onChange={(e) =>
                          setSelComponents((s) => ({ ...s, [c.key]: e.target.checked }))
                        }
                      />
                      <span className="text-sm text-gray-800">{c.label}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Bloque 2: Cambios recomendados */}
            <section className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">
                ¿Qué cambios ayudarían a variar el uso de la tecnología para que la página sea más inclusiva con adultos mayores?
              </h3>
              <div className="space-y-2">
                {CHANGES.map((c) => {
                  const active = selChanges[c.key]
                  return (
                    <label
                      key={c.key}
                      htmlFor={`chg-${c.key}`}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575]"
                      }`}
                    >
                      <input
                        id={`chg-${c.key}`}
                        type="checkbox"
                        className="mt-1 accent-[#286575]"
                        checked={active}
                        onChange={(e) =>
                          setSelChanges((s) => ({ ...s, [c.key]: e.target.checked }))
                        }
                      />
                      <span className="text-sm text-gray-800">{c.label}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Acción */}
            <div className="flex justify-end pt-2">
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
