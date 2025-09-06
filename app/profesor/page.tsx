"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function ProfesorPage() {
  const { user, isProfesor, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace("/login")
    else if (!isProfesor) router.replace("/") // o /403
  }, [user, isProfesor, loading, router])

  if (loading) return null
  if (!user || !isProfesor) return null

  return <div>Panel del profesor</div>
}
