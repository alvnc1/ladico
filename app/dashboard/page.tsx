"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import CompetenceCard from "@/components/CompetenceCard"
import { useCompetenceProgress } from "@/hooks/useCompetenceProgress"
import { useLevelProgress } from "@/hooks/useLevelProgress"
import { useQuestionsCount } from "@/hooks/useQuestionsCount"
import { useCompetences } from "@/hooks/useCompetences"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { firstExerciseRoute, type LevelSlug } from "@/lib/firstExerciseRoute"

export default function Dashboard() {
  const { user, userData, loading } = useAuth()
  const { progress, loading: loadingProgress } = useCompetenceProgress()
  const {
    loading: loadingLevels,
    perCompetenceLevel,
    currentAreaLevel,
    areaStats,
    nextCompetenceToAttempt,
    isPreviousCompetenceCompleted,
  } = useLevelProgress()
  const { counts, loading: loadingCounts } = useQuestionsCount()
  const { competences, loading: loadingCompetences } = useCompetences()
  const router = useRouter()

  const isTeacher = userData?.role === "profesor"

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("Todas")

  const getAreaName = (code: string) => {
    if (code?.startsWith("1.")) return "Búsqueda y gestión de información"
    if (code?.startsWith("2.")) return "Comunicación y colaboración"
    if (code?.startsWith("3.")) return "Creación de contenidos digitales"
    if (code?.startsWith("4.")) return "Seguridad"
    if (code?.startsWith("5.")) return "Resolución de problemas"
    return ""
  }

  const filteredCompetences = competences.filter((competence) => {
    // guard por si algún item viene vacío
    if (!competence) return false

    const q = searchTerm.trim().toLowerCase()
    const areaName = getAreaName(competence.code).toLowerCase()

    const matchesSearch =
      q.length === 0 ||
      competence.name.toLowerCase().includes(q) ||
      competence.description.toLowerCase().includes(q) ||
      areaName.includes(q)

    const hasQuestions = (counts[competence.id] || 0) >= 3

    if (filterType === "Iniciadas" && userData) {
      const userProg = userData.completedCompetences.includes(competence.id) ? 100 : (progress[competence.id] || 0)
      return matchesSearch && userProg > 0 && userProg < 100
    }
    if (filterType === "Pendientes" && userData) {
      const userProg = userData.completedCompetences.includes(competence.id) ? 100 : (progress[competence.id] || 0)
      return matchesSearch && userProg === 0 && hasQuestions
    }

    return matchesSearch
  })

  const groupedCompetences = {
    "Búsqueda y gestión de información": filteredCompetences.filter((c) => c?.code?.startsWith("1.")),
    "Comunicación y colaboración": filteredCompetences.filter((c) => c?.code?.startsWith("2.")),
    "Creación de contenidos digitales": filteredCompetences.filter((c) => c?.code?.startsWith("3.")),
    "Seguridad": filteredCompetences.filter((c) => c?.code?.startsWith("4.")),
    "Resolución de problemas": filteredCompetences.filter((c) => c?.code?.startsWith("5.")),
  }

  const allFilteredCompetences = Object.values(groupedCompetences).flat()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading || loadingProgress || loadingCounts || loadingCompetences || loadingLevels) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675] "></div>
      </div>
    )
  }

  if (!user || !userData) return null

  // 🔗 URL para empezar/continuar según progreso real (igual para alumno y profesor)
  const startOrContinueUrlFor = (competenceId: string, level: "Básico" | "Intermedio" | "Avanzado") => {
    const st = perCompetenceLevel[competenceId]?.[level]
    const slug: LevelSlug = level === "Básico" ? "basico" : (level.toLowerCase() as LevelSlug)

    if (!st || st.completed || (!st.inProgress && st.answered === 0)) {
      return firstExerciseRoute(competenceId, slug)
    }

    const nextIndex = Math.min(st.answered, 2) // 0→ej1, 1→ej2, 2→ej3
    const compSlug = competenceId.replace(".", "-")
    return `/exercises/comp-${compSlug}/${slug}/ej${nextIndex + 1}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 mb-6">
              <div className="text-center lg:text-left">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">Competencias</h1>
                <p className="text-sm lg:text-base text-gray-600">
                  Evalúate a tu propio ritmo en las competencias digitales. Elige una competencia y comienza a ganar
                  Ladicos.
                </p>
              </div>

              <div className="text-center flex-shrink-0">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-[#94b2ba] to-[#286675] rounded-full flex items-center justify-center text-white mb-2 shadow-xl border-4 border-white mx-auto">
                  <div>
                    <div className="text-lg lg:text-2xl font-bold">{userData?.LadicoScore || 0}</div>
                    <div className="text-xs font-medium">Ladicos</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-lg border-2 border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 lg:h-5 lg:w-5" />
                  <Input
                    type="text"
                    placeholder="Buscar por competencia o área…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 lg:pl-12 h-10 lg:h-12 text-sm lg:text-base rounded-xl lg:rounded-2xl border-2 border-gray-200 focus:border-[#286675] transition-colors"
                  />
                </div>

                <div className="flex gap-2 lg:gap-3">
                  {["Todas", "Iniciadas", "Pendientes"].map((filter) => (
                    <Button
                      key={filter}
                      variant={filterType === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterType(filter)}
                      className={`px-3 lg:px-4 py-2 lg:py-2.5 text-xs lg:text-sm font-medium rounded-xl lg:rounded-2xl transition-all duration-200 ${
                        filterType === filter
                          ? "bg-gradient-to-r from-[#94b2ba] to-[#286675] text-white shadow-md border-transparent"
                          : "bg-white text-[#286675] border-2 border-[#94b2ba] hover:border-[#286675] hover:text-[#286675]"
                      }`}
                    >
                      {filter}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 lg:space-y-12">
            {Object.entries(groupedCompetences).map(
              ([dimension, competences]) =>
                competences.length > 0 && (
                  <div key={dimension} className="space-y-4 lg:space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-1 bg-gradient-to-r from-[#94b2ba] to-[#286675] rounded-full flex-1"></div>
                      <h2 className="text-xl lg:text-2xl font-bold text-gray-900 px-4 py-2 bg-white rounded-2xl shadow-sm border-2 border-gray-100">
                        {dimension}
                      </h2>
                      <div className="h-1 bg-gradient-to-r from-[#286675] to-[#94b2ba] rounded-full flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                      {competences.map((competence, idx) => {
                        if (!competence) return null // guard

                        // Nivel de referencia según el área
                        const areaLevel = currentAreaLevel(competence.dimension)

                        // ⬇️ Prioriza mostrar el nivel MÁS ALTO donde haya actividad (anillo correcto)
                        const levelPriority: Array<"Básico" | "Intermedio" | "Avanzado"> = [
                          "Avanzado",
                          "Intermedio",
                          "Básico",
                        ]

                        let displayLevel: "Básico" | "Intermedio" | "Avanzado" = areaLevel
                        for (const lvl of levelPriority) {
                          const st = perCompetenceLevel[competence.id]?.[lvl]
                          if (st && (st.completed || st.inProgress || st.answered > 0)) {
                            displayLevel = lvl
                            break
                          }
                        }

                        // Estado base
                        const baseStatus =
                          perCompetenceLevel[competence.id]?.[displayLevel] || ({
                            completed: false,
                            inProgress: false,
                            answered: 0,
                            total: 3,
                            progressPct: 0,
                          } as const)

                        // ✅ PROFESOR: si respondió las 3 preguntas del nivel, mostramos anillo completo
                        const status =
                          isTeacher && baseStatus.answered >= baseStatus.total
                            ? { ...baseStatus, completed: true, inProgress: false, progressPct: 100 }
                            : baseStatus

                        const area = areaStats[competence.dimension]?.[displayLevel]
                        const isAreaCompleted = !!area && area.completedCount === area.totalCount
                        const nextId = nextCompetenceToAttempt(competence.dimension, displayLevel)
                        const isNextCandidate = nextId === competence.id

                        // 🔗 URL final (alumno y profesor según progreso real)
                        const startOrContinueUrl = startOrContinueUrlFor(competence.id, displayLevel)

                        return (
                          <CompetenceCard
                            key={competence.id || `comp-${idx}`}
                            competence={competence}
                            questionCount={counts[competence.id] || 0}
                            currentAreaLevel={displayLevel}
                            levelStatus={status}
                            areaCompletedAtLevel={isAreaCompleted}
                            isNextCandidate={isNextCandidate}
                            isPreviousCompetenceCompleted={isPreviousCompetenceCompleted}
                            startOrContinueUrl={startOrContinueUrl}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
            )}
          </div>

          {allFilteredCompetences.length === 0 && (
            <div className="text-center py-12 mb-8 lg:mb-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron competencias</h3>
              <p className="text-gray-500">Intenta con otros términos de búsqueda o cambia el filtro.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
