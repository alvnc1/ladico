const { initializeApp } = require("firebase/app")
const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = require("firebase/firestore")


const { firebaseConfig } = require("../lib/firebase");

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function simpleCleanup() {
  console.log("🚀 Script simplificado de limpieza")
  
  try {
   
    const allSessionsQuery = query(collection(db, "testSessions"))
    const allSessionsSnapshot = await getDocs(allSessionsQuery)
    
    console.log(`📊 Total de sesiones: ${allSessionsSnapshot.size}`)
    
   
    const allSessions = []
    allSessionsSnapshot.forEach(docSnap => {
      const data = docSnap.data()
      allSessions.push({
        id: docSnap.id,
        userId: data.userId,
        competence: data.competence,
        level: data.level,
        answers: data.answers,
        endTime: data.endTime,
        score: data.score,
        startTime: data.startTime
      })
    })
    
   
    const groups = {}
    allSessions.forEach(session => {
      const key = `${session.userId}:${session.competence}:${session.level}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(session)
    })
    
   
    let totalDeleted = 0
    
    for (const [key, sessions] of Object.entries(groups)) {
      if (sessions.length > 1) {
        const [userId, competence, level] = key.split(':')
        console.log(`\n🔍 ${competence}/${level} - ${sessions.length} sesiones:`)
        
       
        let bestSession = null
        
       
        const completed = sessions.filter(s => s.endTime)
        if (completed.length > 0) {
          bestSession = completed[0]
          console.log(`✅ Manteniendo sesión completada: ${bestSession.id}`)
        } else {
         
          const withAnswers = sessions.filter(s => s.answers?.some(a => a !== null))
          if (withAnswers.length > 0) {
            bestSession = withAnswers[0]
            console.log(`🔄 Manteniendo sesión en progreso: ${bestSession.id}`)
          } else {
           
            bestSession = sessions[0]
            console.log(`📅 Manteniendo primera sesión: ${bestSession.id}`)
          }
        }
        
       
        for (const session of sessions) {
          if (session.id !== bestSession.id) {
            const answered = session.answers?.filter(a => a !== null && a !== undefined).length || 0
            const status = session.endTime ? 'completada' : answered > 0 ? 'en progreso' : 'inicial'
            
            console.log(`🗑️ Eliminando: ${session.id} (${status})`)
            
            if (process.argv[2] === 'delete') {
              try {
                await deleteDoc(doc(db, "testSessions", session.id))
                totalDeleted++
                console.log(`   ✅ Eliminada`)
              } catch (error) {
                console.error(`   ❌ Error:`, error.message)
              }
            } else {
              console.log(`   ⏭️ MODO SIMULACIÓN - no eliminada`)
            }
          }
        }
      }
    }
    
    console.log(`\n📊 Resumen:`)
    console.log(`🗑️ Sesiones eliminadas: ${totalDeleted}`)
    
    if (process.argv[2] !== 'delete') {
      console.log(`\n💡 Para eliminar realmente: node simple-cleanup.js delete`)
    }
    
  } catch (error) {
    console.error("💥 Error:", error)
  }
}

simpleCleanup()
  .then(() => {
    console.log("\n🏁 Finalizado")
    process.exit(0)
  })
  .catch(error => {
    console.error("\n💥 Error fatal:", error)
    process.exit(1)
  })
