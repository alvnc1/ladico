"use client"

import { useEffect, useRef, useState } from "react"
import type { TestSession } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getCompetenceTitle } from "@/components/data/digcompSkills"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"

interface TestInterfaceProps1 {
  testSession: TestSession
  onAnswerSubmit: (answerIndex: number, questionIndex: number) => void
  onTestComplete: (session: TestSession) => void
}

export default function TestInterface({
  testSession,
  onAnswerSubmit,
  onTestComplete,
}: TestInterfaceProps1) {
  if (!testSession || !testSession.questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar el test</h2>
          <p className="text-gray-700 mb-4">
            No se ha podido cargar la información del test correctamente.
          </p>
          <a
            href="/dashboard"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Volver al Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Estado navegación / respuestas
  const initialAnswer = testSession.answers?.[testSession.currentQuestionIndex] ?? null
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(initialAnswer)
  const [currentIndex, setCurrentIndex] = useState(testSession.currentQuestionIndex ?? 0)

  const currentQuestion = testSession.questions[currentIndex]
  const totalQuestions = 3
  const progress = ((currentIndex + 1) / totalQuestions) * 100
  const competenceCode = currentQuestion.competence
  const competenceName = getCompetenceTitle(competenceCode)

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    onAnswerSubmit(answerIndex, currentIndex)
  }

  // -------- Anti-cheat & Timer --------
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [showWarning, setShowWarning] = useState(false)
  const [invalidated, setInvalidated] = useState(false)
  const violationCooldownRef = useRef<number>(0)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const invalidatedRef = useRef<boolean>(false)

  // Timer por pregunta
  const QUESTION_TIME = 10 // seg   <-- ajusta si quieres
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME)
  const timerIntervalRef = useRef<number | null>(null)
  const [timeoutBanner, setTimeoutBanner] = useState(false)

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${pad(m)}:${pad(r)}`
  }

  const startTimer = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTimeoutBanner(false)
    setTimeLeft(QUESTION_TIME)
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // tiempo agotado -> invalidar y avanzar
          if (!invalidatedRef.current) {
            invalidatedRef.current = true
            setInvalidated(true)
            setShowWarning(false)
            setTimeoutBanner(true)
            if (timerIntervalRef.current) {
              window.clearInterval(timerIntervalRef.current)
              timerIntervalRef.current = null
            }
            if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
            autoAdvanceTimerRef.current = setTimeout(() => handleNext(true), 3000)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const registerViolation = () => {
    const now = Date.now()
    if (now - violationCooldownRef.current < 1500 || invalidatedRef.current) return
    violationCooldownRef.current = now

    setShowWarning(true)
    setAttemptsLeft((prev) => {
      const next = prev - 1
      if (next <= 0) {
        invalidatedRef.current = true
        setInvalidated(true)
        setShowWarning(false)

        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
        autoAdvanceTimerRef.current = setTimeout(() => handleNext(true), 3000)
        return 0
      }
      return next
    })
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) registerViolation()
    }
    const onBlur = () => registerViolation()
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) registerViolation()
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    document.addEventListener("mouseout", onMouseOut)

    // iniciar timer en la primera pregunta
    startTimer()

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("mouseout", onMouseOut)
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNext = (fromInvalidation = false) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = null
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    violationCooldownRef.current = 0
    invalidatedRef.current = false

    setCurrentIndex((prevIndex) => {
      // registrar respuesta salvo que venga de invalidación
      if (!fromInvalidation && selectedAnswer !== null) {
        onAnswerSubmit(selectedAnswer, prevIndex)
      }

      const isLast = prevIndex >= totalQuestions - 1
      if (isLast) {
        const finalSession = {
          ...testSession,
          answers: testSession.answers.map((answer, idx) =>
            idx === prevIndex ? (fromInvalidation ? answer : selectedAnswer) : answer
          ),
        }
        onTestComplete(finalSession)
        return prevIndex
      }

      const nextIndex = prevIndex + 1
      // reset estado de control
      setSelectedAnswer(testSession.answers[nextIndex] ?? null)
      setAttemptsLeft(3)
      setShowWarning(false)
      setInvalidated(false)
      startTimer() // nuevo timer
      return nextIndex
    })
  }
  // -------- fin anti-cheat & timer --------

  const isLastQuestion = currentIndex === totalQuestions - 1

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>

              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                {currentQuestion.dimension} | {competenceCode}
                {competenceName ? ` ${competenceName}` : ""} - {" Nivel "}
                {testSession.level?.toString().toLowerCase?.() === "intermedio"
                  ? "Intermedio"
                  : testSession.level?.toString().toLowerCase?.() === "avanzado"
                  ? "Avanzado"
                  : "Básico"}
              </span>
            </div>

            {/* badges intentos y tiempo */}
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full border ${
                  invalidated
                    ? "bg-red-100 text-red-700 border-red-300"
                    : attemptsLeft === 3
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : attemptsLeft === 2
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
                title="Intentos restantes para no salir de la página"
              >
                {invalidated ? "Invalidada" : `${attemptsLeft}/3`}
              </span>

              <span
                className={`text-xs font-bold px-2 py-1 rounded-full border ${
                  timeLeft <= 10
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
                title="Tiempo restante"
              >
                ⏱ {fmtTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta {currentIndex + 1} de {totalQuestions}
          </span>
          <div className="flex space-x-1 sm:space-x-2">
            {Array.from({ length: totalQuestions }, (_, index) => (
              <div
                key={index}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  index <= currentIndex ? "bg-[#286575] shadow-lg" : "bg-[#dde3e8]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2 sm:h-3 overflow-hidden">
          <div
            className="h-full bg-[#286575] rounded-full transition-all duration-500 ease-in-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Banners anti-cheat / timer */}
      {showWarning && !invalidated && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-2">
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm flex items-center justify-between">
              <span>
                ⚠️ Has salido de la página o pestaña. Intentos restantes: <b>{attemptsLeft}</b>.{" "}
                Permanece dentro para continuar.
              </span>
              <button
                className="ml-3 rounded p-1 hover:bg-amber-100"
                onClick={() => setShowWarning(false)}
                aria-label="Cerrar advertencia"
              >
                <X className="h-4 w-4 text-amber-700" />
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {timeoutBanner && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-2">
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              ⏳ Tiempo agotado. La pregunta se ha invalidado. Avanzando…
            </AlertDescription>
          </Alert>
        </div>
      )}

      {invalidated && !timeoutBanner && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-2">
          <Alert className="border-red-300 bg-red-50 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              ❌ Esta pregunta fue invalidada por exceder los 3 intentos. Avanzando automáticamente…
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Tarjeta de pregunta */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 relative ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Escenario */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  {currentQuestion.scenario}
                </p>
              </div>
            </div>

            {/* Título e instrucciones */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                {currentQuestion.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 bg-blue-50 px-3 sm:px-4 py-2 rounded-full inline-block">
                Selecciona sólo una respuesta
              </p>

              {/* Opciones */}
              <div className="space-y-3 sm:space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-start space-x-3 sm:space-x-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
                      invalidated
                        ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                        : selectedAnswer === index
                        ? "border-[#286575] bg-[#e6f2f3] shadow-md transform scale-[1.01] sm:scale-[1.02] cursor-pointer"
                        : "border-gray-200 hover:border-[#286575] hover:bg-gray-50 hover:shadow-sm cursor-pointer"
                    }`}
                  >
                    <div className="relative mt-1">
                      <input
                        type="radio"
                        name="answer"
                        value={index}
                        checked={selectedAnswer === index}
                        onChange={() => handleAnswerSelect(index)}
                        disabled={invalidated}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all ${
                          selectedAnswer === index
                            ? "border-[#286575] bg-[#286575]"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedAnswer === index && (
                          <div className="w-2 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </div>
                    <span className="text-gray-700 leading-relaxed flex-1 text-sm sm:text-base">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navegación */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex space-x-3 w-full sm:w-auto">
                {currentIndex > 0 && (
                  <Button
                    onClick={() => {
                      // al retroceder, reseteamos timer/flags igual que al avanzar
                      if (timerIntervalRef.current) {
                        window.clearInterval(timerIntervalRef.current)
                        timerIntervalRef.current = null
                      }
                      if (autoAdvanceTimerRef.current) {
                        clearTimeout(autoAdvanceTimerRef.current)
                        autoAdvanceTimerRef.current = null
                      }
                      violationCooldownRef.current = 0
                      invalidatedRef.current = false

                      const prevIndex = currentIndex - 1
                      setCurrentIndex(prevIndex)
                      setSelectedAnswer(testSession.answers[prevIndex] ?? null)
                      setAttemptsLeft(3)
                      setShowWarning(false)
                      setInvalidated(false)
                      startTimer()
                    }}
                    variant="outline"
                    className="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl sm:rounded-2xl font-medium transition-all text-sm sm:text-base"
                  >
                    Anterior
                  </Button>
                )}
              </div>

              <Button
                onClick={() => handleNext(false)}
                disabled={selectedAnswer === null || invalidated}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl sm:rounded-2xl font-medium text-white sm:text-lg shadow-lg hover:bg-[#3a7d89] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLastQuestion ? "Finalizar" : "Siguiente"}
              </Button>
            </div>

            {/* Ayuda */}
            {selectedAnswer === null && !invalidated && (
              <div className="mt-4 sm:mt-6 flex items-center justify-center space-x-3 text-blue-600 bg-blue-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-600" />
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  Por favor, selecciona una respuesta para continuar
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
