import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import type { Question, TestSession } from "@/types";

export interface ActiveSessionResult {
  session: TestSession;
  wasCreated: boolean;
  fromCache: boolean;
  docId: string;
}

export async function getOrCreateActiveSession(
  userId: string,
  competence: string,
  level: string,
  questions: Question[]
): Promise<ActiveSessionResult> {
  if (!db) throw new Error("Firebase no inicializado");

  // Busca todas las sesiones de este user/competencia/nivel
  const q = query(
    collection(db, "testSessions"),
    where("userId", "==", userId),
    where("competence", "==", competence),
    where("level", "==", level)
  );
  const snap = await getDocs(q);

  const sessions: Array<{ id: string; data: TestSession }> = [];
  snap.forEach((d) => sessions.push({ id: d.id, data: d.data() as TestSession }));

  // Toma la sesión ACTIVA (endTime == null) con más progreso
  const active = sessions
    .filter((s) => !s.data.endTime)
    .sort(
      (a, b) =>
        b.data.answers.filter((a1) => a1 !== null).length -
        a.data.answers.filter((a1) => a1 !== null).length
    )[0];

  if (active) {
    // Si el pool de preguntas cambió de tamaño, normalizamos: respuestas a null y puntero al inicio.
    let answers = active.data.answers || [];
    let currentQuestionIndex = active.data.currentQuestionIndex ?? 0;

    if (answers.length !== questions.length) {
      answers = new Array(questions.length).fill(null);
      currentQuestionIndex = 0;

      try {
        await updateDoc(doc(db, "testSessions", active.id), {
          answers,
          currentQuestionIndex,
          endTime: null, // sigue activa
          score: 0,
          passed: false,
        });
      } catch {
        // si falla, seguimos con estado local igualmente
      }
    } else {
      // Aseguramos que el índice no quede fuera de rango
      if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = Math.max(
          0,
          Math.min(
            questions.length - 1,
            answers.findIndex((a) => a === null) === -1 ? questions.length - 1 : answers.findIndex((a) => a === null)
          )
        );
      }
    }

    const merged: TestSession = {
      ...active.data,
      id: active.id,
      questions,
      answers,
      currentQuestionIndex,
    };

    return { session: merged, wasCreated: false, fromCache: false, docId: active.id };
  }

  // ⚠️ Si no hay activa, ANTES se devolvía la última completada → eso mandaba a resultados.
  //    Ahora SIEMPRE creamos una nueva activa.
  const newSession: TestSession = {
    id: "",
    userId,
    competence,
    level,
    questions,
    answers: new Array(questions.length).fill(null),
    currentQuestionIndex: 0,
    startTime: new Date(),
    score: 0,
    passed: false,
  };

  const ref = await addDoc(collection(db, "testSessions"), newSession);
  const withId = { ...newSession, id: ref.id };
  return { session: withId, wasCreated: true, fromCache: false, docId: ref.id };
}

export async function updateSessionAnswer(
  session: TestSession,
  questionIndex: number,
  answerIndex: number | number[]
) {
  if (!db || !session.id) return;
  const answers = [...session.answers];
  answers[questionIndex] = answerIndex as any;

  await updateDoc(doc(db, "testSessions", session.id), {
    answers,
    currentQuestionIndex: questionIndex,
  });

  const updated: TestSession = { ...session, answers, currentQuestionIndex: questionIndex };
  return updated;
}

export async function completeSession(session: TestSession, correctAnswers: number) {
  if (!db || !session.id) return session;
  const score = Math.round((correctAnswers / session.questions.length) * 100);
  const passed = correctAnswers >= 2;
  const endTime = new Date();

  await updateDoc(doc(db, "testSessions", session.id), { endTime, score, passed });

  const updated: TestSession = { ...session, endTime, score, passed };
  return updated;
}
