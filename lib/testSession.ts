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
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore"

export type LevelName = "Básico" | "Intermedio" | "Avanzado"

type NewSessionInput = {
  userId: string          // ej. "uid123"
  competence: string      // ej. "4.3"
  level: LevelName        // ej. "Intermedio"
  totalQuestions?: number // default 3
}

type TestSessionDoc = {
  userId: string
  competence: string
  level: LevelName
  answers: Array<number | null> // 1/0/null
  total: number
  startTime: string
  endTime: string | null
  score: number
  passed: boolean
}

/** 🔹 Busca una sesión activa (endTime === null) para el mismo user/competencia/nivel */
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
    limit(1)
  )
  const snap = await getDocs(qy)
  return snap.empty ? null : snap.docs[0]!.id
}

/** 🔹 Crear (o reutilizar) sesión activa */
export async function ensureSession({
  userId,
  competence,
  level,
  totalQuestions = 3,
}: NewSessionInput): Promise<{ id: string }> {
  const db = getDb()
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
  const prev = Array.isArray(data?.answers) ? [...data!.answers] : Array.from({ length: total }, () => null)
  if (prev.length < total) {
    prev.length = total
    for (let i = 0; i < total; i++) if (typeof prev[i] === "undefined") prev[i] = null
  }

  // Ignora índices fuera de rango
  if (index < 0 || index >= total) return

  prev[index] = typeof correct === "boolean" ? (correct ? 1 : 0) : 1

  await updateDoc(ref, {
    answers: prev,
    // opcional: timestamp de actualización si quieres auditar
    // updatedAt: new Date().toISOString(),
  })
}

/** 🔹 Finalizar la sesión: calcula score, passed y setea endTime */
export async function finalizeSession(
  sessionId: string,
  opts: { correctCount: number; total: number; passMin: number }
): Promise<void> {
  const db = getDb()
  const score = Math.round((opts.correctCount / opts.total) * 100)
  const passed = opts.correctCount >= opts.passMin
  const ref = doc(db, "testSessions", sessionId)
  await updateDoc(ref, {
    score,
    passed,
    endTime: new Date().toISOString(),
  })
}

/** (Opcional) Utilidad para leer una sesión por id (debug) */
export async function getSession(sessionId: string): Promise<TestSessionDoc | null> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TestSessionDoc) : null
}
