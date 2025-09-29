// app/exercises/comp-4-3/avanzado/ej2/web/page.tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

/**
 * Versión con “botones” NO intuitivos:
 * - Todos los CTA del sitio simulado se muestran solo como TEXTO (sin fondo/borde),
 *   con área clicable mínima → error intencional para detectar (adultos mayores).
 * Se mantienen los otros defectos:
 *  1) Aviso con texto pequeño + bajo contraste.
 *  2) Formulario sin <label> visibles (solo placeholder).
 */

function TileSVG({
  label = "",
  variant = "generic",
  className = "w-full h-full",
}: {
  label?: string
  variant?:
    | "hero"
    | "calendar"
    | "lab"
    | "emergency"
    | "vaccine"
    | "telemed"
    | "insurance"
    | "medgen"
    | "cardio"
    | "oftalmo"
    | "derma"
    | "nutri"
    | "kine"
    | "patient"
    | "phone"
    | "hall"
    | "generic"
  className?: string
}) {
  const bg =
    {
      hero: "#e6fff7",
      calendar: "#e6f7ff",
      lab: "#fff3e6",
      emergency: "#ffe6e6",
      vaccine: "#f0e6ff",
      telemed: "#e6fff9",
      insurance: "#f7f7e6",
      medgen: "#e6f7ff",
      cardio: "#ffe6ec",
      oftalmo: "#e6f0ff",
      derma: "#fff0f0",
      nutri: "#eaffea",
      kine: "#f0fff6",
      patient: "#f0f7ff",
      phone: "#f7f0ff",
      hall: "#f5f5f5",
      generic: "#eef6f8",
    }[variant] || "#eef6f8"

  const icon = (() => {
    switch (variant) {
      case "hero":
      case "medgen":
        return "👩‍⚕️"
      case "calendar":
        return "📅"
      case "lab":
        return "🧪"
      case "emergency":
        return "🚑"
      case "vaccine":
        return "💉"
      case "telemed":
        return "💻"
      case "insurance":
        return "📄"
      case "cardio":
        return "❤️"
      case "oftalmo":
        return "👁️"
      case "derma":
        return "🩹"
      case "nutri":
        return "🥗"
      case "kine":
        return "🧘"
      case "patient":
        return "🙂"
      case "phone":
        return "📱"
      case "hall":
        return "🏥"
      default:
        return "🏥"
    }
  })()

  return (
    <svg viewBox="0 0 400 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill={`url(#g-${variant})`} rx="16" />
      <g transform="translate(24,24)">
        <rect x="0" y="0" width="352" height="152" rx="12" fill="white" opacity="0.6" />
        <rect x="12" y="16" width="220" height="16" rx="8" fill="#cfe3e9" />
        <rect x="12" y="44" width="180" height="12" rx="6" fill="#deecf1" />
        <rect x="12" y="64" width="160" height="12" rx="6" fill="#deecf1" />
        <rect x="12" y="84" width="210" height="12" rx="6" fill="#deecf1" />
        <rect x="12" y="114" width="90" height="18" rx="9" fill="#2f7d87" opacity=".8" />
        <text x="320" y="48" fontSize="60" textAnchor="middle" dominantBaseline="middle">
          {icon}
        </text>
      </g>
      {label ? (
        <text x="20" y="190" fontSize="14" fill="#245b63">
          {label}
        </text>
      ) : null}
    </svg>
  )
}

export default function HealthHomeSimple() {
  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* ===== Encabezado 4.3 Avanzado · Ejercicio 2 ===== */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/exercises/comp-4-3/avanzado/ej2">
              <Button variant="ghost" className="text-[#286575] hover:bg-white/30">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver al enunciado
              </Button>
            </Link>
            <span className="text-[#2e6372] text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
              | 4.3 Avanzado · Ejercicio 2
            </span>
          </div>
        </div>
      </div>

      {/* ===== Contenido de la “web de salud” ===== */}
      <div className="min-h-screen bg-[#f7fbfd] text-gray-900">
        {/* Header del sitio simulado */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600" />
              <span className="text-lg font-semibold text-teal-700">Clínica Vida</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="#" className="hover:text-teal-700">Especialidades</Link>
              <Link href="#" className="hover:text-teal-700">Profesionales</Link>
              <Link href="#" className="hover:text-teal-700">Exámenes</Link>
              <Link href="#" className="hover:text-teal-700">Contacto</Link>
              {/* CTA degradado a TEXTO (no botón) → error intencional */}
              <Link href="#reserva" className="text-teal-700 text-sm hover:underline">
                Reservar hora
              </Link>
            </nav>
          </div>
          {/* DEFECTO 1: texto pequeño + contraste bajo */}
          <div className="bg-[#eaf4f6]">
            <div className="max-w-6xl mx-auto px-4 py-2">
              <p className="text-[12px] text-[#8aa2ad]">
                Aviso importante: cambios en los horarios de atención durante el fin de semana.
              </p>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 px-4 py-10">
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-teal-800 leading-tight">
                Tu salud, en buenas manos
              </h1>
              <p className="mt-3 text-base text-gray-700">
                Agenda tus horas, revisa resultados y accede a nuestras especialidades desde un solo lugar.
              </p>
              <div className="mt-6 flex items-center gap-6">
                {/* Ambos CTA como TEXTO simple (sin recuadro) */}
                <Link href="#reserva" className="text-teal-700 text-sm hover:underline">
                  Reservar ahora
                </Link>
                <Link href="#especialidades" className="text-teal-700 text-sm hover:underline">
                  Ver especialidades
                </Link>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-200">
              <TileSVG variant="hero" className="w-full h-72" label="Equipo médico" />
            </div>
          </div>
        </section>

        {/* Accesos rápidos */}
        <section className="bg-[#f0f6f8]">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h2 className="text-2xl font-semibold text-teal-800">Accesos rápidos</h2>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: "Pedir hora", variant: "calendar" as const },
                { name: "Resultados", variant: "lab" as const },
                { name: "Urgencias", variant: "emergency" as const },
                { name: "Vacunas", variant: "vaccine" as const },
                { name: "Telemedicina", variant: "telemed" as const },
                { name: "Coberturas", variant: "insurance" as const },
              ].map((item) => (
                <Link
                  key={item.name}
                  href="#"
                  className="rounded-xl bg-white border border-gray-200 p-4 hover:shadow-sm hover:border-teal-200 transition"
                >
                  <div className="w-full h-20 rounded-lg mb-3 overflow-hidden">
                    <TileSVG variant={item.variant} />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">Ingresar</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Especialidades */}
        <section id="especialidades" className="bg-white">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-teal-800">Especialidades</h2>
              {/* “Ver todas” como texto */}
              <Link href="#" className="text-teal-700 text-sm hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Medicina General", variant: "medgen" as const },
                { name: "Cardiología", variant: "cardio" as const },
                { name: "Oftalmología", variant: "oftalmo" as const },
                { name: "Dermatología", variant: "derma" as const },
                { name: "Nutrición", variant: "nutri" as const },
                { name: "Kinesiología", variant: "kine" as const },
              ].map((s) => (
                <div
                  key={s.name}
                  className="rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-sm hover:border-teal-200 transition flex flex-col"
                >
                  <TileSVG variant={s.variant} className="w-full h-40" />
                  <div className="p-4 flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    {/* “Reservar” como texto, area mínima */}
                    <Link href="#reserva" className="text-teal-700 text-sm hover:underline">
                      Reservar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reserva rápida (DEFECTO 2: sin labels visibles) */}
        <section id="reserva" className="bg-[#f0f6f8]">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-teal-800">Reserva rápida</h2>
              <p className="mt-1 text-sm text-gray-600">Completa los datos para buscar disponibilidad.</p>
              <form className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nombre y apellido"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="RUT / DNI"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Especialidad"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                {/* “Buscar horas” como TEXTO (no botón) */}
                <button
                  type="button"
                  className="text-teal-700 text-sm p-0 h-auto bg-transparent hover:underline"
                >
                  Buscar horas
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#f0f6f8] border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-600" />
                <span className="font-semibold text-teal-800">Clínica Vida</span>
              </div>
              <p className="mt-3 text-gray-600">Cuidamos tu salud con tecnología y un equipo humano cercano.</p>
            </div>
            <div>
              <h3 className="font-semibold text-teal-800">Enlaces</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="#" className="hover:text-teal-700">Especialidades</Link></li>
                <li><Link href="#" className="hover:text-teal-700">Exámenes</Link></li>
                <li><Link href="#" className="hover:text-teal-700">Términos y condiciones</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-teal-800">Contacto</h3>
              <ul className="mt-3 space-y-2 text-gray-600">
                <li>Tel: +56 2 2345 6789</li>
                <li>Av. Salud 123, Santiago</li>
                <li>contacto@clinicavida.cl</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500">
              © 2025 Clínica Vida. Todos los derechos reservados.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
