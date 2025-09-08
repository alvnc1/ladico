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
import { Trash } from "lucide-react" // Icono de eliminar

export default function QuestionsAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const router = useRouter()
  const loadQuestionsRan = useRef(false)

  useEffect(() => {
    if (loadQuestionsRan.current) return
    loadQuestionsRan.current = true
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      if (!db) return
      const querySnapshot = await getDocs(collection(db, "questions"))
      const loadedQuestions: Question[] = []
      querySnapshot.forEach((doc) => {
        loadedQuestions.push({ id: doc.id, ...doc.data() } as Question)
      })
      setQuestions(loadedQuestions)
    } catch (error) {
      console.error("Error loading questions:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- NUEVO: Eliminar una pregunta ---
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pregunta? Esta acción no se puede deshacer.")) return

    try {
      await deleteDoc(doc(db, "questions", questionId))
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      // Si la pregunta eliminada era la seleccionada, limpiar preview
      if (selectedQuestion?.id === questionId) setSelectedQuestion(null)
    } catch (error) {
      console.error("Error eliminando la pregunta:", error)
      alert("No se pudo eliminar la pregunta. Revisa la consola para más detalles.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#286675]"></div>
      </div>
    )
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Preguntas Disponibles ({questions.length})</h2>

            {questions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No hay preguntas en el banco de datos.</p>
                  <Button className="mt-4 Ladico-button-primary" onClick={() => router.push("/admin")}>
                    Agregar Primera Pregunta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              questions.map((question) => (
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
                        {/* Botón eliminar */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation() // Evita seleccionar la pregunta
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
