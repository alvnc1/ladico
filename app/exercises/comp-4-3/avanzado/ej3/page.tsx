// app/exercises/comp-4-3/advanced/ej3/page.tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered, finalizeSession } from "@/lib/testSession"
import { getProgress, getPoint, levelPoints, isLevelPassed, setPoint } from "@/lib/levelProgress"

const STORAGE_KEY = "ladico:4.3:avanzado:ej3"
const COMPETENCE = "4.3" as const
const LEVEL = "avanzado" as const
const QUESTION_INDEX = 3 // Pregunta 3 de 3 (1-based)
const SESSION_PREFIX = "session:4.3:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/** Limpia el estado del SIM de P3 */
function clearSimStorage() {
  try {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

type Persisted = {
  chat?: { pablo?: { blocked?: boolean; muted?: boolean } }
  settings?: { isPrivate?: boolean; disableMsgRequests?: boolean }
}

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : {}
  } catch {
    return {}
  }
}

export default function AdvancedEj3Page() {
  const router = useRouter()
  const { user, userData } = useAuth()                     // ⬅️ necesitamos el rol
  const isTeacher = userData?.role === "profesor"          // ⬅️ flag profesor
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Para evitar dobles creaciones en StrictMode/carreras
  const ensuringRef = useRef(false)

  // 0) Reset por CAMBIO DE USUARIO (evita arrastrar estado entre cuentas)
  useEffect(() => {
    if (typeof window === "undefined" || !user) return
    const lastUser = localStorage.getItem("ladico:lastUser")
    if (lastUser !== user.uid) {
      // usuario cambió → limpiar SIM y marcar nuevo usuario
      clearSimStorage()
      localStorage.setItem("ladico:lastUser", user.uid)
      // limpiar flags de reseteo de sesiones viejas
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sim:4.3:avanzado:ej3:reset:"))
        .forEach((k) => localStorage.removeItem(k))
    }
  }, [user])

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
          level: "Avanzado",
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

  // 2) Reset por SESIÓN (solo una vez por id de sesión)
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return
    const resetFlagKey = `sim:4.3:avanzado:ej3:reset:${sessionId}`
    const alreadyReset = localStorage.getItem(resetFlagKey)
    if (!alreadyReset) {
      // primera vez que abrimos P3 con esta sesión → limpiar el SIM
      clearSimStorage()
      localStorage.setItem(resetFlagKey, "1")
    }
  }, [sessionId])

  const progressPct = 100 // Pregunta 3 de 3

  const handleNext = useCallback(async () => {
    // 1) Leer el estado MÁS RECIENTE del SIM
    const persisted = loadPersisted()
    const blocked = !!persisted.chat?.pablo?.blocked
    const muted = !!persisted.chat?.pablo?.muted
    const isPrivate = !!persisted.settings?.isPrivate
    const disableMsgRequests = !!persisted.settings?.disableMsgRequests

    // 2) Calcular subpuntos y punto de la P3 (2 o 3 → 1; de lo contrario 0)
    let sub = 0
    if (blocked) sub += 1
    if (isPrivate) sub += 1
    if (disableMsgRequests) sub += 1
    if (muted) sub -= 1
    const p3: 0 | 1 = sub >= 2 ? 1 : 0

    // 3) Guardar punto local (nivel/competencia)
    setPoint(COMPETENCE, LEVEL, QUESTION_INDEX, p3)

    // 4) Marcar P3 en testSessions (índice 0-based → 2)
    const sid =
      sessionId ||
      (typeof window !== "undefined" && user ? localStorage.getItem(sessionKeyFor(user.uid)) : null)

    if (sid) {
      try {
        await markAnswered(sid, QUESTION_INDEX - 1, p3 === 1)
      } catch (e) {
        console.warn("No se pudo marcar P3 como respondida:", e)
      }
    }

    // 5) Consolidar progreso local
    const prog = getProgress(COMPETENCE, LEVEL)
    let totalPts = levelPoints(prog) // 0..3
    let passed = isLevelPassed(prog) // >=2

    // ⬅️ Forzar aprobación si es PROFESOR
    if (isTeacher) {
      totalPts = 3
      passed = true
    }

    const score = Math.round((totalPts / 3) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    // Flags para que el dashboard muestre completado
    try {
      if (typeof window !== "undefined") {
        const flag1 = `level:${COMPETENCE}:${LEVEL}:completed`
        const flag2 = `ladico:completed:${COMPETENCE}:${LEVEL}`
        if (passed) {
          localStorage.setItem(flag1, "1")
          localStorage.setItem(flag2, "1")
        } else {
          localStorage.removeItem(flag1)
          localStorage.removeItem(flag2)
        }
        localStorage.setItem("ladico:progress:version", String(Date.now()))
      }
    } catch {
      /* no-op */
    }

    if (sid) {
      try {
        await finalizeSession(sid, { correctCount: totalPts, total: 3, passMin: 2 })
        if (typeof window !== "undefined" && user) {
          localStorage.removeItem(localStorage.getItem(sessionKeyFor(user.uid)) + ":" + user.uid)
        }
      } catch (e) {
        console.warn("No se pudo finalizar la sesión de test:", e)
      }
    }

    const qs = new URLSearchParams({
      score: String(score),
      passed: String(passed),
      correct: String(totalPts),
      total: "3",
      competence: COMPETENCE,
      level: LEVEL,
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      sub3: String(sub),
      sid: sid ?? "",
      refresh: String(Date.now()),
      passMin: "2",                       // (opcional) mínimo para aprobar
      compPath: "comp-4-3",               // <- necesario para rutas de “retry/next level”
      retryBase: "/exercises/comp-4-3/avanzado", // (opcional) si quieres forzarlo
      // Etiquetas opcionales
      ex1Label: "Ejercicio 1: Protección y autocuidado en el uso de tecnologías",
      ex2Label: "Ejercicio 2: Tecnologías para la inclusión social",
      ex3Label: "Ejercicio 3: Aplica medidas integrales de protección ante acoso en línea",
      // Métricas opcionales (si aplica)
      // pairs: `${correctPairs}/${totalPairs}`,
      // kscore: String(percent),
    })

    // 2) Empuja SIEMPRE a la misma página:
    router.push(`/test/results?${qs.toString()}`)
  }, [router, sessionId, user?.uid, isTeacher])

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
            Pregunta 3 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-[#286575] rounded-full transition-all duration-500"
            style={{ width: `100%` }}
          />
        </div>
      </div>

      {/* Enunciado */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/20 w-full max-w-[840px] mx-auto">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Aplica medidas integrales de protección ante acoso en línea
            </h2>

            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
              <p className="text-gray-700 leading-relaxed">
                Estás navegando en una red social. En tu bandeja de mensajes privados,
                recibes una serie de mensajes amenazantes y de acoso de un remitente que no conoces.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Usa las herramientas de la plataforma para frenar el acoso y proteger tu privacidad a futuro.
              </p>
              {/* Link al SIM (nueva pestaña) */}
              <p className="text-sm mt-4">
                <Link
                  href="/exercises/comp-4-3/avanzado/ej3/sim"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Ir a bandeja de mensajes
                </Link>
              </p>
            </div>
            {/* Botón Finalizar (evalúa y registra punto) */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleNext}
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
