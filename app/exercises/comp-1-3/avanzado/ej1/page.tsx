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
import { compareNumbers } from '@/utils/answer-validators'
import { skillsInfo } from "@/components/data/digcompSkills";

// ==== Constantes compartidas ====
const COMPETENCE = "1.3" as const
const LEVEL_LOCAL = "avanzado";   // para levelProgress
const LEVEL_FS = "Avanzado";      // para Firestore
const TOTAL_QUESTIONS = 3;
const SESSION_PREFIX = "session:1.3:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

const Q_ZERO_BASED = 0;  // P3 (0-based) para Firestore
const Q_ONE_BASED  = 1;  // P3 (1-based) para levelProgress

// Flags locales para q1/q2/q3
const setLocalStep = (step: 1 | 2 | 3, passed: boolean) =>
  typeof window !== "undefined" && localStorage.setItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q${step}`, passed ? "1" : "0")

export default function Ej1Comp13Avanzado() {
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

  // 1) Recuperar sid cacheado
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar sid si falta
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
        console.error("No se pudo asegurar la sesión (Avanzado-1):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ========== UI del paso 1 ==========
  const [datasetUrl1, setDatasetUrl1] = useState<string | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/datasets/comp-1-3/advanced/ej1/latest', { cache: 'no-store' })
        const json = await res.json()
        if (json?.url) setDatasetUrl1(json.url)
      } catch { /*no-op*/ }
    })()
  }, [])
  const downloadUrl1 = datasetUrl1 ?? '/api/datasets/comp-1-3/advanced/ej1/default'

  // Respuestas
  const [mediaH, setMediaH] = useState('')
  const [medianaM, setMedianaM] = useState('')
  const [modaH, setModaH] = useState('')
  const [desvM, setDesvM] = useState('')

  const EXPECTED = { mediaH: 170, medianaM: 159, modaH: 172, desvM: 3.81 }
  const vMediaH = mediaH ? compareNumbers(mediaH, EXPECTED.mediaH).ok : null
  const vMedianaM = medianaM ? compareNumbers(medianaM, EXPECTED.medianaM).ok : null
  const vModaH = modaH ? compareNumbers(modaH, EXPECTED.modaH).ok : null
  const vDesvM = desvM ? compareNumbers(desvM, EXPECTED.desvM, 0.01).ok : null
  const totalOk1 = [vMediaH, vMedianaM, vModaH, vDesvM].filter((v) => v === true).length

  // Aprobación paso 1
  const MIN_OK_STEP1 = 2
  const q1Passed = isTeacher ? true : totalOk1 >= MIN_OK_STEP1

  const persistStep = async () => {
    const point: 0 | 1 = q1Passed ? 1 : 0
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point)
    setLocalStep(1, !!point)
    try {
      if (sessionId) await markAnswered(sessionId, 0, point === 1)
    } catch (e) {
      console.warn("No se pudo marcar P1:", e)
    }
  }

  const next = async () => {
    // validar “completitud” para alumno
    const answered = [mediaH, medianaM, modaH, desvM].every((x) => x !== '')
    if (!isTeacher && !answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de continuar.' })
      return
    }
    await persistStep()
    router.push("/exercises/comp-1-3/avanzado/ej2")
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Estadístico en Excel</h2>
              <div className="bg-gray-50 p-5 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base"> Descarga el archivo Excel con datos de alturas de hombres y mujeres por países de LATAM. 
                  Realiza los análisis estadísticos solicitados y completa las casillas con los resultados en centímetros. </p>
              </div>
              <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Download className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Dataset para Análisis</h4>
                      <p className="text-sm text-gray-600">
                        {!datasetUrl1 ? 'Archivo por defecto' : 'Último archivo subido por admin'}
                      </p>
                    </div>
                  </div>
                  <a href={downloadUrl1} target="_blank" rel="noreferrer">
                    <Button className="bg-[#286675] hover:bg-[#3a7d89] text-white rounded-xl">
                      <FileSpreadsheet className="w-5 h-5 mr-2" /> Descargar Excel
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Resultados Estadísticos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExcelField label="Media - Hombres"  value={mediaH} onChange={setMediaH} unit="cm" note='entero' />
                <ExcelField label="Mediana - Mujeres" value={medianaM} onChange={setMedianaM} unit="cm" note='entero' />
                <ExcelField label="Moda - Hombres" value={modaH} onChange={setModaH} unit="cm" />
                <ExcelField label="Desviación Estándar - Mujeres" value={desvM} onChange={setDesvM} unit="cm" note="2 decimales" />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={next} className="px-8 bg-[#286675] hover:bg-[#3a7d89] text-white rounded-xl">
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExcelField({
  label, placeholder, value, onChange, unit, note,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  unit?: string
  note?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {label}
          {unit && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">({unit})</span>}
        </label>
        {note && <span className="text-xs text-gray-500 italic">{note}</span>}
      </div>
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
