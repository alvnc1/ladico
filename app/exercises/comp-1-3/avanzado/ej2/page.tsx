"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Download, FileSpreadsheet, Table } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"
import { compareNumbers, compareText } from '@/utils/answer-validators'
import { skillsInfo } from "@/components/data/digcompSkills";

// ==== Constantes compartidas ====
const COMPETENCE = "1.3" as const
const LEVEL_LOCAL = "avanzado";   // para levelProgress
const LEVEL_FS = "Avanzado";      // para Firestore
const TOTAL_QUESTIONS = 3;
const SESSION_PREFIX = "session:1.3:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

const Q_ZERO_BASED = 1;  // P3 (0-based) para Firestore
const Q_ONE_BASED  = 2;  // P3 (1-based) para levelProgress

// Flags locales
const setLocalStep = (step: 1 | 2 | 3, passed: boolean) =>
  typeof window !== "undefined" && localStorage.setItem(`ladico:${COMPETENCE}:${LEVEL_LOCAL}:q${step}`, passed ? "1" : "0")

export default function Ej2Comp13Avanzado() {
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
        console.error("No se pudo asegurar la sesión (Avanzado-2):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // ========== UI del paso 2 ==========
  const downloadUrl2 = '/api/datasets/comp-1-3/advanced/ej2/default'

  const [c1, setC1] = useState('') // 91
  const [c2, setC2] = useState('') // 350
  const [c3, setC3] = useState('') // La Serena

  const v1 = c1 ? compareNumbers(c1, 91).ok : null
  const v2 = c2 ? compareNumbers(c2, 350).ok : null
  const v3 = c3 ? compareText(c3, 'La Serena').ok : null
  const totalOk2 = [v1, v2, v3].filter((v) => v === true).length

  const MIN_OK_STEP2 = 3
  const q2Passed = isTeacher ? true : totalOk2 >= MIN_OK_STEP2

  const persistStep = async () => {
    const point: 0 | 1 = q2Passed ? 1 : 0
    setPoint(COMPETENCE, LEVEL_LOCAL, Q_ONE_BASED, point)
    setLocalStep(2, !!point)
    try {
      if (sessionId) await markAnswered(sessionId, 1, point === 1)
    } catch (e) {
      console.warn("No se pudo marcar P2:", e)
    }
  }

  const next = async () => {
    const answered = [c1, c2, c3].every((x) => x !== '')
    if (!isTeacher && !answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de continuar.' })
      return
    }
    await persistStep()
    router.push("/exercises/comp-1-3/avanzado/ej3")
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Tabla Dinámica en Excel</h2>
                </div>
              </div>
              <div className="mb-6 sm:mb-8">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                  <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                    Crea una tabla dinámica con: filas = nombre de la tienda; valores = suma de
                    unidades y promedio de precio unitario. Luego responde las preguntas.
                  </p>
                </div>
              </div>
              <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Download className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Dataset para Tabla Dinámica</h4>
                      <p className="text-sm text-gray-600">Archivo de datos de ventas por tienda</p>
                    </div>
                  </div>
                  <a href={downloadUrl2} target="_blank" rel="noreferrer">
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
                <Table className="w-5 h-5 text-blue-600" />
                Resultados de Tabla Dinámica
              </h3>
              <div className="space-y-4">
                <ExcelField label="Unidades totales en Santiago" value={c1} onChange={setC1} unit="unidades" />
                <ExcelField label="Precio promedio en Valparaíso" value={c2} onChange={setC2} unit="$" />
                <ExcelField label="Tienda con mayor total de unidades" value={c3} onChange={setC3} />
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
