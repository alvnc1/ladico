"use client"

import { useEffect, useMemo, useState } from "react"

export type LevelSlug = "basico" | "intermedio" | "avanzado"

const LS_KEYS = {
  level: "teacher:level",
  country: "teacher:country",
} as const

export function useTeacherOverrides() {
  const [teacherLevel, setTeacherLevel] = useState<LevelSlug>("basico")
  const [teacherCountry, setTeacherCountry] = useState<string | null>(null)

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const lv = (localStorage.getItem(LS_KEYS.level) as LevelSlug | null) ?? "basico"
      const cc = localStorage.getItem(LS_KEYS.country)

      if (lv === "basico" || lv === "intermedio" || lv === "avanzado") {
        setTeacherLevel(lv)
      }
      setTeacherCountry(cc && cc.length > 0 ? cc : null)
    } catch {
      // noop
    }
  }, [])

  // Persistir nivel
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.level, teacherLevel)
    } catch {
      // noop
    }
  }, [teacherLevel])

  // Persistir país
  useEffect(() => {
    try {
      if (teacherCountry && teacherCountry.length > 0) {
        localStorage.setItem(LS_KEYS.country, teacherCountry)
      } else {
        localStorage.removeItem(LS_KEYS.country)
      }
    } catch {
      // noop
    }
  }, [teacherCountry])

  // Sincronizar entre pestañas/ventanas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEYS.level && e.newValue) {
        const lv = e.newValue as LevelSlug
        if (lv === "basico" || lv === "intermedio" || lv === "avanzado") {
          setTeacherLevel(lv)
        }
      }
      if (e.key === LS_KEYS.country) {
        setTeacherCountry(e.newValue && e.newValue.length > 0 ? e.newValue : null)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  /** País efectivo: usa override si existe; si no, el del perfil. */
  const effectiveCountry = (profileCountry: string | null | undefined): string | null =>
    teacherCountry ?? (profileCountry ?? null)

  /** Nivel efectivo: usa override si existe; si no, el de la UI/URL que le pases. */
  const effectiveLevel = (fallbackLevel: LevelSlug): LevelSlug =>
    teacherLevel ?? fallbackLevel

  /** ¿Hay algún override activo? (útil para UI) */
  const isOverrideActive = useMemo(
    () => teacherCountry !== null || teacherLevel !== "basico",
    [teacherCountry, teacherLevel]
  )

  /** Limpia todos los overrides del profesor. */
  const clearOverrides = () => {
    try {
      localStorage.removeItem(LS_KEYS.level)
      localStorage.removeItem(LS_KEYS.country)
    } catch {
      // noop
    }
    setTeacherLevel("basico")
    setTeacherCountry(null)
  }

  return {
    // estado
    teacherLevel,
    setTeacherLevel,
    teacherCountry,
    setTeacherCountry,

    // helpers
    effectiveCountry,
    effectiveLevel,
    isOverrideActive,
    clearOverrides,
  }
}
