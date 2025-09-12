// lib/firstExerciseRoute.ts
import { useAuth } from "@/contexts/AuthContext"
import { useTeacherOverrides } from "@/hooks/useTeacherOverrides"

export type LevelSlug = "basico" | "intermedio" | "avanzado"

/**
 * Mapa explícito de rutas iniciales por competencia/nivel.
 * Para la demo: SOLO 1.3, 3.4 y 4.3 tienen intermedio/avanzado.
 * El resto de competencias queda SOLO con básico.
 */
const ROUTE_MAP: Record<string, Partial<Record<LevelSlug, string>>> = {
  // --------------------------
  // Área 1: Búsqueda de información
  // --------------------------
  "1.1": {
    basico: "/test/1.1?level=basico",
  },
  "1.2": {
    basico: "/test/1.2?level=basico",
    intermedio: "/exercises/comp-1-2/intermedio/ej1",
    avanzado: "/exercises/comp-1-2/avanzado/ej1",
  },
  "1.3": {
    basico: "/test/1.3?level=basico",
    intermedio: "/exercises/comp-1-3/intermedio/ej1",
    avanzado: "/exercises/comp-1-3/avanzado/ej1",
  },

  // --------------------------
  // Área 3: Creación de contenidos
  // --------------------------
  "3.1": {
    basico: "/test/3.1?level=basico",
  },
  "3.2": {
    basico: "/test/3.2?level=basico",
  },
  "3.3": {
    basico: "/test/3.3?level=basico",
  },
  "3.4": {
    basico: "/test/3.4?level=basico",
    intermedio: "/exercises/comp-3-4/intermedio/ej1",
    avanzado: "/exercises/comp-3-4/avanzado/ej1",
  },

  // --------------------------
  // Área 4: Seguridad
  // --------------------------
  "4.1": {
    basico: "/test/4.1?level=basico",
  },
  "4.2": {
    basico: "/test/4.2?level=basico",
  },
  "4.3": {
    basico: "/test/4.3?level=basico",
    intermedio: "/exercises/comp-4-3/intermedio/ej1",
    avanzado: "/exercises/comp-4-3/avanzado/ej1",
  },
  "4.4": {
    basico: "/test/4.4?level=basico",
  },
}

/**
 * Devuelve la URL del primer ejercicio para una competencia y nivel.
 * Mantiene fallback a /test/{competencia}?level={nivel} si no hay ruta en el mapa.
 */
export function firstExerciseRoute(competenceId: string, level: LevelSlug): string {
  const route = ROUTE_MAP[competenceId]?.[level]
  if (route) return route

  // Fallback: usa la ruta “/test/{competencia}?level={nivel}”
  const lv = level === "basico" ? "basico" : level
  return `/test/${competenceId}?level=${encodeURIComponent(lv)}`
}

/**
 * Helpers para habilitar/ocultar botones según la disponibilidad real de rutas.
 */
export function hasLevelAvailable(competenceId: string, level: LevelSlug): boolean {
  return Boolean(ROUTE_MAP[competenceId]?.[level])
}

export function safeFirstExerciseRoute(competenceId: string, level: LevelSlug): string | null {
  return ROUTE_MAP[competenceId]?.[level] ?? null
}

export function nextLevel(level: LevelSlug): LevelSlug | null {
  if (level === "basico") return "intermedio"
  if (level === "intermedio") return "avanzado"
  return null
}

/**
 * Hook auxiliar: obtiene la ruta correcta considerando overrides de docente.
 * (Si el override apunta a un nivel no implementado, caerá en el fallback /test)
 */
export function useFirstExerciseRoute(competenceId: string, fallbackLevel: LevelSlug) {
  const { user } = useAuth()
  const { teacherLevel } = useTeacherOverrides()

  const levelToUse: LevelSlug =
    user?.role === "teacher" ? teacherLevel : fallbackLevel

  return firstExerciseRoute(competenceId, levelToUse)
}
