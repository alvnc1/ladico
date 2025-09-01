"use client"

import type { Question } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface QuestionPreviewProps {
  question: Question
}

export default function QuestionPreview({ question }: QuestionPreviewProps) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{question.title}</CardTitle>
          <div className="flex space-x-2">
            <Badge variant="outline">Dimensión {question.dimension}</Badge>
            <Badge variant="outline">{question.competence}</Badge>
            <Badge variant="secondary">{question.level}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-gray-700 leading-relaxed">{question.scenario}</p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900">Opciones:</h4>
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 ${
                index === question.correctAnswerIndex ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              {index === question.correctAnswerIndex && <Badge className="ml-2 bg-green-600">Correcta</Badge>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 rounded-lg">
            <h5 className="font-semibold text-green-800 mb-1">Feedback Correcto:</h5>
            <p className="text-sm text-green-700">{question.feedback.correct}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <h5 className="font-semibold text-red-800 mb-1">Feedback Incorrecto:</h5>
            <p className="text-sm text-red-700">{question.feedback.incorrect}</p>
          </div>
        </div>

        {question.pais && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>🌎</span>
            <span>País: {question.pais}</span>
            <span>•</span>
            <span>Autor: {question.autor}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
