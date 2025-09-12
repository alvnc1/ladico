"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { setPoint } from "@/lib/levelProgress"

// Hooks & helpers
import { useEffect, useMemo, useState, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { useRouter } from "next/navigation"

// ====== Configuración del ejercicio (4.3 Intermedio) ======
type ThreatId = "A1" | "A2" | "A3" | "A4" | "A5"
type MeasureId = "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7"

// Amenazas (orden mezclado)
const THREATS: { id: ThreatId; title: string }[] = [
  { id: "A4", title: "Distracción y menor productividad por interrupciones digitales" },
  { id: "A2", title: "Trastornos del sueño" },
  { id: "A5", title: "Aislamiento social y disminución de interacciones" },
  { id: "A1", title: "Fatiga visual y dolores de cabeza" },
  { id: "A3", title: "Dolores musculares o posturales" },
]

// Medidas (correctas + distractores)
const MEASURES: {
  id: MeasureId
  text: string
  correctFor: ThreatId[]
  isMyth?: boolean
}[] = [
  { id: "M3", text: "Adaptar el mobiliario de trabajo para favorecer una posición ergonómica.", correctFor: ["A3"] },
  { id: "M1", text: "Hacer pausas regulares para moverse y cambiar el foco de atención de la pantalla.", correctFor: ["A1"] },
  { id: "M4", text: "Configurar periodos sin interrupciones en el dispositivo.", correctFor: ["A4"] },
  { id: "M2", text: "Establecer rutinas de cierre de dispositivos en la noche.", correctFor: ["A2"] },
  { id: "M5", text: "Bajar al mínimo el brillo de la pantalla durante todo el día.", correctFor: [], isMyth: true },
  { id: "M7", text: "Mantener contacto constante en grupos de WhatsApp para no perder la conexión social.", correctFor: [], isMyth: true },
  { id: "M6", text: "Incorporar encuentros presenciales en la rutina semanal.", correctFor: ["A5"] },
]

// ====== Helpers Drag & Drop ======
const DRAG_TYPE = "application/ladico-measure-id"

function draggableProps(id: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, id)
      e.dataTransfer.effectAllowed = "move"
    },
  }
}

function droppableProps(onDropId: (id: MeasureId) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault()
    },
    onDrop: (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData(DRAG_TYPE)
      if (raw) onDropId(raw as MeasureId)
    },
  }
}

// ====== Página ======
const COMPETENCE = "4.3"
const LEVEL = "intermedio"
/** Clave de sesión por-usuario para evitar duplicados */
const SESSION_PREFIX = "session:4.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // Sesión Firestore
  const [sessionId, setSessionId] = useState<string | null>(null)

  // pool = medidas aún no asignadas
  const [pool, setPool] = useState<MeasureId[]>(MEASURES.map((m) => m.id))
  // asignaciones: amenaza -> UNA medida (máx 1)
  const [assign, setAssign] = useState<Record<ThreatId, MeasureId | null>>({
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
  })
  const [done, setDone] = useState(false)


  const ensuringRef = useRef(false);
  // Cargar/crear sesión al montar
  // 1) Carga sesión cacheada (si existe) apenas conocemos el uid
    useEffect(() => {
      if (!user || typeof window === "undefined") return;
      const LS_KEY = sessionKeyFor(user.uid);
      const sid = localStorage.getItem(LS_KEY);
      if (sid) setSessionId(sid);
    }, [user?.uid]);


  // 2) Crea/asegura sesión UNA VEZ por usuario (evita duplicados)
    useEffect(() => {
      if (!user) {
        setSessionId(null);
        return;
      }
  
      const LS_KEY = sessionKeyFor(user.uid);
      const cached =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
  
      if (cached) {
        // ya existe para este usuario
        if (!sessionId) setSessionId(cached);
        return;
      }
  
      // Evita que se dispare doble en StrictMode o por renders repetidos
      if (ensuringRef.current) return;
      ensuringRef.current = true;
  
      (async () => {
        try {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
        } catch (e) {
          console.error("No se pudo asegurar la sesión de test:", e);
        } finally {
          ensuringRef.current = false;
        }
      })();
    }, [user?.uid, sessionId]);

  const measureMap = useMemo(() => Object.fromEntries(MEASURES.map((m) => [m.id, m])), [])

  // Quita la medida de todos lados
  const removeEverywhere = (id: MeasureId) => {
    setPool((prev) => prev.filter((x) => x !== id))
    setAssign((prev) => {
      const next: Record<ThreatId, MeasureId | null> = { ...prev }
      ;(Object.keys(next) as ThreatId[]).forEach((k) => {
        if (next[k] === id) next[k] = null
      })
      return next
    })
  }

  // Volver al pool
  const dropToPool = (id: MeasureId) => {
    removeEverywhere(id)
    setPool((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  // Asignar (solo 1 por amenaza)
  const dropToThreat = (threat: ThreatId, id: MeasureId) => {
    setAssign((prev) => {
      const previous = prev[threat]
      if (previous && previous !== id) {
        setPool((p) => (p.includes(previous) ? p : [...p, previous]))
      }
      return prev
    })
    removeEverywhere(id)
    setAssign((prev) => ({ ...prev, [threat]: id }))
  }

  // Quitar manualmente desde el chip
  const unassign = (threat: ThreatId) => {
    setAssign((prev) => {
      const mid = prev[threat]
      if (!mid) return prev
      const next = { ...prev, [threat]: null }
      setPool((p) => (mid && !p.includes(mid) ? [...p, mid] : p))
      return next
    })
  }

  // ===== Calcular correctas (solo puntaje) =====
  const { correctCount } = useMemo(() => {
    let ok = 0
    for (const th of Object.keys(assign) as ThreatId[]) {
      const mid = assign[th]
      if (!mid) continue
      const m = measureMap[mid]
      if (!m) continue
      if (m.correctFor.includes(th)) ok += 1
    }
    return { correctCount: ok }
  }, [assign, measureMap])

  // ===== Navegación =====
  const handleNext = async () => {
    setDone(true)
    const point: 0 | 1 = correctCount >= 3 ? 1 : 0
    setPoint(COMPETENCE, LEVEL, 1, point)

    try {
      const LS_KEY = user ? sessionKeyFor(user.uid) : null;

      // Usa la sesión existente (estado o LS); NO vuelvas a crear si ya hay una
      let sid =
        sessionId ||
        (LS_KEY && typeof window !== "undefined"
          ? localStorage.getItem(LS_KEY)
          : null);

      // Si aún no hay sesión (primer uso en este usuario), créala una sola vez
      if (!sid && user && !ensuringRef.current) {
        ensuringRef.current = true;
        try {
          const created = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          sid = created.id;
          setSessionId(created.id);
          if (typeof window !== "undefined")
            localStorage.setItem(LS_KEY!, created.id);
        } finally {
          ensuringRef.current = false;
        }
      }

      if (sid) {
        await markAnswered(sid, 0, point === 1); // índice 0 = P1
      }
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e);
    }

    router.push("/exercises/comp-4-3/intermedio/ej2")
  }

  const progressPct = 100 / 3 // Pregunta 1 de 3

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
            Pregunta 1 de 3
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
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Título */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Prevención de riesgos para la salud y el bienestar en entornos digitales
            </h2>

            {/* Instrucción */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Arrastra la medida preventiva que corresponda a cada amenaza para reducir sus efectos.
                </p>
              </div>
            </div>
            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pool de medidas — SIN fondo de recuadro */}
              <section
                className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-4"
                {...droppableProps(dropToPool)}
              >
                <h3 className="font-semibold text-gray-900 mb-3">Medidas preventivas</h3>

                <ul className="space-y-2 min-h-[110px]">
                  {pool.length === 0 && <li className="text-sm text-gray-400 italic">No quedan medidas.</li>}
                  {pool.map((id) => (
                    <li
                      key={id}
                      className="p-2.5 rounded-xl border text-sm bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                      {...draggableProps(id)}
                    >
                      {measureMap[id].text}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Amenazas: vacío dashed, asignado AZUL */}
              <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {THREATS.map((t) => {
                  const mid = assign[t.id]
                  const m = mid ? measureMap[mid] : null
                  const assigned = Boolean(mid)

                  return (
                    <div
                      key={t.id}
                      className={
                        assigned
                          ? "rounded-2xl border-2 p-3 bg-blue-50 border-blue-400"
                          : "rounded-2xl border-2 border-dashed p-3 bg-white border-gray-200"
                      }
                      {...droppableProps((mm) => dropToThreat(t.id, mm))}
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{t.title}</h4>
                      <div className="min-h-[72px]">
                        {!mid ? (
                          <p className="text-xs text-gray-400 italic">Suelta aquí la medida.</p>
                        ) : (
                          <div
                            className="p-2.5 rounded-xl border text-sm bg-white border-gray-200 flex items-start gap-2"
                            {...draggableProps(mid)}
                          >
                            <button
                              type="button"
                              onClick={() => unassign(t.id)}
                              className="rounded-md hover:bg-gray-100 p-1"
                              aria-label="Quitar medida"
                              title="Quitar medida"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                            <span className="text-gray-700">{m?.text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
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
