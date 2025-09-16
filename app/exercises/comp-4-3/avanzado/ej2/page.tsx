// app/exercises/comp-4-3/avanzado/ej2/page.tsx
"use client"

import Link from "next/link"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { setPoint } from "@/lib/levelProgress"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"

type GroupId = "adultos" | "migrantes" | "visual"
type Objective = "comunicacion" | "empleo" | "acceso_info"

const GROUPS: GroupId[] = ["adultos", "migrantes", "visual"]

const TECH_OPTIONS: Record<GroupId, { id: string; label: string }[]> = {
  adultos: [
    { id: "tablet_senior", label: "Tabletas con interfaz senior-friendly" },
    { id: "videollamadas_asist", label: "Videollamadas con asistencia remota" }, // ✅
    { id: "podcasts_simples", label: "Podcasts educativos con controles simples" },
  ],
  migrantes: [
    { id: "traductor_rt", label: "Traductor multilingüe en tiempo real" },
    { id: "empleo_idiomatico", label: "Plataforma de empleo con soporte idiomático" }, // ✅
    { id: "red_bilingue", label: "Red social comunitaria bilingüe" },
  ],
  visual: [
    { id: "navegador_audiodesc", label: "Navegador con audio-descripción" }, // ✅
    { id: "asistente_voz", label: "Asistente por voz con comandos personalizados" },
    { id: "mapa_tactil", label: "Mapa táctil digital de la comunidad" },
  ],
}

const OBJECTIVES: { id: Objective; label: string }[] = [
  { id: "comunicacion", label: "Mejorar la comunicación cotidiana." },            // ✅ adultos
  { id: "empleo", label: "Facilitar el acceso a oportunidades laborales." },      // ✅ migrantes
  { id: "acceso_info", label: "Reducir barreras de acceso a la información." },   // ✅ visual
]

const ANSWER_KEY: Record<GroupId, { tech: string; objective: Objective }> = {
  adultos:  { tech: "videollamadas_asist", objective: "comunicacion" },
  migrantes:{ tech: "empleo_idiomatico",   objective: "empleo" },
  visual:   { tech: "navegador_audiodesc", objective: "acceso_info" },
}

const COMPETENCE = "4.3"
const LEVEL_LOCAL = "avanzado"        // para setPoint (1-based)
const SESSION_PREFIX = "session:4.3:Avanzado";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;     // para Firestore / ensureSession (title-case)
const QUESTION_NUM_LOCAL = 2          // Pregunta 2 de 3 (1-based para setPoint)
const QUESTION_IDX_SESSION = 1        // índice 0-based para markAnswered

export default function AdvancedEj2Page() {
  const router = useRouter()
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false);

  // 1) Carga sesión cacheada (si existe) apenas conocemos el uid
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const LS_KEY = sessionKeyFor(user.uid);
    const sid = localStorage.getItem(LS_KEY);
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // 2) Crea/asegura sesión UNA VEZ por usuario (evita duplicados)
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      return;
    }

    const LS_KEY = sessionKeyFor(user.uid);
    const cached =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    if (cached) {
      // ya existe para este usuario
      if (!sessionId) setSessionId(cached);
      return;
    }

    // Evita que se dispare doble en StrictMode o por renders repetidos
    if (ensuringRef.current) return;
    ensuringRef.current = true;

    (async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Avanzado",
          totalQuestions: 3,
        });
        setSessionId(id);
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test:", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  const [tech, setTech] = useState<Record<GroupId, string>>({
    adultos: "",
    migrantes: "",
    visual: "",
  })
  const [obj, setObj] = useState<Record<GroupId, Objective | "">>({
    adultos: "",
    migrantes: "",
    visual: "",
  })

  const chosenTechs = useMemo(
    () => new Set(GROUPS.map((g) => tech[g]).filter(Boolean)),
    [tech]
  )

  // 1 punto por grupo si coincide (tecnología ∧ objetivo)
  const correctCount = useMemo(() => {
    let s = 0
    for (const g of GROUPS) {
      const t = tech[g]
      const o = obj[g]
      const key = ANSWER_KEY[g]
      if (t && o && t === key.tech && o === key.objective) s += 1
    }
    return s
  }, [tech, obj])

  const handleNext = async () => {
    const point: 0 | 1 = correctCount >= 2 ? 1 : 0

    // guarda progreso local (para el anillo del dashboard)
    setPoint(COMPETENCE, LEVEL_LOCAL, QUESTION_NUM_LOCAL, point)

    // marca la P2 como respondida en la sesión (para que el dashboard te lleve a la P3)
    const sid = sessionId || localStorage.getItem("session:4.3:Avanzado")
    if (sid) {
      try {
        await markAnswered(sid, QUESTION_IDX_SESSION, point === 1)
      } catch (e) {
        console.error("markAnswered P2 fallo:", e)
      }
    }

    router.push("/exercises/comp-4-3/avanzado/ej3")
  }

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img src="/ladico_green.png" alt="Ladico Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">
                | 4.3 Protección de la salud y el bienestar - Nivel Avanzado
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta 2 de 3
          </span>
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#286575]" />
            <div className="w-3 h-3 rounded-full bg-[#dde3e8]" />
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2.5 overflow-hidden">
          <div className="h-full bg-[#286575] rounded-full transition-all duration-500" style={{ width: `${(2 / 3) * 100}%` }} />
        </div>
      </div>

      {/* Tarjeta Ladico: Enunciado + Tablero + Acción */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/20 w-full max-w-[840px] mx-auto">
          <CardContent className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Enunciado */}
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Tecnologías para la inclusión social
              </h2>
              <div className="bg-gray-50 p-4 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700">
                  Selecciona la tecnología más adecuada para cada grupo de la comunidad y
                  vincúlala con el objetivo principal que mejor responda a sus necesidades de inclusión digital.
                </p>
              </div>
            </div>
            {/* Tablero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GroupCard
                title="Adultos Mayores"
                techOptions={TECH_OPTIONS.adultos}
                techValue={tech.adultos}
                onTechChange={(v) => setTech((s) => ({ ...s, adultos: v }))}
                objectiveValue={obj.adultos}
                onObjectiveChange={(v) => setObj((s) => ({ ...s, adultos: v as Objective }))}
                chosenTechs={chosenTechs}
              />
              <GroupCard
                title="Migrantes"
                techOptions={TECH_OPTIONS.migrantes}
                techValue={tech.migrantes}
                onTechChange={(v) => setTech((s) => ({ ...s, migrantes: v }))}
                objectiveValue={obj.migrantes}
                onObjectiveChange={(v) => setObj((s) => ({ ...s, migrantes: v as Objective }))}
                chosenTechs={chosenTechs}
              />
              <GroupCard
                title="Personas con Discapacidad Visual"
                techOptions={TECH_OPTIONS.visual}
                techValue={tech.visual}
                onTechChange={(v) => setTech((s) => ({ ...s, visual: v }))}
                objectiveValue={obj.visual}
                onObjectiveChange={(v) => setObj((s) => ({ ...s, visual: v as Objective }))}
                chosenTechs={chosenTechs}
              />
            </div>

            {/* Acción */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleNext}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GroupCard(props: {
  title: string
  techOptions: { id: string; label: string }[]
  techValue: string | ""
  onTechChange: (v: string) => void
  objectiveValue: Objective | ""
  onObjectiveChange: (v: Objective) => void
  chosenTechs: Set<string>
}) {
  const { title, techOptions, techValue, onTechChange, objectiveValue, onObjectiveChange, chosenTechs } = props

  return (
    <Card className="bg-white rounded-2xl border-2 border-gray-200 hover:border-[#286575] transition-colors shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="text-gray-900 font-semibold">{title}</div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">Tecnología</label>
          <select
            className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
            value={techValue}
            onChange={(e) => onTechChange(e.target.value)}
          >
            <option value="">Selecciona una tecnología…</option>
            {techOptions.map((opt) => {
              const disabled = chosenTechs.has(opt.id) && techValue !== opt.id
              return (
                <option key={opt.id} value={opt.id} disabled={disabled}>
                  {opt.label}
                </option>
              )
            })}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">Objetivo</label>
          <select
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
            value={objectiveValue}
            onChange={(e) => onObjectiveChange(e.target.value as Objective)}
          >
            <option value="">Selecciona un objetivo…</option>
            {OBJECTIVES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  )
}
