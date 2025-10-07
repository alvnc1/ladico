"use client"

import { useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, XCircle, CheckCircle, XCircle as XIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { updateCurrentLevel } from "@/lib/updateCurrentLevel"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

function ResultsAvanzadoContent() {
    const sp = useSearchParams()
    const router = useRouter()
    const { user, userData } = useAuth()
    const isTeacher = userData?.role === "profesor"

    // 1) Leer de query (si vienen)
    const qp = {
        score: sp.get("score"),
        passed: sp.get("passed"),
        correct: sp.get("correct"),
        total: sp.get("total"),
        competence: sp.get("competence"),
        level: sp.get("level"),
        q1: sp.get("q1"),
        q2: sp.get("q2"),
        q3: sp.get("q3"),
    }

    // 2) Fallback a progreso local si no hay query
    const fallback = useMemo(() => {
        const key = "ladico:3.4:avanzado:progress"
        try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null
        const arr: number[] | null = raw ? JSON.parse(raw) : null // p.ej. [0,0,1]
        if (!arr || !Array.isArray(arr) || arr.length < 3) return null

        const q1 = arr[0] === 1
        const q2 = arr[1] === 1
        const q3 = arr[2] === 1
        const correct = (q1 ? 1 : 0) + (q2 ? 1 : 0) + (q3 ? 1 : 0)
        const total = 3
        const passed = correct >= 2
        const score = Math.round((correct / total) * 100)

        return {
            score,
            passed,
            correct,
            total,
            competence: "3.4",
            level: "avanzado",
            q1,
            q2,
            q3,
        }
        } catch {
        return null
        }
    }, [])

    // 3) Normalizar datos finales
    const data = useMemo(() => {
        if (qp.correct && qp.total && qp.passed) {
        const correct = Number.parseInt(qp.correct || "0")
        const total = Number.parseInt(qp.total || "3")
        const score = qp.score ? Number.parseInt(qp.score) : Math.round((correct / total) * 100)
        const passed = qp.passed === "true"
        const competence = qp.competence || "3.4"
        const level = (qp.level || "avanzado").toLowerCase()
        const q1 = qp.q1 === "1"
        const q2 = qp.q2 === "1"
        const q3 = qp.q3 === "1"
        return { score, passed, correct, total, competence, level, q1, q2, q3 }
        }
        if (fallback) return { ...fallback }
        return {
        score: 0,
        passed: false,
        correct: 0,
        total: 3,
        competence: "3.4",
        level: "avanzado",
        q1: false,
        q2: false,
        q3: false,
        }
    }, [qp.correct, qp.total, qp.passed, qp.score, qp.level, qp.competence, qp.q1, qp.q2, qp.q3, fallback])

    // 4) Limpiar progreso local, marcar finalización y actualizar currentLevel
    useEffect(() => {
        try {
        const key = `ladico:${data.competence}:${data.level}:progress`
        localStorage.removeItem(key)
        } catch {}

        // Marcar como finalizado (aprobado o reprobado) para que el dashboard lo muestre
        try {
            const slug = data.level.toLowerCase()
            localStorage.setItem(`ladico:completed:${data.competence}:${slug}`, "1")
            localStorage.setItem("ladico:progress:version", String(Date.now()))
            window.dispatchEvent(new Event("ladico:refresh"))
        } catch {
            /* no-op */
        }

        // Actualizar currentLevel si se completó el área
        ;(async () => {
            if (user?.uid && userData) {
                try {
                    await updateCurrentLevel(user.uid, userData, data.level, isTeacher)
                } catch (e) {
                    console.warn("No se pudo actualizar currentLevel:", e)
                }
            }
        })()
    }, [data.competence, data.level, user?.uid, userData, isTeacher])

    const handleBack = () => router.push("/dashboard")
    const handleRetry = () => router.push("/exercises/comp-3-4/avanzado/ej1")

    return (
        <>
        <Sidebar />
            <div className="min-h-screen bg-[#f3fbfb] lg:pl-72 flex items-center justify-center p-3 sm:p-4">
            <Card className="w-full max-w-2xl shadow-2xl rounded-2xl sm:rounded-3xl border-0 overflow-hidden">
                <CardHeader className="text-center bg-gradient-to-b from-white to-gray-50 pb-6 sm:pb-8 px-4 sm:px-6">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                    {isTeacher ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-md">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                        </div>
                    ) : data.passed ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center shadow-md">
                        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center shadow-md">
                        <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" />
                        </div>
                    )}
                    </div>

                    <CardTitle className="text-2xl sm:text-3xl font-bold text-[#3a5d61]">
                    {isTeacher ? "Evaluación Completada" : (data.passed ? "¡Felicitaciones!" : "Sigue practicando")}
                    </CardTitle>

                    <p className="mt-1 text-gray-600">
                    {isTeacher 
                        ? "Evaluación finalizada como profesor"
                        : (data.passed
                        ? "Has completado exitosamente esta competencia"
                        : "Necesitas al menos 2 respuestas correctas para avanzar")
                    }
                    </p>

                    <div className="mt-2 text-xs text-gray-500">
                    Competencia {data.competence} – Programación · Nivel{" "}
                    {data.level.charAt(0).toUpperCase() + data.level.slice(1)}
                    </div>
                </div>
                </CardHeader>

                {/* BODY */}
                <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
                {/* KPIs */}
                {!isTeacher && (
                    <>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                            <div className="p-3 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{data.total}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Preguntas</div>
                            </div>
                            <div className="p-3 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl sm:rounded-2xl shadow-sm border border-green-200">
                            <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">{data.correct}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Correctas</div>
                            </div>
                            <div className="p-3 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl shadow-sm border border-red-200">
                            <div className="text-2xl sm:text-3xl font-bold text-red-600 mb-1 sm:mb-2">{data.total - data.correct}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Incorrectas</div>
                            </div>
                        </div>

                    {/* Porcentaje - Solo visible para estudiantes */}
                    <div className="text-center p-6 sm:p-8 via-blue-50 to-gray-400 rounded-2xl sm:rounded-3xl border border-gray-300 shadow-lg">
                        <div className="text-4xl sm:text-5xl font-bold bg-[#5d8b6a] bg-clip-text text-transparent mb-2 sm:mb-3">
                        {data.score}%
                        </div>
                        <div className="text-gray-600 text-base sm:text-lg font-medium">Puntuación obtenida</div>
                        {data.passed && (
                        <div className="mt-3 sm:mt-4 inline-flex items-center px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium shadow-sm">
                            <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            +15 Ladico ganados
                        </div>
                        )}
                    </div>
                    </>
                )}

                {/* Detalle por pregunta */}
                {!isTeacher && (
                    <div className="mt-8">
                        <h3 className="font-semibold text-gray-900 mb-3">Detalle de preguntas evaluadas:</h3>

                        <div
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                            data.q1 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                        }`}
                        >
                        <div className="flex items-center gap-2 text-gray-800">
                            {data.q1 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                            <span>Ejercicio 1: Blockly — laberinto 6×6</span>
                        </div>
                        <span className={`font-semibold ${data.q1 ? "text-green-700" : "text-red-700"}`}>
                            {data.q1 ? "Correcta" : "Incorrecta"}
                        </span>
                        </div>

                        <div
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm mb-3 ${
                            data.q2 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                        }`}
                        >
                        <div className="flex items-center gap-2 text-gray-800">
                            {data.q2 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                            <span>Ejercicio 2: SQL — filtro por precio</span>
                        </div>
                        <span className={`font-semibold ${data.q2 ? "text-green-700" : "text-red-700"}`}>
                            {data.q2 ? "Correcta" : "Incorrecta"}
                        </span>
                        </div>

                        <div
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${
                            data.q3 ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"
                        }`}
                        >
                        <div className="flex items-center gap-2 text-gray-800">
                            {data.q3 ? <CheckCircle className="w-5 h-5 text-green-700" /> : <XIcon className="w-5 h-5 text-red-700" />}
                            <span>Ejercicio 3: Terminal — rutas y mv</span>
                        </div>
                        <span className={`font-semibold ${data.q3 ? "text-green-700" : "text-red-700"}`}>
                            {data.q3 ? "Correcta" : "Incorrecta"}
                        </span>
                        </div>
                    </div>
                )}

                {/* Acciones */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Button
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl py-3 shadow"
                    >
                    Volver al Dashboard
                    </Button>
                    <Button
                    onClick={() => router.push("/exercises/comp-3-4/avanzado/ej1")}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-xl py-3"
                    >
                    Repetir nivel
                    </Button>
                </div>
                </CardContent>
            </Card>
            </div>
        </>
    )
}

export default function ResultsAvanzadoPage() {
    return (
        <Suspense
        fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#286675]" />
            </div>
        }
        >
        <ResultsAvanzadoContent />
        </Suspense>
    )
}
