"use client"

import type React from "react"
import { useEffect, useState } from "react"

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

 
  useEffect(() => {
   
    const timer = setTimeout(() => {
      setMounted(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

 
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Inicializando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
