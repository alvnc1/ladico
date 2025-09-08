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
  const [refreshKey, setRefreshKey] = useState(0) // ⬅️ para forzar re-render al reiniciar niveles

  // 🔔 Escuchar el “ping” que manda la tarjeta al reiniciar niveles
  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1)
    window.addEventListener("ladico:refresh", bump)
    // por si el evento viene de otro tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ladico:progress:version") bump()
      if (e.key?.startsWith("ladico:resetLevels:")) bump()
    }
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("ladico:refresh", bump)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const getAreaName = (code: string) => {
    if (code?.startsWith("1.")) return "Búsqueda y gestión de información"
    if (code?.startsWith("2.")) return "Comunicación y colaboración"
    if (code?.startsWith("3.")) return "Creación de contenidos digitales"
    if (code?.startsWith("4.")) return "Seguridad"
    if (code?.startsWith("5.")) return "Resolución de problemas"
    return ""
  }

  const filteredCompetences = competences.filter((competence) => {
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
    Seguridad: filteredCompetences.filter((c) => c?.code?.startsWith("4.")),
    "Resolución de problemas": filteredCompetences.filter((c) => c?.code?.startsWith("5.")),
  }

  const allFilteredCompetences = Object.values(groupedCompetences).flat()

  useEffect(() => {
    if (!loading && !user) router.push("/")
  }, [user, loading, router])

  if (loading || loadingProgress || loadingCounts || loadingCompetences || loadingLevels) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]" />
      </div>
    )
  }

  if (!user || !userData) return null

  // URL para empezar/continuar según progreso real
  const startOrContinueUrlFor = (competenceId: string, level: "Básico" | "Intermedio" | "Avanzado") => {
    const st = perCompetenceLevel[competenceId]?.[level]
    const slug: LevelSlug = level === "Básico" ? "basico" : (level.toLowerCase() as LevelSlug)

    if (!st || st.completed || (!st.inProgress && st.answered === 0)) {
      return firstExerciseRoute(competenceId, slug)
    }
    const nextIndex = Math.min(st.answered, 2)
    const compSlug = competenceId.replace(".", "-")
    return `/exercises/comp-${compSlug}/${slug}/ej${nextIndex + 1}`
  }

  return (
    <div key={refreshKey} className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* ===== encabezado omitido por brevedad (sin cambios) ===== */}

          <div className="space-y-8 lg:space-y-12">
            {Object.entries(groupedCompetences).map(([dimension, list]) =>
              list.length > 0 ? (
                <div key={dimension} className="space-y-4 lg:space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-1 bg-gradient-to-r from-[#94b2ba] to-[#286675] rounded-full flex-1" />
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 px-4 py-2 bg-white rounded-2xl shadow-sm border-2 border-gray-100">
                      {dimension}
                    </h2>
                    <div className="h-1 bg-gradient-to-r from-[#286675] to-[#94b2ba] rounded-full flex-1" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                    {list.map((competence, idx) => {
                      if (!competence) return null

                      // ⬇️ Si la tarjeta fue “reiniciada”, mostrar estado inicial (Nivel 1, 0%)
                      const resetFlag =
                        typeof window !== "undefined" &&
                        localStorage.getItem(`ladico:resetLevels:${competence.id}`) === "1"

                      if (resetFlag) {
                        return (
                          <CompetenceCard
                            key={`reset-${competence.id}-${idx}`}
                            competence={competence}
                            questionCount={counts[competence.id] || 0}
                            currentAreaLevel="Básico"
                            levelStatus={{
                              completed: false,
                              inProgress: false,
                              answered: 0,
                              total: 3,
                              progressPct: 0,
                            }}
                            areaCompletedAtLevel={false}
                            isNextCandidate={false}
                            isPreviousCompetenceCompleted={isPreviousCompetenceCompleted}
                            startOrContinueUrl={firstExerciseRoute(competence.id, "basico")}
                          />
                        )
                      }

                      // ===== flujo normal =====
                      const areaLevel = currentAreaLevel(competence.dimension)

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

                      const baseStatus =
                        perCompetenceLevel[competence.id]?.[displayLevel] || ({
                          completed: false,
                          inProgress: false,
                          answered: 0,
                          total: 3,
                          progressPct: 0,
                        } as const)

                      const status =
                        isTeacher && baseStatus.answered >= baseStatus.total
                          ? { ...baseStatus, completed: true, inProgress: false, progressPct: 100 }
                          : baseStatus

                      const area = areaStats[competence.dimension]?.[displayLevel]
                      const isAreaCompleted = !!area && area.completedCount === area.totalCount
                      const nextId = nextCompetenceToAttempt(competence.dimension, displayLevel)
                      const isNextCandidate = nextId === competence.id

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
              ) : null
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
