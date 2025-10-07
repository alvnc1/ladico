// app/exercises/comp-4-3/advanced/ej1/panel/activity/page.tsx
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

/** ===== Persistencia local (igual que limits/night) ===== */
type ActivityState = {
  mandatoryBreak45: boolean  // ✅ buena
  friendlyAfter3h: boolean   // ❌ mala
}

const STORAGE_KEY = "ladico:4.3:advanced:activity"

function loadState(): ActivityState {
  if (typeof window === "undefined") {
    return { mandatoryBreak45: false, friendlyAfter3h: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { mandatoryBreak45: false, friendlyAfter3h: false }
    const p = JSON.parse(raw) as Partial<ActivityState>
    return {
      mandatoryBreak45: !!p.mandatoryBreak45,
      friendlyAfter3h: !!p.friendlyAfter3h,
    }
  } catch {
    return { mandatoryBreak45: false, friendlyAfter3h: false }
  }
}

export default function ActivityPage() {
  // ===== Estado persistente (carga al entrar) =====
  const [state, setState] = useState<ActivityState>(() => loadState())

  // Guarda en localStorage cada vez que cambie algo
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/exercises/comp-4-3/avanzado/ej1/panel">
              <Button variant="ghost" className="text-[#286575] hover:bg-white/30">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al panel
              </Button>
            </Link>
            <span className="text-[#2e6372] text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
              | Configuración: Actividad
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="border rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Actividad</CardTitle>
          </CardHeader>

          <CardContent className="divide-y divide-gray-200">
            {/* ✅ Programar recordatorios obligatorios cada 45 minutos */}
            <Row
              title="Programar recordatorios de pausa activa obligatorios cada 45 minutos de uso"
              description="Interrumpe la sesión e invita a estirarse o caminar brevemente."
              active={state.mandatoryBreak45}
              onToggle={(v) => setState((s) => ({ ...s, mandatoryBreak45: v }))}
            >
              {state.mandatoryBreak45 && (
                <div className="mt-2 text-xs text-gray-600">
                  Frecuencia fijada: <b>cada 45 minutos</b>.
                </div>
              )}
            </Row>

            {/* ❌ Notificación amistosa después de 3 horas */}
            <Row
              title="Notificación cada 3 horas con resumen de actividad"
              description="Resumen sobre uso de aplicaciones."
              active={state.friendlyAfter3h}
              onToggle={(v) => setState((s) => ({ ...s, friendlyAfter3h: v }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({
  title,
  description,
  active,
  onToggle,
  children,
}: {
  title: string
  description?: string
  active: boolean
  onToggle: (v: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="pr-4">
        <div className="flex items-center gap-3">
          <div className="font-medium text-gray-900">{title}</div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
            }`}
          >
            {active ? "Activado" : "Desactivado"}
          </span>
        </div>
        {description && (
          <div className="text-xs text-gray-600 mt-1 max-w-prose">{description}</div>
        )}
        {children}
      </div>

      {/* Switch custom: apagado gris, perilla negra; encendido verde */}
      <button
        onClick={() => onToggle(!active)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          active ? "bg-emerald-600" : "bg-gray-300"
        }`}
        aria-pressed={active}
        aria-label={title}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-black shadow transition-transform ${
            active ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}
