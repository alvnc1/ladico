// hooks/useLevelProgress.ts
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { collection, query, where, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { getDb } from "@/lib/safeDb"
import { useAuth } from "@/contexts/AuthContext"
import type { Competence } from "@/types"
import { useCompetences } from "./useCompetences"

type LevelName = "Básico" | "Intermedio" | "Avanzado"
const LEVELS: LevelName[] = ["Básico", "Intermedio", "Avanzado"]
const RESET_TTL_MS = 10 * 60 * 1000 // 10 minutos

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
  const { user, userData } = useAuth()
  const { competences, loading: loadingCompetences } = useCompetences()

  const [loading, setLoading] = useState(true)

  // 🔹 Mapa derivado DIRECTO de Firestore (sin overlay local)
  const [rawMap, setRawMap] = useState<CompetenceLevelMap>({})

  // 🔹 Versión interna que se incrementa cuando llega un ping o cambia localStorage
  const [bumpVersion, setBumpVersion] = useState(0)

  const isTeacher = userData?.role === "profesor"

  // Helper local
  const initStatus = (): LevelStatus => ({
    completed: false,
    inProgress: false,
    answered: 0,
    total: 3,
    progressPct: 0,
  })

  // === Listener Firestore: construye rawMap ===
  useEffect(() => {
    if (!user?.uid || loadingCompetences) {
      // Si no hay user o competences no están listas, inicializa vacío pero no bloquea UI
      if (!loadingCompetences) setLoading(false)
      return
    }

    let unsubscribe: Unsubscribe | null = null

    try {
      const db = getDb()
      const q = query(collection(db, "testSessions"), where("userId", "==", user.uid))

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Inicializa el mapa por cada competencia y nivel
          const baseMap: CompetenceLevelMap = {} as CompetenceLevelMap
          for (const c of competences) {
            baseMap[c.id] = {
              "Básico": initStatus(),
              "Intermedio": initStatus(),
              "Avanzado": initStatus(),
            }
          }

          // Agrupar sesiones por competencia+nivel
          const sessionGroups: Record<string, Array<{ doc: any; data: any }>> = {}
          snapshot.forEach((docSnap) => {
            const data: any = docSnap.data()
            const cid: string | undefined = data?.competence
            if (!cid || !baseMap[cid]) return

            const lvlRaw: string = data?.level || "Básico"
            const levelNorm = normalizeLevel(lvlRaw)
            if (!levelNorm) return

            const key = `${cid}:${levelNorm}`
            if (!sessionGroups[key]) sessionGroups[key] = []
            sessionGroups[key].push({ doc: docSnap, data })
          })

          // Consolida por grupo
          Object.entries(sessionGroups).forEach(([key, sessions]) => {
            const [cid, levelNorm] = key.split(":") as [string, LevelName]
            if (sessions.length > 1) {
              console.warn(`⚠️ Sesiones duplicadas para ${cid}/${levelNorm}: ${sessions.length}`)
            }
            const consolidatedStatus = consolidateSessionGroup(sessions, isTeacher)
            baseMap[cid][levelNorm] = consolidatedStatus
          })

          setRawMap(baseMap)
          setLoading(false)

          // Logs útiles
          const totalSessions = snapshot.size
          const completedLevels = Object.values(baseMap).reduce(
            (acc, comp) => acc + Object.values(comp).filter((level) => level.completed).length,
            0
          )
          const inProgressLevels = Object.values(baseMap).reduce(
            (acc, comp) => acc + Object.values(comp).filter((level) => level.inProgress).length,
            0
          )
          console.log(
            `📊 testSessions: ${totalSessions} → ${completedLevels} completados, ${inProgressLevels} en progreso`
          )
        },
        (error) => {
          console.error("Error en listener de testSessions:", error)
          setLoading(false)
        }
      )
    } catch (e) {
      console.error("useLevelProgress → getDb() falló:", e)
      setLoading(false)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user?.uid, competences, loadingCompetences, isTeacher])

  // === Escuchar ping/reset local para recomputar overlay (sin tocar Firestore) ===
  useEffect(() => {
    if (typeof window === "undefined") return

    const bump = () => setBumpVersion((v) => v + 1)

    const onPing = () => bump()
    window.addEventListener("ladico:refresh", onPing)

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return
      if (e.key === "ladico:progress:version") bump()
      if (e.key.startsWith("ladico:resetLevels:")) bump()
    }
    window.addEventListener("storage", onStorage)

    // Al montar, si ya hay una versión previa registrada, forzamos un bump
    try {
      const v = Number(localStorage.getItem("ladico:progress:version") || "0")
      if (v) bump()
    } catch {}

    return () => {
      window.removeEventListener("ladico:refresh", onPing)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // === Overlay de reset con TTL aplicado a rawMap ===
  const perCompetenceLevel: CompetenceLevelMap = useMemo(() => {
    // Clonar superficialmente
    const out: CompetenceLevelMap = {} as CompetenceLevelMap
    for (const c of competences) {
      const byLevel = rawMap[c.id] || {
        "Básico": initStatus(),
        "Intermedio": initStatus(),
        "Avanzado": initStatus(),
      }
      out[c.id] = { ...byLevel }
    }

    if (typeof window !== "undefined") {
      for (const c of competences) {
        const compId = c.id
        const flag = localStorage.getItem(`ladico:resetLevels:${compId}`) === "1"
        if (!flag) continue

        // TTL
        const ts = Number(localStorage.getItem(`ladico:resetLevels:${compId}:ts`) || 0)
        const expired = ts && Date.now() - ts > RESET_TTL_MS
        if (expired) {
          localStorage.removeItem(`ladico:resetLevels:${compId}`)
          localStorage.removeItem(`ladico:resetLevels:${compId}:ts`)
          continue
        }

        // Overlay: fuerza estado inicial para TODOS los niveles de esa competencia
        out[compId] = {
          "Básico": initStatus(),
          "Intermedio": initStatus(),
          "Avanzado": initStatus(),
        }
      }
    }

    return out
    // bumpVersion en deps → recomputa cuando hay ping/reset
  }, [competences, rawMap, bumpVersion])

  // Mapa de dimensión por competencia
  const dimensionByCompetence = useMemo(() => {
    const out: Record<string, string> = {}
    for (const c of competences) out[c.id] = c.dimension
    return out
  }, [competences])

  // Conteos por área y nivel (completadas / total)
  const areaStats = useMemo(() => {
    const stats: AreaStatsByLevel = {}
    for (const c of competences) {
      const dim = c.dimension
      if (!stats[dim])
        stats[dim] = {
          "Básico": { completedCount: 0, totalCount: 0 },
          "Intermedio": { completedCount: 0, totalCount: 0 },
          "Avanzado": { completedCount: 0, totalCount: 0 },
        }

      for (const lvl of LEVELS) {
        stats[dim][lvl].totalCount += 1
        if (perCompetenceLevel[c.id]?.[lvl]?.completed) stats[dim][lvl].completedCount += 1
      }
    }
    return stats
  }, [competences, perCompetenceLevel])

  // Nivel actual de un área: sube al siguiente solo si TODAS las competencias del nivel están completas
  const currentAreaLevel = (dimension: string): LevelName => {
    const areaCompetences = competences.filter((c) => c.dimension === dimension)
    if (!areaCompetences.length) return "Básico"

    const basicCompleted = areaCompetences.every(
      (c) => perCompetenceLevel[c.id]?.["Básico"]?.completed === true
    )
    const interCompleted = areaCompetences.every(
      (c) => perCompetenceLevel[c.id]?.["Intermedio"]?.completed === true
    )

    if (interCompleted) return "Avanzado"
    if (basicCompleted) return "Intermedio"
    return "Básico"
  }

  // Siguiente competencia sugerida dentro de un área/nivel (orden por code)
  const nextCompetenceToAttempt = (dimension: string, level: LevelName): string | null => {
    const areaCompetences = competences.filter((c) => c.dimension === dimension)
    if (!areaCompetences.length) return null

    const sorted = areaCompetences.sort((a, b) => a.code.localeCompare(b.code))
    const firstIncomplete = sorted.find((c) => !perCompetenceLevel[c.id]?.[level]?.completed)
    return firstIncomplete?.id ?? null
  }

  // ¿Todas las competencias previas de ese nivel están completas?
  const isPreviousCompetenceCompleted = (competenceId: string, level: LevelName): boolean => {
    const comp = competences.find((c) => c.id === competenceId)
    if (!comp) return true
    const siblings = competences
      .filter((c) => c.dimension === comp.dimension)
      .sort((a, b) => a.code.localeCompare(b.code))

    for (const s of siblings) {
      if (s.id === competenceId) break
      const done = perCompetenceLevel[s.id]?.[level]?.completed
      if (!done) return false
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

/* ===================== Helpers ===================== */

function normalizeLevel(raw: string): LevelName | null {
  const normalized = (raw || "").toLowerCase()
  if (normalized.includes("básico") || normalized.includes("basico")) return "Básico"
  if (normalized.includes("intermedio")) return "Intermedio"
  if (normalized.includes("avanzado")) return "Avanzado"
  return null
}

// Consolida un grupo de sesiones (misma competencia+nivel) a un único LevelStatus
function consolidateSessionGroup(
  sessions: Array<{ doc: any; data: any }>,
  isTeacher: boolean
): LevelStatus {
  const initStatus = (): LevelStatus => ({
    completed: false,
    inProgress: false,
    answered: 0,
    total: 3,
    progressPct: 0,
  })
  if (sessions.length === 0) return initStatus()
  if (sessions.length === 1) return processSessionData(sessions[0].data, isTeacher)

  const processedSessions = sessions.map((s) => ({
    ...s,
    processed: processSessionData(s.data, isTeacher),
  }))

  const completedSessions = processedSessions.filter((s) => s.processed.completed)
  const inProgressSessions = processedSessions.filter((s) => s.processed.inProgress)
  const initialSessions = processedSessions.filter(
    (s) => !s.processed.completed && !s.processed.inProgress
  )

  // 1) última completada (por endTime/startTime)
  if (completedSessions.length > 0) {
    const latest = completedSessions.sort((a, b) => {
      const timeA = a.data.endTime || a.data.startTime
      const timeB = b.data.endTime || b.data.startTime
      return new Date(timeB).getTime() - new Date(timeA).getTime()
    })[0]
    return latest.processed
  }

  // 2) en progreso con más respondidas (empate → más reciente)
  if (inProgressSessions.length > 0) {
    const best = inProgressSessions.sort((a, b) => {
      if (a.processed.answered !== b.processed.answered)
        return b.processed.answered - a.processed.answered
      return new Date(b.data.startTime).getTime() - new Date(a.data.startTime).getTime()
    })[0]
    return best.processed
  }

  // 3) inicial más reciente
  if (initialSessions.length > 0) {
    const latest = initialSessions.sort(
      (a, b) => new Date(b.data.startTime).getTime() - new Date(a.data.startTime).getTime()
    )[0]
    return latest.processed
  }

  return initStatus()
}

// Traduce una sesión individual a LevelStatus
function processSessionData(data: any, isTeacher: boolean): LevelStatus {
  const answers: Array<number | null> = Array.isArray(data?.answers) ? data.answers : []
  const answered = answers.filter((a) => a !== null && a !== undefined).length
  const total = Math.max(3, answers.length || 3)

  const score: number =
    typeof data?.score === "number" ? data.score : Math.round((answered / total) * 100)

  const hasEndTime = typeof data?.endTime !== "undefined" && data?.endTime !== null
  const passed: boolean = data?.passed === true || score >= 66

  // Caso profesor: marcar completado con criterios flexibles
  if (isTeacher) {
    const completedTeacher = hasEndTime || answered >= total || passed
    if (completedTeacher) {
      return {
        completed: true,
        inProgress: false,
        answered: total,
        total,
        progressPct: 100,
      }
    }
    return {
      completed: false,
      inProgress: answered > 0,
      answered,
      total,
      progressPct: Math.round((answered / total) * 100),
    }
  }

  // Lógica para estudiante
  const completed = hasEndTime && (score === 100 || passed)
  const inProgress = !hasEndTime && answered > 0

  if (completed) {
    return {
      completed: true,
      inProgress: false,
      answered,
      total,
      progressPct:
        score === 100 ? 100 : Math.min(99, Math.max(score, Math.round((answered / total) * 100))),
    }
  }

  if (inProgress) {
    return {
      completed: false,
      inProgress: true,
      answered,
      total,
      progressPct: Math.round((answered / total) * 100),
    }
  }

  return { completed: false, inProgress: false, answered: 0, total, progressPct: 0 }
}
