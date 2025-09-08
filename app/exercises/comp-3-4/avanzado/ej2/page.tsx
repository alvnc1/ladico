"use client"

import Link from "next/link"
import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SqlExercise, { SqlExerciseHandle } from "@/components/SqlExercise"

import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"

const SCENARIO =
    "Consulta la tabla FLORES e indique la cantidad de flores cuyo precio sea ESTRICTAMENTE mayor a 15."
const TITLE = "SQL Básico: Filtrar con condición lógica"

const COMPETENCE = "3.4"
const LEVEL = "avanzado"
const SESSION_PREFIX = "session:3.4:Avanzado"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

export default function SandboxSQLPage() {
    const router = useRouter()
    const { user } = useAuth()
    const exRef = useRef<SqlExerciseHandle>(null)

    const [sessionId, setSessionId] = useState<string | null>(null)
    const [ensuring, setEnsuring] = useState(false)
    const [saving, setSaving] = useState(false)

    // Cargar sesión cacheada
    useEffect(() => {
        if (!user || typeof window === "undefined") return
        const sid = localStorage.getItem(sessionKeyFor(user.uid))
        if (sid) setSessionId(sid)
    }, [user?.uid])

    // Asegurar sesión si no existe
    useEffect(() => {
        if (!user) return
        const key = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null
        if (cached && !sessionId) {
        setSessionId(cached)
        return
        }
        if (cached) return
        if (ensuring) return
        setEnsuring(true)
        ;(async () => {
        try {
            const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Avanzado",
            totalQuestions: 3,
            })
            setSessionId(id)
            localStorage.setItem(key, id)
        } catch (e) {
            console.error("No se pudo asegurar sesión (A2):", e)
        } finally {
            setEnsuring(false)
        }
        })()
    }, [user?.uid, sessionId, ensuring])

    const handleNext = async () => {
        if (!exRef.current) return
        // Fuerza una evaluación usando el estado actual del componente
        const isCorrect = exRef.current.finish()
        const point: 0 | 1 = isCorrect ? 1 : 0

        setSaving(true)
        // Guarda puntaje local (Ej2 ⇒ índice 2 en tu helper levelProgress)
        setPoint(COMPETENCE, LEVEL, 2, point)

        try {
        if (sessionId) {
            // Firestore: P2 ⇒ índice 1
            await markAnswered(sessionId, 1, isCorrect)
        }
        } catch (e) {
        console.warn("No se pudo marcar P2 (A2):", e)
        } finally {
        setSaving(false)
        }

        router.push("/exercises/comp-3-4/avanzado/ej3")
    }

    const [currentIndex, setCurrentIndex] = useState(1);
    
      const totalQuestions = 3;
      const progress = ((currentIndex + 1) / totalQuestions) * 100;

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
                | 3.4 Programación -
                Nivel Intermedio
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

        {/* Contenido */}
        <div className="max-w-6xl mx-auto px-4 pb-8 pt-4">

            <Card className="bg-white shadow-2xl rounded-3xl border-0 ring-2 ring-[#286575] ring-opacity-30">
            <CardContent className="p-6 lg:p-8">
                {/* Escenario */}
                <div className="mb-6 bg-gray-50 p-6 rounded-2xl border-l-4 border-[#286575]">
                <h2 className="font-semibold text-gray-800 mb-2">{TITLE}</h2>
                <p className="text-gray-700 font-medium">{SCENARIO}</p>
                </div>

                {/* Instrucción */}
                <p className="text-sm text-gray-600 mt-2 bg-blue-50 px-4 py-2 rounded-full inline-block mb-6">
                Escribe una consulta SQL y presiona <b>Ejecutar</b> para filtrar resultados
                </p>

                {/* Ejercicio */}
                <SqlExercise ref={exRef} />

                {/* Acciones */}
                <div className="mt-6 flex items-center justify-between">
                <Button
                    asChild
                    className="px-6 py-2 bg-[#286675] rounded-2xl text-white font-medium shadow-lg hover:bg-[#3a7d89]"
                >
                    <Link href="/dashboard">Terminar</Link>
                </Button>

                <Button
                    onClick={handleNext}
                    disabled={saving}
                    className="px-6 py-2 bg-[#286675] rounded-2xl text-white font-medium shadow-lg hover:bg-[#3a7d89]"
                >
                    {saving ? "Guardando…" : "Siguiente"}
                </Button>
                </div>
            </CardContent>
            </Card>
        </div>
        </div>
    )
}
