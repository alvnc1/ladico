"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, XCircle, CheckCircle, XCircle as XIcon } from "lucide-react"

function AdvancedResultsContent() {
  const sp = useSearchParams()
  const router = useRouter()

  // score puede venir en base a 3 o a 10 (da igual para la UI)
  const score = Number.parseInt(sp.get("score") || "0")
  const passed = sp.get("passed") === "true"
  const level = (sp.get("level") || "avanzado").toLowerCase()
  const competence = sp.get("competence") || "1.3-avanzado"

  // Forzamos mostrar 3 preguntas
  const total = 3

  // Preferir flags por paso (q1,q2,q3). Si no vienen, aproximamos desde 'correct/total' original.
  const q1 = sp.get("q1") === "1"
  const q2 = sp.get("q2") === "1"
  const q3 = sp.get("q3") === "1"

  const hasStepFlags = sp.has("q1") || sp.has("q2") || sp.has("q3")

  const correctParam = Number.parseInt(sp.get("correct") || "0")
  const totalParam = Number.parseInt(sp.get("total") || "10") || 10

  const correctSteps = hasStepFlags
    ? [q1, q2, q3].filter(Boolean).length
    : Math.min(3, Math.max(0, Math.round((correctParam / totalParam) * 3))) // fallback suave

  const incorrectSteps = total - correctSteps

  const handleBack = () => router.push("/dashboard")
  const handleRetry = () => router.push("/exercises/comp-1-3-advanced/ej1")

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="w-full rounded-2xl border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-white">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {passed ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center shadow-md">
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center shadow-md">
                      <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                    </div>
                  )}
                </div>

                <CardTitle className="text-2xl sm:text-3xl font-bold text-[#3a5d61]">
                  {passed ? "¡Felicitaciones!" : "Sigue practicando"}
                </CardTitle>

                <p className="mt-1 text-gray-600">
                  {passed
                    ? "Has completado exitosamente esta competencia"
                    : "Necesitas al menos 2 respuestas correctas para avanzar"}
                </p>

                <div className="mt-2 text-xs text-gray-500">
                  1.3 Gestión de Datos, Información y Contenidos Digitales · Nivel{" "}
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="bg-[#f7fbfb]">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
                <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">{total}</div>
                  <div className="text-gray-600 text-sm mt-1">Preguntas</div>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-200 shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{correctSteps}</div>
                  <div className="text-gray-600 text-sm mt-1">Correctas</div>
                </div>
                <div className="bg-red-50 rounded-xl p-5 border border-red-200 shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-red-600">{incorrectSteps}</div>
                  <div className="text-gray-600 text-sm mt-1">Incorrectas</div>
                </div>
              </div>

              {/* Porcentaje */}
              <div className="mt-6 bg-white rounded-2xl p-8 border shadow-sm text-center">
                <div className="text-4xl sm:text-5xl font-bold text-[#3a5d61]">{score}%</div>
                <div className="text-gray-600 mt-1">Puntuación obtenida</div>
                {passed && (
                  <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    +15 Ladico ganados (Avanzado)
                  </div>
                )}
              </div>

              {/* Detalle por paso */}
              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-3">Detalle de preguntas evaluadas:</h3>

                {[
                  { ok: hasStepFlags ? q1 : correctSteps >= 1, label: "Pregunta 1: Análisis estadístico" },
                  { ok: hasStepFlags ? q2 : correctSteps >= 2, label: "Pregunta 2: Tabla dinámica" },
                  { ok: hasStepFlags ? q3 : correctSteps >= 3, label: "Pregunta 3: Gráfico dinámico" },
                ].map((it, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                      it.ok ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-gray-800">
                      {it.ok ? (
                        <CheckCircle className="w-5 h-5 text-green-700" />
                      ) : (
                        <XIcon className="w-5 h-5 text-red-700" />
                      )}
                      <span>{it.label}</span>
                    </div>
                    <span className={`font-semibold ${it.ok ? "text-green-700" : "text-red-700"}`}>
                      {it.ok ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Acciones */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => router.push("/dashboard")} className="flex-1 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl py-3 shadow">
                  Volver al Dashboard
                </Button>
                <Button onClick={() => router.push("/exercises/comp-1-3-advanced/ej1")} variant="outline" className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3">
                  Repetir ejercicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function AdvancedTestResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#286675]" />
      </div>
    }>
      <AdvancedResultsContent />
    </Suspense>
  )
}
