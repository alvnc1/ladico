// app/competence/4.3/advanced/ej1/panel/page.tsx
"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Timer,
  Coffee,
  Moon,
  Eye,
  Activity,
  Gamepad2,
  ArrowLeft,
  Shield,
} from "lucide-react"

export default function PanelMenuPage() {
  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/exercises/comp-4-3/avanzado/ej1">
              <Button variant="ghost" className="text-[#286575] hover:bg-white/30">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al enunciado
              </Button>
            </Link>
            <span className="text-[#2e6372] text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
              | 4.3 Avanzado · Panel de control
            </span>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          Panel de Bienestar Digital — Sebastián (16)
        </h1>

        {/* Grid estilo “settings” */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SettingCard
            icon={<Timer className="w-6 h-6 text-blue-600" />}
            title="Límite diario"
            desc="Define un máximo de horas por día."
            href="/exercises/comp-4-3/avanzado/ej1/panel/limits"
          />

          <SettingCard
            icon={<Coffee className="w-6 h-6 text-amber-600" />}
            title="Pantalla"
            desc="Configura pausas regulares."
            href="/exercises/comp-4-3/avanzado/ej1/panel/breaks"
          />

          <SettingCard
            icon={<Moon className="w-6 h-6 text-indigo-600" />}
            title="Sueño"
            desc="Bloquea el uso en horario nocturno."
            href="/exercises/comp-4-3/avanzado/ej1/panel/night"
          />

          <SettingCard
            icon={<Shield className="w-6 h-6 text-red-600" />}
            title="Control de contenido"
            desc="Gestiona el bloqueo de apps y webs con contenido inapropiado."
            href=""
          />

          <SettingCard
            icon={<Activity className="w-6 h-6 text-green-600" />}
            title="Actividad"
            desc="Recibe recordatorios tras inactividad."
            href="/exercises/comp-4-3/avanzado/ej1/panel/activity"
          />

          <SettingCard
            icon={<Gamepad2 className="w-6 h-6 text-pink-600" />}
            title="RRSS y Juegos"
            desc="Define ventanas seguras y un tope diario."
            href="/exercises/comp-4-3/avanzado/ej1/panel/social"
          />
        </div>
      </div>
    </div>
  )
}

function SettingCard({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow border rounded-2xl h-40 flex flex-col">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
              {icon}
            </div>
            <h2 className="font-semibold text-gray-800">{title}</h2>
          </div>
          <p className="text-sm text-gray-600">{desc}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
