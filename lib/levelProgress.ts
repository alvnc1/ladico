// lib/levelProgress.ts

export type Level = "básico" | "intermedio" | "avanzado"
export type QuestionIndex = 1 | 2 | 3
export type Point = 0 | 1

// Progreso tipado con claves literales (evita errores al indexar con 1|2|3)
export type Progress = { 1: Point; 2: Point; 3: Point }

const DEFAULT_PROGRESS: Progress = { 1: 0, 2: 0, 3: 0 }

function storageKey(competence: string, level: Level) {
  return `ladico:${competence}:${level}:progress`
}

const isBrowser = typeof window !== "undefined"

// Convierte algo parseado a Progress seguro
function toProgress(parsed: unknown): Progress {
  // localStorage guarda claves como strings; normalizamos
  const obj = (parsed && typeof parsed === "object" ? parsed as any : {}) as Partial<Record<string, unknown>>
  const p1 = (obj["1"] ?? obj[1] ?? 0) as Point
  const p2 = (obj["2"] ?? obj[2] ?? 0) as Point
  const p3 = (obj["3"] ?? obj[3] ?? 0) as Point
  return { 1: (p1 === 1 ? 1 : 0), 2: (p2 === 1 ? 1 : 0), 3: (p3 === 1 ? 1 : 0) }
}

export function getProgress(competence: string, level: Level): Progress {
  if (!isBrowser) return DEFAULT_PROGRESS
  try {
    const raw = localStorage.getItem(storageKey(competence, level))
    if (!raw) return DEFAULT_PROGRESS
    const parsed = JSON.parse(raw)
    return toProgress(parsed)
  } catch {
    return DEFAULT_PROGRESS
  }
}

export function setPoint(
  competence: string,
  level: Level,
  question: QuestionIndex,
  point: Point
) {
  if (!isBrowser) return
  const prev = getProgress(competence, level)
  const next: Progress = { ...prev, [question]: point } as Progress
  localStorage.setItem(storageKey(competence, level), JSON.stringify(next))
}

export function levelPoints(progress: Progress): number {
  return (progress[1] ?? 0) + (progress[2] ?? 0) + (progress[3] ?? 0)
}

export function isLevelPassed(progress: Progress): boolean {
  // 2 o 3 puntos = pasa el nivel
  return levelPoints(progress) >= 2
}

export function getPoint(progress: Progress, q: QuestionIndex): Point {
  return progress[q] ?? 0
}

// Utilidades opcionales
export function clearProgress(competence: string, level: Level) {
  if (!isBrowser) return
  localStorage.removeItem(storageKey(competence, level))
}

export function setProgress(competence: string, level: Level, prog: Progress) {
  if (!isBrowser) return
  localStorage.setItem(storageKey(competence, level), JSON.stringify(prog))
}
