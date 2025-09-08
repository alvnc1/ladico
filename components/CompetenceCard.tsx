"use client"

import type { Competence } from "@/types"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMemo, useState } from "react"
import { firstExerciseRoute, type LevelSlug } from "@/lib/firstExerciseRoute"
import { useAuth } from "@/contexts/AuthContext"

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
  const { userData } = useAuth()
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

  const effectiveProgressPct = useMemo(() => {
    // Profesor en Avanzado completado → anillo 100%
    if (isTeacher && currentAreaLevel === "Avanzado" && levelStatus.completed) return 100
    if (locallyStarted && !levelStatus.inProgress && !levelStatus.completed) return 15
    return levelStatus.progressPct
  }, [isTeacher, currentAreaLevel, levelStatus.progressPct, levelStatus.inProgress, levelStatus.completed, locallyStarted])

  const dashOffset = useMemo(
    () => circumference * (1 - effectiveProgressPct / 100),
    [circumference, effectiveProgressPct]
  )

  const showDash = levelStatus.inProgress || levelStatus.completed || locallyStarted

  const labelText = useMemo(() => {
    if (!levelStatus.inProgress && !levelStatus.completed && !locallyStarted) return "-"
    return `Nivel ${levelNumber}`
  }, [levelStatus.inProgress, levelStatus.completed, locallyStarted, levelNumber])

  // Helpers
  const levelToSlug = (lvl: "Básico" | "Intermedio" | "Avanzado"): LevelSlug =>
    lvl === "Básico" ? "basico" : lvl === "Intermedio" ? "intermedio" : "avanzado"

  // ===== Reglas de botones =====
  const isLastLevel = levelNumber === 3
  const canStartCurrent = hasEnoughQuestions && !levelStatus.completed
  const canAdvanceToNextLevel = levelStatus.completed && !isLastLevel
  const canStartOrContinue = levelStatus.inProgress || canStartCurrent || canAdvanceToNextLevel

  const btnLabel = (() => {
    if (levelStatus.inProgress) return "Continuar"
    if (canAdvanceToNextLevel) return `Comenzar nivel ${levelNumber + 1}`
    if (canStartCurrent) return "Comenzar evaluación"
    return "Bloqueado"
  })()

  // En Básico/Intermedio, “Volver a intentar” solo si se puede avanzar
  const showRetryButton = isTeacher && canAdvanceToNextLevel

  const handleStartOrContinue = () => {
    if (!canStartOrContinue) return
    setLocallyStarted(true)
    const targetLevelNumber = canAdvanceToNextLevel ? levelNumber + 1 : levelNumber
    const levelMap: Record<number, "Básico" | "Intermedio" | "Avanzado"> = { 1: "Básico", 2: "Intermedio", 3: "Avanzado" }
    const targetLevelName = levelMap[targetLevelNumber]
    const url = firstExerciseRoute(competence.id, levelToSlug(targetLevelName))
    router.push(url)
  }

  // Intermedio/Avanzado → ej1; Básico mantiene /test?...retry=1
  const handleRetryTeacher = () => {
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

  // ⬇️ Reiniciar niveles SIN navegar: limpia progreso y avisa al Dashboard
  const handleResetTeacherLevels = () => {
    if (currentAreaLevel !== "Avanzado") return
    try {
      if (typeof window !== "undefined") {
        const compId = competence.id
        // Flag para que el dashboard pinte estado inicial (Nivel 1)
        localStorage.setItem(`ladico:resetLevels:${compId}`, "1")
        // Limpiar progreso local de los 3 niveles
        ;(["basico", "intermedio", "avanzado"] as const).forEach((lvl) => {
          localStorage.removeItem(`ladico:${compId}:${lvl}:progress`)
          localStorage.removeItem(`level:${compId}:${lvl}:completed`)
          localStorage.removeItem(`ladico:completed:${compId}:${lvl}`)
        })
        // Notificar al dashboard
        localStorage.setItem("ladico:progress:version", String(Date.now()))
        window.dispatchEvent(new Event("ladico:refresh"))
      }
    } catch {
      /* no-op */
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

          {/* Botonera */}
          {isTeacher && currentAreaLevel === "Avanzado" && levelStatus.completed ? (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleRetryTeacher}
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
                onClick={handleRetryTeacher}
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
              className={`w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 border mt-3
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
                      <span className="text-xs text-green-700 font-medium">Completado</span>
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
