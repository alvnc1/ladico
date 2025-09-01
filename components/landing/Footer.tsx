"use client"

import { Github, Twitter, Linkedin, Mail, Zap } from "lucide-react"

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-2">
                            <img
                            src="/ladico_white.png"
                            alt="Ladico Logo"
                            className="w-32 max-w-full object-contain ml-1"
                            />
                        </div>
                        <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
                            Impulsando tus competencias digitales hacia el futuro.
                        </p>
                        <p className="text-gray-400 mb-8 max-w-md leading-relaxed">
                            {currentYear} Ladico. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
