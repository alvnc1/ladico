"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, XCircle, CheckCircle, XCircle as XIcon, RotateCcw, ChevronRight } from "lucide-react"
import { finalizeSession } from "@/lib/testSession"
import { useAuth } from "@/contexts/AuthContext"
import { skillsInfo } from "@/components/data/digcompSkills"


function ResultsAvanzadoContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor"

  // Parámetros (mismos que envíes desde la P3)
  const score = Number.parseInt(sp.get("score") || "0")
  const passed = sp.get("passed") === "true"
  const correct = Number.parseInt(sp.get("correct") || "0")
  const total = Number.parseInt(sp.get("total") || "3")
  const competence = sp.get("competence") || "1.1"
  const level = (sp.get("level") || "intermedio").toLowerCase()

  // Resultados por pregunta (1 = correcta, 0 = incorrecta)
  const q1 = sp.get("q1") === "1"
  const q2 = sp.get("q2") === "1"
  const q3 = sp.get("q3") === "1"

  // Id de sesión (opcional) para consolidar en Firestore si aún no se consolidó
  const sid = sp.get("sid") || null

  // Al montar: limpiar progreso local y (opcional) finalizar la sesión en Firestore
  useEffect(() => {
    try {
      const key = `ladico:${competence}:${level}:progress`
      localStorage.removeItem(key)
    } catch {/* no-op */}

    ;(async () => {
      if (!sid) return
      try {
        await finalizeSession(sid, { correctCount: correct, total, passMin: 2 })
      } catch (e) {
        console.warn("No se pudo finalizar la sesión en resultados:", e)
      }
    })()
  }, [sid, competence, level, correct, total])

  const handleBack = () => router.push("/dashboard")
  const handleRetry = () => router.push("/exercises/comp-1-1/intermedio/ej1")
  
  // Función para continuar al siguiente nivel (para profesores)
  const handleNextLevel = () => {
    // Determinar el siguiente nivel
    const nextLevel = 
      level === "basico" ? "intermedio" :
      level === "intermedio" ? "avanzado" : "basico";
    
    // Redirigir al primer ejercicio del siguiente nivel
    router.push(`/exercises/comp-1-1/${nextLevel}/ej1`);
  }

  return (
    <>
      {/* === Sidebar igual que en /dashboard === */}
      <Sidebar />
      {/* === Contenido === */}
        <div className="min-h-screen bg-[#f3fbfb] lg:pl-72 flex items-center justify-center p-3 sm:p-4">
          <Card className="w-full max-w-2xl shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
            <CardHeader className="text-center bg-gradient-to-b from-white to-gray-50 pb-6 sm:pb-8 px-4 sm:px-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  {isTeacher ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-md">
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                    </div>
                  ) : passed ? (
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
                  {isTeacher ? "Evaluación Completada" : (passed ? "¡Felicitaciones!" : "Sigue practicando")}
                </CardTitle>

                <p className="mt-1 text-gray-600">
                  {isTeacher 
                    ? "Evaluación finalizada como profesor"
                    : (passed
                      ? "Has completado exitosamente esta competencia"
                      : "Necesitas al menos 2 respuestas correctas para avanzar")
                  }
                </p>

                <div className="mt-2 text-xs text-gray-500">
                  Competencia {competence} - {skillsInfo[competence].title} · Nivel{" "}
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </div>
              </div>
            </CardHeader>

            {/* BODY */}
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
              {/* KPIs - Solo visibles para estudiantes */}
              {!isTeacher && (
                <>
                  <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                    <div className="p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{total}</div>
                      <div className="text-xs sm:text-sm text-gray-600 font-medium">Preguntas</div>
                    </div>
                    <div className="p-3 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl shadow-sm border border-green-200">
                      <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{correct}</div>
                      <div className="text-xs sm:text-sm text-gray-600 font-medium">Correctas</div>
                    </div>
                    <div className="p-3 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl shadow-sm border border-red-200">
                      <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{total - correct}</div>
                      <div className="text-xs sm:text-sm text-gray-600 font-medium">Incorrectas</div>
                    </div>
                  </div>

                  {/* Porcentaje - Solo visible para estudiantes */}
                  <div className="text-center p-6 sm:p-8 via-blue-50 to-gray-400 rounded-2xl sm:rounded-3xl border border-gray-300 shadow-lg">
                    <div className="text-4xl sm:text-5xl font-bold bg-[#5d8b6a] bg-clip-text text-transparent mb-2 sm:mb-3">
                      {score}%
                    </div>
                    <div className="text-gray-600 text-base sm:text-lg font-medium">Puntuación obtenida</div>
                    {passed && (
                      <div className="mt-3 sm:mt-4 inline-flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium shadow-sm">
                        <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        +10 Ladico ganados
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Detalle de preguntas (visible para todos) */}
              {!isTeacher && (
                <div className="mt-8">
                  <h3 className="font-semibold text-gray-900 mb-3">Detalle de preguntas evaluadas:</h3>

                  <div
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                      q1 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-gray-800">
                      {q1 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                      <span>Ejercicio 1: Escribir Consultas Precisas en Buscadores</span>
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
                      <span>Ejercicio 2: Búsqueda en Internet</span>
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
                      <span>Ejercicio 3: Ordenar estrategia de búsqueda</span>
                    </div>
                    <span className={`font-semibold ${q3 ? "text-green-700" : "text-red-700"}`}>
                      {q3 ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {isTeacher ? (
                  <>
                    <Button
                      onClick={handleBack}
                      variant="outline"
                      className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3 text-base font-medium transition-all"
                    >
                      Volver al Dashboard
                    </Button>
                    <Button
                      onClick={handleNextLevel}
                      className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl py-3 text-base font-semibold"
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Siguiente nivel
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
    </>
  )
}

export default function ResultsAvanzadoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#286675]" />
        </div>
      }
    >
      <ResultsAvanzadoContent />
    </Suspense>
  )
}