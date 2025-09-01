"use client"

import { useState, useEffect } from "react"
import { Menu, X, Zap, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const { user, userData } = useAuth()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
        setIsMenuOpen(false)
    }
    const router = useRouter()

    const goToLogin = () => {
        router.push("/login")
    }

    const goToDashboard = () => {
        router.push("/dashboard")
    }

    
    const userDisplayName = userData?.name || user?.displayName || user?.email || "Usuario"

    return (
        <header
            className={`fixed top-2 right-2 left-2 z-50 transition-all duration-300 rounded-3xl ${
        isScrolled
            ? "bg-[#286675] backdrop-blur-md shadow-lg border-b-2 text-white"
            : "bg-[#286675] backdrop-blur-sm border-b text-white"
    }`}
        >
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    
                    <div
                    >
                        <img
                            src="/ladico_white.png"
                            alt="Ladico Logo"
                            className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => scrollTo('inicio')}
                        />

                    </div>


                    
                    <nav className="hidden md:flex space-x-3">
                        {["Inicio", "Características"].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase().replace("í", "i"))}
                                className="px-5 py-2.5 rounded-xl hover:bg-[#94b2ba] text-white hover:shadow-sm transition-all font-medium"
                            >
                                {item}
                            </button>
                        ))}
                        {user && (
                            <button
                                onClick={goToDashboard}
                                className="px-5 py-2.5 rounded-xl bg-white/20 text-white font-medium border border-white/30 hover:bg-white/30 transition-all"
                            >
                                Dashboard
                            </button>
                        )}
                    </nav>


                    
                    {user ? (
                        <div onClick={goToDashboard} className="hidden md:flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#94b2ba] text-white cursor-pointer hover:shadow-md hover:bg-[#94b2ba] transition-all">
                            <User className="h-5 w-5 text-white" />
                            <span className="font-medium">{userDisplayName}</span>
                        </div>
                    ) : (
                        <button onClick={goToLogin} className="hidden md:block px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#94b2ba] to-[#286675] text-white font-medium hover:shadow-md hover:from-gray-300 hover:bg-[#94b2ba] transition-all">
                            Comenzar
                        </button>
                    )}

                    
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-3 rounded-xl border-2 border-indigo-300/50 bg-white/20 hover:bg-white/30 transition-all"
                    >
                        {isMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
                    </button>
                </div>

                
                {isMenuOpen && (
                    <div className="md:hidden pb-6">
                        <div className=" rounded-2xl p-6 space-y-3">
                            {["Inicio", "Características"].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => scrollTo(item.toLowerCase().replace("í", "i"))}
                                    className="block w-full text-left px-4 py-3 rounded-xl text-white hover:bg-[#94b2ba] border-2 border-transparent hover:bg-[#94b2ba] transition-all"
                                >
                                    {item}
                                </button>
                            ))}
                            {user ? (
                                <>
                                    <button
                                        onClick={goToDashboard}
                                        className="block w-full text-left px-4 py-3 rounded-xl bg-white/20 text-white font-medium border-2 border-bg-[#94b2ba] hover:bg-white/30 transition-all"
                                    >
                                        Dashboard
                                    </button>
                                    <div onClick={goToDashboard} className="flex items-center space-x-2 px-4 py-3 mt-4 rounded-xl bg-gradient-to-r from-[#94b2ba] to-[#286675] text-white border-2 border-transparent cursor-pointer hover:shadow-md transition-all">
                                        <User className="h-5 w-5 text-white" />
                                        <span className="font-medium">{userDisplayName}</span>
                                    </div>
                                </>
                            ) : (
                                <button onClick={goToLogin} className="w-full px-6 py-3 mt-4 rounded-xl bg-gradient-to-r from-[#94b2ba] to-[#286675] text-white font-medium hover:shadow-md hover:from-gray-300 hover:bg-[#94b2ba] transition-all">
                                    Comenzar
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}
