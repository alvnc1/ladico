import { doc, updateDoc } from "firebase/firestore"
import { getDb } from "./safeDb"

export async function updateCurrentLevel(
  userId: string,
  userData: any,
  levelParam: string,
  isTeacher: boolean
): Promise<void> {
  console.log(`🔍 updateCurrentLevel llamado:`, { userId, levelParam, isTeacher, currentLevel: userData?.currentLevel })
  
  if (isTeacher || !userId || !userData) {
    console.log(`❌ Saltando actualización: isTeacher=${isTeacher}, userId=${!!userId}, userData=${!!userData}`)
    return
  }

  try {
    const db = getDb()
    if (!db) {
      console.log(`❌ No hay conexión a la base de datos`)
      return
    }

    // Usar la misma lógica que el dashboard - verificar localStorage directamente
    const levelParamForArea = levelParam.toLowerCase()
    
    // Verificar las áreas activas usando localStorage
    const activeAreas = [
      "Búsqueda y gestión de información y datos", // área 1
      "Seguridad" // área 4
    ]
    
    for (const area of activeAreas) {
      console.log(`📊 Verificando área "${area}" en nivel: ${levelParamForArea}`)
      
      // Buscar competencias de esta área usando localStorage
      const areaCompetences = []
      const maxCompetences = area === "Búsqueda y gestión de información y datos" ? 3 : 4 // área 1: 3 competencias, área 4: 4 competencias
      
      for (let i = 1; i <= maxCompetences; i++) {
        const compId = area === "Búsqueda y gestión de información y datos" ? `1.${i}` : `4.${i}`
        const isCompleted = localStorage.getItem(`ladico:completed:${compId}:${levelParamForArea}`) === "1"
        if (isCompleted) {
          areaCompetences.push(compId)
        }
      }
      
      console.log(`🏢 Competencias completadas del área "${area}":`, areaCompetences)

      // Si todas las competencias del área están completadas, actualizar nivel
      const expectedCount = maxCompetences
      const justCompletedArea = areaCompetences.length === expectedCount
      
      console.log(`📈 Área "${area}" completada: ${justCompletedArea} (${areaCompetences.length}/${expectedCount})`)

      if (justCompletedArea) {
        const completedLevel = levelParamForArea as "basico" | "intermedio" | "avanzado"
        const rank = { "-": 0, basico: 1, intermedio: 2, avanzado: 3 } as const
        const current = ((userData?.currentLevel ?? "-") as "-" | "basico" | "intermedio" | "avanzado")

        console.log(`🔄 Comparando niveles: actual=${current} (rank=${rank[current]}), nuevo=${completedLevel} (rank=${rank[completedLevel]})`)

        if (rank[completedLevel] > rank[current]) {
          console.log(`✅ Actualizando currentLevel de ${current} a ${completedLevel}`)
          await updateDoc(doc(db, "users", userId), { currentLevel: completedLevel })
          
          // Disparar evento para actualizar la UI
          try {
            localStorage.setItem("ladico:progress:version", String(Date.now()))
            window.dispatchEvent(new Event("ladico:refresh"))
          } catch {}
          
          // Solo actualizar una vez
          break
        } else {
          console.log(`❌ No se actualiza: el nuevo nivel no es mayor que el actual`)
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo actualizar currentLevel:", e)
  }
}
