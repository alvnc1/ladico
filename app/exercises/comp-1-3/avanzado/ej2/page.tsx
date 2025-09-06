"use client"

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, AlertTriangle, CheckCircle, Info, Shield, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { compareNumbers, compareText } from '@/utils/answer-validators'

export default function EjercicioComp13Avanzado2() {
  const { toast } = useToast()
  const [datasetUrl, setDatasetUrl] = useState<string | null>(null)
  useEffect(() => {
    setDatasetUrl('/api/datasets/comp-1-3/advanced/ej2/default')
  }, [])
  const downloadUrl = datasetUrl!

  const [showInitialWarning, setShowInitialWarning] = useState(true)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [isQuestionLocked, setIsQuestionLocked] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [isQuestionInvalidated, setIsQuestionInvalidated] = useState(false)
  const [showInvalidationAlert, setShowInvalidationAlert] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [c3, setC3] = useState('')

  const v1 = c1 ? compareNumbers(c1, 17).ok : null
  const v2 = c2 ? compareNumbers(c2, 410).ok : null
  const v3 = c3 ? compareText(c3, 'Concepción').ok : null
  const totalOk = [v1, v2, v3].filter((v) => v === true).length

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

  const handleFinish = () => {
    if (isQuestionInvalidated) {
      toast({ title: 'Pregunta invalidada', description: 'Se excedieron los intentos permitidos.', variant: 'destructive' })
      return
    }
    const answered = [c1, c2, c3].every((x) => x !== '')
    if (!answered) {
      toast({ title: 'Respuestas incompletas', description: 'Completa todas las casillas antes de finalizar.' })
      return
    }
    if (totalOk === 3) {
      toast({ title: '¡Perfecto!', description: 'Las 3 respuestas son correctas.' })
    } else {
      toast({ title: 'Resultados', description: `Correctas: ${totalOk}/3. Revisa las que aparecen en rojo.` })
    }
  }

  return (
    <div className="min-h-screen Ladico-gradient">
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
                <p className="font-semibold text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">Mantén el mouse dentro del recuadro de la pregunta.</p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center mt-6">
              <Button onClick={() => setShowInitialWarning(false)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold">
                <CheckCircle className="w-5 h-5 mr-2" />Comenzar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-4">
              <h1 className="text-lg sm:text-xl font-bold">Ladico</h1>
              <span className="text-xs sm:text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full">1.3 Avanzado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs sm:text-sm font-medium bg-white/10 px-3 py-1 rounded-full">Pregunta 1 de 1</span>
          <div className="w-3 h-3 rounded-full bg-white shadow-lg" />
        </div>
        <div className="bg-white/20 rounded-full h-2 sm:h-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white to-white/90 rounded-full" style={{ width: `100%` }} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card
          ref={cardRef}
          className={`bg-white shadow-2xl rounded-2xl border-0 transition-all duration-300 relative ${
            isQuestionLocked ? 'ring-4 ring-red-500' : isQuestionInvalidated ? 'ring-4 ring-red-600' : 'ring-2 ring-purple-500/30'
          }`}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <div className="absolute -top-3 -right-3 z-10">
            <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${isQuestionInvalidated ? 'bg-red-600' : attemptsLeft === 3 ? 'bg-green-500' : attemptsLeft === 2 ? 'bg-yellow-500' : 'bg-red-500'}`}>
              {isQuestionInvalidated ? 'INVALIDADA' : `${attemptsLeft}/3`}
            </div>
          </div>

          <CardContent className="p-6">
            {showWarning && (
              <Alert variant="destructive" className="mb-4 border-red-300 bg-red-50 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm text-red-700 flex justify-between">
                  <span>Has salido del área. Intentos restantes: <strong>{attemptsLeft}</strong></span>
                  <button onClick={() => setShowWarning(false)} className="ml-2 p-1 hover:bg-red-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-purple-500">
                <p className="text-gray-700">Crea una tabla dinámica con: filas = nombre de la tienda; valores = suma total de unidades vendidas y promedio de precio unitario.</p>
              </div>
              <div className="mt-4 flex gap-2 items-center">
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Button>Descargar dataset (.xlsx)</Button>
                </a>
              </div>
            </div>

            <Field label="Casilla 1: ¿Cuántas unidades totales se vendieron en Santiago?" placeholder="Ej: 17" value={c1} onChange={setC1} state={v1} />
            <Field label="Casilla 2: ¿Cuál es el precio promedio de los productos vendidos en Valparaíso?" placeholder="Ej: 410" value={c2} onChange={setC2} state={v2} />
            <Field label="Casilla 3: ¿Qué tienda tuvo la mayor cantidad total de unidades vendidas?" placeholder="Ej: Concepción" value={c3} onChange={setC3} state={v3} />
            <p className="text-sm text-gray-600 mt-2">Progreso: {totalOk}/3 correctas</p>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleFinish} disabled={isQuestionLocked || isQuestionInvalidated} className="px-8 py-3 Ladico-button-primary rounded-xl">Finalizar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, placeholder, value, onChange, state }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; state: boolean | null }) {
  return (
    <div className="space-y-2 mt-4">
      <label className="text-sm font-semibold text-gray-800">{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={state === true ? 'border-green-500 focus-visible:ring-green-500' : state === false ? 'border-red-500 focus-visible:ring-red-500' : ''}
      />
      {state === true && <p className="text-xs text-green-600">Correcto</p>}
      {state === false && <p className="text-xs text-red-600">Incorrecto</p>}
    </div>
  )
}
