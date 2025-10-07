"use client"

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

type LimitsState = {
  limitEnabled: boolean
  hours: number
  screenTimeReminders: boolean
  weeklySummary: boolean
}

const STORAGE_KEY = "ladico:4.3:advanced:limits"

function loadState(): LimitsState {
  if (typeof window === "undefined") {
    return { limitEnabled: false, hours: 1, screenTimeReminders: false, weeklySummary: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { limitEnabled: false, hours: 1, screenTimeReminders: false, weeklySummary: false }
    const p = JSON.parse(raw) as Partial<LimitsState>
    return {
      limitEnabled: !!p.limitEnabled,
      hours: typeof p.hours === "number" ? p.hours : 1, // 👈 por defecto 1
      screenTimeReminders: !!p.screenTimeReminders,
      weeklySummary: !!p.weeklySummary,
    }
  } catch {
    return { limitEnabled: false, hours: 1, screenTimeReminders: false, weeklySummary: false }
  }
}

export default function LimitDailyPage() {
  // ===== Estado persistente (carga al entrar) =====
  const [state, setState] = useState<LimitsState>(() => loadState())

  // guarda en localStorage cada vez que cambie algo
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const hoursOk = useMemo(
    () => !state.limitEnabled || (state.hours >= 6 && state.hours <= 8),
    [state.limitEnabled, state.hours]
  )

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
              | Configuración: Límite diario
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="border rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Límite diario de pantalla</CardTitle>
          </CardHeader>

          <CardContent className="divide-y divide-gray-200">
            {/* 1) ✅ Establecer horas (entre 6–8 h) */}
            <Row
              title="Establecer horas permitidas por día"
              description="Activa un máximo diario."
              active={state.limitEnabled}
              onToggle={(v) =>
                setState((s) => ({
                  ...s,
                  limitEnabled: v,
                  hours: v ? 1 : s.hours, // 👈 al activar, siempre arranca en 1
                }))
              }
            >
              {state.limitEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <label htmlFor="hours" className="text-sm text-gray-700">
                    Horas/día
                  </label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={24}
                    value={state.hours}
                    onChange={(e) => setState((s) => ({ ...s, hours: Number(e.target.value) }))}
                    className="w-24"
                  />
                </div>
              )}
            </Row>

            {/* 2) ❌ Recordatorios de tiempo en pantalla */}
            <Row
              title="Recordatorios de tiempo en pantalla"
              description="Muestra avisos ocasionales sobre tiempo usado."
              active={state.screenTimeReminders}
              onToggle={(v) => setState((s) => ({ ...s, screenTimeReminders: v }))}
            />

            {/* 3) ❌ Resumen semanal */}
            <Row
              title="Resumen de tiempos en pantalla al final de la semana"
              description="Entrega un informe semanal."
              active={state.weeklySummary}
              onToggle={(v) => setState((s) => ({ ...s, weeklySummary: v }))}
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
        {description && <div className="text-xs text-gray-600 mt-1 max-w-prose">{description}</div>}
        {children}
      </div>

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
