// lib/firstExerciseRoute.ts
import { useAuth } from "@/contexts/AuthContext"
import { useTeacherOverrides } from "@/hooks/useTeacherOverrides"

export type LevelSlug = "basico" | "intermedio" | "avanzado"

/**
 * Devuelve la URL del primer ejercicio para una competencia y nivel.
 * Para docentes, si hay override de nivel se respeta.
 */
export function firstExerciseRoute(competenceId: string, level: LevelSlug): string {
  // Mapa explícito de rutas iniciales por competencia/nivel
  const map: Record<string, Partial<Record<LevelSlug, string>>> = {
    // --------------------------
    // Área 1: Búsqueda de información
    // --------------------------
    "1.1": {
      basico: "/test/1.1?level=basico",
      intermedio: "/exercises/comp-1-1/intermedio/ej1",
      avanzado: "/exercises/comp-1-1/avanzado/ej1",
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
    // Área 4: Seguridad
    // --------------------------
    "4.1": {
      basico: "/test/4.1?level=basico",
      intermedio: "/exercises/comp-4-1/intermedio/ej1",
      avanzado: "/exercises/comp-4-1/avanzado/ej1",
    },
    "4.2": {
      basico: "/test/4.2?level=basico",
      intermedio: "/exercises/comp-4-2/intermedio/ej1",
      avanzado: "/exercises/comp-4-2/avanzado/ej1",
    },
    "4.3": {
      basico: "/test/4.3?level=basico",
      intermedio: "/exercises/comp-4-3/intermedio/ej1",
      avanzado: "/exercises/comp-4-3/avanzado/ej1",
    },
    "4.4": {
      basico: "/test/4.4?level=basico",
      intermedio: "/exercises/comp-4-4/intermedio/ej1",
      avanzado: "/exercises/comp-4-4/avanzado/ej1",
    },
  }

  const byLevel = map[competenceId]
  if (byLevel?.[level]) {
    return byLevel[level]!
  }

  // Fallback: usa la ruta “/test/{competencia}?level={nivel}”
  const lv = level === "basico" ? "basico" : level
  return `/test/${competenceId}?level=${encodeURIComponent(lv)}`
}

/**
 * Hook auxiliar: obtiene la ruta correcta considerando overrides de docente
 */
export function useFirstExerciseRoute(competenceId: string, fallbackLevel: LevelSlug) {
  const { user } = useAuth()
  const { teacherLevel } = useTeacherOverrides()

  // Si es docente, usar override de nivel
  const levelToUse: LevelSlug =
    user?.role === "teacher" ? teacherLevel : fallbackLevel

  return firstExerciseRoute(competenceId, levelToUse)
}
