"use client"

import type { Competence } from "@/types"
import { useRouter } from "next/navigation"
import { AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useEffect, useMemo, useState } from "react"
// Helpers para rutas/niveles
import {
  firstExerciseRoute,
  type LevelSlug,
  hasLevelAvailable,
  nextLevel,
} from "@/lib/firstExerciseRoute"
import { useAuth } from "@/contexts/AuthContext"
import {
  clearTeacherSeenQuestionsAllCountries,
  hardResetCompetenceSessions,
} from "@/lib/testSession"

interface CompetenceCardProps {
  competence: Competence
  questionCount?: number
  currentAreaLevel: "Básico" | "Intermedio" | "Avanzado"
  levelStatus: { completed: boolean; inProgress: boolean; answered: number; total: number; progressPct: number }
  areaCompletedAtLevel: boolean
  isNextCandidate: boolean
  isPreviousCompetenceCompleted: (competenceId: string, level: "Básico" | "Intermedio" | "Avanzado") => boolean
  startOrContinueUrl?: string
}

export default function CompetenceCard({
  competence,
  questionCount = 0,
  currentAreaLevel,
  levelStatus,
  areaCompletedAtLevel,
  isNextCandidate,
  isPreviousCompetenceCompleted,
  startOrContinueUrl,
}: CompetenceCardProps) {
  const router = useRouter()
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor"

  const [locallyStarted, setLocallyStarted] = useState(false)
  const hasEnoughQuestions = questionCount >= 3

  const getCompetenceSpecificColor = () => {
    const competenceColors: Record<string, string> = {
      "1.1": "#F3D37B", "1.2": "#F3D37B", "1.3": "#F3D37B",
      "2.1": "#A8D4F1", "2.2": "#A8D4F1", "2.3": "#A8D4F1", "2.4": "#A8D4F1", "2.5": "#A8D4F1", "2.6": "#A8D4F1",
      "3.1": "#F5A78D", "3.2": "#F5A78D", "3.3": "#F5A78D", "3.4": "#F5A78D",
      "4.1": "#A5D0A0", "4.2": "#A5D0A0", "4.3": "#A5D0A0", "4.4": "#A5D0A0",
      "5.1": "#F1A5A0", "5.2": "#F1A5A0", "5.3": "#F1A5A0", "5.4": "#F1A5A0",
    }
    return competenceColors[competence.id] || "#D1D5DB"
  }

  const ringColor = getCompetenceSpecificColor()

  const levelNumber = useMemo(() => {
    return currentAreaLevel === "Básico" ? 1 : currentAreaLevel === "Intermedio" ? 2 : 3
  }, [currentAreaLevel])

  const circumference = useMemo(() => 2 * Math.PI * 18, [])

  const levelToSlug = (lvl: "Básico" | "Intermedio" | "Avanzado"): LevelSlug =>
    lvl === "Básico" ? "basico" : lvl === "Intermedio" ? "intermedio" : "avanzado"

  // Marca local de "finalizado" (aprobado o reprobado) para rellenar el anillo igual
  const [finishedFlag, setFinishedFlag] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const slug = levelToSlug(currentAreaLevel)
    const key = `ladico:completed:${competence.id}:${slug}`
    const refresh = () => {
      const fin = localStorage.getItem(key) === "1"
      setFinishedFlag(fin)
    }
    refresh()
    const handler = () => refresh()
    window.addEventListener("ladico:refresh", handler)
    return () => window.removeEventListener("ladico:refresh", handler)
  }, [competence.id, currentAreaLevel])

  // ✅ terminado pero NO aprobado → debe bloquear y mostrar "Reprobado"
  const failedAndFinished = finishedFlag && !levelStatus.completed

  const effectiveProgressPct = useMemo(() => {
    if (isTeacher && currentAreaLevel === "Avanzado" && levelStatus.completed) return 100
    if (finishedFlag) return 100
    if (locallyStarted && !levelStatus.inProgress && !levelStatus.completed) return 15
    return levelStatus.progressPct
  }, [isTeacher, currentAreaLevel, levelStatus.progressPct, levelStatus.inProgress, levelStatus.completed, locallyStarted, finishedFlag])

  const dashOffset = useMemo(
    () => circumference * (1 - effectiveProgressPct / 100),
    [circumference, effectiveProgressPct]
  )

  const showDash = levelStatus.inProgress || levelStatus.completed || locallyStarted || finishedFlag

  const labelText = useMemo(() => {
    if (!levelStatus.inProgress && !levelStatus.completed && !locallyStarted && !finishedFlag) return "-"
    return `Nivel ${levelNumber}`
  }, [levelStatus.inProgress, levelStatus.completed, locallyStarted, finishedFlag, levelNumber])

  // ====== REGLAS DE BOTONES ======
  const isLastLevel = levelNumber === 3

  // Estudiante: para avanzar al siguiente nivel requiere completar competencia + área
  // Profesor: SIN modo secuencial -> ignora `areaCompletedAtLevel`
  const currentLevelSlug = levelToSlug(currentAreaLevel)
  const nxt = nextLevel(currentLevelSlug)
  const nextExists = nxt ? hasLevelAvailable(competence.id, nxt) : false

  // Base (estudiante)
  let canStartCurrent = hasEnoughQuestions && !levelStatus.completed
  // ⛔ bloquear si terminó pero reprobó (solo alumno)
  if (!isTeacher && failedAndFinished) {
    canStartCurrent = false
  }

  let canAdvanceToNextLevel = levelStatus.completed && !isLastLevel && areaCompletedAtLevel
  let allowNext = canAdvanceToNextLevel && nextExists

  // ----- OVERRIDES PARA PROFESOR (NO secuencial) -----
  if (isTeacher) {
    // Puede comenzar SIEMPRE el nivel actual si hay preguntas
    canStartCurrent = hasEnoughQuestions

    // Solo habilita el siguiente nivel si ya tocó este nivel (iniciado o completado).
    const alreadyTouched = levelStatus.inProgress || levelStatus.completed || locallyStarted
    canAdvanceToNextLevel = !isLastLevel && nextExists && alreadyTouched
    allowNext = canAdvanceToNextLevel
  }

  const canStartOrContinue = levelStatus.inProgress || canStartCurrent || allowNext

  const btnLabel = (() => {
    if (levelStatus.inProgress) return "Continuar"
    if (allowNext) return `Comenzar nivel ${levelNumber + 1}`
    if (canStartCurrent) return "Comenzar evaluación"
    if (!allowNext && (levelStatus.inProgress || levelStatus.completed || locallyStarted || failedAndFinished))
      return "Volver a intentar"
    return "Bloqueado"
  })()

  // Mostrar doble botón (reintentar + reset) cuando:
  // - Nivel Básico
  // - NO hay siguiente nivel permitido (allowNext == false)
  // - y el nivel 1 ya fue iniciado / completado / iniciado localmente
  // SOLO profesor ve "Volver a intentar" + "Reiniciar nivel" en nivel Básico sin siguiente nivel
  const showRetryAndReset =
    isTeacher &&
    currentAreaLevel === "Básico" &&
    !allowNext &&
    (levelStatus.inProgress || levelStatus.completed || locallyStarted)

  // Rama especial Avanzado (profe)
  const showTeacherAdvancedReset =
    isTeacher && currentAreaLevel === "Avanzado" && levelStatus.completed

  const showRetryButton = isTeacher && allowNext

  // ===== utilidades de navegación y reset =====
  const clearResetFlag = () => {
    if (typeof window === "undefined") return
    const compId = competence.id
    localStorage.removeItem(`ladico:resetLevels:${compId}`)
    localStorage.removeItem(`ladico:resetLevels:${compId}:ts`)
    localStorage.setItem("ladico:progress:version", String(Date.now()))
    window.dispatchEvent(new Event("ladico:refresh"))
    setTimeout(() => {
      try { router.refresh() } catch {}
    }, 0)
  }

  const handleStartOrContinue = () => {
    if (!canStartOrContinue) return
    setLocallyStarted(true)
    clearResetFlag()
    const targetLevelNumber = allowNext ? levelNumber + 1 : levelNumber
    const levelMap: Record<number, "Básico" | "Intermedio" | "Avanzado"> = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" }
    const targetLevelName = levelMap[targetLevelNumber]
    const url = firstExerciseRoute(competence.id, levelToSlug(targetLevelName))
    router.push(url)
  }

  const handleRetrySameLevel = () => {
    clearResetFlag()
    const compSlug = competence.id.replace(".", "-")
    if (currentAreaLevel === "Intermedio") {
      router.push(`/exercises/comp-${compSlug}/intermedio/ej1?retry=1`)
      return
    }
    if (currentAreaLevel === "Avanzado") {
      router.push(`/exercises/comp-${compSlug}/avanzado/ej1?retry=1`)
      return
    }
    const slug = levelToSlug(currentAreaLevel)
    router.push(`/test/${competence.id}?level=${slug}&retry=1`)
  }

  const handleResetCurrentLevel = async () => {
    try {
      if (typeof window !== "undefined") {
        const compId = competence.id
        const slug = levelToSlug(currentAreaLevel)

        // 1) Local
        localStorage.setItem(`ladico:resetLevels:${compId}`, "1")
        localStorage.setItem(`ladico:resetLevels:${compId}:ts`, String(Date.now()))
        ;(["basico", "intermedio", "avanzado"] as const).forEach((lvl) => {
          localStorage.removeItem(`ladico:${compId}:${lvl}:progress`)
          localStorage.removeItem(`level:${compId}:${lvl}:completed`)
          localStorage.removeItem(`ladico:completed:${compId}:${lvl}`)
        })

        // 2) Backend
        if (user?.uid) {
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Básico")
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Intermedio")
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Avanzado")
          await hardResetCompetenceSessions(user.uid, compId)
        }

        // 3) UI
        localStorage.setItem("ladico:progress:version", String(Date.now()))
        window.dispatchEvent(new Event("ladico:refresh"))
        try { router.refresh() } catch {}
        setTimeout(() => {
          localStorage.setItem("ladico:progress:version", String(Date.now()))
        }, 50)
      }
    } catch (e) {
      console.warn("No se pudo reiniciar el nivel:", e)
    }
  }

  const handleResetTeacherLevels = async () => {
    if (currentAreaLevel !== "Avanzado") return
    try {
      if (typeof window !== "undefined") {
        const compId = competence.id
        localStorage.setItem(`ladico:resetLevels:${compId}`, "1")
        localStorage.setItem(`ladico:resetLevels:${compId}:ts`, String(Date.now()))
        ;(["basico", "intermedio", "avanzado"] as const).forEach((lvl) => {
          localStorage.removeItem(`ladico:${compId}:${lvl}:progress`)
          localStorage.removeItem(`level:${compId}:${lvl}:completed`)
          localStorage.removeItem(`ladico:completed:${compId}:${lvl}`)
        })
        if (user?.uid) {
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Básico")
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Intermedio")
          await clearTeacherSeenQuestionsAllCountries(user.uid, compId, "Avanzado")
          await hardResetCompetenceSessions(user.uid, compId)
        }
        localStorage.setItem("ladico:progress:version", String(Date.now()))
        window.dispatchEvent(new Event("ladico:refresh"))
        try { router.refresh() } catch {}
        setTimeout(() => {
          localStorage.setItem("ladico:progress:version", String(Date.now()))
        }, 50)
      }
    } catch (e) {
      console.warn("No se pudo reiniciar niveles:", e)
    }
  }

  return (
    <div className="relative bg-white rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group border border-gray-200 h-[300px] max-h-[300px] flex flex-col">
      <div className="overflow-hidden rounded-2xl bg-white h-full flex flex-col">
        <div className="h-6 rounded-t-2xl" style={{ backgroundColor: ringColor }} />

        <div className="p-5 flex-1 flex flex-col overflow-hidden text-center">
          <div className="overflow-y-auto flex-1 pr-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-bold text-gray-900 mb-3 leading-tight min-h-[2.5rem]">
                    {competence.name}
                  </h3>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>

            <div className="flex justify-center my-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  {showDash && (
                    <circle
                      cx="20" cy="20" r="18" fill="none" strokeWidth="4"
                      stroke={ringColor}
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.5s" }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-[#286675]">{labelText}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botonera (con bypass secuencial para profesor) */}
          {showRetryAndReset ? (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleRetrySameLevel}
                variant="outline"
                className="w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold border-2 border-[#94b2ba] text-[#286675] hover:bg-[#f1f6f8]"
              >
                Volver a intentar
              </Button>
              <Button
                onClick={handleResetCurrentLevel}
                className="w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold bg-[#286675] hover:bg-[#1e4a56] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-transparent font-bold"
              >
                Reiniciar nivel
              </Button>
            </div>
          ) : showTeacherAdvancedReset ? (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleRetrySameLevel}
                variant="outline"
                className="w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold border-2 border-[#94b2ba] text-[#286675] hover:bg-[#f1f6f8]"
              >
                Volver a intentar
              </Button>
              <Button
                onClick={handleResetTeacherLevels}
                className="w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold bg-[#286675] hover:bg-[#1e4a56] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-transparent font-bold"
              >
                Reiniciar niveles
              </Button>
            </div>
          ) : showRetryButton ? (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleRetrySameLevel}
                variant="outline"
                className="w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold border-2 border-[#94b2ba] text-[#286675] hover:bg-[#f1f6f8]"
              >
                Volver a intentar
              </Button>
              <Button
                onClick={handleStartOrContinue}
                className={`w-full rounded-full py-2.5 sm:py-3 text-xs font-semibold transition-all duration-200 border
                ${
                  canStartOrContinue
                    ? "bg-[#286675] hover:bg-[#1e4a56] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-transparent font-bold"
                    : "bg-gray-100 text-gray-400 border-gray-200"
                }`}
                disabled={!canStartOrContinue}
              >
                {btnLabel}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStartOrContinue}
              className={`w-full rounded-full py-3 text-sm font-semibold transition-all duración-200 border mt-3
              ${
                canStartOrContinue
                  ? "bg-[#286675] hover:bg-[#1e4a56] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-transparent font-bold"
                  : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
              disabled={!canStartOrContinue}
            >
              {canStartOrContinue ? (
                btnLabel
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {levelStatus.completed ? (
                    <>
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs text-green-700 font-medium">Aprobado</span>
                    </>
                  ) : failedAndFinished ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-700 font-medium">Reprobado</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-700">Bloqueado</span>
                    </>
                  )}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
