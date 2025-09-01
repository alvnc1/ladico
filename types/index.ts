export interface Question {
  id: string
  type: "multiple-choice" | "multiple-response"
  dimension: number
  competence: string
  level: string
  title: string
  scenario: string
  options: string[]
  correctAnswerIndex: number | number[]
  feedback: {
    correct: string
    incorrect: string
  }
  questionSlot: number
  
  pais?: string
  fechaCreacion?: string
  autor?: string
  vecesUtilizada?: number
  tasaAcierto?: number
}

export interface TestSession {
  id: string
  userId: string
  competence: string
  level: string
  questions: Question[]
  answers: (number | number[] | null)[]
  currentQuestionIndex: number
  startTime: Date
  endTime?: Date
  score: number
  passed: boolean
}

export interface UserResult {
  userId: string
  fecha: string
  respuestas: Array<{
    preguntaId: string
    competence: string
    respuestaUsuario: number
    correcta: boolean
    tiempoSegundos: number
  }>
  puntajeTotal: number
  nivelDigComp: string
}

export interface Competence {
  id: string
  code: string
  name: string
  dimension: string
  description: string
  color: string
}
