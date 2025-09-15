"use client"

import Link from "next/link"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ProgrammingExerciseHTML, { HtmlExerciseHandle } from "@/components/ProgrammingExerciseHTML"
import { useAuth } from "@/contexts/AuthContext"

import { getProgress, setPoint, levelPoints, isLevelPassed, getPoint } from "@/lib/levelProgress"
import { ensureSession, markAnswered, finalizeSession } from "@/lib/testSession"

const SCENARIO =
    "Estás revisando el código HTML de una página sobre energías renovables en América Latina y deseas realizar algunas correcciones."
const COMPETENCE = "3.4"
const LEVEL = "intermedio"

// Clave de sesión por-usuario
const SESSION_PREFIX = "session:3.4:Intermedio"
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`

export default function SandboxHtmlExercisePage() {
    const exerciseRef = useRef<HtmlExerciseHandle>(null)
    const router = useRouter()
    const { user } = useAuth()

    const [sessionId, setSessionId] = useState<string | null>(null)

    // Cargar sesión cacheada (si existe)
    useEffect(() => {
        if (!user || typeof window === "undefined") return
        const sid = localStorage.getItem(sessionKeyFor(user.uid))
        if (sid) setSessionId(sid)
    }, [user?.uid])

    // Maneja cierre con cálculo + finalización
    const handleFinish = async (point: 0 | 1) => {
    // Guarda P3 local
    setPoint(COMPETENCE, LEVEL, 3, point)

    // Asegura/marca en testSession
    let sid = sessionId
    try {
        if (user) {
        const LS_KEY = sessionKeyFor(user.uid)
        if (!sid) sid = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
        if (!sid) {
            const created = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
            })
            sid = created.id
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, sid)
        }
        if (sid) {
            await markAnswered(sid, 2, point === 1) // índice 2 = P3
        }
        }
    } catch (e) {
        console.warn("No se pudo asegurar/marcar sesión (3.4 P3):", e)
    }

    // Calcular score local
    const prog = getProgress(COMPETENCE, LEVEL)
    const totalPts = levelPoints(prog) // 0..3
    const passed = isLevelPassed(prog)
    const score = Math.round((totalPts / 3) * 100)
    const q1 = getPoint(prog, 1)
    const q2 = getPoint(prog, 2)
    const q3 = getPoint(prog, 3)

    // Finaliza la sesión para que /results pueda leerla
    try {
        if (sid) await finalizeSession(sid, { correctCount: totalPts, total: 3, passMin: 2 })
    } catch (e) {
        console.warn("No se pudo finalizar la sesión (3.4 P3):", e)
    }

    // Limpia cache de sesión por-usuario (opcional)
    try {
        if (user) localStorage.removeItem(sessionKeyFor(user.uid))
    } catch {}

    // ✅ Construir querystring
    const qs = new URLSearchParams({
        score: String(score),
        passed: String(passed),
        correct: String(totalPts),
        total: "3",
        competence: COMPETENCE,
        level: LEVEL,
        q1: String(q1),
        q2: String(q2),
        q3: String(q3),
        ...(sid ? { sid } : {}),
    })

    // Redirige a la página específica de resultados
    router.push(`/test/comp-3-4-intermedio?${qs.toString()}`)
    }

    const progressPct = (3 / 3) * 100
    return (
        <div className="min-h-screen bg-[#f3fbfb]">
        {/* Header */}
        <div className="bg-white/20 backdrop-blur-sm border-b border-white/10 rounded-b-xl">
            <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <Link href="/dashboard" className="shrink-0">
                    <img
                    src="/ladico_green.png"
                    alt="Ladico Logo"
                    className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    />
                </Link>

                <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                    3.4 Programación — Nivel Intermedio
                </span>
                </div>
            </div>
            </div>
        </div>

        {/* Contenido */}
        <div className="max-w-6xl mx-auto px-4 pb-8 pt-4">
                        {/* Progreso */}
            <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 py-1 rounded-full">
                Ejercicio 3 de 3
                </span>
                <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#286575]" />
                <div className="w-3 h-3 rounded-full bg-[#286575]" />
                <div className="w-3 h-3 rounded-full bg-[#286575]" />
                </div>
            </div>
            <div className="bg-[#dde3e8] rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-[#286575] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            </div>
            <Card className="bg-white shadow-2xl rounded-3xl border-0 ring-2 ring-[#286575] ring-opacity-30">
            <CardContent className="p-6 lg:p-8">
                {/* Escenario */}
                <div className="mb-6 bg-gray-50 p-6 rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 font-medium">{SCENARIO}</p>
                </div>
                <div className="mb-6">
                <p className="text-sm text-gray-600 mt-2 bg-blue-50 px-4 py-2 rounded-full inline-block">
                    Revisa la página, inspecciona el código y responde abajo
                </p>
                </div>

                {/* Ejercicio */}
                <ProgrammingExerciseHTML ref={exerciseRef} onFinish={handleFinish} />

                {/* Acciones: Terminar / Finalizar (afuera, mismo nivel) */}
                <div className="mt-6 flex items-center justify-between">
                <Button
                    asChild
                    className="px-6 py-2 bg-[#286675] rounded-2xl text-white font-medium shadow-lg hover:bg-[#3a7d89]"
                >
                    <Link href="/dashboard">Terminar</Link>
                </Button>

                <Button
                    onClick={() => exerciseRef.current?.finish()}
                    className="px-6 py-2 bg-[#286675] rounded-2xl text-white font-medium shadow-lg hover:bg-[#3a7d89]"
                >
                    Finalizar
                </Button>
                </div>
            </CardContent>
            </Card>
        </div>
        </div>
    )
}
