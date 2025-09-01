import { db } from "@/lib/firebase"
import type { Question, Competence } from "@/types"
import { collection, query, where, getDocs, updateDoc, doc, increment, getDoc, orderBy, limit } from "firebase/firestore"

let competencesCache: Competence[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000


export async function loadCompetences(): Promise<Competence[]> {
 
  const now = Date.now()
  if (competencesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log(`📋 Usando caché de competencias (${competencesCache.length} items)`)
    return competencesCache
  }

  if (!db) {
    console.error("Firestore no está inicializado")
    return []
  }

  try {

    const predefinedCompetences = ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4","5.1","5.2","5.3","5.4"]
    const competenceMap = new Map<string, Competence>()


    predefinedCompetences.forEach((code) => {
      const competence: Competence = {
        id: code,
        code: code,
        name: getCompetenceName(code),
        dimension: getCompetenceDimension(code),
        description: getCompetenceDescription(code),
        color: getCompetenceColor(code)
      }
      competenceMap.set(code, competence)
    })


    const questionsSnapshot = await getDocs(collection(db, "questions"))
    questionsSnapshot.forEach((doc) => {
      const questionData = doc.data()
      const competenceCode = questionData.competence

      if (competenceCode && !competenceMap.has(competenceCode)) {

        const competence: Competence = {
          id: competenceCode,
          code: competenceCode,
          name: getCompetenceName(competenceCode),
          dimension: getCompetenceDimension(competenceCode),
          description: getCompetenceDescription(competenceCode),
          color: getCompetenceColor(competenceCode)
        }
        competenceMap.set(competenceCode, competence)
      }
    })


    const competences = Array.from(competenceMap.values()).sort((a, b) => a.code.localeCompare(b.code))

   
    competencesCache = competences
    cacheTimestamp = now

    console.log(`✅ Se cargaron ${competences.length} competencias desde Firebase`)
    return competences
  } catch (error) {
    console.error("Error al cargar competencias:", error)
    return []
  }
}

function getCompetenceName(code: string): string {
  const names: Record<string, string> = {
    "1.1": "Navegar, buscar y filtrar datos, información y contenidos digitales",
    "1.2": "Evaluar datos, información y contenidos digitales",
    "1.3": "Gestión de datos, información y contenidos digitales",
    "2.1": "Interactuar a través de tecnologías digitales",
    "2.2": "Compartir a través de tecnologías digitales",
    "2.3": "Participación ciudadana a través de las tecnologías digitales",
    "2.4": "Colaboración a traves de las tecnologías digitales",
    "2.5": "Comportamiento en la red",
    "2.6": "Gestión de la identidad digital",
    "3.1": "Desarrollo de contenidos digitales",
    "3.2": "Integración y reelaboración de contenido digital",
    "3.3": "Derechos de autor y licencias de propiedad intelectual",
    "3.4": "Programación",
    "4.1": "Protección de dispositivos",
    "4.2": "Protección de datos personales y privacidad",
    "4.3": "Protección de la salud y del bienestar",
    "4.4": "Protección medioambiental",
    "5.1": "Resolución de problemas técnicos",
    "5.2": "Identificación de necesidades y respuestas tecnológicas",
    "5.3": "Uso creativo de la tecnología digital",
    "5.4": "Identificar lagunas en las competencias digitales"
  }

  return names[code] || `Competencia ${code}`
}



function getCompetenceDimension(code: string): string {
  if (code.startsWith("1.")) {
    return "Búsqueda y gestión de información"
  } else if (code.startsWith("2.")) {
    return "Comunicación y colaboración"
  } else if (code.startsWith("3.")) {
    return "Creación de contenidos digitales"
  } else if (code.startsWith("4.")) {
    return "Seguridad"
  } else if (code.startsWith("5.")) {
    return "Resolución de problemas"
  }
  return "Competencia Digital"
}


function getCompetenceDescription(code: string): string {
  const descriptions: Record<string, string> = {
    "1.1": "Articular las necesidades de información, buscar datos, información y contenidos en entornos digitales.",
    "1.2": "Analizar, comparar y evaluar de manera crítica la credibilidad y fiabilidad de las fuentes.",
    "1.3": "Gestionar, almacenar y recuperar datos, información y contenidos en entornos digitales.",
    "2.1": "Interactuar a través de diferentes tecnologías digitales y entender los medios de comunicación digitales apropiados para un contexto determinado.",
    "2.2": "Compartir datos, información y contenidos digitales con otros a través de las tecnologías adecuadas. Actuar como intermediario, conocer las prácticas de referencia y atribución.",
    "2.3": "Participar en la sociedad a través del uso de servicios digitales públicos y privados. Buscar oportunidades de auto empoderamiento y para una ciudadanía participativa a través de tecnologías digitales apropiadas.",
    "2.4": "Uso de herramientas y tecnologías digitales en procesos colaborativos y para la coconstrucción y la cocreación de datos, recursos y conocimiento.",
    "2.5": "Estar al tanto de las normas de comportamiento y del “know-how” (saber cómo) en el uso de las tecnologías y en la interacción en entornos digitales. Adaptar las estrategias de comunicación a una audiencia específica, teniendo en cuenta la diversidad cultural y generacional de los entornos digitales.",
    "2.6": "Crear y gestionar una o varias identidades digitales para poder proteger la propia reputación, para tratar los datos que uno produce a través de diversas herramientas, entornos y servicios digitales.",
    "3.1": "Crear y editar contenidos digitales en formatos diferentes, expresarse a través de medios digitales.",
    "3.2": "Modificar, perfeccionar, mejorar e integrar información y contenido en un cuerpo de conocimiento existente para crear contenidos nuevos, originales y relevantes.",
    "3.3": "Entender cómo solicitar datos, informaciones y contenidos digitales con derechos de autor y licencias de propiedad intelectual.",
    "3.4": "Desarrollar secuencias de instrucciones aplicables a sistemas computacionales para solucionar un problema dado o ejecutar una tarea determinada.",
    "4.1": "Proteger los dispositivos y contenidos digitales, comprender los riesgos y amenazas.",
    "4.2": "Proteger los datos personales y la privacidad en entornos digitales.",
    "4.3": "Evitar riesgos para la salud y amenazas al bienestar físico y psicológico.",
    "4.4": "Tener en cuenta el impacto de las tecnologías digitales sobre el medio ambiente.",
    "5.1": "Identificación de problemas técnicos en el uso de dispositivos y entornos digitales, y resolución de éstos (desde los más básicos a los más complejos).",
    "5.2": "Evaluar las necesidades e identificar, valorar, seleccionar y utilizar las herramientas digitales y las posibles respuestas tecnológicas y resolverlas. Ajustar y personalizar los entornos digitales a las necesidades personales (por ejemplo, la accesibilidad).",
    "5.3": "Utilizar herramientas y tecnologías digitales para crear contenidos, procesos y productos innovadores. Participación individual y colectiva en procesos cognitivos para entender y resolver problemas conceptuales y situaciones confusas en entornos digitales.",
    "5.4": "Identificar dónde debo mejorar o actualizar mis propias competencias digitales. Ser capaz de ayudar a otros en el desarrollo de sus competencias digitales. Buscar oportunidades para el auto aprendizaje y mantenerse al día de la evolución del mundo digital."


  }

  return descriptions[code] || `Descripción de la competencia ${code}`
}



function getCompetenceColor(code: string): string {
  const colors: Record<string, string> = {
    "1.1": "from-orange-400 to-red-500",
    "1.2": "from-orange-500 to-red-600",
    "1.3": "from-red-400 to-pink-500",
    "4.1": "from-blue-400 to-purple-500",
    "4.2": "from-blue-500 to-purple-600",
    "4.3": "from-purple-400 to-indigo-500",
    "4.4": "from-green-400 to-teal-500"
  }
  return colors[code] || "from-gray-400 to-gray-500"
}


export async function loadQuestionsByCompetence(competenceId: string, level: string = "Básico", count: number = 3): Promise<Question[]> {
 
  const callId = Date.now() + Math.random()
  console.log(`[Questions call #${callId}] loadQuestionsByCompetence: ${competenceId}::${level}::${count}`)
  
  if (!db) {
    console.error("Firestore no está inicializado")
    return []
  }

  try {

    const q = query(
      collection(db, "questions"),
      where("competence", "==", competenceId),
      where("level", "in", [`${level} 1`, `${level} 2`]),
      limit(count * 2)
    )

    const querySnapshot = await getDocs(q)
    const loadedQuestions: Question[] = []

    querySnapshot.forEach((doc) => {
      const questionData = {
        id: doc.id,
        ...doc.data() as Omit<Question, 'id'>
      } as Question

      loadedQuestions.push(questionData)
    })


    if (loadedQuestions.length >= count) {
      const selectedQuestions = loadedQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
      
      console.log(`✅ ${selectedQuestions.length} preguntas seleccionadas para ${competenceId}/${level}:`)
      selectedQuestions.forEach((q, i) => {
        const correctDisplay = Array.isArray(q.correctAnswerIndex) 
          ? q.correctAnswerIndex.map(idx => idx + 1).join(', ') 
          : (q.correctAnswerIndex ?? -1) + 1;
        console.log(`  ${i + 1}. ${q.title?.substring(0, 40) || "Sin título"}... (correcta: opción ${correctDisplay})`)
      })
      
      return selectedQuestions
    }


    const fallbackQuery = query(
      collection(db, "questions"),
      where("competence", "==", competenceId),
      limit(count)
    )

    const fallbackSnapshot = await getDocs(fallbackQuery)
    const fallbackQuestions: Question[] = []

    fallbackSnapshot.forEach((doc) => {
      fallbackQuestions.push({
        id: doc.id,
        ...doc.data() as Omit<Question, 'id'>
      } as Question)
    })

    if (fallbackQuestions.length >= count) {
      return fallbackQuestions
        .sort(() => 0.5 - Math.random())
        .slice(0, count)
    }


    throw new Error(`No hay suficientes preguntas para la competencia ${competenceId}. Se requieren al menos ${count} preguntas.`)
  } catch (error) {
    console.error("Error al cargar preguntas:", error)

    throw error
  }
}

export async function updateQuestionStats(questionId: string, wasCorrect: boolean): Promise<void> {
  if (!db) {
    console.error("Firestore no está inicializado")
    return
  }

  try {
    const questionRef = doc(db, "questions", questionId)


    const questionSnap = await getDoc(questionRef)
    if (!questionSnap.exists()) {
      console.error(`La pregunta con ID ${questionId} no existe`)
      return
    }

    console.log(`Estadísticas actualizadas para pregunta ${questionId}: ${wasCorrect ? "correcta" : "incorrecta"}`)
  } catch (error) {
    console.error("Error al actualizar estadísticas de la pregunta:", error)
  }
}
