"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Trophy, RotateCcw, FileSpreadsheet } from "lucide-react"
import { Suspense } from "react"

function AdvancedTestResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const score = Number.parseInt(searchParams.get("score") || "0")
  const passed = searchParams.get("passed") === "true"
  const correctAnswers = Number.parseInt(searchParams.get("correct") || "0")
  const totalQuestions = Number.parseInt(searchParams.get("total") || "10")
  const competence = searchParams.get("competence") || "1.3-avanzado"

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  const handleRetakeTest = () => {
    router.push("/exercises/comp-1-3-advanced/ej1")
  }

  return (
    <div className="min-h-screen Ladico-gradient flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-3xl shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
        <CardHeader className="text-center bg-gradient-to-b from-white to-gray-50 pb-6 sm:pb-8 px-4 sm:px-6">
          <div className="mx-auto mb-4 sm:mb-6">
            {passed ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent px-2">
            {passed ? "¡Excelente trabajo!" : "Sigue practicando"}
          </CardTitle>

          <p className="text-gray-600 text-base sm:text-lg px-2">
            {passed
              ? "Has completado exitosamente el ejercicio avanzado de gestión de datos con Excel"
              : `Necesitas al menos ${Math.ceil(totalQuestions * 0.7)} respuestas correctas para aprobar`}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Competencia 1.3 - Gestión de Datos Avanzado</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
          
          
          <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
            <div className="p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{totalQuestions}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Preguntas</div>
            </div>

            <div className="p-3 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl shadow-sm border border-green-200">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{correctAnswers}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Correctas</div>
            </div>

            <div className="p-3 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl shadow-sm border border-red-200">
              <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{totalQuestions - correctAnswers}</div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium">Incorrectas</div>
            </div>
          </div>

          
          <div className="text-center p-6 sm:p-8 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 rounded-2xl sm:rounded-3xl border border-purple-200 shadow-lg">
            <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              {score}%
            </div>
            <div className="text-gray-600 text-base sm:text-lg font-medium">Puntuación obtenida</div>
            {passed && (
              <div className="mt-3 sm:mt-4 inline-flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium shadow-sm">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                +15 Ladico ganados (Ejercicio Avanzado)
              </div>
            )}
          </div>

          
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">Resumen por ejercicio:</h3>
            <div className="space-y-2 sm:space-y-3">
              
              
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl sm:rounded-2xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div>
                    <span className="text-gray-700 font-medium text-sm sm:text-base">Ejercicio 1: Análisis Estadístico</span>
                    <div className="text-xs text-gray-500">Media, Mediana, Moda, Desviación</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-bold">4 preguntas</div>
                </div>
              </div>

              
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl sm:rounded-2xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-gray-700 font-medium text-sm sm:text-base">Ejercicio 2: Tabla Dinámica</span>
                    <div className="text-xs text-gray-500">Análisis de ventas por tienda</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-600 font-bold">3 preguntas</div>
                </div>
              </div>

              
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl sm:rounded-2xl border border-purple-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                  <div>
                    <span className="text-gray-700 font-medium text-sm sm:text-base">Ejercicio 3: Gráfico Dinámico</span>
                    <div className="text-xs text-gray-500">Producción de café por país</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-purple-600 font-bold">3 preguntas</div>
                </div>
              </div>
            </div>
          </div>

          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
            <Button
              onClick={handleReturnToDashboard}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Volver al Dashboard
            </Button>
            
            <Button
              onClick={handleRetakeTest}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold shadow-sm hover:shadow-md transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Repetir Ejercicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdvancedTestResults() {
  return (
    <Suspense fallback={
      <div className="min-h-screen Ladico-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    }>
      <AdvancedTestResultsContent />
    </Suspense>
  )
}
