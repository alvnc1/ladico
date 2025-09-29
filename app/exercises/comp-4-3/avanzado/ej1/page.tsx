// app/exercises/comp-4-3/advanced/ej1/page.tsx
"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ensureSession, markAnswered } from "@/lib/testSession"
import { useAuth } from "@/contexts/AuthContext"
import { setPoint } from "@/lib/levelProgress"


const COMPETENCE = "4.3" as const
const LEVEL = "avanzado" as const
/** ⚠️ CLAVE POR-USUARIO: evita pisar sesiones entre cuentas */
const SESSION_PREFIX = "session:4.3:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

// ====== keys del panel (para limpiar cuando cambia de usuario) ======
const ADV_KEYS = [
  "ladico:4.3:advanced:limits",
  "ladico:4.3:advanced:breaks",
  "ladico:4.3:advanced:night",
  "ladico:4.3:advanced:activity",
  "ladico:4.3:advanced:social",
]

// ---- Lectores de cada área desde localStorage ----
type LimitsState = {
  limitEnabled: boolean
  hours: number
  screenTimeReminders?: boolean
  weeklySummary?: boolean
}
function readLimits(): LimitsState {
  try {
    const raw = localStorage.getItem("ladico:4.3:advanced:limits")
    if (!raw) return { limitEnabled: false, hours: 6 }
    const p = JSON.parse(raw) as Partial<LimitsState>
    return {
      limitEnabled: !!p.limitEnabled,
      hours: typeof p.hours === "number" ? p.hours : 6,
      screenTimeReminders: !!p.screenTimeReminders,
      weeklySummary: !!p.weeklySummary,
    }
  } catch {
    return { limitEnabled: false, hours: 6 }
  }
}

type BreaksState = {
  blueLightFilter: boolean
  autoBrightness: boolean
  autoLock?: boolean
}
function readBreaks(): BreaksState {
  try {
    const raw = localStorage.getItem("ladico:4.3:advanced:breaks")
    if (!raw) return { blueLightFilter: false, autoBrightness: false, autoLock: false }
    const p = JSON.parse(raw) as Partial<BreaksState>
    return {
      blueLightFilter: !!p.blueLightFilter,
      autoBrightness: !!p.autoBrightness,
      autoLock: !!p.autoLock,
    }
  } catch {
    return { blueLightFilter: false, autoBrightness: false, autoLock: false }
  }
}

type NightState = {
  restSchedule: boolean
  muteAll?: boolean
  muteCalls?: boolean
}
function readNight(): NightState {
  try {
    const raw = localStorage.getItem("ladico:4.3:advanced:night")
    if (!raw) return { restSchedule: false }
    const p = JSON.parse(raw) as Partial<NightState>
    return {
      restSchedule: !!p.restSchedule,
      muteAll: !!p.muteAll,
      muteCalls: !!p.muteCalls,
    }
  } catch {
    return { restSchedule: false }
  }
}

type ActivityState = {
  mandatoryBreak45: boolean
  friendlyAfter3h?: boolean
}
function readActivity(): ActivityState {
  try {
    const raw = localStorage.getItem("ladico:4.3:advanced:activity")
    if (!raw) return { mandatoryBreak45: false }
    const p = JSON.parse(raw) as Partial<ActivityState>
    return {
      mandatoryBreak45: !!p.mandatoryBreak45,
      friendlyAfter3h: !!p.friendlyAfter3h,
    }
  } catch {
    return { mandatoryBreak45: false }
  }
}

type SocialState = {
  dailyLimitEnabled: boolean
}
function readSocial(): SocialState {
  try {
    const raw = localStorage.getItem("ladico:4.3:advanced:social")
    if (!raw) return { dailyLimitEnabled: false }
    const p = JSON.parse(raw) as Partial<SocialState>
    return { dailyLimitEnabled: !!p.dailyLimitEnabled }
  } catch {
    return { dailyLimitEnabled: false }
  }
}

export default function Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 🔐 Reset visual si cambia de usuario: borra los estados del panel para que SIEMPRE inicie igual.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!user) return
    try {
      const lastUser = localStorage.getItem("ladico:lastUser")
      if (lastUser !== user.uid) {
        ADV_KEYS.forEach((k) => localStorage.removeItem(k))
        localStorage.setItem("ladico:lastUser", user.uid)
      }
    } catch {
      /* no-op */
    }
  }, [user])

  // crea/recupera sesión Avanzado (4.3)
  /* ==== Sesión por-usuario (evita mezclar) ==== */
    // 🔒 Guard contra doble ejecución de efectos (StrictMode) y carreras
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

  const progressPct = 100 / 3 // Pregunta 1 de 3

  const handleNext = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      // Asegura sesión en el click si aún no llegó la del useEffect
      let sid = sessionId;
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
            level: "Avanzado",
            totalQuestions: 3,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(sessionKeyFor(user.uid), id);
        }
      }

      // Leer el estado ACTUAL de cada área (el panel está en otra pestaña)
      const limits = readLimits()
      const breaks = readBreaks()
      const night = readNight()
      const activity = readActivity()
      const social = readSocial()

      // Reglas por área (1 punto por área)
      const limitsOk = limits.limitEnabled && [6, 7, 8].includes(limits.hours)
      const breaksOk = breaks.blueLightFilter && breaks.autoBrightness
      const nightOk = night.restSchedule === true
      const activityOk = activity.mandatoryBreak45 === true
      const socialOk = social.dailyLimitEnabled === true

      const areaPoints =
        (limitsOk ? 1 : 0) +
        (breaksOk ? 1 : 0) +
        (nightOk ? 1 : 0) +
        (activityOk ? 1 : 0) +
        (socialOk ? 1 : 0)

      // Pregunta correcta si suma 3, 4 o 5
      const point: 0 | 1 = areaPoints >= 3 ? 1 : 0

      // Guarda el punto local (para anillo/resultados)
      setPoint(COMPETENCE, LEVEL, 1, point)

      // Marca P1 "respondida" SIEMPRE para avanzar (independiente de si fue correcta)
      await markAnswered(sid!, 0, true)

      // Avanza al siguiente ejercicio
      router.push("/exercises/comp-4-3/avanzado/ej2")
    } catch (e) {
      console.warn("No se pudo completar el guardado de P1:", e)
    } finally {
      setIsSaving(false)
    }
  }

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
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Protección y autocuidado en el uso de tecnologías
            </h2>

            <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
              <p className="text-gray-700 leading-relaxed">
                En el panel de bienestar digital de una aplicación familiar, tienes acceso al perfil de Sebastián, 
                un adolescente de 16 años. Los registros de la última semana muestran los siguientes patrones:
              </p>
              <ul className="list-disc ml-5 mt-3 space-y-1 text-gray-700">
                <li>12 horas diarias de conexión, en su mayoría por la noche.</li>
                <li>Uso intensivo de redes sociales y juegos en línea.</li>
                <li>Ningún descanso registrado durante sesiones &gt; 3 horas.</li>
                <li>Quejas de dolores de cabeza y fatiga visual.</li>
                <li>Bajo rendimiento escolar y menos interacción presencial con sus amigos.</li>
              </ul>

              <p className="text-gray-700 leading-relaxed mt-4">
                Analiza la información del caso y selecciona las configuraciones más adecuadas en el panel 
                de bienestar digital para reducir el impacto negativo del uso intensivo de la tecnología.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
              <Link
                href="/exercises/comp-4-3/avanzado/ej1/panel"
                className="text-blue-600 hover:underline font-medium"
              >
                Ir a panel
              </Link>
            </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleNext}
                disabled={!user || isSaving}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89] disabled:opacity-60"
              >
                {isSaving ? "Siguiente" : "Siguiente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
