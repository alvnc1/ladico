"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"
import { compareNumbers, compareText } from '@/utils/answer-validators'
import { skillsInfo } from '@/components/data/digcompSkills'

// ==== Constantes compartidas ====
const COMPETENCE = "1.3" as const
const LEVEL_LOCAL = "avanzado";   // para levelProgress
const LEVEL_FS = "Avanzado";      // para Firestore
const TOTAL_QUESTIONS = 3;
const SESSION_PREFIX = "session:1.3:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

const Q_ZERO_BASED = 2;  // P3 (0-based) para Firestore
const Q_ONE_BASED  = 3;  // P3 (1-based) para levelProgress


// Flags locales q1/q2/q3
const getLocalStep = (step: 1 | 2 | 3): boolean =>
  typeof window !== "undefined" ? localStorage.getItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q${step}`) === "1" : false
const setLocalStep = (step: 1 | 2 | 3, passed: boolean) =>
  typeof window !== "undefined" && localStorage.setItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q${step}`, passed ? "1" : "0")

export default function Ej3Comp13Avanzado() {
  const [currentIndex] = useState(Q_ZERO_BASED);
  const progress = useMemo(
    () => ((currentIndex + 1) / TOTAL_QUESTIONS) * 100,
    [currentIndex]
  );
  const { toast } = useToast()
  const router = useRouter()
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor"

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  useEffect(() => {
    if (!user) { setSessionId(null); return }
    const LS_KEY = sessionKeyFor(user.uid)
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
    if (cached) { if (!sessionId) setSessionId(cached); return }
    if (ensuringRef.current) return
    ensuringRef.current = true
    ;(async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Avanzado",
          totalQuestions: 3,
        })
        setSessionId(id)
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
      } catch (e) {
        console.error("No se pudo asegurar la sesión (Avanzado-3):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ========== UI del paso 3 ==========
  const downloadUrl3 = '/api/datasets/comp-1-3/advanced/ej3/default'

  const [g1, setG1] = useState('') // país
  const [g2, setG2] = useState('') // robusta Colombia
  const [g3, setG3] = useState('') // diferencia Honduras
  const EXPECTED3 = { paisMayor: 'Venezuela', robustaColombia: 279.725, diferenciaHonduras: 243.613 }

  const vg1 = g1 ? compareText(g1, EXPECTED3.paisMayor).ok : null
  const vg2 = g2 ? compareNumbers(g2, EXPECTED3.robustaColombia).ok : null
  const vg3 = g3 ? compareNumbers(g3, EXPECTED3.diferenciaHonduras).ok : null
  const totalOk3 = [vg1, vg2, vg3].filter((v) => v === true).length

  const MIN_OK_STEP3 = 3
  const q3Passed = isTeacher ? true : totalOk3 >= MIN_OK_STEP3

  const persistStep = async () => {
    const point: 0 | 1 = q3Passed ? 1 : 0
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point)
    setLocalStep(3, !!point)
    try {
      if (sessionId) await markAnswered(sessionId, Q_ZERO_BASED, point === 1)
    } catch (e) {
      console.warn("No se pudo marcar P3:", e)
    }
  }

  const finish = async () => {
    const answered = [g1, g2, g3].every((x) => x !== '')
    if (!isTeacher && !answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de finalizar.' })
      return
    }

    await persistStep()

    // Leer q1/q2 locales (marcados en ej1/ej2)
    const finalQ1 = isTeacher ? true : getLocalStep(1)
    const finalQ2 = isTeacher ? true : getLocalStep(2)
    const finalQ3 = q3Passed

    const correctas = (finalQ1 ? 1 : 0) + (finalQ2 ? 1 : 0) + (finalQ3 ? 1 : 0)
    const total = 3
    const score = Math.round((correctas / total) * 100)
    const passed = correctas >= 2

    const sid = sessionId ?? ""
    const qs = new URLSearchParams({
      score: String(score),
      correct: String(correctas),
      total: String(total),
      passed: String(passed),
      // para ResultsUniversalContent:
      competence: '1.3',
      level: 'avanzado',
      q1: finalQ1 ? "1" : "0",
      q2: finalQ2 ? "1" : "0",
      q3: finalQ3 ? "1" : "0",
      sid,
      passMin: "2",
      compPath: "comp-1-3",
      retryBase: "/exercises/comp-1-3/avanzado",
      ex1Label: "Ejercicio 1: Análisis Estadístico en Excel",
      ex2Label: "Ejercicio 2: Tabla Dinámica en Excel",
      ex3Label: "Ejercicio 3: Gráfico Dinámico en Excel",
    })

    // Limpieza mínima local del “progress” visible (ResultsUniversal ya limpia key general)
    try {
      localStorage.removeItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q1`)
      localStorage.removeItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q2`)
      localStorage.removeItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q3`)
    } catch {}

    router.push(`/test/results?${qs.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                | {COMPETENCE} {skillsInfo[COMPETENCE].title} - Nivel {LEVEL_FS}
              </span>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-1">
            <div className="flex items-center justify-between text-[#286575] mb-2">
              <span className="text-xs sm:text-sm font-medium bg-white/40 px-2 sm:px-3 py-1 rounded-full">
                Pregunta {currentIndex + 1} de {TOTAL_QUESTIONS}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: TOTAL_QUESTIONS }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                      index <= currentIndex ? "bg-[#286575] shadow-lg" : "bg-[#dde3e8]"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 bg-[#dde3e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#286575] rounded-full transition-all duration-500 ease-in-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl border-0 ring-2 ring-[#286575]/30">
          <CardContent className="p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Gráfico Dinámico en Excel</h2>
                </div>
              </div>
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                  <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                    Genera un gráfico dinámico (por país y tipo de café) y responde las preguntas basándote
                    en el análisis visual de los datos.
                  </p>
                </div>
              </div>
              <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Download className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Dataset para Gráfico Dinámico</h4>
                      <p className="text-sm text-gray-600">Archivo de datos de producción de café por país</p>
                    </div>
                  </div>
                  <a href={downloadUrl3} target="_blank" rel="noreferrer">
                    <Button className="bg-[#286675] hover:bg-[#3a7d89] text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                      <FileSpreadsheet className="w-5 h-5 mr-2" />
                      Descargar Excel
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Análisis del Gráfico Dinámico
              </h3>
              <div className="space-y-4">
                <ExcelField label="País con mayor producción total de café" value={g1} onChange={setG1} />
                <ExcelField label="Producción total de café Robusta en Colombia" value={g2} onChange={setG2} unit="toneladas" />
                <ExcelField label="Diferencia entre Arábica y Robusta en Honduras" value={g3} onChange={setG3} unit="toneladas" />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={finish} className="px-8 bg-[#286675] hover:bg-[#3a7d89] text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExcelField({
  label, placeholder, value, onChange, unit,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  unit?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        {label}
        {unit && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">({unit})</span>}
      </label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(',', '.'))}
        className="border-2 rounded-xl border-gray-300 hover:border-gray-400 focus-visible:ring-[#286575]"
        inputMode={unit ? 'decimal' : 'text'}
      />
    </div>
  )
}
