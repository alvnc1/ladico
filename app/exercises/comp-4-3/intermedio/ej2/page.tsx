// app/exercises/comp-4-3/intermedio/ej2/page.tsx
"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

const COMPETENCE = "4.3"
const LEVEL = "intermedio"
/** ⚠️ CLAVE POR-USUARIO: evita pisar sesiones entre cuentas */
const SESSION_PREFIX = "session:4.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

const OPTIONS = [
  {
    key: "A",
    text: "Instalar un bloqueador de anuncios o ventanas emergentes en el navegador.",
    correct: true,
  },
  {
    key: "B",
    text: "Configurar horarios para navegar y respetar pausas digitales.",
    correct: true,
  },
  {
    key: "C",
    text: "Bajar el volumen de las notificaciones para que molesten menos.",
    correct: false,
  },
  {
    key: "D",
    text: "Dejar abierta la página en segundo plano.",
    correct: false,
  },
  {
    key: "E",
    text: "Diversificar actividades fuera de la web para reducir la dependencia.",
    correct: true,
  },
] as const

type Key = typeof OPTIONS[number]["key"]

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false);

  /* ==== Sesión por-usuario (evita mezclar) ==== */
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

  const [selected, setSelected] = useState<Set<Key>>(new Set())

  const toggle = (k: Key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  // Puntaje local (para resultados): 1 si A,B,E exactamente; 0 en otro caso
  const point: 0 | 1 = useMemo(() => {
    const chosen = Array.from(selected)
    const correctSet = new Set<Key>(["A", "B", "E"])
    if (chosen.length !== correctSet.size) return 0
    for (const c of chosen) if (!correctSet.has(c)) return 0
    return 1
  }, [selected])

  const handleNext = async () => {
    // Guarda el punto local (para anillo/resultados)
    setPoint(COMPETENCE, LEVEL, 2, point)

    // Asegura tener sesión fresca SIEMPRE en este clic (evita carreras)
    let sid = sessionId
    try {
      if (!sid && user) {
        // intenta recuperar de LS por-usuario
        const cached = typeof window !== "undefined" ? localStorage.getItem(sessionKeyFor(user.uid)) : null;
        if (cached) {
          sid = cached;
        } else {
          // crear si no existe todavía
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(sessionKeyFor(user.uid), id);
        }
      }
    } catch (e) {
      console.error("No se pudo (re)asegurar la sesión al guardar P2:", e);
    }

    // Marcamos siempre como respondida para avanzar a P3
    try {
      if (sid) {
        await markAnswered(sid, 1, true)
      }
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e)
    }

    router.push("/exercises/comp-4-3/intermedio/ej3")
  }

  const progressPct = (2 / 3) * 100

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
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Seleccionar formas sencillas de proteger el bienestar digital
            </h2>

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed">
                  Mientras navega en un sitio web, aparecen constantemente ventanas emergentes 
                  con ofertas limitadas y mensajes de que “otros usuarios ya aprovecharon la promoción”. 
                  Nota que estas 
                  notificaciones generan distracción y aumentan la sensación de presión 
                  por no perder oportunidades.
                </p>
                <p className="text-gray-700 leading-relaxed font-medium">
                ¿Cuáles de las siguientes acciones son formas adecuadas de protegerse frente a este tipo de estrategias?
                </p>
              </div>
            </div>
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
                        aria-label={`Opción`}
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
