// app/exercises/comp-4-3/advanced/ej1/panel/night/page.tsx
"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type NightState = {
  restSchedule: boolean
  muteAll: boolean
  muteCalls: boolean
}

const STORAGE_KEY = "ladico:4.3:advanced:night"

function loadState(): NightState {
  if (typeof window === "undefined") {
    return { restSchedule: false, muteAll: false, muteCalls: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { restSchedule: false, muteAll: false, muteCalls: false }
    const p = JSON.parse(raw) as Partial<NightState>
    return {
      restSchedule: !!p.restSchedule,
      muteAll: !!p.muteAll,
      muteCalls: !!p.muteCalls,
    }
  } catch {
    return { restSchedule: false, muteAll: false, muteCalls: false }
  }
}

export default function NightPage() {
  // Estado persistente
  const [state, setState] = useState<NightState>(() => loadState())

  // Guardar en localStorage cada vez que cambie algo
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
              | Configuración: Sueño
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="border rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Sueño</CardTitle>
          </CardHeader>

          <CardContent className="divide-y divide-gray-200">
            {/* ✅ Horario de descanso programado */}
            <Row
              title="Horario de descanso programado desde las 22:00"
              description="Restringe el uso del dispositivo en la noche para proteger el sueño."
              active={state.restSchedule}
              onToggle={(v) => setState((s) => ({ ...s, restSchedule: v }))}
            />

            {/* ❌ Silenciar todas las notificaciones */}
            <Row
              title="Silenciar todas las notificaciones desde las 22:00"
              description="Bloquea notificaciones."
              active={state.muteAll}
              onToggle={(v) => setState((s) => ({ ...s, muteAll: v }))}
            />

            {/* ❌ Silenciar llamadas */}
            <Row
              title="Silenciar llamadas desde las 22:00"
              description="Bloquea llamadas."
              active={state.muteCalls}
              onToggle={(v) => setState((s) => ({ ...s, muteCalls: v }))}
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

      {/* Switch custom */}
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
