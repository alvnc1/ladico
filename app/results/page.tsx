"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getUserResults } from "@/utils/results-manager"
import type { UserResult } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy } from "lucide-react"
import Sidebar from "@/components/Sidebar"

export default function ResultsPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadResults()
    }
  }, [user])

  const loadResults = async () => {
    try {
      const userResults = await getUserResults(user!.uid)
      setResults(userResults)
    } catch (error) {
      console.error("Error loading results:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Mis Resultados
            </h1>
            <p className="text-gray-600 text-lg">
              Historial completo de tus evaluaciones y progreso en competencias digitales.
            </p>
          </div>

          <div className="grid gap-8">
            {results.length === 0 ? (
              <Card className="shadow-xl rounded-3xl border-0">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">¡Comienza tu primer test!</h3>
                  <p className="text-gray-500 text-lg">No tienes resultados aún. ¡Comienza tu primera evaluación!</p>
                </CardContent>
              </Card>
            ) : (
              results.map((result, index) => (
                <Card key={index} className="shadow-xl rounded-3xl border-0 overflow-hidden hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-white to-gray-50 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                          Evaluación - {new Date(result.fecha).toLocaleDateString("es-ES")}
                        </CardTitle>
                        <p className="text-gray-600">
                          Completada el {new Date(result.fecha).toLocaleDateString("es-ES", {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={result.puntajeTotal >= 67 ? "default" : "secondary"}
                          className="px-4 py-2 text-lg font-bold rounded-full"
                        >
                          {result.puntajeTotal}%
                        </Badge>
                        <Badge
                          variant="outline"
                          className="px-4 py-2 rounded-full border-2 font-medium"
                        >
                          {result.nivelDigComp}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="text-3xl font-bold text-gray-900 mb-2">{result.respuestas.length}</div>
                        <div className="text-gray-600 font-medium">Preguntas</div>
                      </div>

                      <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 shadow-sm">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {result.respuestas.filter((r) => r.correcta).length}
                        </div>
                        <div className="text-gray-600 font-medium">Correctas</div>
                      </div>

                      <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200 shadow-sm">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          {result.respuestas.filter((r) => !r.correcta).length}
                        </div>
                        <div className="text-gray-600 font-medium">Incorrectas</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 text-lg">Competencias evaluadas:</h4>
                      <div className="flex flex-wrap gap-3">
                        {[...new Set(result.respuestas.map((r) => r.competence))].map((comp) => (
                          <Badge
                            key={comp}
                            variant="outline"
                            className="px-4 py-2 rounded-full border-2 font-medium text-sm"
                          >
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
