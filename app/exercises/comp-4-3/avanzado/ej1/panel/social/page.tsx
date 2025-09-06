// app/exercises/comp-4-3/advanced/ej1/panel/social/page.tsx
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

type SocialState = {
  dailyLimitEnabled: boolean // ✅ buena
  hours: number              // debe ser 2 cuando está activo
}

const STORAGE_KEY = "ladico:4.3:advanced:social"

function loadState(): SocialState {
  if (typeof window === "undefined") return { dailyLimitEnabled: false, hours: 2 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dailyLimitEnabled: false, hours: 2 }
    const p = JSON.parse(raw) as Partial<SocialState>
    return {
      dailyLimitEnabled: !!p.dailyLimitEnabled,
      hours: typeof p.hours === "number" ? p.hours : 2,
    }
  } catch {
    return { dailyLimitEnabled: false, hours: 2 }
  }
}

export default function SocialPage() {
  // ===== Estado persistente =====
  const [state, setState] = useState<SocialState>(() => loadState())

  // Guardar en localStorage en cada cambio
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const hoursOk = useMemo(
    () => !state.dailyLimitEnabled || state.hours === 2,
    [state.dailyLimitEnabled, state.hours]
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
              | Configuración: RRSS/Juegos
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="border rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">RRSS / Juegos</CardTitle>
          </CardHeader>

          <CardContent className="divide-y divide-gray-200">
            {/* ✅ Establecer un límite diario de 2 horas */}
            <Row
              title="Establecer un límite diario de 2 horas para la categoría"
              description="Restringe el uso de redes sociales y juegos en línea a un máximo de 2 horas al día."
              active={state.dailyLimitEnabled}
              onToggle={(v) => setState((s) => ({ ...s, dailyLimitEnabled: v }))}
            >
              {state.dailyLimitEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <label htmlFor="hours" className="text-sm text-gray-700">
               
                  </label>
  
                </div>
              )}
            </Row>
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
