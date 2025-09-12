"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ensureSession, markAnswered } from "@/lib/testSession";

const SESSION_PREFIX = "session:1.2:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

export default function LadicoArticles() {
    const [currentIndex, setCurrentIndex] = useState(2);
    const totalQuestions = 3;
    const progress = ((currentIndex + 1) / totalQuestions) * 100;

    const router = useRouter();
    const { user } = useAuth();

    const COMPETENCE = "1.2";
    const LEVEL = "intermedio";
    const SESSION_KEY = "session:1.2:Intermedio";
    const Q_IDX_ZERO = 2;
    const Q_IDX_ONE = 3;
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Carga sesión cacheada (si existe) cuando conocemos el uid
    useEffect(() => {
        if (!user || typeof window === "undefined") return;
        const sid = localStorage.getItem(sessionKeyFor(user.uid));
        if (sid) setSessionId(sid);
    }, [user?.uid]);

    // Si no hay cache, crear/asegurar una sesión y guardarla con clave por-usuario
    useEffect(() => {
        if (!user) return;
        if (sessionId) return;
        (async () => {
            try {
            const { id } = await ensureSession({
                userId: user.uid,
                competence: COMPETENCE,
                level: "Intermedio",
                totalQuestions: 3,
            });
            setSessionId(id);
            if (typeof window !== "undefined") {
                localStorage.setItem(sessionKeyFor(user.uid), id);
            }
            } catch (e) {
            console.error("No se pudo asegurar la sesión de test (P2):", e);
            }
        })();
    }, [user?.uid, sessionId]);

    const [checked, setChecked] = useState<number[]>([]);
    const [feedback, setFeedback] = useState<React.ReactNode>("");

    const toggle = (idx: number) =>
        setChecked((prev) =>
        prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
        );

    const validar = () => {
        // (ejemplo) supongamos que los verificados son 2 y 5
        const okSet = new Set([2, 5]);
        const userSet = new Set(checked);
        const allOk =
        checked.length === okSet.size &&
        [...okSet].every((i) => userSet.has(i));

    };

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
                        | 1.2 Evaluar datos, información y contenidos digitales - Nivel Intermedio
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

            {/* Tarjeta del ejercicio */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
                <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                    {/* Enunciado */}
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Verificación de artículos en la web
                            </h2>
                            </div>
                        </div>
                        {/* Instrucciones */}
                        <div className="mb-6 sm:mb-8">
                            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                            <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                                A menudo compartes artículos leídos en la web… pero no siempre verificas sus fuentes.
                            </p>
                            <p className="mb-2">
                            <Link
                                href="ej3/articulos"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1a73e8] underline font-medium"
                            >
                                En su página web
                            </Link>{" "}
                            ¿Qué artículos transmiten información <b>verificada</b>?
                            </p>
                            </div>
                        </div>
                    </div>

                    {/* Opciones */}
                    <div className="mt-5 border-bg-[#dde3e8] rounded-xl">
                    <div className="px-4 py-3 text-sm text-gray-600">
                        Seleccione varias respuestas.
                    </div>
                    <div className="px-4 pb-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                        <label
                            key={n}
                            className="flex items-center gap-3 py-2 text-[15px] cursor-pointer"
                        >
                            <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#286575]"
                            checked={checked.includes(n)}
                            onChange={() => toggle(n)}
                            />
                            <span>Artículo {n}</span>
                        </label>
                        ))}
                    </div>
                    </div>
                    {/* Footer / acciones */}
                    <div className="px-3 py-3 bg-white flex items-center justify-end">
                    <Button
                        onClick={validar}
                        className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
                    >
                        Siguiente
                    </Button>
                    </div>
                </CardContent>
                </Card>
            </div>
        </div>
    );
}
