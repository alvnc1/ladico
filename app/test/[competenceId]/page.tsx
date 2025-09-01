"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Question, TestSession } from "@/types"
import TestInterface from "@/components/TestInterface"
import { useToast } from "@/hooks/use-toast"

import { saveUserResult } from "@/utils/results-manager"
import { loadQuestionsByCompetence, updateQuestionStats, loadCompetences } from "@/services/questionsService"
import { getOrCreateActiveSession, updateSessionAnswer, completeSession } from "@/services/simpleSessionService"

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [questions, setQuestions] = useState<Question[]>([])
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [loading, setLoading] = useState(true)

 
  const initRan = useRef(false)




  useEffect(() => {
    if (initRan.current) return
    if (!user || !userData) return
    initRan.current = true
    bootstrap()
  }, [user, userData])

 
  const bootstrap = async () => {
    try {
      const competenceId = params.competenceId as string
      const levelParam = (searchParams.get("level") || "basico").toLowerCase()
      const levelName = levelParam.startsWith("b") ? "Básico" : levelParam.startsWith("i") ? "Intermedio" : "Avanzado"

      const comps = await loadCompetences()

     
      if (userData.completedCompetences.includes(competenceId)) {
        router.push(`/test/${competenceId}/results?completed=true&score=100&passed=true&correct=3&level=${levelParam}`)
        return
      }

      const loadedQuestions = await loadQuestionsByCompetence(competenceId, levelName, 3)
      if (loadedQuestions.length < 3) throw new Error(`No hay suficientes preguntas para la competencia ${competenceId}`)
      setQuestions(loadedQuestions)

      const { session } = await getOrCreateActiveSession(user!.uid, competenceId, levelParam, loadedQuestions)
      setTestSession(session)
    } catch (e) {
      console.error("Error inicializando test:", e)
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo iniciar la evaluación", variant: "destructive" })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

 

  const handleAnswerSubmit = async (answerIndex: number, questionIndex: number) => {
    if (!testSession) return
    try {
      const updated = await updateSessionAnswer(testSession, questionIndex, answerIndex)
      if (updated) setTestSession(updated)
    } catch (e) {
      console.error("No se pudo actualizar respuesta:", e)
    }
  }

  const handleTestComplete = async (finalSession: TestSession) => {
    try {

      let correctAnswers = 0


      await Promise.all(finalSession.questions.map(async (question, index) => {
        const userAnswer = finalSession.answers[index]
        const wasCorrect = userAnswer === question.correctAnswerIndex

        console.log(`Pregunta ${index + 1}: ${question.title}`)
        console.log(`  Usuario respondió: ${userAnswer !== null ? `Opción ${userAnswer + 1} (índice ${userAnswer}) - "${question.options[userAnswer]}"` : "No respondió"}`)
        console.log(`  Respuesta correcta: Opción ${question.correctAnswerIndex + 1} (índice ${question.correctAnswerIndex}) - "${question.options[question.correctAnswerIndex]}"`)
        console.log(`  ¿Correcta?: ${wasCorrect ? "SÍ" : "NO"}`)
        console.log(`  🔍 DEBUG: userAnswer=${userAnswer}, correctAnswerIndex=${question.correctAnswerIndex}, comparison=${userAnswer} === ${question.correctAnswerIndex} = ${wasCorrect}`)
        console.log("---")

        if (wasCorrect) {
          correctAnswers++
          console.log(`✅ Respuesta ${index + 1} marcada como correcta. Total correctas: ${correctAnswers}`)
        } else {
          console.log(`❌ Respuesta ${index + 1} marcada como incorrecta.`)
        }


        await updateQuestionStats(question.id, wasCorrect)
      }))

      const score = Math.round((correctAnswers / finalSession.questions.length) * 100)
      const passed = correctAnswers >= 2

      const completedSession = {
        ...finalSession,
        endTime: new Date(),
        score,
        passed,
      }

     
      await completeSession(completedSession, correctAnswers)


      try {
        await saveUserResult(completedSession)
      } catch (error) {
        console.error("Error saving user result:", error)
      }


      if (passed && userData && db) {
        try {
          const updatedCompetences = [...userData.completedCompetences]
          if (!updatedCompetences.includes(finalSession.competence)) {
            updatedCompetences.push(finalSession.competence)
          }

          await updateDoc(doc(db, "users", user!.uid), {
            completedCompetences: updatedCompetences,




            LadicoScore: userData.LadicoScore + (passed ? 10 : 0),
          })
        } catch (error) {
          console.error("Error updating user progress:", error)
        }
      }


     
      const comps = await loadCompetences()
      const currentComp = comps.find(c => c.id === (params.competenceId as string))
      const dimension = currentComp?.dimension || ""
      const levelParam = (searchParams.get("level") || "basico").toLowerCase()

     
      const areaCompetences = comps.filter(c => c.dimension === dimension).sort((a, b) => a.code.localeCompare(b.code))

     
      let allCompletedAtLevel = true
      let nextCompetenceId: string | null = null
      for (const c of areaCompetences) {
        const qs = await getDocs(query(collection(db!, "testSessions"), where("userId", "==", user!.uid), where("competence", "==", c.id), where("level", "==", levelParam)))
        const hasPerfect = qs.docs.some(d => (d.data() as any)?.score === 100)
        if (!hasPerfect) {
          allCompletedAtLevel = false
          if (!nextCompetenceId) nextCompetenceId = c.id
        }
      }

     
      const wasAreaAlreadyComplete = allCompletedAtLevel && nextCompetenceId !== params.competenceId
      const justCompletedArea = allCompletedAtLevel && !wasAreaAlreadyComplete

      console.log(`🎯 Estado del área:`)
      console.log(`  - allCompletedAtLevel: ${allCompletedAtLevel}`)
      console.log(`  - wasAreaAlreadyComplete: ${wasAreaAlreadyComplete}`)
      console.log(`  - justCompletedArea: ${justCompletedArea}`)
      console.log(`  - nextCompetenceId: ${nextCompetenceId}`)

     
      const testResultData = {
        questions: finalSession.questions,
        answers: finalSession.answers,
        competence: finalSession.competence,
        level: levelParam,
        score,
        correctAnswers,
        totalQuestions: finalSession.questions.length,
        isAreaComplete: justCompletedArea
      }


      try {
        sessionStorage.setItem('testResultData', JSON.stringify(testResultData))
        console.log('Datos del test guardados en sessionStorage:', testResultData)
      } catch (error) {
        console.error('Error guardando datos en sessionStorage:', error)
      }

     
      const areaCompletedParam = justCompletedArea ? "1" : "0"
     
      router.push(`/test/${params.competenceId}/results?score=${score}&passed=${passed}&correct=${correctAnswers}&areaCompleted=${areaCompletedParam}&level=${levelParam}`)
    } catch (error) {
      console.error("Error saving test results:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los resultados",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    )
  }

  if (!testSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No se ha podido iniciar la prueba</h2>
          <p className="text-gray-600 mb-6">
            Hubo un problema al cargar las preguntas para esta competencia. Por favor intenta nuevamente.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 sm:bg-transparent">
      <TestInterface
        testSession={testSession}
        onAnswerSubmit={handleAnswerSubmit}
        onTestComplete={handleTestComplete}
      />
    </div>
  )
}
