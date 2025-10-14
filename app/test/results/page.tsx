"use client"

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, XCircle, CheckCircle, XCircle as XIcon, ChevronRight } from "lucide-react"
import { finalizeSession } from "@/lib/testSession"
import { useAuth } from "@/contexts/AuthContext"
import { skillsInfo } from "@/components/data/digcompSkills"
import { markLevelCompleted } from "@/lib/levelProgress"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { loadCompetences } from "@/services/questionsService"

function ResultsUniversalContent() {
  const sp = useSearchParams()
  const router = useRouter()
  const { userData } = useAuth()
  const isTeacher = userData?.role === "profesor"
  const hasUpdatedFirebase = useRef(false)

  // --------- Parámetros recibidos (flexibles y con defaults) ----------
  const score = Number.parseInt(sp.get("score") || "0")
  const passed = sp.get("passed") === "true"
  const correct = Number.parseInt(sp.get("correct") || "0")
  const total = Number.parseInt(sp.get("total") || "3")
  const competence = sp.get("competence") || "Competencia" // ej: "1.1"
  const level = (sp.get("level") || "Nivel").toLowerCase() // "basico" | "intermedio" | "avanzado"

  // Resultados por pregunta (1 = correcta, 0 = incorrecta)
  const q1 = sp.get("q1") === "1"
  const q2 = sp.get("q2") === "1"
  const q3 = sp.get("q3") === "1"

  // Opcionales extra
  const sid = sp.get("sid") || null
  const passMin = Number.parseInt(sp.get("passMin") || "2")
  const compPath = sp.get("compPath") || `comp-${competence.replace(".", "-")}`
  const retryBase = sp.get("retryBase") || `/exercises/${compPath}/${level}`

  // Etiquetas opcionales por ejercicio
  const ex1Label = sp.get("ex1Label") || "Ejercicio 1"
  const ex2Label = sp.get("ex2Label") || "Ejercicio 2"
  const ex3Label = sp.get("ex3Label") || "Ejercicio 3"

  // Métricas opcionales
  const pairs = sp.get("pairs")
  const kscore = sp.get("kscore")

  // --------- Limpieza local + finalizeSession + marcar completado ----------
  useEffect(() => {
    try {
      const key = `ladico:${competence}:${level}:progress`
      localStorage.removeItem(key)

      // Marcar la competencia como completada (aprobada o reprobada) usando la misma lógica que CompetenceCard
      const completedKey = `ladico:completed:${competence}:${level}`
      localStorage.setItem(completedKey, "1")
      
      // Disparar evento para actualizar CompetenceCard
      window.dispatchEvent(new Event("ladico:refresh"))

      const levelMap: Record<string, "básico" | "intermedio" | "avanzado"> = {
        basico: "básico",
        intermedio: "intermedio",
        avanzado: "avanzado",
      }
      const normalizedLevel = levelMap[level] || "básico"
      markLevelCompleted(competence, normalizedLevel)
    } catch { /* no-op */ }

    ;(async () => {
      if (!sid) return
      try {
        await finalizeSession(sid, { correctCount: correct, total, passMin })
      } catch (e) {
        console.warn("No se pudo finalizar la sesión en resultados:", e)
      }
    })()
  }, [sid, competence, level, correct, total, passMin])

  // --------- Guardar en Firestore si aprobó (para admin/user-results) ----------
  useEffect(() => {
    if (!passed || !db || !userData?.uid || isTeacher || hasUpdatedFirebase.current) return
    hasUpdatedFirebase.current = true

    ;(async () => {
      try {
        const currentScore = typeof userData.LadicoScore === "number" ? userData.LadicoScore : 0
        const currentList = Array.isArray(userData.completedCompetences) ? userData.completedCompetences : []
        const levelLetter = level === "basico" ? "B" : level === "intermedio" ? "I" : level === "avanzado" ? "A" : level.charAt(0).toUpperCase()
        const competenceWithLevel = `${competence} ${levelLetter}`

        // Evitar duplicar el mismo "código + letra"
        const nextList = currentList.includes(competenceWithLevel)
          ? currentList
          : [...currentList, competenceWithLevel]

        await updateDoc(doc(db, "users", userData.uid), {
          completedCompetences: nextList,
          LadicoScore: currentScore + 10,
          // (Opcional, si quieres dejar rastro del estado por nivel)
          [`competenceStatus.${competence.replace(/\./g, "_")}.${level}`]: "approved",
          progressTick: Date.now(),
        })
      } catch (error) {
        console.error("Error updating user progress:", error)
      }
    })()
  }, [passed, db, userData?.uid, userData?.LadicoScore, userData?.completedCompetences, isTeacher, competence, level])

  // --------- Helpers de navegación ----------
  const handleBack = () => router.push("/dashboard")
  const handleRetry = () => router.push(`${retryBase}/ej1`)
  const handleNextLevel = () => {
    const nextLevel =
      level === "basico" ? "intermedio" :
      level === "intermedio" ? "avanzado" : "basico"
    router.push(`/exercises/${compPath}/${nextLevel}/ej1`)
  }

  const handleContinueToNextCompetence = async () => {
    try {
      // Cargar todas las competencias para obtener el orden correcto
      const comps = await loadCompetences()
      const current = comps.find(c => c.id === competence)
      
      if (!current) {
        router.push("/dashboard")
        return
      }

      // Obtener todas las competencias del área actual ordenadas
      const inArea = comps
        .filter(c => c.dimension === current.dimension)
        .sort((a, b) => a.code.localeCompare(b.code))

      // Encontrar el índice de la competencia actual
      const currentIndex = inArea.findIndex(c => c.id === competence)
      
      if (currentIndex === -1) {
        router.push("/dashboard")
        return
      }

      // Determinar la siguiente competencia
      let nextCompetence: typeof inArea[0] | null = null
      
      if (currentIndex < inArea.length - 1) {
        // Si no es la última competencia, ir a la siguiente
        nextCompetence = inArea[currentIndex + 1]
      } else {
        // Si es la última competencia del área, volver a la primera
        nextCompetence = inArea[0]
      }

      if (nextCompetence) {
        const nextCompPath = `comp-${nextCompetence.id.replace(/\./g, "-")}`
        router.push(`/exercises/${nextCompPath}/${level}/ej1`)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error navegando a la siguiente competencia:", error)
      router.push("/dashboard")
    }
  }

  const handleGoToNextLevelInArea = () => {
    const [majorStr] = String(competence).split(".")
    const major = Number(majorStr)
    const nextLevel =
      level === "basico" ? "intermedio" :
      level === "intermedio" ? "avanzado" : null
    if (!nextLevel || Number.isNaN(major)) {
      router.push("/dashboard")
      return
    }
    const firstCompPath = `comp-${major}-1`
    router.push(`/exercises/${firstCompPath}/${nextLevel}/ej1`)
  }

  // --------- Lógica de "última competencia del área" ----------
  const isLastCompetenceOfArea = (() => {
    const [majorStr, minorStr] = String(competence).split(".")
    const major = Number(majorStr)
    const minor = Number(minorStr)
    if (Number.isNaN(major) || Number.isNaN(minor)) return false
    const LAST_BY_AREA: Record<number, number> = { 1: 3, 4: 4 }
    const lastMinor = LAST_BY_AREA[major] ?? 4
    return minor === lastMinor
  })()

  const isMaxLevelAndLast = isLastCompetenceOfArea && level === "avanzado"

  // --------- NUEVO: Cálculo robusto de "área completa" en ESTE nivel ----------
  // Consideramos el área completa si TODAS las competencias han sido intentadas (aprobadas o reprobadas)
  const isAreaCompletedAtLevel = (() => {
    const [majorStr] = String(competence).split(".")
    const major = Number(majorStr)
    if (Number.isNaN(major)) return false

    // Competencias por área conocidas
    const areaCompetences: Record<number, string[]> = {
      1: ["1.1", "1.2", "1.3"],  // Búsqueda
      4: ["4.1", "4.2", "4.3", "4.4"], // Seguridad
    }
    const list = areaCompetences[major]
    if (!list) return false // si el área no está mapeada, no forzamos "Siguiente nivel"

    const levelLetter = level === "basico" ? "B" : level === "intermedio" ? "I" : level === "avanzado" ? "A" : level.charAt(0).toUpperCase()
    
    // Obtener competencias aprobadas del perfil
    const approvedFromProfile = new Set<string>(
      (Array.isArray(userData?.completedCompetences) ? userData!.completedCompetences : [])
        .filter((c) => c.endsWith(` ${levelLetter}`))
    )

    // Incluir el resultado actual si fue aprobado
    if (passed) {
      approvedFromProfile.add(`${competence} ${levelLetter}`)
    }

    // Verificar competencias intentadas usando localStorage
    // Buscar en localStorage por competencias que hayan sido intentadas
    const attemptedCompetences = new Set<string>()
    
    // Agregar competencias aprobadas
    approvedFromProfile.forEach(comp => attemptedCompetences.add(comp))
    
    // Buscar en localStorage por competencias intentadas (tanto aprobadas como reprobadas)
    if (typeof window !== "undefined") {
      try {
        for (const compCode of list) {
          // Buscar si hay evidencia de que esta competencia fue intentada
          const sessionKey = `session:${compCode}:${level.charAt(0).toUpperCase() + level.slice(1)}`
          const hasSession = localStorage.getItem(sessionKey)
          
          if (hasSession) {
            attemptedCompetences.add(`${compCode} ${levelLetter}`)
          }
        }
      } catch (error) {
        console.error("Error checking localStorage for attempted competences:", error)
      }
    }

    // El área está completa si TODAS las competencias del área han sido intentadas
    return list.every((code) => attemptedCompetences.has(`${code} ${levelLetter}`))
  })()

  const compTitle = skillsInfo[competence]?.title || "Competencia"

  return (
    <>
      <Sidebar />
      <div className="min-h-screen bg-[#f3fbfb] lg:pl-72 flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-2xl shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-b from-white to-gray-50 pb-6 sm:pb-8 px-4 sm:px-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4">
                {isTeacher ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-md">
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                  </div>
                ) : passed ? (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center shadow-md">
                    <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center shadow-md">
                    <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                  </div>
                )}
              </div>

              <CardTitle className="text-2xl sm:text-3xl font-bold text-[#3a5d61]">
                {isTeacher ? "Evaluación Completada" : (passed ? "¡Felicitaciones!" : "Sigue practicando")}
              </CardTitle>

              <p className="mt-1 text-gray-600">
                {isTeacher
                  ? "Evaluación finalizada como profesor"
                  : (passed
                      ? "Has completado exitosamente esta competencia"
                      : `Necesitas al menos ${passMin} respuestas correctas para avanzar`)
                }
              </p>

              <div className="mt-2 text-xs text-gray-500">
                Competencia {competence} - {compTitle} · Nivel{" "}
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </div>

              {(pairs || kscore) && (
                <div className="mt-2 text-xs text-gray-500">
                  {pairs && <span className="mr-2">Orden relativo: {pairs}</span>}
                  {kscore && <span>Precisión de orden: {kscore}%</span>}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {/* KPIs - estudiantes */}
            {!isTeacher && (
              <>
                <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                  <div className="p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{total}</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">Preguntas</div>
                  </div>
                  <div className="p-3 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl shadow-sm border border-green-200">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{correct}</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">Correctas</div>
                  </div>
                  <div className="p-3 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl shadow-sm border border-red-200">
                    <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{total - correct}</div>
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
              </>
            )}

            {/* Detalle por pregunta */}
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">
                {isTeacher ? "Detalle de vista previa:" : "Detalle de preguntas evaluadas:"}
              </h3>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                q1 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
              }`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q1 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                  <span>{ex1Label}</span>
                </div>
                <span className={`font-semibold ${q1 ? "text-green-700" : "text-red-700"}`}>
                  {q1 ? "Correcta" : "Incorrecta"}
                </span>
              </div>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                q2 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
              }`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q2 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                  <span>{ex2Label}</span>
                </div>
                <span className={`font-semibold ${q2 ? "text-green-700" : "text-red-700"}`}>
                  {q2 ? "Correcta" : "Incorrecta"}
                </span>
              </div>

              <div className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${
                q3 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
              }`}>
                <div className="flex items-center gap-2 text-gray-800">
                  {q3 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                  <span>{ex3Label}</span>
                </div>
                <span className={`font-semibold ${q3 ? "text-green-700" : "text-red-700"}`}>
                  {q3 ? "Correcta" : "Incorrecta"}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {isTeacher ? (
                <>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3 text-base font-medium transition-all"
                  >
                    Volver al Dashboard
                  </Button>

                  {level !== "avanzado" && (
                    <Button
                      onClick={handleNextLevel}
                      className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl py-3 text-base font-semibold"
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Siguiente nivel
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {(() => {
                    // --- Config base ---
                    const [currentMajorStr] = String(competence).split(".")
                    const currentMajor = Number(currentMajorStr)
                    const areaCompetences: Record<number, string[]> = {
                      1: ["1.1", "1.2", "1.3"],
                      4: ["4.1", "4.2", "4.3", "4.4"],
                    }
                    const competencesInArea = areaCompetences[currentMajor] || []

                    const levelLetter =
                      level === "basico" ? "B" :
                      level === "intermedio" ? "I" :
                      level === "avanzado" ? "A" :
                      level.charAt(0).toUpperCase()

                    // --- Competencias intentadas usando la misma lógica que CompetenceCard ---
                    const attemptedCompetences = new Set<string>()
                    
                    // Agregar competencias del perfil (aprobadas)
                    const approvedFromProfile = new Set<string>(
                      (userData?.completedCompetences || []).filter((c) =>
                        c.endsWith(` ${levelLetter}`)
                      )
                    )
                    approvedFromProfile.forEach(comp => attemptedCompetences.add(comp))
                    
                    // Agregar competencias completadas desde localStorage (usando la misma clave que CompetenceCard)
                    if (typeof window !== "undefined") {
                      for (const compCode of competencesInArea) {
                        // Usar la misma lógica que CompetenceCard para detectar competencias completadas
                        const completedKey = `ladico:completed:${compCode}:${level}`
                        if (localStorage.getItem(completedKey) === "1") {
                          attemptedCompetences.add(`${compCode} ${levelLetter}`)
                        }
                      }
                    }
                    
                    // Agregar la competencia actual (que acabamos de hacer)
                    attemptedCompetences.add(`${competence} ${levelLetter}`)
                    
                    // Verificar si todas las competencias del área han sido intentadas
                    const allAttempted = competencesInArea.every((c) =>
                      attemptedCompetences.has(`${c} ${levelLetter}`)
                    )

                    console.log("🧩 Estado área:", {
                      competence,
                      attempted: [...attemptedCompetences],
                      allAttempted,
                      competencesInArea,
                    })

                    // 🧠 CASOS SIMPLIFICADOS
                    if (isMaxLevelAndLast) {
                      // Fin del nivel avanzado - última competencia del área
                      return (
                        <Button
                          onClick={handleBack}
                          className="flex-1 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl py-3 shadow"
                        >
                          Volver al Dashboard
                        </Button>
                      )
                    }

                    // Si ya intentó TODAS las competencias del área
                    if (allAttempted) {
                      // Verificar si todas fueron aprobadas
                      const allApproved = competencesInArea.every((c) =>
                        approvedFromProfile.has(`${c} ${levelLetter}`)
                      )
                      
                      if (allApproved) {
                        // Todas aprobadas: Dashboard + Siguiente nivel
                        return (
                          <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <Button
                              onClick={handleBack}
                              variant="outline"
                              className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3 text-base font-medium transition-all"
                            >
                              Volver al Dashboard
                            </Button>
                            <Button
                              onClick={handleGoToNextLevelInArea}
                              className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl py-3 text-base font-semibold"
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Siguiente nivel
                            </Button>
                          </div>
                        )
                      } else {
                        // Algunas reprobadas: Solo Dashboard
                        return (
                          <Button
                            onClick={handleBack}
                            className="flex-1 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl py-3 shadow"
                          >
                            Volver al Dashboard
                          </Button>
                        )
                      }
                    }

                    // Si aún quedan competencias por hacer, permitir continuar
                    return (
                      <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="flex-1 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3 text-base font-medium transition-all"
                        >
                          Ir al Dashboard
                        </Button>
                        <Button
                          onClick={handleContinueToNextCompetence}
                          className="flex-1 bg-[#286675] hover:bg-[#1e4a56] text-white rounded-xl py-3 text-base sm:text-lg font-semibold"
                        >
                          <ChevronRight className="w-4 h-4 mr-2" />
                          Siguiente competencia
                        </Button>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function ResultsUniversalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#286675]" />
        </div>
      }
    >
      <ResultsUniversalContent />
    </Suspense>
  )
}
