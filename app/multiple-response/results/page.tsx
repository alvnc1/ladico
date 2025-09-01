"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react"

export default function MultipleResponseResultsPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)

  const completed = searchParams.get('completed') === 'true'
  const score = parseInt(searchParams.get('score') || '0')
  const passed = searchParams.get('passed') === 'true'
  const correct = parseInt(searchParams.get('correct') || '0')

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3fbfb] via-[#e8f4f8] to-[#d1ecf1]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    )
  }

  if (!completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3fbfb] via-[#e8f4f8] to-[#d1ecf1]">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">No se pudo cargar los resultados.</p>
          <Link href="/dashboard">
            <Button className="bg-[#286675] hover:bg-[#3a7d89] text-white px-6 py-2 rounded-lg">
              Volver al Dashboard
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3fbfb] via-[#e8f4f8] to-[#d1ecf1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#286675] to-[#3a7d89] p-6 sm:p-8 text-white text-center">
            <div className="flex justify-center mb-4">
              {passed ? (
                <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-300 animate-bounce" />
              ) : (
                <XCircle className="w-16 h-16 sm:w-20 sm:h-20 text-red-300" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {passed ? "¡Felicitaciones!" : "Inténtalo de nuevo"}
            </h1>
            <p className="text-lg opacity-90">
              {passed ? "Has aprobado la evaluación" : "No has alcanzado el puntaje mínimo"}
            </p>
          </div>

          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{correct}</div>
                <div className="text-sm text-blue-700">Correctas</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">{score}%</div>
                <div className="text-sm text-purple-700">Puntuación</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">+10</div>
                <div className="text-sm text-green-700">Ladico Points</div>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-gray-700">
                  Estado: {passed ? (
                    <span className="text-green-600 font-bold">Aprobado</span>
                  ) : (
                    <span className="text-red-600 font-bold">Reprobado</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button className="w-full sm:w-auto bg-[#286675] hover:bg-[#3a7d89] text-white px-8 py-3 rounded-xl font-medium">
                  Volver al Dashboard
                </Button>
              </Link>
              <Link href="/multiple-response">
                <Button variant="outline" className="w-full sm:w-auto border-2 border-[#286675] text-[#286675] hover:bg-[#286675] hover:text-white px-8 py-3 rounded-xl font-medium">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Repetir Evaluación
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
