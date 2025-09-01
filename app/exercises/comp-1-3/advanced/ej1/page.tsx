"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, AlertTriangle, CheckCircle, Info, Shield, X, Download, FileSpreadsheet, BarChart3, Table } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { compareNumbers, compareText } from '@/utils/answer-validators'

// Interfaz avanzada con la misma estética y reglas de TestInterface
export default function EjercicioComp13Avanzado1() {
  const { toast } = useToast()
  const router = useRouter()

  // Paso actual (1..3)
  const [currentIndex, setCurrentIndex] = useState(0)

  // URLs dataset por paso
  const [datasetUrl1, setDatasetUrl1] = useState<string | null>(null)
  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch('/api/datasets/comp-1-3/advanced/ej1/latest', { cache: 'no-store' })
        const json = await res.json()
        if (json?.url) setDatasetUrl1(json.url)
      } catch {
        // ignore
      }
    })()
  }, [])
  const downloadUrl1 = datasetUrl1 ?? '/api/datasets/comp-1-3/advanced/ej1/default'
  const downloadUrl2 = '/api/datasets/comp-1-3/advanced/ej2/default'
  const downloadUrl3 = '/api/datasets/comp-1-3/advanced/ej3/default'

  // Estados de control idénticos a TestInterface
  const [showInitialWarning, setShowInitialWarning] = useState(true)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [isQuestionLocked, setIsQuestionLocked] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [isQuestionInvalidated, setIsQuestionInvalidated] = useState(false)
  const [showInvalidationAlert, setShowInvalidationAlert] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Respuestas del usuario
  // Paso 1 (estadísticos)
  const [mediaH, setMediaH] = useState('')
  const [medianaM, setMedianaM] = useState('')
  const [modaH, setModaH] = useState('')
  const [desvM, setDesvM] = useState('')

  // Respuestas correctas (cm)
  const EXPECTED = {
    mediaH: 170,
    medianaM: 159,
    modaH: 165,
    desvM: 3.81, // 2 decimales
  }

  const vMediaH = mediaH ? compareNumbers(mediaH, EXPECTED.mediaH).ok : null
  const vMedianaM = medianaM ? compareNumbers(medianaM, EXPECTED.medianaM).ok : null
  const vModaH = modaH ? compareNumbers(modaH, EXPECTED.modaH).ok : null
  const vDesvM = desvM ? compareNumbers(desvM, EXPECTED.desvM, 0.01).ok : null // tolerancia 0.01
  const totalOk1 = [vMediaH, vMedianaM, vModaH, vDesvM].filter((v) => v === true).length

  // Paso 2 (tabla dinámica)
  const [c1, setC1] = useState('') // unidades totales en Santiago => 17
  const [c2, setC2] = useState('') // precio promedio en Valparaíso => 410
  const [c3, setC3] = useState('') // tienda con mayor total => Concepción
  const v1 = c1 ? compareNumbers(c1, 17).ok : null
  const v2 = c2 ? compareNumbers(c2, 410).ok : null
  const v3 = c3 ? compareText(c3, 'Concepción').ok : null
  const totalOk2 = [v1, v2, v3].filter((v) => v === true).length

  // Paso 3 (gráfico dinámico) — valores de referencia tentativos, ajustar con dataset definitivo
  const [g1, setG1] = useState('') // país con mayor producción total
  const [g2, setG2] = useState('') // robusta en Colombia (t)
  const [g3, setG3] = useState('') // diferencia en Honduras (t)
  const EXPECTED3 = { paisMayor: 'Brasil', robustaColombia: 0, diferenciaHonduras: 0 }
  const vg1 = g1 ? compareText(g1, EXPECTED3.paisMayor).ok : null
  const vg2 = g2 ? compareNumbers(g2, EXPECTED3.robustaColombia).ok : null
  const vg3 = g3 ? compareNumbers(g3, EXPECTED3.diferenciaHonduras).ok : null
  const totalOk3 = [vg1, vg2, vg3].filter((v) => v === true).length

  // Reglas de invalidación por salir del área
  const handleMouseLeave = () => {
    if (attemptsLeft > 0 && !isQuestionInvalidated) {
      setIsQuestionLocked(true)
      setShowWarning(true)
      setAttemptsLeft((prev) => prev - 1)
      if (attemptsLeft === 1) {
        setIsQuestionInvalidated(true)
        setShowWarning(false)
        setShowInvalidationAlert(true)
      }
    }
  }
  const handleMouseEnter = () => {
    if (isQuestionLocked && !isQuestionInvalidated) {
      setIsQuestionLocked(false)
      setShowWarning(false)
    }
  }

  // Finalizar: calcula aciertos y redirige a resultados
  const handleFinish = () => {
    if (isQuestionInvalidated) {
      toast({ title: 'Pregunta invalidada', description: 'Se excedieron los intentos permitidos.', variant: 'destructive' })
      return
    }
    const answered = [mediaH, medianaM, modaH, desvM, c1, c2, c3, g1, g2, g3].every((x) => x !== '')
    if (!answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de finalizar.' })
      return
    }
    
    // Calcular resultados
    const correctas = totalOk1 + totalOk2 + totalOk3
    const total = 4 + 3 + 3 // 10 preguntas en total
    const score = Math.round((correctas / total) * 100)
    const passed = correctas >= (total * 0.7) // 70% para aprobar
    
    // Redirigir a la vista de resultados con parámetros
    const params = new URLSearchParams({
      score: score.toString(),
      correct: correctas.toString(),
      total: total.toString(),
      passed: passed.toString(),
      competence: '1.3-avanzado'
    })
    
    router.push(`/test/comp-1-3-advanced/results?${params.toString()}`)
  }

  return (
    <div className="min-h-screen Ladico-gradient">
      {/* Popup inicial (idéntico a TestInterface) */}
      <Dialog open={showInitialWarning} onOpenChange={setShowInitialWarning}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-lg"></div>
          <div className="relative">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">⚠️ Advertencia Importante</DialogTitle>
              <DialogDescription className="text-base text-gray-600">
                <div className="space-y-4">
                  <p className="font-semibold text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                    Durante el test, debes mantener el mouse dentro del recuadro de la pregunta.
                  </p>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="w-5 h-5 text-yellow-600" />
                      <p className="text-sm font-bold text-yellow-800">Reglas del Test:</p>
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Tienes <strong className="text-yellow-800">3 intentos</strong> para salir del área de la pregunta</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Si sales más de 3 veces, la pregunta se <strong className="text-red-600">invalidará automáticamente</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Mantén el mouse dentro del <strong className="text-purple-600">recuadro blanco</strong> en todo momento</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-6">
              <Button onClick={() => setShowInitialWarning(false)} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <CheckCircle className="w-5 h-5 mr-2" />
                Entendido, comenzar test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header y progreso */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-bold">Ladico</h1>
              <span className="text-xs sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                Gestión de datos | 1.3 Avanzado
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">Pregunta {currentIndex + 1} de 3</span>
          <div className="flex space-x-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i <= currentIndex ? 'bg-white shadow-lg' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-2 sm:h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white to-white/90 rounded-full transition-all duration-500 ease-in-out shadow-sm" style={{ width: `${((currentIndex + 1) / 3) * 100}%` }} />
        </div>
      </div>

      {/* Card central con mismas reglas de mouse */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card
          ref={cardRef}
          className={`bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 relative ${isQuestionLocked
              ? 'ring-4 ring-red-500 ring-opacity-70 shadow-red-500/20'
              : isQuestionInvalidated
                ? 'ring-4 ring-red-600 ring-opacity-90 shadow-red-600/30'
                : 'ring-2 ring-purple-500 ring-opacity-30 shadow-purple-500/10'
            }`}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          {/* Indicador intentos */}
          <div className="absolute -top-3 -right-3 z-10">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${isQuestionInvalidated ? 'bg-red-600' : attemptsLeft === 3 ? 'bg-green-500' : attemptsLeft === 2 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
            >
              {isQuestionInvalidated ? 'INVALIDADA' : `${attemptsLeft}/3`}
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 lg:p-8">
            {showWarning && (
              <Alert variant="destructive" className="mb-4 sm:mb-6 border-red-300 bg-red-50 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm text-red-700">
                  <div className="flex items-center justify-between">
                    <span>
                      ⚠️ ¡Has salido del área! Intentos restantes: <strong>{attemptsLeft}</strong>. Vuelve al recuadro para desbloquear.
                    </span>
                    <button onClick={() => setShowWarning(false)} className="ml-2 p-1 hover:bg-red-100 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {showInvalidationAlert && (
              <Alert variant="destructive" className="mb-4 sm:mb-6 border-red-400 bg-red-100 animate-pulse">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm text-red-800 font-medium">
                  <div className="flex items-center justify-between">
                    <span>❌ Esta pregunta ha sido invalidada por exceder los 3 intentos.</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Contenido por paso - Nueva interfaz Excel */}
            {currentIndex === 0 && (
              <>
                {/* Header del ejercicio con icono Excel */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileSpreadsheet className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Análisis Estadístico en Excel</h2>
                      <p className="text-gray-600">Competencia 1.3 - Gestión de Datos Avanzado - Ejercicio 1</p>
                    </div>
                  </div>

                  {/* Instrucciones con diseño moderno */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Instrucciones</h3>
                        <p className="text-gray-700 leading-relaxed">
                          Descarga el archivo Excel con datos de alturas de hombres y mujeres por países de LATAM.
                          Realiza los análisis estadísticos solicitados y completa las casillas con los resultados en centímetros.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón de descarga prominente */}
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
                        <Button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                          <FileSpreadsheet className="w-5 h-5 mr-2" />
                          Descargar Excel
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Casillas de respuesta con diseño Excel */}
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Resultados Estadísticos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ExcelField
                        label="Media - Hombres"
                        placeholder="170"
                        value={mediaH}
                        onChange={setMediaH}
                        unit="cm"
                      />
                      <ExcelField
                        label="Mediana - Mujeres"
                        placeholder="159"
                        value={medianaM}
                        onChange={setMedianaM}
                        unit="cm"
                      />
                      <ExcelField
                        label="Moda - Hombres"
                        placeholder="165"
                        value={modaH}
                        onChange={setModaH}
                        unit="cm"
                      />
                      <ExcelField
                        label="Desviación Estándar - Mujeres"
                        placeholder="3.81"
                        value={desvM}
                        onChange={setDesvM}
                        unit="cm"
                        note="2 decimales"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-400 h-2 rounded-full transition-all"
                            style={{ width: `0%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentIndex === 1 && (
              <>
                {/* Header del ejercicio Paso 2 */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Table className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Tabla Dinámica en Excel</h2>
                      <p className="text-gray-600">Competencia 1.3 - Gestión de Datos Avanzado - Ejercicio 2</p>
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Instrucciones</h3>
                        <p className="text-gray-700 leading-relaxed">
                          Crea una tabla dinámica con: filas = nombre de la tienda; valores = suma de unidades y promedio de precio unitario.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón de descarga */}
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
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                          <FileSpreadsheet className="w-5 h-5 mr-2" />
                          Descargar Excel
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Casillas de respuesta Paso 2 */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Table className="w-5 h-5 text-blue-600" />
                    Resultados de Tabla Dinámica
                  </h3>
                  <div className="space-y-4">
                    <ExcelField
                      label="Unidades totales en Santiago"
                      placeholder="17"
                      value={c1}
                      onChange={setC1}
                      unit="unidades"
                    />
                    <ExcelField
                      label="Precio promedio en Valparaíso"
                      placeholder="410"
                      value={c2}
                      onChange={setC2}
                      unit="$"
                    />
                    <ExcelField
                      label="Tienda con mayor total de unidades"
                      placeholder="Concepción"
                      value={c3}
                      onChange={setC3}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-400 h-2 rounded-full transition-all"
                          style={{ width: `0%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentIndex === 2 && (
              <>
                {/* Header del ejercicio Paso 3 */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Gráfico Dinámico en Excel</h2>
                      <p className="text-gray-600">Competencia 1.3 - Gestión de Datos Avanzado - Ejercicio 3</p>
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Instrucciones</h3>
                        <p className="text-gray-700 leading-relaxed">
                          Genera un gráfico dinámico (por país y tipo de café) y responde las preguntas basándote en el análisis visual de los datos.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón de descarga */}
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
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
                          <FileSpreadsheet className="w-5 h-5 mr-2" />
                          Descargar Excel
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Casillas de respuesta Paso 3 */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Análisis del Gráfico Dinámico
                  </h3>
                  <div className="space-y-4">
                    <ExcelField
                      label="País con mayor producción total de café"
                      placeholder="Brasil"
                      value={g1}
                      onChange={setG1}
                    />
                    <ExcelField
                      label="Producción total de café Robusta en Colombia"
                      placeholder="0"
                      value={g2}
                      onChange={setG2}
                      unit="toneladas"
                    />
                    <ExcelField
                      label="Diferencia entre Arábica y Robusta en Honduras"
                      placeholder="0"
                      value={g3}
                      onChange={setG3}
                      unit="toneladas"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">

                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navegación */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 mt-6">
              <div className="flex space-x-3 w-full sm:w-auto">
                {currentIndex > 0 && (
                  <Button onClick={() => { setCurrentIndex((i) => i - 1); setIsQuestionLocked(false); setShowWarning(false); setAttemptsLeft(3); setIsQuestionInvalidated(false); setShowInvalidationAlert(false) }} variant="outline" className="flex-1 sm:flex-none px-6 sm:px-8 py-3">
                    Anterior
                  </Button>
                )}
              </div>
              {currentIndex < 2 ? (
                <Button onClick={() => { if (!isQuestionLocked) { setCurrentIndex((i) => i + 1); setIsQuestionLocked(false); setShowWarning(false); setAttemptsLeft(3); setIsQuestionInvalidated(false); setShowInvalidationAlert(false) } }} disabled={isQuestionLocked} className="w-full sm:w-auto px-8 sm:px-10 py-3 Ladico-button-primary">
                  Siguiente
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={isQuestionLocked || isQuestionInvalidated} className="w-full sm:w-auto px-8 sm:px-10 py-3 Ladico-button-primary">
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
          onChange={(e) => onChange(e.target.value)}
          className="border-2 border-gray-300 hover:border-gray-400 focus-visible:ring-blue-500 transition-all"
          inputMode={unit === 'toneladas' || unit === 'unidades' || unit === 'cm' || unit === '$' ? 'decimal' : 'text'}
        />
      </div>
    </div>
  )
}

// Componente legacy mantenido para compatibilidad
function Field({
  label,
  placeholder,
  value,
  onChange,
  state,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  state: boolean | null
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-800">{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          state === true ? 'border-green-500 focus-visible:ring-green-500' : state === false ? 'border-red-500 focus-visible:ring-red-500' : ''
        }
        inputMode="decimal"
      />
      {state === true && <p className="text-xs text-green-600">Correcto</p>}
      {state === false && <p className="text-xs text-red-600">Incorrecto</p>}
    </div>
  )
}
