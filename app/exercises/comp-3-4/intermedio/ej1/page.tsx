"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { ensureSession, markAnswered } from "@/lib/testSession"
import { setPoint } from "@/lib/levelProgress"
import ProgrammingExercise, { ProgrammingExerciseHandle } from "@/components/ProgrammingExercise"

const SCENARIO =
    "Estás escribiendo un programa en JavaScript. Se te entregan dos variables para trabajar. Tu objetivo es listar las instrucciones necesarias para que el sistema convierta esas cadenas en números, realice la suma y muestre correctamente el resultado 12 en la consola."

const COMPETENCE = "3.4"
const LEVEL = "intermedio"
const SESSION_PREFIX = "session:3.4:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

export default function PageEj1() {
    const router = useRouter()
    const { user } = useAuth()

    const [sessionId, setSessionId] = useState<string | null>(null)
    const ensuringRef = useRef(false)
    const [saving, setSaving] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

    const exRef = useRef<ProgrammingExerciseHandle>(null)

    // 1) Cargar sesión cacheada
    useEffect(() => {
        if (!user || typeof window === "undefined") return
        const sid = localStorage.getItem(sessionKeyFor(user.uid))
        if (sid) setSessionId(sid)
    }, [user?.uid])

    // 2) Crear sesión si no existe
    useEffect(() => {
        if (!user) {
        setSessionId(null)
        return
        }
        const key = sessionKeyFor(user.uid)
        const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null
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
            level: "Intermedio",
            totalQuestions: 3,
            })
            setSessionId(id)
            if (typeof window !== "undefined") localStorage.setItem(key, id)
        } catch (e) {
            console.error("No se pudo asegurar la sesión (P1):", e)
        } finally {
            ensuringRef.current = false
        }
        })()
    }, [user?.uid, sessionId])

    const handleNext = async () => {
        if (!exRef.current) return
        const isCorrect = exRef.current.check() // true/false según orden

        setSaving(true)
        const point: 0 | 1 = isCorrect ? 1 : 0
        // P1
        setPoint(COMPETENCE, LEVEL, 1, point)

        try {
        if (sessionId) {
            await markAnswered(sessionId, 0, isCorrect) // índice 0 = P1
        }
        } catch (e) {
        console.warn("No se pudo marcar P1:", e)
        } finally {
        setSaving(false)
        }

        router.push("/exercises/comp-3-4/intermedio/ej2")
    }

    const progressPct = (1 / 3) * 100

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
            <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                {/* Escenario */}
                <div className="mb-6 bg-gray-50 p-6 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 font-medium">{SCENARIO}</p>
                </div>

                {/* Ejercicio */}
                <ProgrammingExercise ref={exRef} />

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
