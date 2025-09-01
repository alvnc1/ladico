"use client"

import { ArrowRight, Play, Star, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function Hero() {
    const [open, setOpen] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)
    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }

        // Cerrar con ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [])

    // Cerrar al hacer clic fuera
    const onBackdropClick = (e: React.MouseEvent) => {
        if (e.target === dialogRef.current) setOpen(false)
    }

    return (
        <section id="inicio" className="min-h-screen flex items-center justify-center ladico-section pt-32">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    
                    <div className="text-center lg:text-left">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight mb-2">
                        Evalúa y Certifica tus
                        <span className="text-[#5d8b6a]"> Competencias Digitales</span>
                        </h1>

                        <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-xl">
                        Descubre tu nivel real en las 5 áreas fundamentales del Marco Europeo de Competencias Digitales. 
                        Una evaluación profesional basada en estándares internacionales, diseñada para estudiantes, 
                        profesionales y ciudadanos del siglo XXI.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-12 items-center sm:items-start">
                            <button onClick={() => scrollTo("caracteristicas")} className="bg-gradient-to-r from-[#94b2ba] to-[#286675] text-white font-semibold px-6 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:opacity-90">
                                ¿Qué ofrecemos?
                            </button>

                            <button
                                onClick={() => setOpen(true)}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-gray-700 bg-white shadow-sm hover:shadow transition-all duration-200"
                                aria-haspopup="dialog"
                                aria-expanded={open}
                                aria-controls="demo-video-dialog"
                            >
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-200">
                                <Play className="w-3.5 h-3.5 translate-x-[1px]" />
                                </span>
                                <span>Ver demo</span>
                            </button>

                        </div>

                        <div className="hero-stats flex gap-16 justify-center mb-12 bg-[#f8fafc] py-6 rounded-2xl shadow-sm">
                        <div className="stat-item text-center transition-transform duration-300 hover:scale-105">
                            <span
                            className="stat-number block text-4xl font-extrabold text-[#1f302b] leading-none mb-1"
                            style={{ textShadow: "0 2px 6px #4c584fff" }}
                            >
                            5
                            </span>
                            <span className="stat-label block text-base font-semibold tracking-wide text-gray-400 uppercase">
                            Áreas de<br />Competencia
                            </span>
                        </div>
                        <div className="stat-item text-center transition-transform duration-300 hover:scale-105">
                            <span
                            className="stat-number block text-4xl font-extrabold text-[#1f302b] leading-none mb-1"
                            style={{ textShadow: "0 2px 6px #4c584fff" }}
                            >
                            21
                            </span>
                            <span className="stat-label block text-base font-semibold tracking-wide text-gray-400 uppercase">
                            Competencias<br />Evaluadas
                            </span>
                        </div>
                        <div className="stat-item text-center transition-transform duration-300 hover:scale-105">
                            <span
                            className="stat-number block text-4xl font-extrabold text-[#1f302b] leading-none mb-1"
                            style={{ textShadow: "0 2px 6px #4c584fff" }}
                            >
                            3
                            </span>
                            <span className="stat-label block text-base font-semibold tracking-wide text-gray-400 uppercase">
                            Niveles de<br />Dificultad
                            </span>
                        </div>
                        </div>
                    </div>

                    
                    <div className="relative">
                        <div className="border-2 border-gray-200  rounded-3xl p-12 bg-gradient-to-br from-gray-50 to-gray-20 border-2 border-bg-gradient-to-r from-[#94b2ba] to-[#286675]">
                            <div className="relative">
                                <div className="w-full h-80 bg-gradient-to-br from-white to-gray-50 rounded-3xl border-2 border-gray-100 flex items-center justify-center mb-8">
                                    <img
                                        src="/ladico.png"
                                        alt="Ladico Logo"
                                        className="w-40 h-40 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg border-2 border-gray-200"
                                    />
                                </div>

                                
                                
                                <div
                                    className="absolute -top-6 -right-6 w-28 h-[90px] bg-white rounded-xl shadow-lg animate-float border border-gray-200"
                                    style={{ animationDelay: "1.0s" }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                            <span className="text-xl">🔍</span>
                                        </div>
                                        <span className="text-gray-700 text-sm">Información</span>
                                    </div>
                                </div>

                                
                                <div
                                    className="absolute -bottom-6 -right-6 w-28 h-[90px] bg-white rounded-xl shadow-lg animate-float border border-gray-200"
                                    style={{ animationDelay: "1.5s" }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                                            <span className="text-xl">💬</span>
                                        </div>
                                        <span className="text-gray-700 text-sm">Comunicación</span>
                                    </div>
                                </div>

                                
                                <div
                                    className="absolute -bottom-6 -left-6 w-28 h-[90px] bg-white rounded-xl shadow-lg animate-float border border-gray-200"
                                    style={{ animationDelay: "2.0s" }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                                            <span className="text-xl">🎨</span>
                                        </div>
                                        <span className="text-gray-700 text-sm">Creación</span>
                                    </div>
                                </div>

                                
                                <div
                                    className="absolute top-1/2 -left-8 w-28 h-[90px] bg-white rounded-xl shadow-lg animate-float border border-gray-200"
                                    style={{ animationDelay: "2.5s" }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                            <span className="text-xl">🛡️</span>
                                        </div>
                                        <span className="text-gray-700 text-sm">Seguridad</span>
                                    </div>
                                </div>

                                
                                <div
                                    className="absolute top-1/4 -right-8 w-28 h-[90px] bg-white rounded-xl shadow-lg animate-float border border-gray-200"
                                    style={{ animationDelay: "3.0s" }}
                                >
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                            <span className="text-xl">⚙️</span>
                                        </div>
                                        <span className="text-gray-700 text-sm">Resolución</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* MODAL DE VIDEO */}
                    {open && (
                        <div
                        ref={dialogRef}
                        id="demo-video-dialog"
                        role="dialog"
                        aria-modal="true"
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onMouseDown={onBackdropClick}
                        >
                        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden">
                            <button
                            onClick={() => setOpen(false)}
                            className="absolute top-3 right-3 p-2 rounded-full border border-gray-200 bg-white/80 hover:bg-white"
                            aria-label="Cerrar video"
                            >
                            <X className="w-5 h-5" />
                            </button>

                            <div className="aspect-video">
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/l-EV37ol_0k?si=SSBiX3vAK1RdvYkL"
                                title="Demo Ladico"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                            </div>

                            <div className="p-4 text-sm text-gray-600">
                            <p>Así funciona la plataforma: recorrido rápido por registro, evaluación y certificados.</p>
                            </div>
                        </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
