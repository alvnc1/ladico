// lib/safeDb.ts
import { db } from "@/lib/firebase"
import type { Firestore } from "firebase/firestore"

/**
 * Obtiene la instancia de Firestore asegurada.
 * Lanza error si db no fue inicializado correctamente en lib/firebase.ts
 */
export function getDb(): Firestore {
  if (!db) {
    throw new Error("❌ Firestore no está inicializado (ver lib/firebase.ts)")
  }
  return db as Firestore
}
