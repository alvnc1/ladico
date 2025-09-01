
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore"

import { firebaseConfig } from "../lib/firebase";


const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const competenceCodes = ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4"]

async function checkQuestions() {
  try {
    console.log("🔍 Verificando preguntas en la base de datos...")
    
    
    const allQuestionsSnapshot = await getDocs(collection(db, "questions"))
    const totalQuestions = allQuestionsSnapshot.size
    
    console.log(`📊 Total de preguntas en la base de datos: ${totalQuestions}`)
    console.log("\n📋 Desglose por competencia:")
    
    
    for (const code of competenceCodes) {
      const q = query(collection(db, "questions"), where("competence", "==", code))
      const snapshot = await getDocs(q)
      const count = snapshot.size
      
      
      const status = count >= 3 ? "✅" : "❌"
      
      console.log(`${status} Competencia ${code}: ${count} preguntas${count < 3 ? " (se requieren al menos 3)" : ""}`)
      
      
      if (count > 0) {
        const basicQuery = query(
          collection(db, "questions"),
          where("competence", "==", code),
          where("level", "in", ["Básico", "Básico 1", "Básico 2"])
        )
        const basicSnapshot = await getDocs(basicQuery)
        
        const intermedioQuery = query(
          collection(db, "questions"),
          where("competence", "==", code),
          where("level", "in", ["Intermedio", "Intermedio 1", "Intermedio 2"])
        )
        const intermedioSnapshot = await getDocs(intermedioQuery)
        
        const avanzadoQuery = query(
          collection(db, "questions"),
          where("competence", "==", code),
          where("level", "in", ["Avanzado", "Avanzado 1", "Avanzado 2"])
        )
        const avanzadoSnapshot = await getDocs(avanzadoQuery)
        
        console.log(`   - Nivel Básico: ${basicSnapshot.size} preguntas`)
        console.log(`   - Nivel Intermedio: ${intermedioSnapshot.size} preguntas`)
        console.log(`   - Nivel Avanzado: ${avanzadoSnapshot.size} preguntas`)
      }
      
      console.log("") 
    }
    
    console.log("\n🔎 Verificación completa!")
    
  } catch (error) {
    console.error("❌ Error al verificar preguntas:", error)
  }
}


checkQuestions()
