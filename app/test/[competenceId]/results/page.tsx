"use client"

import { useSearchParams, useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Trophy, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { useEffect, useMemo, useState, Suspense } from "react"
import { loadCompetences } from "@/services/questionsService"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { TestSession, Question } from "@/types"

type AnswerValue = number | number[] | null;

function TestResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const params = useParams()
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor"
 
  const competenceId = params?.competenceId as string | undefined

  const score = Number.parseInt(searchParams.get("score") || "0")
  const passed = searchParams.get("passed") === "true"
  const correctAnswers = Number.parseInt(searchParams.get("correct") || "0")
  const totalQuestions = 3
  const isAlreadyCompleted = searchParams.get("completed") === "true"
  const areaCompleted = searchParams.get("areaCompleted") === "1"
  const levelParam = (searchParams.get("level") || "basico").toLowerCase()
  const [firstCompetenceInArea, setFirstCompetenceInArea] = useState<string | null>(null)
  const [loadingArea, setLoadingArea] = useState(false)
  const [areaCounts, setAreaCounts] = useState<{ completed: number; total: number } | null>(null)
  const [nextCompetenceInfo, setNextCompetenceInfo] = useState<{ id: string; name: string } | null>(null)
  const [testQuestions, setTestQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<AnswerValue[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Última competencia del área por código
  const isLastCompetenceOfArea = useMemo(() => {
    const id = (competenceId || "").trim()
    const [majorStr, minorStr] = id.split(".")
    const major = Number(majorStr)
    const minor = Number(minorStr)
    if (Number.isNaN(major) || Number.isNaN(minor)) return false
    const LAST_BY_AREA: Record<number, number> = { 1: 3, 4: 4 } // 1 → 1.3; 4 → 4.4
    const lastMinor = LAST_BY_AREA[major] ?? 4
    return minor >= lastMinor
  }, [competenceId])

  // Banderas pregunta por pregunta
  const [q1, q2, q3] = useMemo<boolean[]>(() => {
    if (testQuestions.length >= 3 && userAnswers.length >= 3) {
      return [0, 1, 2].map(i => userAnswers[i] === (testQuestions[i] as any)?.correctAnswerIndex)
    }
    return [0, 1, 2].map(i => i < correctAnswers)
  }, [testQuestions, userAnswers, correctAnswers])

  const loadAllAreaQuestions = async (competenceId: string) => {
    if (!user?.uid || !db) return
    try {
      const levels = ['basico', 'intermedio', 'avanzado']
      let allQuestions: Question[] = []
      let allAnswers: (number | number[] | null)[] = []
      for (const level of levels) {
        const sessionQuery = query(
          collection(db, "testSessions"),
          where("userId", "==", user.uid),
          where("competence", "==", competenceId),
          where("level", "==", level),
          orderBy("startTime", "desc"),
          limit(1)
        )
        const sessionSnapshot = await getDocs(sessionQuery)
        if (!sessionSnapshot.empty) {
          const sessionData = sessionSnapshot.docs[0].data() as TestSession
          if (sessionData.questions?.length) allQuestions.push(...sessionData.questions)
          if (sessionData.answers) allAnswers.push(...sessionData.answers)
        }
      }
      if (allQuestions.length > 0) {
        setTestQuestions(allQuestions)
        setUserAnswers(allAnswers)
      }
    } catch (error) {
      console.error('❌ Error cargando todas las preguntas del área:', error)
    }
  }

  useEffect(() => {
    if (hasLoadedOnce || !user?.uid || !competenceId) return

    const run = async () => {
      setLoadingArea(true)
      setLoadingQuestions(true)
      setHasLoadedOnce(true)
      try {
        let questionsLoaded = false

        // 1) Intentar leer desde sessionStorage
        try {
          const testResultDataStr = sessionStorage.getItem('testResultData')
          if (testResultDataStr) {
            const testResultData = JSON.parse(testResultDataStr)
            const isValidData =
              testResultData.questions &&
              testResultData.answers &&
              competenceId &&
              testResultData.competence === competenceId &&
              testResultData.level &&
              testResultData.level.toLowerCase() === levelParam.toLowerCase()

            if (isValidData) {
              setTestQuestions(testResultData.questions)
              setUserAnswers(testResultData.answers)
              questionsLoaded = true
              if (!areaCompleted) sessionStorage.removeItem('testResultData')
            } else {
              sessionStorage.removeItem('testResultData')
            }
          }
        } catch (error) {
          console.error('❌ Error cargando datos desde sessionStorage:', error)
        }

        // 2) Si completó el área, cargar todo desde Firebase
        if (areaCompleted && !questionsLoaded) {
          if (competenceId) await loadAllAreaQuestions(competenceId)
          questionsLoaded = true
        }

        // 3) Respaldo: mejor sesión en Firebase
        if (!questionsLoaded && db) {
          const sessionQuery = query(
            collection(db, "testSessions"),
            where("userId", "==", user.uid),
            where("competence", "==", competenceId),
            where("level", "==", levelParam)
          )
          const sessionSnapshot = await getDocs(sessionQuery)
          if (!sessionSnapshot.empty) {
            const sessions = sessionSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as TestSession & { id: string }))

            const completedSessions = sessions.filter((s: any) => s.endTime)
            const inProgressSessions = sessions.filter((s: any) => !s.endTime && s.answers?.some((a: any) => a !== null))
            const initialSessions = sessions.filter((s: any) => !s.endTime && !s.answers?.some((a: any) => a !== null))

            let bestSession: any = null
            if (completedSessions.length > 0) {
              bestSession = completedSessions.sort((a: any, b: any) => new Date(b.startTime.toDate()).getTime() - new Date(a.startTime.toDate()).getTime())[0]
            } else if (inProgressSessions.length > 0) {
              bestSession = inProgressSessions.sort((a: any, b: any) => {
                const aCnt = a.answers?.filter((ans: any) => ans !== null).length || 0
                const bCnt = b.answers?.filter((ans: any) => ans !== null).length || 0
                return bCnt - aCnt
              })[0]
            } else if (initialSessions.length > 0) {
              bestSession = initialSessions[0]
            }
            if (bestSession) {
              if (bestSession.questions?.length) setTestQuestions(bestSession.questions)
              if (bestSession.answers) setUserAnswers(bestSession.answers)
              questionsLoaded = true
            }
          }
        }

        // Cargar vecina/siguiente competencia cuando NO se completó el área
        if (!areaCompleted) {
          const comps = await loadCompetences()
          const current = comps.find(c => c.id === competenceId)
          if (current) {
            const inArea = comps.filter(c => c.dimension === current.dimension).sort((a, b) => a.code.localeCompare(b.code))
            const currentIndex = inArea.findIndex(c => c.id === competenceId)
            
            // Determinar la siguiente competencia (secuencial)
            let nextCompetence: typeof inArea[0] | null = null
            if (currentIndex < inArea.length - 1) {
              // Si no es la última competencia, ir a la siguiente
              nextCompetence = inArea[currentIndex + 1]
            } else {
              // Si es la última competencia del área, volver a la primera
              nextCompetence = inArea[0]
            }
            
            if (nextCompetence) {
              setNextCompetenceInfo({ id: nextCompetence.id, name: nextCompetence.name })
            } else {
              setNextCompetenceInfo(null)
            }
          }
          return
        }

        // Si área completada, obtener info de área y conteos (usando passed === true)
        const comps = await loadCompetences()
        const current = comps.find(c => c.id === competenceId)
        if (!current) return
        const inArea = comps.filter(c => c.dimension === current.dimension).sort((a, b) => a.code.localeCompare(b.code))
        setFirstCompetenceInArea(inArea[0]?.id || null)

        const currentIndex = inArea.findIndex(c => c.id === competenceId)
        const nextCompetence = inArea[currentIndex + 1]
        if (nextCompetence) setNextCompetenceInfo({ id: nextCompetence.id, name: nextCompetence.name })
        else setNextCompetenceInfo(null)

        const lvl = levelParam
        let completed = 0
        for (const c of inArea) {
          if (!db) continue
          const qs = await getDocs(query(collection(db, "testSessions"), where("competence", "==", c.id), where("level", "==", lvl)))
          const hasPassed = qs.docs.some(d => (d.data() as any)?.passed === true) // <— antes: score === 100
          if (hasPassed) completed++
        }
        setAreaCounts({ completed, total: inArea.length })
      } catch (error) {
        console.error("Error cargando datos de la sesión:", error)
      } finally {
        setLoadingArea(false)
        setLoadingQuestions(false)
      }
    }
    run()
  }, [params.competenceId, user?.uid])

  const handleReturnToDashboard = () => {
    router.push("/dashboard")
  }

  const handleRetakeTest = () => {
    if (isTeacher) {
      router.back()
      return
    }
  }

  const handleContinueEvaluation = () => {
    // 🚫 Seguridad extra: si no completó el área y no es profesor, manda a Dashboard
    if (!isTeacher && !areaCompleted) {
      router.push("/dashboard")
      return
    }

    // Ir a la PRIMERA competencia del área (X.1) en el siguiente nivel
    const id = (params.competenceId as string) || ""
    const [majorStr] = id.split(".")
    const major = Number(majorStr)
    const firstIdInArea = !Number.isNaN(major) ? `${major}.1` : null
    const compId = (firstIdInArea || firstCompetenceInArea || id).trim()
    if (!compId) {
      router.push("/dashboard")
      return
    }
    const compSlug = `comp-${compId.replace(/\./g, "-")}`
    const nextLevel =
      levelParam.startsWith("b") ? "intermedio" :
      levelParam.startsWith("i") ? "avanzado" :
      null
    const nextEj = 1
    if (nextLevel) {
      router.push(`/exercises/${compSlug}/${nextLevel}/ej${nextEj}`)
    } else {
      router.push("/dashboard")
    }
  };

  const handleContinueToNextCompetence = async () => {
    try {
      // Cargar todas las competencias para obtener el orden correcto
      const comps = await loadCompetences()
      const current = comps.find(c => c.id === competenceId)
      
      if (!current) {
        router.push("/dashboard")
        return
      }

      // Obtener todas las competencias del área actual ordenadas
      const inArea = comps
        .filter(c => c.dimension === current.dimension)
        .sort((a, b) => a.code.localeCompare(b.code))

      // Encontrar el índice de la competencia actual
      const currentIndex = inArea.findIndex(c => c.id === competenceId)
      
      if (currentIndex === -1) {
        router.push("/dashboard")
        return
      }

      // Determinar la siguiente competencia
      let nextCompetence: typeof inArea[0] | null = null
      
      if (currentIndex < inArea.length - 1) {
        // Si no es la última competencia, ir a la siguiente
        nextCompetence = inArea[currentIndex + 1]
      } else {
        // Si es la última competencia del área, volver a la primera
        nextCompetence = inArea[0]
      }

      if (nextCompetence) {
        router.push(`/test/${nextCompetence.id}?level=${levelParam}`)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error navegando a la siguiente competencia:", error)
      router.push("/dashboard")
    }
  }

  return (
    <>
      <Sidebar />

      <div className="min-h-screen bg-[#f3fbfb] lg:pl-72 flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-2xl shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
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

            <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-[#5d8b6a] bg-clip-text text-transparent px-2">
              {areaCompleted
                ? "¡Nivel del área completado!"
                : isTeacher
                ? "Evaluación Completada"
                : (passed ? "¡Felicitaciones!" : "Sigue practicando")}
            </CardTitle>

            <p className="text-gray-600 text-base sm:text-lg px-2">
              {areaCompleted
                ? "Has completado este nivel en todas las competencias del área."
                : isTeacher 
                  ? "Evaluación finalizada como profesor"
                  : (passed
                    ? "Has completado exitosamente esta competencia"
                    : "Necesitas al menos 2 respuestas correctas para avanzar")}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {!isTeacher && (
              <>
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

            {/* Detalle preguntas */}
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">
                {isTeacher ? "Detalle de preguntas evaluadas:" : "Detalle de respuestas del alumno:"}
              </h3>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${q1 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"}`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q1 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XCircle className="w-5 h-5 text-red-700" />}
                  <span>Pregunta 1</span>
                </div>
                <span className={`font-semibold ${q1 ? "text-green-700" : "text-red-700"}`}>{q1 ? "Correcta" : "Incorrecta"}</span>
              </div>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${q2 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"}`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q2 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XCircle className="w-5 h-5 text-red-700" />}
                  <span>Pregunta 2</span>
                </div>
                <span className={`font-semibold ${q2 ? "text-green-700" : "text-red-700"}`}>{q2 ? "Correcta" : "Incorrecta"}</span>
              </div>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${q3 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"}`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q3 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XCircle className="w-5 h-5 text-red-700" />}
                  <span>Pregunta 3</span>
                </div>
                <span className={`font-semibold ${q3 ? "text-green-700" : "text-red-700"}`}>{q3 ? "Correcta" : "Incorrecta"}</span>
              </div>
            </div>

            {!isTeacher && (
              <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 shadow-sm">
                <p className="text-blue-800 leading-relaxed text-sm sm:text-base">
                  {isAlreadyCompleted
                    ? "Has completado esta competencia previamente. Tus Ladicos ya han sido otorgados. Explora otras competencias para seguir creciendo."
                    : passed
                      ? "¡Excelente trabajo! Has completado esta competencia exitosamente. ¡Continúa desarrollando tus habilidades digitales!"
                      : "No te desanimes. Puedes volver a intentarlo cuando te sientas preparado. Recuerda revisar los recursos de apoyo."}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              {/* --- PROFESOR --- */}
              {isTeacher ? (
                <>
                  <Button
                    onClick={handleReturnToDashboard}
                    variant="outline"
                    className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-medium transition-all"
                  >
                    Volver al Dashboard
                  </Button>
                  <Button
                    onClick={handleContinueEvaluation}
                    className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold"
                  >
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Siguiente nivel
                  </Button>
                  {!passed && (
                    <Button
                      onClick={handleRetakeTest}
                      variant="outline"
                      className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-medium transition-all"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Intentar de nuevo
                    </Button>
                  )}
                </>
              ) : (
                /* --- USUARIO --- */
                <>
                  {/* Lógica unificada para navegación secuencial */}
                  {areaCompleted && passed ? (
                    <Button
                      onClick={handleContinueEvaluation}
                      className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold"
                    >
                      Continuar al siguiente nivel
                    </Button>
                  ) : (
                    <>
                      {areaCompleted && (
                        <Button onClick={handleReturnToDashboard} variant="outline" className="flex-1 rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-medium">
                          Volver al Dashboard
                        </Button>
                      )}

                      {!areaCompleted && nextCompetenceInfo ? (
                        <Button
                          onClick={handleContinueToNextCompetence}
                          className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold"
                        >
                          {isLastCompetenceOfArea 
                            ? `Continuar con ${nextCompetenceInfo.name.split(' ').slice(0, 3).join(' ')}...`
                            : `Continuar con ${nextCompetenceInfo.name.split(' ').slice(0, 3).join(' ')}...`
                          }
                        </Button>
                      ) : !areaCompleted && !nextCompetenceInfo ? (
                        <Button onClick={handleReturnToDashboard} className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold">
                          Ir al Dashboard
                        </Button>
                      ) : (
                        <Button onClick={handleContinueEvaluation} className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold">
                          Continuar al siguiente nivel
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function TestResults() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f3fbfb] lg:pl-72 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    }>
      <TestResultsContent />
    </Suspense>
  )
}
