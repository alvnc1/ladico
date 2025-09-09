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
  writeBatch,
  type Firestore,
} from "firebase/firestore"

export type LevelName = "Básico" | "Intermedio" | "Avanzado"
export type LevelSlug = "basico" | "intermedio" | "avanzado"
export type SessionMode = "standard" | "teacher_preview"
export type ActorRole = "student" | "teacher"

type NewSessionInput = {
  userId: string
  competence: string
  level: LevelName
  totalQuestions?: number
}

type EnsureOpts = {
  actorRole?: ActorRole
  country?: string | null
  resetIfTeacher?: boolean
}

type TestSessionDoc = {
  userId: string
  competence: string
  level: LevelName
  answers: Array<number | null>
  total: number
  startTime: string
  endTime: string | null
  score: number
  passed: boolean
  actorRole?: ActorRole
  sessionMode?: SessionMode
  countryUsed?: string | null
  updatedAt?: string
  seenQuestionIds?: string[]
}

/** 🔔 Notifica al dashboard (solo en cliente) */
function pingUI() {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("ladico:progress:version", String(Date.now()))
    window.dispatchEvent(new Event("ladico:refresh"))
  } catch {}
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
    where("sessionMode", "in", ["standard", null]),
    limit(1)
  )
  const snap = await getDocs(qy)
  return snap.empty ? null : snap.docs[0]!.id
}

/* ===== helpers de rol y nivel ===== */

/** Lee el rol desde users/<uid> si no se pasó actorRole */
async function resolveActorRole(db: Firestore, userId: string, hint?: ActorRole): Promise<ActorRole> {
  if (hint === "teacher" || hint === "student") return hint
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)
    const role = (userSnap.exists() ? (userSnap.data() as any)?.role : null) as string | null
    return role === "profesor" ? "teacher" : "student"
  } catch {
    return "student"
  }
}

function nextLevelOf(level: LevelName): LevelName | null {
  if (level === "Básico") return "Intermedio"
  if (level === "Intermedio") return "Avanzado"
  return null
}

/** 🔹 Crear (o reutilizar) sesión */
export async function ensureSession(
  { userId, competence, level, totalQuestions = 3 }: NewSessionInput,
  opts?: EnsureOpts
): Promise<{ id: string }> {
  const db = getDb()
  const actorRole: ActorRole = await resolveActorRole(db, userId, opts?.actorRole)
  const country = opts?.country ?? null

  // 👉 Modo docente (auto si users/<uid>.role == "profesor")
  if (actorRole === "teacher") {
    const sessionId = getTeacherSessionId(userId, competence, level, country)
    const ref = doc(db, "testSessions", sessionId)
    const snap = await getDoc(ref)

    const now = new Date().toISOString()
    const answers = Array.from({ length: totalQuestions }, () => null)

    const payload: Partial<TestSessionDoc> = {
      userId,
      competence,
      level,
      answers,
      total: totalQuestions,
      score: 0,
      passed: false,
      startTime: snap.exists() ? (snap.data() as TestSessionDoc).startTime : now,
      endTime: null,
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
    seenQuestionIds: [],
  } satisfies TestSessionDoc)

  return { id: ref.id }
}

/** 🔹 Marcar una pregunta respondida */
export async function markAnswered(sessionId: string, index: number, correct?: boolean): Promise<void> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data = snap.data() as Partial<TestSessionDoc> | undefined
  const total = (data?.total ?? 3) as number

  const prev = Array.isArray(data?.answers)
    ? [...(data!.answers as Array<number | null>)]
    : Array.from({ length: total }, () => null)
  if (prev.length < total) {
    prev.length = total
    for (let i = 0; i < total; i++) if (typeof prev[i] === "undefined") prev[i] = null
  }

  if (index < 0 || index >= total) return

  prev[index] = typeof correct === "boolean" ? (correct ? 1 : 0) : 1

  await updateDoc(ref, {
    answers: prev,
    updatedAt: new Date().toISOString(),
  })

  // 🔔 Ping “liviano” para ver progreso en vivo (opcional)
  pingUI()
}

/** 🔹 Finalizar la sesión: calcula score, passed */
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
    // 👇 Docente: mantener endTime=null pero actualizar score/passed
    await updateDoc(ref, {
      score,
      passed,
      endTime: null,
      updatedAt: now,
    })

    // ✅ FORZAR AVANCE AUTOMÁTICO si aprobó o respondió todo
    if (passed || opts.correctCount >= opts.total) {
      const nxt = nextLevelOf(data.level)
      if (nxt) {
        await ensureSession(
          {
            userId: data.userId,
            competence: data.competence,
            level: nxt,
            totalQuestions: opts.total,
          },
          {
            actorRole: "teacher",
            country: data.countryUsed ?? null,
          }
        )
        if (typeof window !== "undefined") {
          const comp = data.competence
          const slug = toSlug(nxt)
          localStorage.setItem(`ladico:teacher:autoNext:${comp}`, slug)
        }
      }
    }

    // 🔔 Notificar dashboard (clave tras el reset)
    pingUI()
    return
  }

  // 👇 Alumno: cerrar sesión normalmente
  await updateDoc(ref, {
    score,
    passed,
    endTime: now,
    updatedAt: now,
  })
  // 🔔 Notificar dashboard
  pingUI()
}

/** (Opcional) Utilidad para leer una sesión por id (debug) */
export async function getSession(sessionId: string): Promise<TestSessionDoc | null> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as TestSessionDoc) : null
}

/** 🔹 Historial de preguntas vistas */
export async function getSeenQuestions(sessionId: string): Promise<string[]> {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return []
  const data = snap.data() as Partial<TestSessionDoc>
  return Array.isArray(data.seenQuestionIds) ? (data.seenQuestionIds as string[]) : []
}

/** 🔹 Agrega ids al historial (merge único) */
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

/** 🔹 Reemplaza completamente el historial */
export async function setSeenQuestions(sessionId: string, questionIds: string[]) {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  await updateDoc(ref, {
    seenQuestionIds: Array.from(new Set(questionIds || [])),
    updatedAt: new Date().toISOString(),
  })
}

/** 🔹 Limpia el historial */
export async function clearSeenQuestions(sessionId: string) {
  const db = getDb()
  const ref = doc(db, "testSessions", sessionId)
  await updateDoc(ref, {
    seenQuestionIds: [],
    updatedAt: new Date().toISOString(),
  })
}

/* ========== Reset de "preguntas vistas" del profesor (todas las sesiones determinísticas por país) ========== */
export async function clearTeacherSeenQuestionsAllCountries(
  userId: string,
  competence: string,
  level: LevelName
): Promise<void> {
  const db = getDb()
  if (!db || !userId || !competence) return

  const candidates: Array<LevelName | string> = [level, toSlug(level)]

  for (const lvl of candidates) {
    try {
      const qy = query(
        collection(db, "testSessions"),
        where("userId", "==", userId),
        where("competence", "==", competence),
        where("level", "==", lvl as any),
        where("sessionMode", "==", "teacher_preview")
      )
      const snap = await getDocs(qy)
      if (snap.empty) continue

      const updates = snap.docs.map(async (d) => {
        try {
          await updateDoc(doc(db, "testSessions", d.id), {
            seenQuestionIds: [],
            seen: [],
            seenIds: [],
            teacherSeen: [],
            seenByCountry: {},
            teacherSeenByCountry: {},
            lastSeenResetAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any)
        } catch (e) {
          console.warn("No se pudo limpiar historial en testSession", d.id, e)
        }
      })
      await Promise.all(updates)
    } catch (e) {
      console.warn("clearTeacherSeenQuestionsAllCountries(): error al consultar/actualizar:", e)
    }
  }
}

/* ========== RESET DURO ========== */

/** Borra en lotes (<=500 por batch) todos los docs que cumplan un query. */
async function deleteByQuery(qy: ReturnType<typeof query>) {
  const db = getDb()
  const snap = await getDocs(qy)
  if (snap.empty) return
  let batch = writeBatch(db)
  let count = 0
  for (const d of snap.docs) {
    batch.delete(d.ref)
    count++
    if (count % 450 === 0) {
      await batch.commit()
      batch = writeBatch(db)
    }
  }
  await batch.commit()
}

/** 🔥 Reset duro: elimina testSessions y userResults del profesor para una competencia. */
export async function hardResetCompetenceSessions(userId: string, competenceId: string) {
  const db = getDb()

  // 1) testSessions
  const q1 = query(
    collection(db, "testSessions"),
    where("userId", "==", userId),
    where("competence", "==", competenceId)
  )
  await deleteByQuery(q1)

  // 2) userResults
  const q2 = query(
    collection(db, "userResults"),
    where("userId", "==", userId),
    where("competence", "==", competenceId)
  )
  await deleteByQuery(q2)

  // (Opcional) evaluationStates
  // const q3 = query(
  //   collection(db, "evaluationStates"),
  //   where("userId", "==", userId),
  //   where("competence", "==", competenceId)
  // )
  // await deleteByQuery(q3)

  // 🔔 Tras reset duro, emite ping por si se llama fuera de la tarjeta
  pingUI()
}
