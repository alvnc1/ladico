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
  const obj =
    parsed && typeof parsed === "object" ? (parsed as any) : {}
  const p1 = (obj["1"] ?? obj[1] ?? 0) as Point
  const p2 = (obj["2"] ?? obj[2] ?? 0) as Point
  const p3 = (obj["3"] ?? obj[3] ?? 0) as Point
  return {
    1: p1 === 1 ? 1 : 0,
    2: p2 === 1 ? 1 : 0,
    3: p3 === 1 ? 1 : 0,
  }
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

// 🧹 Limpia el progreso local del nivel
export function clearProgress(competence: string, level: Level) {
  if (!isBrowser) return
  localStorage.removeItem(storageKey(competence, level))
}

// 🧩 Reemplaza el progreso completo (por ejemplo, restaurar datos)
export function setProgress(competence: string, level: Level, prog: Progress) {
  if (!isBrowser) return
  localStorage.setItem(storageKey(competence, level), JSON.stringify(prog))
}

/**
 * ✅ Marca un nivel como completado (ya sea aprobado o reprobado)
 * y notifica al dashboard para actualizar los anillos visuales.
 * 
 * - Guarda la bandera ladico:completed:<competence>:<level> = "1"
 * - Actualiza la versión del progreso
 * - Lanza un evento ladico:refresh para refrescar el dashboard
 */
export function markLevelCompleted(competence: string, level: Level) {
  if (!isBrowser) return
  try {
    // Normalizar los niveles a formato interno sin tilde
    const slug =
      level === "básico"
        ? "basico"
        : level === "intermedio"
        ? "intermedio"
        : "avanzado"

    // Guardar estado de completado (aprobado o reprobado)
    const key = `ladico:completed:${competence}:${slug}`
    localStorage.setItem(key, "1")

    // Actualizar timestamp global de progreso
    localStorage.setItem("ladico:progress:version", String(Date.now()))

    // Emitir evento para refrescar dashboard y anillos
    window.dispatchEvent(new Event("ladico:refresh"))
  } catch (e) {
    console.warn("⚠️ No se pudo marcar el nivel como completado:", e)
  }
}
