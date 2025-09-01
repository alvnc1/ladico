"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import type { Competence } from "@/types"
import { useCompetences } from "./useCompetences"

type LevelName = "Básico" | "Intermedio" | "Avanzado"

const LEVELS: LevelName[] = ["Básico", "Intermedio", "Avanzado"]

export interface LevelStatus {
  completed: boolean
  inProgress: boolean
  answered: number
  total: number
  progressPct: number
}

export interface CompetenceLevelMap {
  [competenceId: string]: {
    [level in LevelName]: LevelStatus
  }
}

interface AreaStatsByLevel {
  [dimension: string]: {
    [level in LevelName]: { completedCount: number; totalCount: number }
  }
}

export interface UseLevelProgressResult {
  loading: boolean
  competences: Competence[]
  dimensionByCompetence: Record<string, string>
  perCompetenceLevel: CompetenceLevelMap
  areaStats: AreaStatsByLevel
  currentAreaLevel: (dimension: string) => LevelName
  nextCompetenceToAttempt: (dimension: string, level: LevelName) => string | null
  isPreviousCompetenceCompleted: (competenceId: string, level: LevelName) => boolean
}

export function useLevelProgress(): UseLevelProgressResult {
  const { user } = useAuth()
  const { competences, loading: loadingCompetences } = useCompetences()
  const [loading, setLoading] = useState(true)
  const [perCompetenceLevel, setPerCompetenceLevel] = useState<CompetenceLevelMap>({})

 
  useEffect(() => {
    if (!user?.uid || !db || loadingCompetences) {
      setLoading(false)
      return
    }

    let unsubscribe: Unsubscribe | null = null

   
    const q = query(collection(db, "testSessions"), where("userId", "==", user.uid))
    
    unsubscribe = onSnapshot(q, (snapshot) => {
     
      const initStatus = (): LevelStatus => ({ completed: false, inProgress: false, answered: 0, total: 3, progressPct: 0 })
      const map: CompetenceLevelMap = {} as CompetenceLevelMap
      for (const c of competences) {
        map[c.id] = {
          "Básico": initStatus(),
          "Intermedio": initStatus(),
          "Avanzado": initStatus(),
        }
      }

     
      const sessionGroups: Record<string, Array<{doc: any, data: any}>> = {}
      
      snapshot.forEach((docSnap) => {
        const data: any = docSnap.data()
        const cid: string | undefined = data?.competence
        if (!cid || !map[cid]) return

        const lvlRaw: string = data?.level || "Básico"
        const levelNorm = normalizeLevel(lvlRaw)
        if (!levelNorm) return

        const key = `${cid}:${levelNorm}`
        if (!sessionGroups[key]) {
          sessionGroups[key] = []
        }
        sessionGroups[key].push({ doc: docSnap, data })
      })

     
      Object.entries(sessionGroups).forEach(([key, sessions]) => {
        const [cid, levelNorm] = key.split(':') as [string, LevelName]
        
        if (sessions.length > 1) {
          console.warn(`⚠️ Encontradas ${sessions.length} sesiones duplicadas para ${cid}/${levelNorm}`)
        }

       
        const consolidatedStatus = consolidateSessionGroup(sessions)
        map[cid][levelNorm] = consolidatedStatus
      })

      setPerCompetenceLevel(map)
      setLoading(false)
      
     
      const totalSessions = snapshot.size
      const completedLevels = Object.values(map).reduce((acc, comp) => {
        return acc + Object.values(comp).filter(level => level.completed).length
      }, 0)
      const inProgressLevels = Object.values(map).reduce((acc, comp) => {
        return acc + Object.values(comp).filter(level => level.inProgress).length
      }, 0)
      
      console.log(`📊 DATOS FIREBASE: ${totalSessions} sesiones → ${completedLevels} completados, ${inProgressLevels} en progreso`)
      
      if (totalSessions > 0) {
        const sessionDetails = snapshot.docs.map(doc => {
          const data = doc.data()
          return `${data.competence || 'N/A'}/${data.level || 'N/A'} (${data.endTime ? 'terminada' : 'en curso'})`
        })
        console.log(`📋 Sesiones encontradas:`, sessionDetails)
        
       
        console.log(`📊 ESTADO CONSOLIDADO POR COMPETENCIA:`)
        Object.entries(map).forEach(([competenceId, levels]) => {
          Object.entries(levels).forEach(([level, status]) => {
            if (status.completed || status.inProgress || status.answered > 0) {
              console.log(`  ${competenceId}/${level}: ${status.completed ? '✅ COMPLETADO' : status.inProgress ? '🔄 EN PROGRESO' : '⚪ INICIAL'} (${status.answered}/${status.total}, ${status.progressPct}%)`)
            }
          })
        })
      }
    }, (error) => {
      console.error("Error en listener de testSessions:", error)
      setLoading(false)
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.uid, competences, loadingCompetences])

 
  const dimensionByCompetence = useMemo(() => {
    const out: Record<string, string> = {}
    for (const c of competences) out[c.id] = c.dimension
    return out
  }, [competences])

 
  const areaStats = useMemo(() => {
    const stats: AreaStatsByLevel = {}
    for (const c of competences) {
      const dim = c.dimension
      if (!stats[dim]) stats[dim] = { "Básico": { completedCount: 0, totalCount: 0 }, "Intermedio": { completedCount: 0, totalCount: 0 }, "Avanzado": { completedCount: 0, totalCount: 0 } }
      
      for (const lvl of LEVELS) {
        stats[dim][lvl].totalCount += 1
        if (perCompetenceLevel[c.id]?.[lvl]?.completed) stats[dim][lvl].completedCount += 1
      }
    }
    return stats
  }, [competences, perCompetenceLevel])

 
  const currentAreaLevel = (dimension: string): LevelName => {
    const areaCompetences = competences.filter(c => c.dimension === dimension)
    if (!areaCompetences.length) return "Básico"
    
    const basicCompleted = areaCompetences.every(c =>
      perCompetenceLevel[c.id]?.["Básico"]?.completed === true
    )
    
    const interCompleted = areaCompetences.every(c => 
      perCompetenceLevel[c.id]?.["Intermedio"]?.completed === true
    )
    
    if (interCompleted) return "Avanzado"
    if (basicCompleted) return "Intermedio"
    return "Básico"
  }

 
  const nextCompetenceToAttempt = (dimension: string, level: LevelName): string | null => {
    const areaCompetences = competences.filter(c => c.dimension === dimension)
    if (!areaCompetences.length) return null
    
   
    const sortedCompetences = areaCompetences.sort((a, b) => a.code.localeCompare(b.code))
    
   
    const firstIncomplete = sortedCompetences.find(c => 
      !perCompetenceLevel[c.id]?.[level]?.completed
    )
    
    return firstIncomplete?.id || null
  }

 
  const isPreviousCompetenceCompleted = (competenceId: string, level: LevelName): boolean => {
    const currentCompetence = competences.find(c => c.id === competenceId)
    if (!currentCompetence) return false
    
    const areaCompetences = competences
      .filter(c => c.dimension === currentCompetence.dimension)
      .sort((a, b) => a.code.localeCompare(b.code))
    
    const currentIndex = areaCompetences.findIndex(c => c.id === competenceId)
    
   
    if (currentIndex === 0) return true
    
   
    for (let i = 0; i < currentIndex; i++) {
      const prevCompetence = areaCompetences[i]
      const isCompleted = perCompetenceLevel[prevCompetence.id]?.[level]?.completed
      if (!isCompleted) return false
    }
    
    return true
  }

  return {
    loading: loading || loadingCompetences,
    competences,
    dimensionByCompetence,
    perCompetenceLevel,
    areaStats,
    currentAreaLevel,
    nextCompetenceToAttempt,
    isPreviousCompetenceCompleted,
  }
}

function normalizeLevel(raw: string): LevelName | null {
  const normalized = raw.toLowerCase()
  if (normalized.includes("básico") || normalized.includes("basico")) return "Básico"
  if (normalized.includes("intermedio")) return "Intermedio"
  if (normalized.includes("avanzado")) return "Avanzado"
  return null
}

function consolidateSessionGroup(sessions: Array<{doc: any, data: any}>): LevelStatus {
  const initStatus = (): LevelStatus => ({ completed: false, inProgress: false, answered: 0, total: 3, progressPct: 0 })
  
  if (sessions.length === 0) {
    return initStatus()
  }

  if (sessions.length === 1) {
   
    return processSessionData(sessions[0].data)
  }

  console.log(`🔄 Consolidando ${sessions.length} sesiones duplicadas...`)

 
  const processedSessions = sessions.map(s => ({
    ...s,
    processed: processSessionData(s.data)
  }))

  const completedSessions = processedSessions.filter(s => s.processed.completed)
  const inProgressSessions = processedSessions.filter(s => s.processed.inProgress)
  const initialSessions = processedSessions.filter(s => !s.processed.completed && !s.processed.inProgress)

 
  if (completedSessions.length > 0) {
    const latest = completedSessions.sort((a, b) => {
      const timeA = a.data.endTime || a.data.startTime
      const timeB = b.data.endTime || b.data.startTime
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })[0]
    
    console.log("✅ Usando sesión completada más reciente")
    return latest.processed
  }

 
  if (inProgressSessions.length > 0) {
    const bestInProgress = inProgressSessions.sort((a, b) => {
     
      if (a.processed.answered !== b.processed.answered) {
        return b.processed.answered - a.processed.answered
      }
     
      return new Date(b.data.startTime).getTime() - new Date(a.data.startTime).getTime()
    })[0]
    
    console.log(`🔄 Usando sesión en progreso con ${bestInProgress.processed.answered} respuestas`)
    return bestInProgress.processed
  }

 
  if (initialSessions.length > 0) {
    const latest = initialSessions.sort((a, b) => 
      new Date(b.data.startTime).getTime() - new Date(a.data.startTime).getTime()
    )[0]
    
    console.log("📅 Usando sesión inicial más reciente")
    return latest.processed
  }

 
  return initStatus()
}


function processSessionData(data: any): LevelStatus {
  const answers: Array<number | null> = Array.isArray(data?.answers) ? data.answers : []
  const answered = answers.filter(a => a !== null && a !== undefined).length
  const total = Math.max(3, answers.length || 3)
  const score: number = typeof data?.score === "number" ? data.score : Math.round((answered / total) * 100)
  const hasEndTime = typeof data?.endTime !== "undefined" && data?.endTime !== null
 
  const passed: boolean = data?.passed === true || score >= 66

  const completed = hasEndTime && (score === 100 || passed)
 
  const inProgress = !hasEndTime && answered > 0

  if (completed) {
    return {
      completed: true,
      inProgress: false,
      answered,
      total,
      progressPct: score === 100 ? 100 : Math.min(99, Math.max(score, Math.round((answered / total) * 100)))
    }
  }

  if (inProgress) {
    return {
      completed: false,
      inProgress: true,
      answered,
      total,
      progressPct: Math.round((answered / total) * 100)
    }
  }

 
  return {
    completed: false,
    inProgress: false,
    answered: 0,
    total,
    progressPct: 0
  }
}
