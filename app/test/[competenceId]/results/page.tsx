"use client"

import { useSearchParams, useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Trophy, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { useEffect, useState, Suspense } from "react"
import { loadCompetences } from "@/services/questionsService"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { TestSession, Question } from "@/types"

function TestResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
 
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
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

 
  const loadAllAreaQuestions = async (competenceId: string) => {
    if (!user?.uid || !db) {
      console.log('Usuario o DB no disponible para cargar preguntas del área')
      return
    }

    try {
      console.log('=== CARGANDO TODAS LAS PREGUNTAS DEL ÁREA ===')
      console.log('Competencia:', competenceId)
      console.log('Usuario:', user.uid)

      const levels = ['basico', 'intermedio', 'avanzado']
      let allQuestions: Question[] = []
      let allAnswers: (number | null)[] = []

      for (const level of levels) {
        console.log(`\n--- Cargando sesión de nivel ${level} ---`)

        const sessionQuery = query(
          collection(db, "testSessions"),
          where("userId", "==", user.uid),
          where("competence", "==", competenceId),
          where("level", "==", level),
          orderBy("startTime", "desc"),
          limit(1)
        )

        const sessionSnapshot = await getDocs(sessionQuery)
        console.log(`Documentos encontrados para ${level}:`, sessionSnapshot.size)

        if (!sessionSnapshot.empty) {
          const sessionData = sessionSnapshot.docs[0].data() as TestSession
          console.log(`Sesión ${level} encontrada:`, {
            id: sessionSnapshot.docs[0].id,
            questionsCount: sessionData.questions?.length || 0,
            answersCount: sessionData.answers?.length || 0,
            score: sessionData.score,
            startTime: sessionData.startTime
          })

          if (sessionData.questions && sessionData.questions.length > 0) {
            allQuestions.push(...sessionData.questions)
            console.log(`✅ ${sessionData.questions.length} preguntas agregadas desde nivel ${level}`)
          } else {
            console.log(`⚠️ No se encontraron preguntas en la sesión de ${level}`)
          }

          if (sessionData.answers) {
            allAnswers.push(...sessionData.answers)
            console.log(`✅ ${sessionData.answers.length} respuestas agregadas desde nivel ${level}`)
          } else {
            console.log(`⚠️ No se encontraron respuestas en la sesión de ${level}`)
          }
        } else {
          console.log(`❌ No se encontró sesión para nivel ${level}`)
        }
      }

      if (allQuestions.length > 0) {
        setTestQuestions(allQuestions)
        setUserAnswers(allAnswers)
        console.log('✅ Todas las preguntas del área cargadas exitosamente')
      } else {
        console.log('❌ No se cargaron preguntas del área')
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

        try {
          const testResultDataStr = sessionStorage.getItem('testResultData')
          if (testResultDataStr) {
            const testResultData = JSON.parse(testResultDataStr)

           
            const isValidData = testResultData.questions &&
              testResultData.answers &&
              competenceId &&
              testResultData.competence === competenceId &&
              testResultData.level &&
              testResultData.level.toLowerCase() === levelParam.toLowerCase()

            if (isValidData) {
              setTestQuestions(testResultData.questions)
              setUserAnswers(testResultData.answers)
              questionsLoaded = true

             
              if (!areaCompleted) {
                sessionStorage.removeItem('testResultData')
              }
            } else {
             
              sessionStorage.removeItem('testResultData')
            }
          } else {
           
          }
        } catch (error) {
          console.error('❌ Error cargando datos desde sessionStorage:', error)
        }

       
        if (areaCompleted && !questionsLoaded) {
          console.log('🏆 Área completa detectada, cargando todas las preguntas desde Firebase...')
          if (competenceId) {
            await loadAllAreaQuestions(competenceId)
          }
          questionsLoaded = true
        }

       
        if (!questionsLoaded && db) {
          console.log('🔄 Cargando sesión desde Firebase como respaldo...')
          console.log(`🔍 Buscando sesión: userId=${user.uid}, competence=${competenceId}, level=${levelParam}`)

         
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

            console.log(`📋 Encontradas ${sessions.length} sesiones para ${competenceId}/${levelParam}`)
            console.log('📋 Sesiones encontradas:', sessions.map(s => ({
              id: s.id,
              competence: s.competence,
              level: s.level,
              endTime: s.endTime,
              score: s.score
            })))

           
            const completedSessions = sessions.filter((s: any) => s.endTime)
            const inProgressSessions = sessions.filter((s: any) => !s.endTime && s.answers?.some((a: any) => a !== null))
            const initialSessions = sessions.filter((s: any) => !s.endTime && !s.answers?.some((a: any) => a !== null))

            let bestSession: any = null
            if (completedSessions.length > 0) {
              bestSession = completedSessions.sort((a: any, b: any) => new Date(b.startTime.toDate()).getTime() - new Date(a.startTime.toDate()).getTime())[0]
              console.log("✅ Usando sesión completada más reciente")
            } else if (inProgressSessions.length > 0) {
              bestSession = inProgressSessions.sort((a: any, b: any) => {
                const answersA = a.answers?.filter((ans: any) => ans !== null).length || 0
                const answersB = b.answers?.filter((ans: any) => ans !== null).length || 0
                return answersB - answersA
              })[0]
              console.log("🔄 Usando sesión en progreso con más respuestas")
            } else if (initialSessions.length > 0) {
              bestSession = initialSessions[0]
              console.log("📅 Usando sesión inicial")
            }

            if (bestSession) {
              console.log("✅ Sesión encontrada en Firebase:", {
                id: bestSession.id,
                questionsCount: bestSession.questions?.length || 0,
                answersCount: bestSession.answers?.length || 0,
                completed: !!bestSession.endTime,
                score: bestSession.score || 0
              })

              if (bestSession.questions && bestSession.questions.length > 0) {
                setTestQuestions(bestSession.questions)
                console.log(`✅ ${bestSession.questions.length} preguntas cargadas desde Firebase`)
              }

              if (bestSession.answers) {
                setUserAnswers(bestSession.answers)
                console.log(`✅ ${bestSession.answers.length} respuestas cargadas desde Firebase`)
              }
              questionsLoaded = true
            }
          } else {
            console.log("❌ No se encontró sesión en Firebase para esta competencia y nivel")
            console.log(`🔍 Búsqueda realizada: userId=${user.uid}, competence=${competenceId}, level=${levelParam}`)

           
            const allSessionsQuery = query(
              collection(db, "testSessions"),
              where("userId", "==", user.uid)
            )
            const allSnapshot = await getDocs(allSessionsQuery)
            console.log(`🔍 TOTAL sesiones del usuario: ${allSnapshot.size}`)
            allSnapshot.docs.forEach(doc => {
              const data = doc.data()
              console.log(`  - ${data.competence}/${data.level} (score: ${data.score || 0}, endTime: ${data.endTime ? 'SI' : 'NO'})`)
            })
          }
        }

        if (!areaCompleted) {
         
          const comps = await loadCompetences()
          const current = comps.find(c => c.id === competenceId)
          if (current) {
            const inArea = comps.filter(c => c.dimension === current.dimension).sort((a, b) => a.code.localeCompare(b.code))
            const currentIndex = inArea.findIndex(c => c.id === competenceId)
            const nextCompetence = inArea[currentIndex + 1]
            if (nextCompetence) {
              setNextCompetenceInfo({
                id: nextCompetence.id,
                name: nextCompetence.name
              })
            } else {
              setNextCompetenceInfo(null)
            }
          }
          return
        }

        const comps = await loadCompetences()
        const current = comps.find(c => c.id === competenceId)
        if (!current) return
        const inArea = comps.filter(c => c.dimension === current.dimension).sort((a, b) => a.code.localeCompare(b.code))
        setFirstCompetenceInArea(inArea[0]?.id || null)

       
        const currentIndex = inArea.findIndex(c => c.id === competenceId)
        const nextCompetence = inArea[currentIndex + 1]
        if (nextCompetence) {
          setNextCompetenceInfo({
            id: nextCompetence.id,
            name: nextCompetence.name
          })
        } else {
          setNextCompetenceInfo(null)
        }

       
        const lvl = levelParam
        let completed = 0
        for (const c of inArea) {
          if (!db) continue
          const qs = await getDocs(query(collection(db, "testSessions"), where("competence", "==", c.id), where("level", "==", lvl)))
          const hasPerfect = qs.docs.some(d => (d.data() as any)?.score === 100)
          if (hasPerfect) completed++
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
    if (!isAlreadyCompleted) {
      router.back()
    }
  }

  const handleContinueEvaluation = () => {
   
    const currentCompetenceId = firstCompetenceInArea || (params.competenceId as string)
   
    const nextLevel = levelParam.startsWith("b") ? "intermedio" : levelParam.startsWith("i") ? "avanzado" : null
    if (nextLevel) {
      router.push(`/test/${currentCompetenceId}?level=${nextLevel}`)
    } else {
      router.push("/dashboard")
    }
  }

 
  const handleContinueToNextCompetence = () => {
    if (nextCompetenceInfo) {
      const confirmed = confirm(
        `🎯 CONTINUAR EVALUACIÓN\n\n` +
        `📍 Siguiente competencia: "${nextCompetenceInfo.name}"\n` +
        `🎯 Nivel: ${levelParam.charAt(0).toUpperCase() + levelParam.slice(1)}\n` +
        `📝 Preguntas: 3\n\n` +
        `¿Deseas continuar con la evaluación de esta competencia?`
      )

      if (confirmed) {
        router.push(`/test/${nextCompetenceInfo.id}?level=${levelParam}`)
      }
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
              {areaCompleted ? "¡Nivel del área completado!" : isAlreadyCompleted ? "¡Competencia Completada!" : passed ? "¡Felicitaciones!" : "Sigue practicando"}
            </CardTitle>

            <p className="text-gray-600 text-base sm:text-lg px-2">
              {areaCompleted
                ? "Has completado este nivel en todas las competencias del área."
                : isAlreadyCompleted
                  ? "Ya has completado exitosamente esta competencia anteriormente"
                  : passed
                    ? "Has completado exitosamente esta competencia"
                    : "Necesitas al menos 2 respuestas correctas para avanzar"}
            </p>
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

            <div className="space-y-3 sm:space-y-4">
              {areaCompleted && (
                <div className="p-4 sm:p-5 bg-green-50 border border-green-200 rounded-xl sm:rounded-2xl text-center">
                  <p className="text-green-800 text-sm sm:text-base font-medium">
                    {loadingArea
                      ? "Calculando resultados del área..."
                      : areaCounts
                        ? `Completaste ${areaCounts.completed}/${areaCounts.total} competencias en este nivel.`
                        : "Área completada en este nivel."}
                  </p>
                </div>
              )}

              <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                Detalle de preguntas evaluadas:
                {testQuestions.length > 3 && (
                  <span className="ml-2 text-sm font-medium text-[#286675]">
                    (Resumen completo del área - {testQuestions.length} preguntas)
                  </span>
                )}
              </h3>

              {loadingQuestions ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#286675] mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando detalles de las preguntas...</p>
                </div>
              ) : testQuestions.length > 0 ? (
                <div className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  
                  <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <button
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentQuestionIndex === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#286675] text-white hover:bg-[#1e4a56] hover:shadow-md transform hover:scale-105'
                        }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <div className="text-center">
                      <span className="text-sm text-gray-600 font-medium mb-2 block">
                        Pregunta {currentQuestionIndex + 1} de {testQuestions.length}
                      </span>
                      
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {testQuestions.map((_, index) => {
                         
                          let indicatorColor = 'bg-gray-300 hover:bg-gray-400'
                          if (testQuestions.length > 3) {
                            if (index < 3) indicatorColor = 'bg-green-300 hover:bg-green-400'
                            else if (index < 6) indicatorColor = 'bg-blue-300 hover:bg-blue-400'
                            else indicatorColor = 'bg-purple-300 hover:bg-purple-400'
                          }

                          if (index === currentQuestionIndex) {
                            indicatorColor = 'bg-[#286675] scale-125 shadow-md'
                          }

                          return (
                            <button
                              key={index}
                              onClick={() => setCurrentQuestionIndex(index)}
                              className={`w-3 h-3 rounded-full transition-all duration-200 ${indicatorColor}`}
                              aria-label={`Ir a pregunta ${index + 1}${testQuestions.length > 3 ?
                                ` (${index < 3 ? 'Básico' : index < 6 ? 'Intermedio' : 'Avanzado'})` : ''}`}
                              title={testQuestions.length > 3 ?
                                `Pregunta ${index + 1} - Nivel ${index < 3 ? 'Básico' : index < 6 ? 'Intermedio' : 'Avanzado'}` :
                                `Pregunta ${index + 1}`}
                            />
                          )
                        })}
                      </div>
                      
                      {testQuestions.length > 3 && (
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                            <span>Básico</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                            <span>Intermedio</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                            <span>Avanzado</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setCurrentQuestionIndex(Math.min(testQuestions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === testQuestions.length - 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentQuestionIndex === testQuestions.length - 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-[#286675] text-white hover:bg-[#1e4a56] hover:shadow-md transform hover:scale-105'
                        }`}
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-[#286675] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {currentQuestionIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {testQuestions[currentQuestionIndex]?.title}
                          </h4>
                          
                          {testQuestions.length > 3 && (
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentQuestionIndex < 3
                                ? 'bg-green-100 text-green-800'
                                : currentQuestionIndex < 6
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                                }`}>
                                Nivel {currentQuestionIndex < 3 ? 'Básico' : currentQuestionIndex < 6 ? 'Intermedio' : 'Avanzado'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        {testQuestions[currentQuestionIndex]?.scenario}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {testQuestions[currentQuestionIndex]?.options.map((option, index) => {
                        const userAnswer = userAnswers[currentQuestionIndex]
                        const correctAnswer = testQuestions[currentQuestionIndex]?.correctAnswerIndex
                        const isUserAnswer = userAnswer === index
                        const isCorrectAnswer = correctAnswer === index

                        let className = "p-4 rounded-lg border text-sm transition-all duration-200 "
                        let iconElement = null
                        let letterLabel = String.fromCharCode(65 + index)

                        if (isUserAnswer && isCorrectAnswer) {
                          className += "bg-green-50 border-green-300 text-green-800 shadow-md ring-2 ring-green-200"
                          iconElement = <CheckCircle className="w-5 h-5 text-green-600" />
                        } else if (isUserAnswer && !isCorrectAnswer) {
                          className += "bg-red-50 border-red-300 text-red-800 shadow-md ring-2 ring-red-200"
                          iconElement = <XCircle className="w-5 h-5 text-red-600" />
                        } else if (isCorrectAnswer) {
                          className += "bg-green-50 border-green-300 text-green-800 shadow-sm"
                          iconElement = <CheckCircle className="w-5 h-5 text-green-600" />
                        } else {
                          className += "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }

                        return (
                          <div key={index} className={className}>
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCorrectAnswer || isUserAnswer
                                ? 'bg-white text-gray-700 border-2 border-current'
                                : 'bg-gray-100 text-gray-500 border border-gray-300'
                                }`}>
                                {letterLabel}
                              </div>
                              <span className="flex-1">{option}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isUserAnswer && (
                                  <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                    Tu respuesta
                                  </span>
                                )}
                                {iconElement}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                      <div className="text-sm">
                        <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">i</span>
                          </div>
                          Resumen de la respuesta:
                        </h5>
                        <div className="space-y-2">
                          <p className="text-blue-700">
                            <span className="font-medium">Tu respuesta:</span>{' '}
                            <span className={`font-semibold ${userAnswers[currentQuestionIndex] === testQuestions[currentQuestionIndex]?.correctAnswerIndex
                              ? 'text-green-700'
                              : 'text-red-700'
                              }`}>
                              {userAnswers[currentQuestionIndex] !== null && userAnswers[currentQuestionIndex] !== undefined
                                ? `${String.fromCharCode(65 + userAnswers[currentQuestionIndex]!)}. ${testQuestions[currentQuestionIndex]?.options[userAnswers[currentQuestionIndex]!]}`
                                : 'No respondida'}
                            </span>
                          </p>
                          <p className="text-blue-700">
                            <span className="font-medium">Respuesta correcta:</span>{' '}
                            <span className="font-semibold text-green-700">
                              {testQuestions[currentQuestionIndex]?.correctAnswerIndex !== undefined
                                ? `${String.fromCharCode(65 + testQuestions[currentQuestionIndex]?.correctAnswerIndex!)}. ${testQuestions[currentQuestionIndex]?.options[testQuestions[currentQuestionIndex]?.correctAnswerIndex!]}`
                                : 'No disponible'}
                            </span>
                          </p>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${userAnswers[currentQuestionIndex] === testQuestions[currentQuestionIndex]?.correctAnswerIndex
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {userAnswers[currentQuestionIndex] === testQuestions[currentQuestionIndex]?.correctAnswerIndex ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Correcta
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Incorrecta
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                  <div className="flex justify-center gap-2 mt-4">
                    {testQuestions.map((_, index) => {
                      const userAnswer = userAnswers[index]
                      const correctAnswer = testQuestions[index]?.correctAnswerIndex
                      const isCorrect = userAnswer === correctAnswer

                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`w-4 h-4 rounded-full transition-all ${index === currentQuestionIndex
                            ? isCorrect
                              ? "bg-green-500 ring-2 ring-green-300"
                              : "bg-red-500 ring-2 ring-red-300"
                            : isCorrect
                              ? "bg-green-300 hover:bg-green-400"
                              : "bg-red-300 hover:bg-red-400"
                            }`}
                          title={`Pregunta ${index + 1} - ${isCorrect ? 'Correcta' : 'Incorrecta'}`}
                        />
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {Array.from({ length: totalQuestions }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm"
                    >
                      <span className="text-gray-700 font-medium text-sm sm:text-base">Pregunta {index + 1}</span>
                      {index < correctAnswers ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                          <span className="text-green-600 font-medium text-xs sm:text-sm">Correcta</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                          <span className="text-red-600 font-medium text-xs sm:text-sm">Incorrecta</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-200 shadow-sm">
              <p className="text-blue-800 leading-relaxed text-sm sm:text-base">
                {isAlreadyCompleted
                  ? "Has completado esta competencia previamente. Tus Ladicos ya han sido otorgados. Explora otras competencias para seguir creciendo."
                  : passed
                    ? "¡Excelente trabajo! Has completado esta competencia exitosamente. ¡Continúa desarrollando tus habilidades digitales!"
                    : "No te desanimes. Puedes volver a intentarlo cuando te sientas preparado. Recuerda revisar los recursos de apoyo."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
              {areaCompleted && (
                <Button onClick={handleReturnToDashboard} variant="outline" className="flex-1 rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-medium">
                  Ir al Dashboard
                </Button>
              )}

              
              {!areaCompleted && nextCompetenceInfo && passed ? (
               
                <Button
                  onClick={handleContinueToNextCompetence}
                  className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold"
                >
                  Continuar con {nextCompetenceInfo.name.split(' ').slice(0, 3).join(' ')}...
                </Button>
              ) : !areaCompleted && !nextCompetenceInfo && passed ? (
               
                <Button onClick={handleReturnToDashboard} className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold">
                  Ir al Dashboard
                </Button>
              ) : !areaCompleted && !passed ? (
               
                <Button onClick={handleReturnToDashboard} className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold">
                  Ir al Dashboard
                </Button>
              ) : (
               
                <Button onClick={handleContinueEvaluation} className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-semibold">
                  Continuar al siguiente nivel
                </Button>
              )}

              {!passed && !isAlreadyCompleted && (
                <Button
                  onClick={handleRetakeTest}
                  variant="outline"
                  className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl sm:rounded-2xl py-3 text-base sm:text-lg font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Intentar de nuevo
                </Button>
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
