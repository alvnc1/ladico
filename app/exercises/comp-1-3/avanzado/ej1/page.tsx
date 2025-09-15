"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Download, FileSpreadsheet, BarChart3, Table } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { compareNumbers, compareText } from '@/utils/answer-validators'

/* === Progreso/sesión (igual lógica que Intermedio) === */
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"

/* ======= Puntaje/sesión ======= */
const COMPETENCE = "1.3" as const
const LEVEL = "avanzado" as const
const SESSION_PREFIX = "session:1.3:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

export default function EjercicioComp13Avanzado1() {
  const { toast } = useToast()
  const router = useRouter()

  // ⬇️ también traemos userData para detectar rol
  const { user, userData } = useAuth()
  const isTeacher = userData?.role === "profesor" // 👈 modo profesor

  const [sessionId, setSessionId] = useState<string | null>(null)
  const ensuringRef = useRef(false)

  // 1) Cargar sesión cacheada por-usuario
  useEffect(() => {
    if (!user || typeof window === "undefined") return
    const sid = localStorage.getItem(sessionKeyFor(user.uid))
    if (sid) setSessionId(sid)
  }, [user?.uid])

  // 2) Asegurar/crear sesión por-usuario si no hay cache
  useEffect(() => {
    if (!user) {
      setSessionId(null)
      return
    }
    const LS_KEY = sessionKeyFor(user.uid)
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
    if (cached) {
      if (!sessionId) setSessionId(cached)
      return
    }
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
        console.error("No se pudo asegurar la sesión de test (Avanzado-P1):", e)
      } finally {
        ensuringRef.current = false
      }
    })()
  }, [user?.uid, sessionId])

  // helper: asegura y devuelve sid
  const ensureSid = async (): Promise<string | null> => {
    let sid = sessionId
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
        if (cached) {
          sid = cached
        } else if (!ensuringRef.current) {
          ensuringRef.current = true
          try {
            const { id } = await ensureSession({
              userId: user.uid,
              competence: COMPETENCE,
              level: "Avanzado",
              totalQuestions: 3,
            })
            sid = id
            setSessionId(id)
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id)
          } finally {
            ensuringRef.current = false
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo (re)asegurar la sesión:", e)
    }
    return sid ?? null
  }

  // Paso actual (0..2)
  const [currentIndex, setCurrentIndex] = useState(0)

  // URLs dataset por paso
  const [datasetUrl1, setDatasetUrl1] = useState<string | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/datasets/comp-1-3/advanced/ej1/latest', { cache: 'no-store' })
        const json = await res.json()
        if (json?.url) setDatasetUrl1(json.url)
      } catch {
        /* no-op */
      }
    })()
  }, [])
  const downloadUrl1 = datasetUrl1 ?? '/api/datasets/comp-1-3/advanced/ej1/default'
  const downloadUrl2 = '/api/datasets/comp-1-3/advanced/ej2/default'
  const downloadUrl3 = '/api/datasets/comp-1-3/advanced/ej3/default'

  // Respuestas del usuario
  // Paso 1 (estadísticos)
  const [mediaH, setMediaH] = useState('')
  const [medianaM, setMedianaM] = useState('')
  const [modaH, setModaH] = useState('')
  const [desvM, setDesvM] = useState('')

  // Respuestas correctas (cm)
  const EXPECTED = { mediaH: 170, medianaM: 159, modaH: 172, desvM: 3.81 }
  const vMediaH = mediaH ? compareNumbers(mediaH, EXPECTED.mediaH).ok : null
  const vMedianaM = medianaM ? compareNumbers(medianaM, EXPECTED.medianaM).ok : null
  const vModaH = modaH ? compareNumbers(modaH, EXPECTED.modaH).ok : null
  const vDesvM = desvM ? compareNumbers(desvM, EXPECTED.desvM, 0.01).ok : null
  const totalOk1 = [vMediaH, vMedianaM, vModaH, vDesvM].filter((v) => v === true).length

  // Paso 2 (tabla dinámica)
  const [c1, setC1] = useState('') // 91
  const [c2, setC2] = useState('') // 350
  const [c3, setC3] = useState('') // La Serena
  const v1 = c1 ? compareNumbers(c1, 91).ok : null
  const v2 = c2 ? compareNumbers(c2, 350).ok : null
  const v3 = c3 ? compareText(c3, 'La Serena').ok : null
  const totalOk2 = [v1, v2, v3].filter((v) => v === true).length

  // Paso 3 (gráfico dinámico — placeholders)
  const [g1, setG1] = useState('') // país
  const [g2, setG2] = useState('') // robusta Colombia
  const [g3, setG3] = useState('') // diferencia Honduras
  const EXPECTED3 = { paisMayor: 'Venezuela', robustaColombia: 279.725, diferenciaHonduras: 243.613 }
  const vg1 = g1 ? compareText(g1, EXPECTED3.paisMayor).ok : null
  const vg2 = g2 ? compareNumbers(g2, EXPECTED3.robustaColombia).ok : null
  const vg3 = g3 ? compareNumbers(g3, EXPECTED3.diferenciaHonduras).ok : null
  const totalOk3 = [vg1, vg2, vg3].filter((v) => v === true).length

  // Reglas de aprobación por paso (punto = 1/0)
  const MIN_OK_STEP1 = 2   // Avanzado: 2 de 4 estadísticos
  const MIN_OK_STEP2 = 3   // 3/3
  const MIN_OK_STEP3 = 3   // 3/3

  // Booleans por paso
  const q1PassedRaw = totalOk1 >= MIN_OK_STEP1
  const q2PassedRaw = totalOk2 >= MIN_OK_STEP2
  const q3PassedRaw = totalOk3 >= MIN_OK_STEP3

  // 👇 En modo profesor, todos los pasos cuentan como aprobados
  const q1Passed = isTeacher ? true : q1PassedRaw
  const q2Passed = isTeacher ? true : q2PassedRaw
  const q3Passed = isTeacher ? true : q3PassedRaw

  // Progreso (mismo estilo que TestInterface)
  const totalQuestions = 3
  const progress = ((currentIndex + 1) / totalQuestions) * 100

  // ====== Persistencia por paso (igual que intermedio) ======
  const persistStepPoint = async (zeroIdx: 0 | 1 | 2, passed: boolean) => {
    const effective = isTeacher ? true : passed // 👈 override profesor
    const point: 0 | 1 = effective ? 1 : 0
    // Local (1-based)
    setPoint(COMPETENCE, LEVEL, zeroIdx + 1, point)
    // Firestore (sesión)
    try {
      const sid = await ensureSid()
      if (sid) await markAnswered(sid, zeroIdx, point === 1)
    } catch (e) {
      console.warn(`No se pudo marcar P${zeroIdx + 1} respondida:`, e)
    }
  }

  // Navegación entre pasos guardando puntaje del paso actual
  const goNext = async () => {
    if (currentIndex === 0) {
      await persistStepPoint(0, q1Passed)
      setCurrentIndex(1)
      return
    }
    if (currentIndex === 1) {
      await persistStepPoint(1, q2Passed)
      setCurrentIndex(2)
      return
    }
  }

  // Finalizar (guarda P3 y navega a resultados con sid y q1..q3)
  const handleFinish = async () => {
    // Si NO es profesor, exige todas las casillas respondidas
    const answered = [mediaH, medianaM, modaH, desvM, c1, c2, c3, g1, g2, g3].every((x) => x !== '')
    if (!isTeacher && !answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de finalizar.' })
      return
    }

    // Guarda P3 (con override profesor si aplica)
    await persistStepPoint(2, q3Passed)

    // ✅ Resultados a nivel “pregunta/paso” (3 en total)
    const finalQ1 = q1Passed
    const finalQ2 = q2Passed
    const finalQ3 = q3Passed
    const correctas = (finalQ1 ? 1 : 0) + (finalQ2 ? 1 : 0) + (finalQ3 ? 1 : 0)
    const total = 3
    const score = Math.round((correctas / total) * 100)
    const passed = correctas >= 2 // 2/3 para aprobar

    // Enviar también q1/q2/q3 y sid
    const sid = await ensureSid()
    const params = new URLSearchParams({
      score: String(score),
      correct: String(correctas),
      total: String(total),
      passed: String(passed),
      competence: '1.3-avanzado',
      q1: finalQ1 ? "1" : "0",
      q2: finalQ2 ? "1" : "0",
      q3: finalQ3 ? "1" : "0",
      sid: sid ?? "",
    })
    router.push(`/test/comp-1-3-advanced/results?${params.toString()}`)
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
                | 1.3 Gestión de Datos, Información y Contenidos Digitales - Nivel Avanzado
              </span>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-1">
            <div className="flex items-center justify-between text-[#286575] mb-2">
              <span className="text-xs sm:text-sm font-medium bg-white/40 px-2 sm:px-3 py-1 rounded-full">
                Pregunta {currentIndex + 1} de {totalQuestions}
              </span>
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: totalQuestions }, (_, index) => (
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

      {/* Card central */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Paso 1 */}
            {currentIndex === 0 && (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Estadístico en Excel</h2>
                    </div>
                  </div>
                  <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                      <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        Descarga el archivo Excel con datos de alturas de hombres y mujeres por países de LATAM.
                        Realiza los análisis estadísticos solicitados y completa las casillas con los resultados en centímetros.
                      </p>
                    </div>
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
                            {!datasetUrl1 ? 'Archivo de datos por defecto del repositorio' : 'Último archivo subido por el administrador'}
                          </p>
                        </div>
                      </div>
                      <a href={downloadUrl1} target="_blank" rel="noreferrer">
                        <Button className="bg-[#286675] hover:bg-[#3a7d89] text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                          <FileSpreadsheet className="w-5 h-5 mr-2" />
                          Descargar Excel
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Resultados Estadísticos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl">
                      <ExcelField label="Media - Hombres"  value={mediaH} onChange={setMediaH} unit="cm" note='entero' />
                      <ExcelField label="Mediana - Mujeres" value={medianaM} onChange={setMedianaM} unit="cm" note='entero' />
                      <ExcelField label="Moda - Hombres" value={modaH} onChange={setModaH} unit="cm" />
                      <ExcelField label="Desviación Estándar - Mujeres" value={desvM} onChange={setDesvM} unit="cm" note="2 decimales" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Paso 2 */}
            {currentIndex === 1 && (
              <>
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
                        unidades y promedio de precio unitario.
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
              </>
            )}

            {/* Paso 3 */}
            {currentIndex === 2 && (
              <>
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
              </>
            )}

            {/* Navegación */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 mt-6">
              <div className="flex space-x-3 w-full sm:w-auto">
                {currentIndex > 0 && (
                  <Button
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    variant="outline"
                    className="flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-transparent border-2 border-gray-300 hover:border-gray-400 rounded-xl sm:rounded-2xl font-medium transition-all text-sm sm:text-base"
                  >
                    Anterior
                  </Button>
                )}
              </div>

              {currentIndex < 2 ? (
                <Button
                  onClick={goNext}
                  className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl sm:rounded-2xl font-medium text-white sm:text-lg shadow-lg hover:bg-[#3a7d89] transition-all"
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl sm:rounded-2xl font-medium text-white sm:text-lg shadow-lg hover:bg-[#3a7d89] transition-all"
                >
                  Finalizar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExcelField({
  label,
  placeholder,
  value,
  onChange,
  unit,
  note,
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
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            // Reemplaza comas por puntos antes de guardar
            const raw = e.target.value
            onChange(raw.replace(',', '.'))
          }}
          className="border-2 rounded-xl border-gray-300 hover:border-gray-400 focus-visible:ring-[#286575] transition-all"
          inputMode={unit === 'toneladas' || unit === 'unidades' || unit === 'cm' || unit === '$' ? 'decimal' : 'text'}
        />
      </div>
    </div>
  )
}
