"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { collection, updateDoc, doc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Question, TestSession } from "@/types"
import TestInterface from "@/components/TestInterface"
import { useToast } from "@/hooks/use-toast"

import { saveUserResult } from "@/utils/results-manager"
import { loadQuestionsByCompetence, updateQuestionStats, loadCompetences } from "@/services/questionsService"
import { getOrCreateActiveSession, updateSessionAnswer, completeSession } from "@/services/simpleSessionService"

// Sesión docente determinística + historial
import {
  ensureSession,
  getSeenQuestions,
  appendSeenQuestions,
  type LevelName,
} from "@/lib/testSession"

// Overrides de docente (nivel/país)
import { useTeacherOverrides } from "@/hooks/useTeacherOverrides"

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { effectiveCountry } = useTeacherOverrides()

  const [questions, setQuestions] = useState<Question[]>([])
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Valores reactivos derivados de URL/overrides
  const competenceId = params.competenceId as string
  const levelParam = (searchParams.get("level") || "basico").toLowerCase()
  const levelName: LevelName =
    levelParam.startsWith("b") ? "Básico" : levelParam.startsWith("i") ? "Intermedio" : "Avanzado"
  const isRetry = searchParams.get("retry") === "1"
  const isTeacher = userData?.role === "profesor"
  const country = effectiveCountry(userData?.country ?? null)

  useEffect(() => {
    if (!user || !userData) return
    let cancelled = false

    const bootstrap = async () => {
      setLoading(true)
      try {
        // Alumnos: si ya completaron, directo a resultados (profesor nunca se redirige aquí)
        if (!isTeacher && userData?.completedCompetences?.includes(competenceId)) {
          router.push(
            `/test/${competenceId}/results?completed=true&score=100&passed=true&correct=3&level=${levelParam}`
          )
          return
        }

        // (A) Si es DOCENTE + BÁSICO: asegurar sesión determinística (atada a país)
        let teacherSessionId: string | null = null
        if (isTeacher && levelParam === "basico") {
          const ensured = await ensureSession(
            {
              userId: user!.uid,
              competence: competenceId,
              level: "Básico",
              totalQuestions: 3,
            },
            {
              actorRole: "teacher",
              country, // 👈 ID docente incorpora país (historial por país)
            }
          )
          teacherSessionId = ensured.id
        }

        // (B) Historial de preguntas vistas (solo docente+básico)
        let excludeIds: string[] = []
        if (isTeacher && levelParam === "basico" && teacherSessionId) {
          excludeIds = await getSeenQuestions(teacherSessionId)
        }

        // (C) Cargar preguntas priorizando país, excluyendo vistas y barajando con semilla
        const loadedQuestions = await loadQuestionsByCompetence(competenceId, levelName, 3, {
          country,
          excludeIds,
          shuffleSeed: Date.now(),
        })

        if (loadedQuestions.length < 3) {
          throw new Error(
            `No hay suficientes preguntas ${excludeIds.length ? "nuevas " : ""}para la competencia ${competenceId} en tu país`
          )
        }
        if (cancelled) return
        setQuestions(loadedQuestions)

        // (D) Obtener (o crear) la sesión activa para la UI
        const { session } = await getOrCreateActiveSession(user!.uid, competenceId, levelParam, loadedQuestions)
        if (cancelled) return

        // Docente: usar SIEMPRE el doc determinístico (por país) para registrar vistas
        const seenDocId = teacherSessionId ?? session.id

        // (E) Normalización en modo profesor+básico
        if (isTeacher && levelParam === "basico") {
          const answers = Array(loadedQuestions.length).fill(null)
          try {
            await updateDoc(doc(db, "testSessions", session.id), {
              answers,
              endTime: null,
              score: 0,
              passed: false,
            })
          } catch (e) {
            console.warn("No se pudo normalizar la sesión (docente básico), continúo con estado local:", e)
          }

          // Registrar vistas para evitar repetidas en próximos intentos/cambios
          await appendSeenQuestions(seenDocId, loadedQuestions.map((q) => q.id))

          const cleared: TestSession = {
            ...session,
            answers,
            currentQuestionIndex: 0 as any,
            endTime: null as any,
            score: 0 as any,
            passed: false as any,
          }
          setTestSession(cleared)
        } else {
          // Alumno o profesor en otros niveles: setear sesión tal cual
          setTestSession(session)
        }
      } catch (e) {
        console.error("Error inicializando test:", e)
        const message = e instanceof Error ? e.message : "No se pudo iniciar la evaluación"
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
    // Re-dispara al cambiar país (override), nivel, retry, competencia, rol/datos
  }, [user, userData, competenceId, levelParam, isRetry, country, isTeacher, router, toast])

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
      const isTeacher = userData?.role === "profesor"
      let correctAnswers = 0

      await Promise.all(
        finalSession.questions.map(async (question, index) => {
          const userAnswer = finalSession.answers[index]
          const wasCorrect = userAnswer === question.correctAnswerIndex

          if (!isTeacher && wasCorrect) correctAnswers++
          await updateQuestionStats(question.id, !!wasCorrect)
        })
      )

      // Profesor: aprobado aunque el puntaje real sea 0/1/2/3
      if (isTeacher) {
        correctAnswers = finalSession.questions.length
      }

      const score = Math.round((correctAnswers / finalSession.questions.length) * 100)
      const passed = isTeacher ? true : correctAnswers >= 2

      const completedSession = {
        ...finalSession,
        endTime: new Date(),
        score,
        passed,
      }

      await completeSession(completedSession, correctAnswers)

      // Profesor: NO modificar progreso/puntos
      if (!isTeacher) {
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
      }

      const comps = await loadCompetences()
      const currentComp = comps.find((c) => c.id === (params.competenceId as string))
      const dimension = currentComp?.dimension || ""
      const levelParam = (searchParams.get("level") || "basico").toLowerCase()

      const areaCompetences = comps
        .filter((c) => c.dimension === dimension)
        .sort((a, b) => a.code.localeCompare(b.code))

      let allCompletedAtLevel = true
      let nextCompetenceId: string | null = null
      for (const c of areaCompetences) {
        const qs = await getDocs(
          query(
            collection(db!, "testSessions"),
            where("userId", "==", user!.uid),
            where("competence", "==", c.id),
            where("level", "==", levelParam)
          )
        )
        const hasPerfect = qs.docs.some((d) => (d.data() as any)?.score === 100)
        if (!hasPerfect) {
          allCompletedAtLevel = false
          if (!nextCompetenceId) nextCompetenceId = c.id
        }
      }

      const wasAreaAlreadyComplete = allCompletedAtLevel && nextCompetenceId !== params.competenceId
      const justCompletedArea = allCompletedAtLevel && !wasAreaAlreadyComplete

      const testResultData = {
        questions: finalSession.questions,
        answers: finalSession.answers,
        competence: finalSession.competence,
        level: levelParam,
        score,
        correctAnswers,
        totalQuestions: finalSession.questions.length,
        isAreaComplete: justCompletedArea,
      }

      try {
        sessionStorage.setItem("testResultData", JSON.stringify(testResultData))
      } catch (error) {
        console.error("Error guardando datos en sessionStorage:", error)
      }

      const areaCompletedParam = justCompletedArea ? "1" : "0"
      router.push(
        `/test/${params.competenceId}/results?score=${score}&passed=${passed}&correct=${correctAnswers}&areaCompleted=${areaCompletedParam}&level=${levelParam}`
      )
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
