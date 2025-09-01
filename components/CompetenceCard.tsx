"use client"

import type { Competence } from "@/types"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMemo, useState } from "react"

const getDimensionName = (dimension: string): string => {
  const dimensionNames: Record<string, string> = {
    "Búsqueda y gestión de información": "Búsqueda y Gestión de Información",
    "Comunicación y colaboración": "Comunicación y Colaboración",
    "Creación de contenidos digitales": "Creación de Contenidos Digitales",
    "Seguridad": "Seguridad",
    "Resolución de problemas": "Resolución de Problemas"
  }
  return dimensionNames[dimension] || dimension
}

interface CompetenceCardProps {
  competence: Competence
  questionCount?: number
  currentAreaLevel: "Básico" | "Intermedio" | "Avanzado"
  levelStatus: { completed: boolean; inProgress: boolean; answered: number; total: number; progressPct: number }
  areaCompletedAtLevel: boolean
  isNextCandidate: boolean
  isPreviousCompetenceCompleted: (competenceId: string, level: "Básico" | "Intermedio" | "Avanzado") => boolean
}

export default function CompetenceCard({ competence, questionCount = 0, currentAreaLevel, levelStatus, areaCompletedAtLevel, isNextCandidate, isPreviousCompetenceCompleted }: CompetenceCardProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [locallyStarted, setLocallyStarted] = useState(false)

  const hasEnoughQuestions = questionCount >= 3


  const getCompetenceSpecificColor = () => {
    const competenceColors: Record<string, string> = {
      "1.1": "#F3D37B",
      "1.2": "#F3D37B",
      "1.3": "#F3D37B",
      "2.1": "#A8D4F1",
      "2.2": "#A8D4F1",
      "2.3": "#A8D4F1",
      "2.4": "#A8D4F1",
      "2.5": "#A8D4F1",
      "2.6": "#A8D4F1",
      "3.1": "#F5A78D",
      "3.2": "#F5A78D",
      "3.3": "#F5A78D",
      "3.4": "#F5A78D",
      "4.1": "#A5D0A0",
      "4.2": "#A5D0A0",
      "4.3": "#A5D0A0",
      "4.4": "#A5D0A0",
      "5.1": "#F1A5A0",
      "5.2": "#F1A5A0",
      "5.3": "#F1A5A0",
      "5.4": "#F1A5A0",
    }
    return competenceColors[competence.id] || "#D1D5DB"
  }

  const ringColor = getCompetenceSpecificColor()

  const isLongDescription = competence.description.length > 80
  const displayDescription = showFullDescription || !isLongDescription
    ? competence.description
    : `${competence.description.substring(0, 80)}...`

  const levelNumber = useMemo(() => {
    return currentAreaLevel === "Básico" ? 1 : currentAreaLevel === "Intermedio" ? 2 : 3
  }, [currentAreaLevel])

  const circumference = useMemo(() => 2 * Math.PI * 18, [])
  
 
  const effectiveProgressPct = useMemo(() => {
    if (locallyStarted && !levelStatus.inProgress && !levelStatus.completed) {
      return 15
    }
    return levelStatus.progressPct
  }, [levelStatus.progressPct, levelStatus.inProgress, levelStatus.completed, locallyStarted])
  
  const dashOffset = useMemo(() => circumference * (1 - effectiveProgressPct / 100), [circumference, effectiveProgressPct])

  const showDash = levelStatus.inProgress || levelStatus.completed || locallyStarted
  
 
  const labelText = useMemo(() => {
    if (!levelStatus.inProgress && !levelStatus.completed && !locallyStarted) {
      return "-"
    }
    // Mostrar siempre el nivel actual, no el siguiente
    return `Nivel ${levelNumber}`
  }, [levelStatus.inProgress, levelStatus.completed, locallyStarted, levelNumber])

  // Nueva lógica de habilitación de botón y avance de nivel
  const isLastLevel = levelNumber === 3
  const canStartCurrent = hasEnoughQuestions && !levelStatus.completed
  const canAdvanceToNextLevel = levelStatus.completed && areaCompletedAtLevel && !isLastLevel
  const canStartOrContinue = levelStatus.inProgress || canStartCurrent || canAdvanceToNextLevel
  const btnLabel = (() => {
    if (levelStatus.inProgress) return "Continuar"
    if (canAdvanceToNextLevel) return `Comenzar nivel ${levelNumber + 1}`
    if (canStartCurrent) return "Comenzar evaluación"
    return "Bloqueado"
  })()

  const handleStartOrContinue = () => {
    if (!canStartOrContinue) return

    const targetLevelNumber = canAdvanceToNextLevel ? levelNumber + 1 : levelNumber
    const levelMap: Record<number, "Básico" | "Intermedio" | "Avanzado"> = {1: "Básico", 2: "Intermedio", 3: "Avanzado"}
    const targetLevelName = levelMap[targetLevelNumber]

    const dimensionName = getDimensionName(competence.dimension)
    const competenceNumber = competence.code.split('.')[1]
    const areaNumber = competence.code.split('.')[0]
    const totalInArea = areaNumber === "1" ? 3 : areaNumber === "2" ? 6 : 4
    const currentPosition = parseInt(competenceNumber)

    const intro = canAdvanceToNextLevel
      ? `🚀 AVANZAR AL NIVEL ${targetLevelNumber}`
      : `🎯 EVALUACIÓN: "${competence.name}"`

    const confirmed = confirm(
      `${intro}\n\n` +
      `📍 Área: ${dimensionName}\n` +
      `📊 Posición: ${currentPosition}/${totalInArea} competencias del área\n` +
      `🎯 Nivel a realizar: ${targetLevelName}\n` +
      `📝 Preguntas: 3\n` +
      `⏱️ Tiempo estimado: 5-10 minutos\n\n` +
      (canAdvanceToNextLevel
        ? `✅ Has completado todas las competencias del nivel ${levelNumber}. Ahora puedes iniciar el nivel ${targetLevelNumber}.\n\n`
        : `⚡ Al completar esta competencia podrás continuar con la siguiente.\n\n`) +
      `¿Deseas continuar?`
    )

    if (confirmed) {
      setLocallyStarted(true)
      const levelParam = targetLevelName.toLowerCase()
      router.push(`/test/${competence.id}?level=${levelParam}`)
    }
  }

  return (
    <div className="relative bg-white rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group border border-gray-200 h-[300px] max-h-[300px] flex flex-col">
      <div className="overflow-hidden rounded-2xl bg-white h-full flex flex-col">
        <div
          className="h-6 rounded-t-2xl"
          style={{ backgroundColor: getCompetenceSpecificColor() }}
        />

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
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      strokeWidth="4"
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

          <Button
            onClick={handleStartOrContinue}
            className={`w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 border mt-3
            ${canStartOrContinue
                ? "bg-[#286675] hover:bg-[#1e4a56] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-transparent font-bold"
                : "bg-gray-100 text-gray-400 border-gray-200"
              }`}
            disabled={!canStartOrContinue}
          >
            {canStartOrContinue ? btnLabel : (
              <span className="flex items-center justify-center gap-2">
                {levelStatus.completed ? (
                  <>
                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
        </div>
      </div>
    </div>
  )
}
