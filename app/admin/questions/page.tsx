"use client"

import { useEffect, useState, useRef } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Question } from "@/types"
import QuestionPreview from "@/components/QuestionPreview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function QuestionsAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const router = useRouter()

 
  const loadQuestionsRan = useRef(false)

  useEffect(() => {
   
    if (loadQuestionsRan.current) {
      console.log("⚠️ Admin questions useEffect ya ejecutado previamente, saltando...")
      return
    }
    
    loadQuestionsRan.current = true
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      if (!db) {
        console.error("Firestore not initialized")
        return
      }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Banco de Preguntas</h1>
              <p className="text-gray-600">Gestiona y visualiza todas las preguntas del sistema.</p>
            </div>
            <Button onClick={() => router.push("/admin")} className="Ladico-button-primary">
              Agregar Nueva Pregunta
            </Button>
          </div>
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
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedQuestion?.id === question.id ? "ring-2 ring-purple-500" : ""
                  }`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{question.title}</h3>
                      <div className="flex space-x-1">
                        <Badge variant="outline" className="text-xs">
                          D{question.dimension}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {question.competence}
                        </Badge>
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
              <Card>
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
