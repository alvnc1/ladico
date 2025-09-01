import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore"

import { firebaseConfig } from "../lib/firebase";

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface SessionData {
  id: string
  userId: string
  competence: string
  level: string
  answers: (number | null)[]
  startTime: any
  endTime?: any
  score?: number
  passed?: boolean
}

function consolidateDuplicates(sessions: SessionData[]): SessionData {
  if (sessions.length === 1) return sessions[0]

  console.log(`🔄 Consolidando ${sessions.length} sesiones duplicadas...`)

 
  const completedSessions = sessions.filter(s => s.endTime)
  const inProgressSessions = sessions.filter(s => !s.endTime && s.answers?.some(a => a !== null))
  const initialSessions = sessions.filter(s => !s.endTime && !s.answers?.some(a => a !== null))

 
  if (completedSessions.length > 0) {
    const latest = completedSessions.sort((a, b) => {
      const timeA = a.endTime?.toDate?.() || a.endTime || new Date(a.startTime)
      const timeB = b.endTime?.toDate?.() || b.endTime || new Date(b.startTime)
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })[0]
    
    console.log("✅ Manteniendo sesión completada más reciente")
    return latest
  }

 
  if (inProgressSessions.length > 0) {
    const bestInProgress = inProgressSessions.sort((a, b) => {
      const answersA = a.answers?.filter(ans => ans !== null && ans !== undefined).length || 0
      const answersB = b.answers?.filter(ans => ans !== null && ans !== undefined).length || 0
      
      if (answersA !== answersB) {
        return answersB - answersA
      }
      
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    })[0]
    
    const answeredCount = bestInProgress.answers?.filter(ans => ans !== null && ans !== undefined).length || 0
    console.log(`🔄 Manteniendo sesión en progreso con ${answeredCount} respuestas`)
    return bestInProgress
  }

 
  const latest = initialSessions.sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )[0] || sessions[0]
  
  console.log("📅 Manteniendo sesión más reciente")
  return latest
}


async function cleanDuplicateSessions() {
  console.log("🧹 Iniciando limpieza de sesiones duplicadas...")
  
  try {
   
    const allSessionsQuery = query(collection(db, "testSessions"))
    const allSessionsSnapshot = await getDocs(allSessionsQuery)
    
    console.log(`📊 Total de sesiones encontradas: ${allSessionsSnapshot.size}`)
    
   
    const sessionGroups: Record<string, SessionData[]> = {}
    
    allSessionsSnapshot.forEach(doc => {
      const data = doc.data() as Omit<SessionData, 'id'>
      const session: SessionData = {
        id: doc.id,
        ...data
      }
      
      const key = `${session.userId}:${session.competence}:${session.level}`
      if (!sessionGroups[key]) {
        sessionGroups[key] = []
      }
      sessionGroups[key].push(session)
    })
    
   
    let totalDeleted = 0
    let groupsProcessed = 0
    
    for (const [key, sessions] of Object.entries(sessionGroups)) {
      if (sessions.length > 1) {
        const [userId, competence, level] = key.split(':')
        console.log(`\n🔍 Procesando ${sessions.length} sesiones duplicadas para ${competence}/${level}`)
        
       
        const bestSession = consolidateDuplicates(sessions)
        const sessionsToDelete = sessions.filter(s => s.id !== bestSession.id)
        
        console.log(`🗑️ Eliminando ${sessionsToDelete.length} sesiones duplicadas`)
        
       
        for (const session of sessionsToDelete) {
          try {
            await deleteDoc(doc(db, "testSessions", session.id))
            totalDeleted++
            console.log(`   ✅ Eliminada sesión ${session.id}`)
          } catch (error) {
            console.error(`   ❌ Error eliminando sesión ${session.id}:`, error)
          }
        }
        
        groupsProcessed++
      }
    }
    
    console.log("\n" + "=".repeat(50))
    console.log("📊 RESUMEN DE LIMPIEZA:")
    console.log(`✅ Grupos procesados: ${groupsProcessed}`)
    console.log(`🗑️ Sesiones eliminadas: ${totalDeleted}`)
    console.log(`📊 Sesiones restantes: ${allSessionsSnapshot.size - totalDeleted}`)
    console.log("=".repeat(50))
    
    if (totalDeleted > 0) {
      console.log("🎉 ¡Limpieza completada exitosamente!")
    } else {
      console.log("✨ No se encontraron sesiones duplicadas para limpiar")
    }
    
  } catch (error) {
    console.error("💥 Error durante la limpieza:", error)
    throw error
  }
}

async function reportDuplicates() {
  console.log("📋 Generando reporte de sesiones duplicadas...")
  
  try {
    const allSessionsQuery = query(collection(db, "testSessions"))
    const allSessionsSnapshot = await getDocs(allSessionsQuery)
    
   
    const sessionGroups: Record<string, SessionData[]> = {}
    
    allSessionsSnapshot.forEach(doc => {
      const data = doc.data() as Omit<SessionData, 'id'>
      const session: SessionData = {
        id: doc.id,
        ...data
      }
      
      const key = `${session.userId}:${session.competence}:${session.level}`
      if (!sessionGroups[key]) {
        sessionGroups[key] = []
      }
      sessionGroups[key].push(session)
    })
    
   
    const duplicateGroups = Object.entries(sessionGroups).filter(([, sessions]) => sessions.length > 1)
    
    console.log(`\n📊 REPORTE DE DUPLICADOS:`)
    console.log(`Total de sesiones: ${allSessionsSnapshot.size}`)
    console.log(`Grupos con duplicados: ${duplicateGroups.length}`)
    console.log(`Sesiones duplicadas: ${duplicateGroups.reduce((acc, [, sessions]) => acc + sessions.length - 1, 0)}`)
    
    if (duplicateGroups.length > 0) {
      console.log("\n📋 DETALLES DE DUPLICADOS:")
      duplicateGroups.forEach(([key, sessions]) => {
        const [userId, competence, level] = key.split(':')
        console.log(`\n  ${competence}/${level} (Usuario: ${userId}):`)
        sessions.forEach((session, index) => {
          const answered = session.answers?.filter(a => a !== null).length || 0
          const status = session.endTime ? 'completada' : answered > 0 ? 'en progreso' : 'inicial'
          console.log(`    ${index + 1}. ${session.id} - ${status} (${answered} respuestas)`)
        })
      })
    }
    
  } catch (error) {
    console.error("💥 Error generando reporte:", error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'report'
  
  console.log("🚀 Script de limpieza de sesiones duplicadas")
  console.log("📊 Proyecto:", firebaseConfig.projectId)
  console.log("⏰ Fecha:", new Date().toLocaleString('es-ES'))
  console.log("=".repeat(50))
  
  try {
    if (command === 'clean') {
      console.log("⚠️  MODO LIMPIEZA: Se eliminarán sesiones duplicadas")
      await cleanDuplicateSessions()
    } else {
      console.log("📋 MODO REPORTE: Solo se mostrarán duplicados")
      await reportDuplicates()
      console.log("\n💡 Para ejecutar limpieza: node cleanup-sessions.js clean")
    }
  } catch (error) {
    console.error("💥 Error fatal:", error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🏁 Script finalizado")
      process.exit(0)
    })
    .catch(error => {
      console.error("\n💥 Error fatal:", error)
      process.exit(1)
    })
}

export { cleanDuplicateSessions, reportDuplicates }
