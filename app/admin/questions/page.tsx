"use client"

import { useEffect, useState, useRef } from "react"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Question } from "@/types"
import QuestionPreview from "@/components/QuestionPreview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Trash } from "lucide-react"

// --- helpers de ordenamiento ---
function parseCompetence(c?: string | number): number[] {
  if (c === undefined || c === null) return []
  const s = String(c).trim()
  // Soporta formatos "3.4", "3-4", "3_4", "3.04", etc.
  return s.split(/[.\-_]/).map((x) => {
    const n = Number(x)
    return Number.isFinite(n) ? n : 0
  })
}

function compareCompetence(a?: string | number, b?: string | number): number {
  const A = parseCompetence(a)
  const B = parseCompetence(b)
  const len = Math.max(A.length, B.length)
  for (let i = 0; i < len; i++) {
    const ai = A[i] ?? 0
    const bi = B[i] ?? 0
    if (ai !== bi) return ai - bi
  }
  return 0
}

export default function QuestionsAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [filterCountry, setFilterCountry] = useState<string>("")
  const [filterCompetence, setFilterCompetence] = useState<string>("")
  const router = useRouter()
  const loadQuestionsRan = useRef(false)

  useEffect(() => {
    if (loadQuestionsRan.current) return
    loadQuestionsRan.current = true
    loadQuestions()
  }, [])

  // Aplicar filtros cuando cambian las selecciones
  useEffect(() => {
    if (questions.length === 0) return
    
    let filtered = questions
    
    // Aplicar filtro por país
    if (filterCountry) {
      filtered = filtered.filter(q => 
        q.country === filterCountry
      )
    }
    
    // Aplicar filtro por competencia
    if (filterCompetence) {
      filtered = filtered.filter(q => 
        String(q.competence) === filterCompetence
      )
    }
    
    // Ordenar resultados filtrados
    filtered.sort((q1, q2) => {
      const byComp = compareCompetence(q1.competence as any, q2.competence as any)
      if (byComp !== 0) return byComp
      const byLevel = String(q1.level ?? "").localeCompare(String(q2.level ?? ""), "es", { sensitivity: "base" })
      if (byLevel !== 0) return byLevel
      return String(q1.title ?? "").localeCompare(String(q2.title ?? ""), "es", { sensitivity: "base" })
    })
    
    setFilteredQuestions(filtered)
  }, [filterCountry, filterCompetence, questions])

  const loadQuestions = async () => {
    try {
      if (!db) return
      const querySnapshot = await getDocs(collection(db, "questions"))
      const loaded: Question[] = []
      querySnapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as Question)
      })

      // Ordenar por competencia (numérico), luego level y title
      loaded.sort((q1, q2) => {
        const byComp = compareCompetence(q1.competence as any, q2.competence as any)
        if (byComp !== 0) return byComp
        const byLevel = String(q1.level ?? "").localeCompare(String(q2.level ?? ""), "es", { sensitivity: "base" })
        if (byLevel !== 0) return byLevel
        return String(q1.title ?? "").localeCompare(String(q2.title ?? ""), "es", { sensitivity: "base" })
      })

      setQuestions(loaded)
      setFilteredQuestions(loaded)
    } catch (error) {
      console.error("Error loading questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.")) return
    try {
      await deleteDoc(doc(db, "questions", questionId))
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      if (selectedQuestion?.id === questionId) setSelectedQuestion(null)
    } catch (error) {
      console.error("Error eliminando la pregunta:", error)
      alert("No se pudo eliminar la pregunta. Revisa la consola para más detalles.")
    }
  }

  const handleDeleteByCompetence = async (competenceId: string) => {
    if (!competenceId) return
    if (!confirm(`¿Estás seguro de que deseas eliminar TODAS las preguntas de la competencia ${competenceId}? Esta acción no se puede deshacer.`)) return
    
    try {
      const toDelete = questions.filter(q => String(q.competence) === competenceId)
      for (const q of toDelete) {
        await deleteDoc(doc(db, "questions", q.id))
      }
      // Actualizar estados en memoria
      setQuestions(prev => prev.filter(q => String(q.competence) !== competenceId))
      setFilteredQuestions(prev => prev.filter(q => String(q.competence) !== competenceId))
      setSelectedQuestion(null)
      alert(`Se eliminaron ${toDelete.length} preguntas de la competencia ${competenceId}.`)
    } catch (error) {
      console.error("Error eliminando preguntas por competencia:", error)
      alert("No se pudo eliminar por competencia. Revisa la consola para más detalles.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    )
  }

  // Obtener todas las opciones únicas para los filtros de País y Competencia
  const countries = Array.from(new Set(questions.map(q => q.country).filter(Boolean))) as string[]
  const competencies = Array.from(new Set(questions.map(q => q.competence).filter(Boolean))) as string[]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Banco de Preguntas</h1>
            <p className="text-gray-600">Gestiona y visualiza todas las preguntas del sistema.</p>
          </div>
          <Button onClick={() => router.push("/admin")} className="text-white bg-[#286675] hover:bg-[#3a7d89] rounded-xl">
            Agregar Nueva Pregunta
          </Button>
        </div>

        <div className="mb-8 flex gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="countryFilter" className="font-semibold">Filtrar por País</label>
            <select
              id="countryFilter"
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-300 text-sm"
            >
              <option value="">Todos los países</option>
              {countries.map((country, idx) => (
                <option key={idx} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="competenceFilter" className="font-semibold">Filtrar por Competencia</label>
            <select
              id="competenceFilter"
              value={filterCompetence}
              onChange={(e) => setFilterCompetence(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-300  text-sm"
            >
              <option value="">Todas las competencias</option>
              {competencies.map((competence, idx) => (
                <option key={idx} value={competence}>{competence}</option>
              ))}
            </select>
            {filterCompetence && (
              <Button
                onClick={() => handleDeleteByCompetence(filterCompetence)}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm"
              >
                Borrar todas las preguntas de {filterCompetence}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Preguntas Disponibles ({filteredQuestions.length})</h2>

            {filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">
                    {questions.length === 0 
                      ? "No hay preguntas en el banco de datos." 
                      : "No hay preguntas que coincidan con los filtros seleccionados."}
                  </p>
                  <Button className="mt-4 text-white bg-[#286675] hover:bg-[#3a7d89] rounded-xl" 
                    onClick={() => {
                      if (questions.length === 0) {
                        router.push("/admin")
                      } else {
                        setFilterCountry("")
                        setFilterCompetence("")
                      }
                    }}>
                    {questions.length === 0 ? "Agregar Primera Pregunta" : "Limpiar Filtros"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredQuestions.map((question) => (
                <Card
                  key={question.id}
                  className={`cursor-pointer transition-all rounded-xl hover:shadow-lg relative ${
                    selectedQuestion?.id === question.id ? "ring-2 ring-[#286675]" : ""
                  }`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{question.title}</h3>
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {question.country || "Sin país"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.competence}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuestion(question.id)
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 line-clamp-2">{question.scenario}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="secondary" className="text-xs">
                        {question.level}
                      </Badge>
                      {question.pais && <span className="text-xs text-gray-500">🌎 {question.pais}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="sticky top-8">
            {selectedQuestion ? (
              <QuestionPreview question={selectedQuestion} />
            ) : (
              <Card className="rounded-xl shadow-lg">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">Selecciona una pregunta para ver la vista previa.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}