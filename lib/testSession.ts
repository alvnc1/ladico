// lib/testSession.ts
import { getDb } from "@/lib/safeDb"
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore"

export type LevelName = "Básico" | "Intermedio" | "Avanzado"
export type LevelSlug = "basico" | "intermedio" | "avanzado"
export type SessionMode = "standard" | "teacher_preview"
export type ActorRole = "student" | "teacher"

type NewSessionInput = {
  userId: string          // ej. "uid123"
  competence: string      // ej. "4.3"
  level: LevelName        // ej. "Intermedio"
  totalQuestions?: number // default 3
}

type EnsureOpts = {
  actorRole?: ActorRole
  country?: string | null
  // Si es docente, al asegurar la sesión se reinician respuestas/score por defecto (pero no el historial)
  resetIfTeacher?: boolean
}

type TestSessionDoc = {
  userId: string
  competence: string            // "4.3"
  level: LevelName              // "Básico" | "Intermedio" | "Avanzado"
  answers: Array<number | null> // 1/0/null
  total: number
  startTime: string
  endTime: string | null
  score: number
  passed: boolean
  // Metadatos de modo/rol
  actorRole?: ActorRole
  sessionMode?: SessionMode
  countryUsed?: string | null
  updatedAt?: string
  // Historial de preguntas vistas (solo nos interesa para básico/docente, pero es genérico)
  seenQuestionIds?: string[]
}

/** Normaliza LevelName → LevelSlug */
function toSlug(level: LevelName): LevelSlug {
  return level === "Básico" ? "basico" : (level.toLowerCase() as LevelSlug)
}

/** 🔹 ID determinístico para modo docente (evita duplicados y separa por país) */
export function getTeacherSessionId(userId: string, competence: string, level: LevelName, country?: string | null) {
  const lv = toSlug(level)
  const cc = (country || "global").replace(/\s+/g, "_").toLowerCase()
  return ["teacher", userId, competence.replace(".", "_"), lv, cc].join(":")
}

/** 🔹 Busca una sesión activa (endTime === null) para el mismo user/competencia/nivel (alumno) */
async function findActiveSessionId(
  db: Firestore,
  userId: string,
  competence: string,
  level: LevelName
): Promise<string | null> {
  const col = collection(db, "testSessions")
  const qy = query(
    col,
    where("userId", "==", userId),
    where("competence", "==", competence),
    where("level", "==", level),
    where("endTime", "==", null),
    where("sessionMode", "in", ["standard", null]), // evita confundir con docente
    limit(1)
  )
  const snap = await getDocs(qy)
  return snap.empty ? null : snap.docs[0]!.id
}

/** 🔹 Crear (o reutilizar) sesión
 *  - Alumno: reusa activa (endTime === null) o crea nueva.
 *  - Docente: usa SIEMPRE un ID determinístico y REINICIA respuestas/score, pero **NO** borra seenQuestionIds.
 */
export async function ensureSession(
  { userId, competence, level, totalQuestions = 3 }: NewSessionInput,
  opts?: EnsureOpts
): Promise<{ id: string }> {
  const db = getDb()
  const actorRole: ActorRole = opts?.actorRole ?? "student"
  const country = opts?.country ?? null

  // 👉 Modo docente
  if (actorRole === "teacher") {
    const sessionId = getTeacherSessionId(userId, competence, level, country)
    const ref = doc(db, "testSessions", sessionId)
    const snap = await getDoc(ref)

    const now = new Date().toISOString()
    const answers = Array.from({ length: totalQuestions }, () => null)

    // Construye payload sin tocar seenQuestionIds (se conserva si ya existe).
    // Si NO existe, inicializamos seenQuestionIds: [].
    const payload: Partial<TestSessionDoc> = {
      userId,
      competence,
      level,
      answers,
      total: totalQuestions,
      score: 0,
      passed: false,
      startTime: snap.exists() ? (snap.data() as TestSessionDoc).startTime : now, // conserva primer start
      endTime: null, // 👈 se mantiene activa para reintentos
      actorRole: "teacher",
      sessionMode: "teacher_preview",
      countryUsed: country,
      updatedAt: now,
      ...(snap.exists() ? {} : { seenQuestionIds: [] }),
    }

    await setDoc(ref, payload as TestSessionDoc, { merge: true })
    return { id: sessionId }
  }

  // 👉 Flujo alumno (standard)
  const existing = await findActiveSessionId(db, userId, competence, level)
  if (existing) return { id: existing }

  const col = collection(db, "testSessions")
  const answers = Array.from({ length: totalQuestions }, () => null)
  const ref = await addDoc(col, {
    userId,
    competence,
    level,
    answers,
    total: totalQuestions,
    startTime: new Date().toISOString(),
    endTime: null,
    score: 0,
    passed: false,
    actorRole: "student",
    sessionMode: "standard",
    countryUsed: country ?? null,
    updatedAt: new Date().toISOString(),
    seenQuestionIds: [], // inicializa vacío
  } satisfies TestSessionDoc)

  return { id: ref.id }
}

/** 🔹 Marcar una pregunta respondida (index 0-based). Guarda 1/0 si se pasa `correct`. */
export async function markAnswered(sessionId: string, index: number, correct?: boolean): Promise<void> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data() as Partial<TestSessionDoc> | undefined
  const total = (data?.total ?? 3) as number

  // Asegura array y longitud >= total
  const prev = Array.isArray(data?.answers)
    ? [...(data!.answers as Array<number | null>)]
    : Array.from({ length: total }, () => null)
  if (prev.length < total) {
    prev.length = total
    for (let i = 0; i < total; i++) if (typeof prev[i] === "undefined") prev[i] = null
  }

  // Ignora índices fuera de rango
  if (index < 0 || index >= total) return

  prev[index] = typeof correct === "boolean" ? (correct ? 1 : 0) : 1

  await updateDoc(ref, {
    answers: prev,
    updatedAt: new Date().toISOString(),
  })
}

/** 🔹 Finalizar la sesión: calcula score, passed
 *  - Docente (teacher_preview): NO cierra la sesión (endTime sigue null)
 *  - Alumno: cierra la sesión (endTime timestamp)
 */
export async function finalizeSession(
  sessionId: string,
  opts: { correctCount: number; total: number; passMin: number }
): Promise<void> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data() as TestSessionDoc
  const score = Math.round((opts.correctCount / opts.total) * 100)
  const passed = opts.correctCount >= opts.passMin
  const now = new Date().toISOString()

  if (data.sessionMode === "teacher_preview") {
    // 👇 Modo docente: sobreescribe score/passed pero mantiene la sesión activa
    await updateDoc(ref, {
      score,
      passed,
      endTime: null,
      updatedAt: now,
    })
    return
  }

  // 👇 Flujo alumno: cerrar sesión normalmente
  await updateDoc(ref, {
    score,
    passed,
    endTime: now,
    updatedAt: now,
  })
}

/** (Opcional) Utilidad para leer una sesión por id (debug) */
export async function getSession(sessionId: string): Promise<TestSessionDoc | null> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TestSessionDoc) : null
}

/** 🔹 Historial de preguntas vistas (genérico, lo usamos sobre todo para docente+básico) */
export async function getSeenQuestions(sessionId: string): Promise<string[]> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  const data = snap.data() as Partial<TestSessionDoc>
  return Array.isArray(data.seenQuestionIds) ? (data.seenQuestionIds as string[]) : []
}

/** 🔹 Agrega nuevas ids al historial (merge único, sin duplicar) */
export async function appendSeenQuestions(sessionId: string, questionIds: string[]) {
  if (!questionIds || questionIds.length === 0) return
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const prev = ((snap.data() as any).seenQuestionIds || []) as string[]
  const set = new Set(prev)
  for (const id of questionIds) set.add(id)
  const next = Array.from(set)

  await updateDoc(ref, {
    seenQuestionIds: next,
    updatedAt: new Date().toISOString(),
  })
}

/** 🔹 Reemplaza completamente el historial (por si cambias de país o quieres resetear) */
export async function setSeenQuestions(sessionId: string, questionIds: string[]) {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  await updateDoc(ref, {
    seenQuestionIds: Array.from(new Set(questionIds || [])),
    updatedAt: new Date().toISOString(),
  })
}

/** 🔹 Limpia el historial (usar si necesitas un reset explícito del docente) */
export async function clearSeenQuestions(sessionId: string) {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  await updateDoc(ref, {
    seenQuestionIds: [],
    updatedAt: new Date().toISOString(),
  })
}
