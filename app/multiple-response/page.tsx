"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import type { Question, TestSession } from "@/types"
import MultipleResponseInterface from "@/components/MultipleResponseInterface"
import { useToast } from "@/hooks/use-toast"

import { loadMultipleResponseQuestions } from "@/services/multipleResponseService"
import { getOrCreateActiveSession, updateSessionAnswer, completeSession } from "@/services/simpleSessionService"

export default function MultipleResponsePage() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const { toast } = useToast()

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
      const levelParam = "Básico" 

      const loadedQuestions = await loadMultipleResponseQuestions(levelParam, 3)
      if (loadedQuestions.length < 3) throw new Error("No hay suficientes preguntas multiple-response")
      setQuestions(loadedQuestions)

      const { session } = await getOrCreateActiveSession(user!.uid, "multiple-response", levelParam, loadedQuestions)
      setTestSession(session)
    } catch (e) {
      console.error("Error inicializando multiple-response:", e)
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo iniciar la evaluación", variant: "destructive" })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSubmit = async (answerIndices: number[], questionIndex: number) => {
    if (!testSession) return
    try {
      
      const updated = await updateSessionAnswer(testSession, questionIndex, answerIndices)
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
        let wasCorrect = false

        if (question.type === "multiple-response") {
          const correctIndices = Array.isArray(question.correctAnswerIndex) ? question.correctAnswerIndex : [question.correctAnswerIndex]
          const userIndices = Array.isArray(userAnswer) ? userAnswer : [userAnswer].filter(a => a !== null)
          wasCorrect = correctIndices.length === userIndices.length && correctIndices.every(idx => userIndices.includes(idx))
        } else {
          wasCorrect = userAnswer === question.correctAnswerIndex
        }

        console.log(`Pregunta ${index + 1}: ${question.title}`)
        console.log(`  Usuario respondió: ${Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer}`)
        console.log(`  Respuesta correcta: ${Array.isArray(question.correctAnswerIndex) ? question.correctAnswerIndex.join(', ') : question.correctAnswerIndex}`)
        console.log(`  ¿Correcta?: ${wasCorrect ? "SÍ" : "NO"}`)

        if (wasCorrect) {
          correctAnswers++
        }
      }))

      const score = Math.round((correctAnswers / finalSession.questions.length) * 100)
      const passed = correctAnswers >= 2 

      await completeSession(finalSession, correctAnswers)

      router.push(`/multiple-response/results?completed=true&score=${score}&passed=${passed}&correct=${correctAnswers}`)
    } catch (e) {
      console.error("Error completando test:", e)
      toast({ title: "Error", description: "No se pudo completar la evaluación", variant: "destructive" })
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
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar el test</h2>
          <p className="text-gray-700 mb-4">No se ha podido cargar la información correctamente.</p>
          <a href="/dashboard" className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Volver al Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MultipleResponseInterface
        testSession={testSession}
        onAnswerSubmit={handleAnswerSubmit}
        onTestComplete={handleTestComplete}
      />
    </div>
  )
}
