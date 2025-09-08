// lib/firstExerciseRoute.ts
export type LevelSlug = "basico" | "intermedio" | "avanzado"

/**
 
Devuelve la URL del primer ejercicio para una competencia y nivel.
Agrega aquí tus competencias a medida que vayas creando niveles estáticos.*/
export function firstExerciseRoute(competenceId: string, level: LevelSlug): string {
  // Mapa explícito de rutas iniciales por competencia/nivel
  const map: Record<string, Partial<Record<LevelSlug, string>>> = {
    // Búsqueda y gestión de información
    "1.3": {
      basico: "/test/1.3?level=básico", // ya existe el básico tipo banco de preguntas
      intermedio: "/exercises/comp-1-3/intermedio/ej1", // ✅ ejercicio estático
      avanzado: "/exercises/comp-1-3/avanzado/ej1",     // ✅ ejercicio estático
    },

    // Seguridad 4.3
    "4.3": {
      basico: "/test/4.3?level=básico",
      intermedio: "/exercises/comp-4-3/intermedio/ej1",
      avanzado: "/exercises/comp-4-3/avanzado/ej1",
    },

    // Ejemplos de cómo seguir agregando:
    // "4.2": { basico: "/test/4.2?level=básico" },
  }

  const byLevel = map[competenceId]
  if (byLevel?.[level]) return byLevel[level]!

  // Fallback: usa la ruta genérica “/test/{competencia}?level={nivel}”
  const lv = level === "basico" ? "básico" : level
  return `/test/${competenceId}?level=${encodeURIComponent(lv)}`
}