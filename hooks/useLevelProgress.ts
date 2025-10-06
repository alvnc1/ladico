// hooks/useLevelProgress.ts
"use client"

import { useEffect, useMemo, useState } from "react"
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
  const [rawMap, setRawMap] = useState<CompetenceLevelMap>({})
  const [bumpVersion, setBumpVersion] = useState(0)

  const isTeacher = userData?.role === "profesor"

  const initStatus = (): LevelStatus => ({
    completed: false,
    inProgress: false,
    answered: 0,
    total: 3,
    progressPct: 0,
  })

  useEffect(() => {
    if (!user?.uid || loadingCompetences) {
      if (!loadingCompetences) setLoading(false)
      return
    }

    let unsubscribe: Unsubscribe | null = null

    try {
      const db = getDb()
      const qRef = query(collection(db, "testSessions"), where("userId", "==", user.uid))

      unsubscribe = onSnapshot(
        qRef,
        (snapshot) => {
          const baseMap: CompetenceLevelMap = {} as CompetenceLevelMap
          for (const c of competences) {
            baseMap[c.id] = {
              "Básico": initStatus(),
              "Intermedio": initStatus(),
              "Avanzado": initStatus(),
            }
          }

          const sessionGroups: Record<string, Array<{ data: any }>> = {}
          snapshot.forEach((docSnap) => {
            const data: any = docSnap.data()
            const cid: string | undefined = data?.competence
            if (!cid || !baseMap[cid]) return
            const lvlRaw: string = data?.level || "Básico"
            const levelNorm = normalizeLevel(lvlRaw)
            if (!levelNorm) return
            const key = `${cid}:${levelNorm}`
            if (!sessionGroups[key]) sessionGroups[key] = []
            sessionGroups[key].push({ data })
          })

          Object.entries(sessionGroups).forEach(([key, sessions]) => {
            const [cid, levelNorm] = key.split(":") as [string, LevelName]
            const { status } = consolidateSessionGroup(sessions, isTeacher)
            baseMap[cid][levelNorm] = status
          })

          // 🧹 Limpieza defensiva de flags locales “terminado” si para este usuario NO hay progreso real
          // (evita que un nuevo usuario herede flags del anterior)
          if (!isTeacher && typeof window !== "undefined") {
            try {
              for (const c of competences) {
                const byLevel = baseMap[c.id]
                if (!byLevel) continue
                for (const lvl of LEVELS) {
                  const st = byLevel[lvl]
                  if (!st) continue
                  const isInitial = !st.completed && !st.inProgress && st.progressPct === 0
                  if (isInitial) {
                    const slug = levelToSlug(lvl)
                    localStorage.removeItem(`ladico:completed:${c.id}:${slug}`)
                  }
                }
              }
            } catch {}
          }

          setRawMap(baseMap)
          setLoading(false)
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

    try {
      const v = Number(localStorage.getItem("ladico:progress:version") || "0")
      if (v) bump()
    } catch {}

    return () => {
      window.removeEventListener("ladico:refresh", onPing)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const perCompetenceLevel: CompetenceLevelMap = useMemo(() => {
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

        const ts = Number(localStorage.getItem(`ladico:resetLevels:${compId}:ts`) || 0)
        const expired = ts && Date.now() - ts > RESET_TTL_MS
        if (expired) {
          localStorage.removeItem(`ladico:resetLevels:${compId}`)
          localStorage.removeItem(`ladico:resetLevels:${compId}:ts`)
          continue
        }

        out[compId] = {
          "Básico": initStatus(),
          "Intermedio": initStatus(),
          "Avanzado": initStatus(),
        }
      }
    }

    return out
  }, [competences, rawMap, bumpVersion])

  const dimensionByCompetence = useMemo(() => {
    const out: Record<string, string> = {}
    for (const c of competences) out[c.id] = c.dimension
    return out
  }, [competences])

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

  const nextCompetenceToAttempt = (dimension: string, level: LevelName): string | null => {
    const areaCompetences = competences.filter((c) => c.dimension === dimension)
    if (!areaCompetences.length) return null

    const sorted = areaCompetences.sort((a, b) => a.code.localeCompare(b.code))
    const firstIncomplete = sorted.find((c) => !perCompetenceLevel[c.id]?.[level]?.completed)
    return firstIncomplete?.id ?? null
  }

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

function levelToSlug(level: LevelName): "basico" | "intermedio" | "avanzado" {
  return level === "Básico" ? "basico" : level === "Intermedio" ? "intermedio" : "avanzado"
}

// Consolida un grupo de sesiones (misma competencia+nivel)
function consolidateSessionGroup(
  sessions: Array<{ data: any }>,
  isTeacher: boolean
): { status: LevelStatus } {
  const initStatus = (): LevelStatus => ({
    completed: false,
    inProgress: false,
    answered: 0,
    total: 3,
    progressPct: 0,
  })
  if (sessions.length === 0) return { status: initStatus() }
  if (sessions.length === 1) {
    const st = processSessionData(sessions[0].data, isTeacher)
    return { status: st }
  }

  const processed = sessions.map((s) => ({
    raw: s.data,
    st: processSessionData(s.data, isTeacher),
  }))

  const timeOf = (d: any) => {
    const t = d?.endTime ?? d?.startTime
    if (!t) return 0
    // Firestore Timestamp compatibility
    return typeof t?.toDate === "function" ? t.toDate().getTime() : new Date(t).getTime()
  }

  const completed = processed.filter((p) => p.st.completed)
  const endedFailed = processed.filter((p) => !!p.raw?.endTime && !isPassed(p.raw))
  const inProgress = processed.filter((p) => p.st.inProgress)
  const initial = processed.filter((p) => !p.st.completed && !p.st.inProgress && !p.raw?.endTime)

  if (completed.length > 0) {
    const best = completed.sort((a, b) => timeOf(b.raw) - timeOf(a.raw))[0].st
    return { status: best }
  }
  if (endedFailed.length > 0) {
    const best = endedFailed.sort((a, b) => timeOf(b.raw) - timeOf(a.raw))[0].st
    return { status: best }
  }
  if (inProgress.length > 0) {
    const best =
      inProgress.sort((a, b) =>
        a.st.answered !== b.st.answered ? b.st.answered - a.st.answered : timeOf(b.raw) - timeOf(a.raw)
      )[0].st
    return { status: best }
  }
  if (initial.length > 0) {
    const best = initial.sort((a, b) => timeOf(b.raw) - timeOf(a.raw))[0].st
    return { status: best }
  }
  return { status: initStatus() }
}

function isPassed(d: any): boolean {
  const scoreOk = typeof d?.score === "number" ? d.score >= 66 : false
  return d?.passed === true || scoreOk
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

  // PROFESOR
  if (isTeacher) {
    const completedTeacher = hasEndTime || answered >= total || passed
    if (completedTeacher) {
      return { completed: true, inProgress: false, answered: total, total, progressPct: 100 }
    }
    return {
      completed: false,
      inProgress: answered > 0,
      answered,
      total,
      progressPct: Math.round((answered / total) * 100),
    }
  }

  // ESTUDIANTE
  if (hasEndTime && passed) {
    // Aprobó → completado al 100%
    return { completed: true, inProgress: false, answered: total, total, progressPct: 100 }
  }

  if (hasEndTime && !passed) {
    // Reprobó → no completado, no en progreso, anillo al 100% (bloqueado en la UI)
    return { completed: false, inProgress: false, answered: total, total, progressPct: 100 }
  }

  if (!hasEndTime && answered > 0) {
    return { completed: false, inProgress: true, answered, total, progressPct: Math.round((answered / total) * 100) }
  }

  return { completed: false, inProgress: false, answered: 0, total, progressPct: 0 }
}
