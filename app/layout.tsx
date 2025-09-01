import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import ClientWrapper from "@/components/ClientWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Ladico | Simple y Directo",
  description: "La plataforma más simple para transformar tu experiencia digital",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={inter.className}>
        
        <ClientWrapper>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ClientWrapper>
      </body>
    </html>
  )
}
