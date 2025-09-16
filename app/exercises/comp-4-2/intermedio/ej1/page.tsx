// app/exercises/comp-4-2/intermedio/ej1/page.tsx
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

// ====== Configuración del ejercicio (4.2 Intermedio) ======
type MotiveId = "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A7"
type ActionId = "M1" | "M2" | "M3" | "M4" | "M5"

// Motivos (arrastrables en el pool a la IZQUIERDA; A6 y A7 son distractores)
const THREATS: { id: MotiveId; title: string }[] = [
  { id: "A1", title: "Garantizar que un atacante no pueda entrar aunque tenga tu contraseña." },
  { id: "A2", title: "Evitar que aplicaciones con acceso innecesario recopilen datos adicionales." },
  { id: "A3", title: "Evitar que otros accedan a tu información desde equipos públicos o compartidos." },
  { id: "A4", title: "Crear y recordar contraseñas seguras sin anotarlas físicamente." },
  { id: "A5", title: "Mantener el software protegido contra vulnerabilidades recientes." },
  { id: "A6", title: "Ahorrar espacio en el dispositivo eliminando permisos y accesos innecesarios." }, // distractor
  { id: "A7", title: "Evitar que la batería se consuma rápidamente al mantener el sistema actualizado." }, // distractor
]

// Acciones (SLOTS a la DERECHA; esperan recibir un motivo)
const MEASURES: {
  id: ActionId
  text: string
  correctFor: MotiveId[]
  isMyth?: boolean
}[] = [
  { id: "M1", text: "Usar un gestor de contraseñas para almacenar credenciales.", correctFor: ["A4"] },
  { id: "M2", text: "Cerrar sesión en dispositivos compartidos después de usarlos.", correctFor: ["A3"] },
  { id: "M3", text: "Actualizar el sistema operativo y las aplicaciones regularmente.", correctFor: ["A5"] },
  { id: "M4", text: "Activar la verificación en dos pasos en todas las cuentas críticas.", correctFor: ["A1"] },
  { id: "M5", text: "Revisar los permisos de aplicaciones móviles cada tres meses.", correctFor: ["A2"] },
]

// ====== Helpers Drag & Drop ======
const DRAG_TYPE = "application/ladico-measure-id" // (se mantiene para no tocar el front)

function draggableProps(id: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, id)
      e.dataTransfer.effectAllowed = "move"
    },
  }
}

function droppableProps(onDropId: (id: MotiveId) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault()
    },
    onDrop: (e: React.DragEvent) => {
      const raw = e.dataTransfer.getData(DRAG_TYPE)
      if (raw) onDropId(raw as MotiveId)
    },
  }
}

// ====== Página ======
const COMPETENCE = "4.2"
const LEVEL = "intermedio"
/** Clave de sesión por-usuario para evitar duplicados */
const SESSION_PREFIX = "session:4.2:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  // Sesión Firestore
  const [sessionId, setSessionId] = useState<string | null>(null)

  // pool = MOTIVOS aún no asignados (arrastrables)
  const [pool, setPool] = useState<MotiveId[]>(THREATS.map((m) => m.id))
  // asignaciones: acción -> UN motivo (máx 1)
  const [assign, setAssign] = useState<Record<ActionId, MotiveId | null>>({
    M1: null,
    M2: null,
    M3: null,
    M4: null,
    M5: null,
  })
  const [done, setDone] = useState(false)

  const ensuringRef = useRef(false);
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
      if (!sessionId) setSessionId(cached);
      return;
    }

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

  const actionMap = useMemo(() => Object.fromEntries(MEASURES.map((m) => [m.id, m])), [])
  const motiveMap = useMemo(() => Object.fromEntries(THREATS.map((t) => [t.id, t])), [])

  // Quita el MOTIVO de todos lados
  const removeEverywhere = (motiveId: MotiveId) => {
    // quita del pool
    setPool((prev) => prev.filter((x) => x !== motiveId))
    // quita de cualquier acción asignada
    setAssign((prev) => {
      const next: Record<ActionId, MotiveId | null> = { ...prev }
      ;(Object.keys(next) as ActionId[]).forEach((k) => {
        if (next[k] === motiveId) next[k] = null
      })
      return next
    })
  }

  // Volver un MOTIVO al pool
  const dropToPool = (motiveId: MotiveId) => {
    removeEverywhere(motiveId)
    setPool((prev) => (prev.includes(motiveId) ? prev : [...prev, motiveId]))
  }

  // Asignar (solo 1 motivo por ACCIÓN)
  const dropToAction = (action: ActionId, motiveId: MotiveId) => {
    // El motivo deja cualquier otro lugar
    removeEverywhere(motiveId)
    // Asignar al slot (acción)
    setAssign((prev) => ({ ...prev, [action]: motiveId }))
  }

  // Quitar manualmente desde el chip (desde una ACCIÓN)
  const unassign = (action: ActionId) => {
    setAssign((prev) => {
      const mid = prev[action]
      if (!mid) return prev
      const next = { ...prev, [action]: null }
      setPool((p) => (mid && !p.includes(mid) ? [...p, mid] : p))
      return next
    })
  }

  // ===== Calcular correctas (solo puntaje) =====
  const { correctCount } = useMemo(() => {
    let ok = 0
    for (const actionId of Object.keys(assign) as ActionId[]) {
      const motiveId = assign[actionId]
      if (!motiveId) continue
      const action = actionMap[actionId]
      if (!action) continue
      if (action.correctFor.includes(motiveId)) ok += 1
    }
    return { correctCount: ok }
  }, [assign, actionMap])

  // ===== Navegación =====
  const handleNext = async () => {
    setDone(true)
    const point: 0 | 1 = correctCount >= 3 ? 1 : 0
    setPoint(COMPETENCE, LEVEL, 1, point)

    try {
      const LS_KEY = user ? sessionKeyFor(user.uid) : null;

      // Usa la sesión existente (estado o LS)
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

    router.push("/exercises/comp-4-2/intermedio/ej2")
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
              Medidas básicas para proteger tus datos personales
            </h2>

            {/* Instrucción */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Empareja cada medida preventiva con su objetivo.
                </p>
              </div>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pool de MOTIVOS — izquierda */}
              <section
                className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 p-4"
                {...droppableProps(dropToPool)}
              >
                <h3 className="font-semibold text-gray-900 mb-3">Objetivos</h3>

                <ul className="space-y-2 min-h-[110px]">
                  {pool.length === 0 && <li className="text-sm text-gray-400 italic">No quedan motivos.</li>}
                  {pool.map((id) => (
                    <li
                      key={id}
                      className="relative cursor-grab active:cursor-grabbing bg-white p-3 rounded-2xl border-2 border-gray-200 text-sm transition-all duration-200 hover:border-[#286575] hover:bg-gray-50"
                      {...draggableProps(id)}
                    >
                      {motiveMap[id].title}
                    </li>
                  ))}
                </ul>
              </section>

              {/* ACCIONES con slots — derecha (vacío dashed, asignado AZUL) */}
              <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {MEASURES.map((a) => {
                  const motiveId = assign[a.id]
                  const motive = motiveId ? motiveMap[motiveId] : null
                  const assigned = Boolean(motiveId)

                  return (
                    <div
                      key={a.id}
                      className={
                        assigned
                          ? "rounded-2xl border-2 p-3 bg-blue-50 border-blue-400"
                          : "rounded-2xl border-2 border-dashed p-3 bg-white border-gray-200"
                      }
                      {...droppableProps((mId) => dropToAction(a.id, mId))}
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{a.text}</h4>
                      <div className="min-h-[72px]">
                        {!motiveId ? (
                          <p className="text-xs text-gray-400 italic">Suelta aquí el motivo.</p>
                        ) : (
                          <div
                            className="p-2.5 rounded-xl border text-sm bg-white border-gray-200 flex items-start gap-2"
                            {...draggableProps(motiveId)}
                          >
                            <button
                              type="button"
                              onClick={() => unassign(a.id)}
                              className="rounded-md hover:bg-gray-100 p-1"
                              aria-label="Quitar motivo"
                              title="Quitar motivo"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                            <span className="text-gray-700">{motive?.title}</span>
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
