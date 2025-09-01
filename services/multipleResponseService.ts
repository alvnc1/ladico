import type { Question } from "@/types"


async function loadLocalQuestions(): Promise<Question[]> {
  try {
    const response = await fetch('/banco 1.json')
    if (!response.ok) {
      throw new Error('No se pudo cargar el banco de preguntas')
    }
    const questions: Question[] = await response.json()
    return questions
  } catch (error) {
    console.error('Error al cargar preguntas locales:', error)
    return []
  }
}


export async function loadMultipleResponseQuestions(level: string = "Básico", count: number = 3): Promise<Question[]> {
  const allQuestions = await loadLocalQuestions()

  
  const levelQuestions = allQuestions.filter(q =>
    q.level?.toLowerCase().includes(level.toLowerCase())
  )

  if (levelQuestions.length === 0) {
    throw new Error(`No hay preguntas disponibles para el nivel ${level}`)
  }

  const selectedQuestions: Question[] = []
  const usedSlots = new Set<number>()

  
  const multipleResponseQuestions = levelQuestions.filter(q => q.type === 'multiple-response')

  
  for (let slot = 1; slot <= count; slot++) {
    let availableQuestions = levelQuestions.filter(q =>
      q.questionSlot === slot && !usedSlots.has(q.questionSlot)
    )

    
    const slotMultipleResponse = availableQuestions.filter(q => q.type === 'multiple-response')
    if (slotMultipleResponse.length > 0) {
      availableQuestions = slotMultipleResponse
    }

    if (availableQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length)
      const selectedQuestion = availableQuestions[randomIndex]
      selectedQuestions.push(selectedQuestion)
      usedSlots.add(selectedQuestion.questionSlot)
    } else {
      
      const fallbackQuestions = levelQuestions.filter(q => !usedSlots.has(q.questionSlot))
      if (fallbackQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * fallbackQuestions.length)
        const selectedQuestion = fallbackQuestions[randomIndex]
        selectedQuestions.push(selectedQuestion)
        usedSlots.add(selectedQuestion.questionSlot)
      }
    }
  }

  if (selectedQuestions.length < count) {
    throw new Error(`No hay suficientes preguntas disponibles. Se encontraron ${selectedQuestions.length} de ${count} requeridas.`)
  }

  console.log(`✅ ${selectedQuestions.length} preguntas seleccionadas para multiple-response ${level}:`)
  selectedQuestions.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q.title?.substring(0, 40) || "Sin título"}... (tipo: ${q.type}, slot: ${q.questionSlot})`)
  })

  return selectedQuestions
}


export function createMultipleResponseSession(questions: Question[], userId: string, competence: string, level: string) {
  return {
    id: `mr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    competence,
    level,
    questions,
    answers: questions.map(() => null), 
    currentQuestionIndex: 0,
    startTime: new Date(),
    score: 0,
    passed: false
  }
}
