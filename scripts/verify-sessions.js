const { initializeApp } = require("firebase/app")
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore")

const { firebaseConfig } = require("../lib/firebase");

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function verifyCurrentState() {
  console.log("🔍 Verificando estado actual de sesiones...")
  
  try {
   
    const allSessionsQuery = query(collection(db, "testSessions"))
    const allSessionsSnapshot = await getDocs(allSessionsQuery)
    
    console.log(`📊 Total de sesiones en Firebase: ${allSessionsSnapshot.size}`)
    
   
    const groups = {}
    allSessionsSnapshot.forEach(doc => {
      const data = doc.data()
      const key = `${data.competence}/${data.level}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push({
        id: doc.id,
        userId: data.userId.substring(0, 8) + "...",
        answers: data.answers?.filter(a => a !== null).length || 0,
        completed: !!data.endTime,
        score: data.score || 0
      })
    })
    
    console.log("\n📋 ESTADO ACTUAL POR COMPETENCIA/NIVEL:")
    Object.entries(groups).forEach(([key, sessions]) => {
      console.log(`\n  ${key}:`)
      if (sessions.length === 1) {
        const s = sessions[0]
        console.log(`    ✅ 1 sesión - ${s.completed ? 'completada' : 'inicial'} (${s.answers} respuestas) ${s.score ? '- ' + s.score + '%' : ''}`)
      } else {
        console.log(`    ⚠️ ${sessions.length} sesiones:`)
        sessions.forEach((s, i) => {
          console.log(`      ${i + 1}. ${s.id.substring(0, 8)}... - ${s.completed ? 'completada' : 'inicial'} (${s.answers} respuestas) ${s.score ? '- ' + s.score + '%' : ''}`)
        })
      }
    })
    
   
    const duplicateGroups = Object.entries(groups).filter(([, sessions]) => sessions.length > 1)
    
    if (duplicateGroups.length === 0) {
      console.log("\n✅ ¡PERFECTO! No hay sesiones duplicadas")
    } else {
      console.log(`\n⚠️ ADVERTENCIA: ${duplicateGroups.length} grupos con duplicados encontrados`)
    }
    
    console.log(`\n📈 RESUMEN:`)
    console.log(`  Total sesiones: ${allSessionsSnapshot.size}`)
    console.log(`  Grupos únicos: ${Object.keys(groups).length}`)
    console.log(`  Duplicados: ${duplicateGroups.length}`)
    
  } catch (error) {
    console.error("💥 Error:", error)
  }
}

verifyCurrentState()
  .then(() => {
    console.log("\n🏁 Verificación completada")
    process.exit(0)
  })
  .catch(error => {
    console.error("\n💥 Error fatal:", error)
    process.exit(1)
  })
