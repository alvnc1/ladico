// app/test/comp-4-3-advanced/results/page.tsx
"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, XCircle, CheckCircle, XCircle as XIcon } from "lucide-react"
import { finalizeSession } from "@/lib/testSession"

const PROGRESS_KEY = "ladico:4.3:avanzado:progress"
const SESSION_KEY = "session:4.3:Avanzado"
const SIM_P3_STORAGE_KEY = "ladico:4.3:avanzado:ej3"

function ResultsAdvancedContent() {
  const sp = useSearchParams()
  const router = useRouter()

  // Parámetros recibidos desde P3 (ej3/page.tsx)
  const score = Number.parseInt(sp.get("score") || "0")
  const passed = sp.get("passed") === "true"
  const correct = Number.parseInt(sp.get("correct") || "0")
  const total = Number.parseInt(sp.get("total") || "3")
  const competence = sp.get("competence") || "4.3"
  const level = (sp.get("level") || "avanzado").toLowerCase()

  // Resultados por pregunta
  const q1 = sp.get("q1") === "1"
  const q2 = sp.get("q2") === "1"
  const q3 = sp.get("q3") === "1"

  // Id de sesión opcional (si lo envías en la query)
  const sid = sp.get("sid") || null

  // Al montar: limpiar progreso local y, si viene sid, finalizar sesión en Firestore.
  // Además limpiamos la sesión cacheada y el SIM de la P3 para que el reintento empiece en blanco.
  useEffect(() => {
    try {
      localStorage.removeItem(PROGRESS_KEY)         // progreso nivel avanzado
      localStorage.removeItem(SESSION_KEY)          // sesión cacheada avanzado
      localStorage.removeItem(SIM_P3_STORAGE_KEY)   // estado SIM P3
    } catch {
      /* no-op */
    }

    ;(async () => {
      if (!sid) return
      try {
        await finalizeSession(sid, { correctCount: correct, total, passMin: 2 })
      } catch (e) {
        console.warn("No se pudo finalizar la sesión en resultados (Avanzado):", e)
      }
    })()
  }, [sid, correct, total])

  const handleBack = () => router.push("/dashboard")
  const handleRetry = () => router.push("/exercises/comp-4-3/avanzado/ej1")

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar como en /dashboard */}
      <Sidebar />

      {/* Contenido */}
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="w-full rounded-2xl border-0 shadow-xl overflow-hidden">
            {/* HEADER */}
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
                  Competencia {competence} – Protección de la salud y el bienestar · Nivel{" "}
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </div>
              </div>
            </CardHeader>

            {/* BODY */}
            <CardContent className="bg-[#f7fbfb]">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
                <div className="bg-white rounded-xl p-5 border shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">{total}</div>
                  <div className="text-gray-600 text-sm mt-1">Preguntas</div>
                </div>
                <div className="bg-green-50 rounded-xl p-5 border border-green-200 shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{correct}</div>
                  <div className="text-gray-600 text-sm mt-1">Correctas</div>
                </div>
                <div className="bg-red-50 rounded-xl p-5 border border-red-200 shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-red-600">{total - correct}</div>
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
                    +10 Ladico ganados
                  </div>
                )}
              </div>

              {/* Detalle de preguntas */}
              <div className="mt-8">
                <h3 className="font-semibold text-gray-900 mb-3">Detalle de preguntas evaluadas:</h3>

                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                    q1 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-gray-800">
                    {q1 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                    <span>Pregunta 1: Panel de bienestar (configuraciones adecuadas)</span>
                  </div>
                  <span className={`font-semibold ${q1 ? "text-green-700" : "text-red-700"}`}>
                    {q1 ? "Correcta" : "Incorrecta"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                    q2 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-gray-800">
                    {q2 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                    <span>Pregunta 2: Tecnología y objetivo por grupo (3 grupos)</span>
                  </div>
                  <span className={`font-semibold ${q2 ? "text-green-700" : "text-red-700"}`}>
                    {q2 ? "Correcta" : "Incorrecta"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${
                    q3 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 text-gray-800">
                    {q3 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                    <span>Pregunta 3: Simulación de acoso en línea (bloqueo, privacidad, solicitudes)</span>
                  </div>
                  <span className={`font-semibold ${q3 ? "text-green-700" : "text-red-700"}`}>
                    {q3 ? "Correcta" : "Incorrecta"}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleBack}
                  className="flex-1 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl py-3 shadow"
                >
                  Volver al Dashboard
                </Button>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3"
                >
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

export default function ResultsAdvancedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#286675]" />
        </div>
      }
    >
      <ResultsAdvancedContent />
    </Suspense>
  )
}
