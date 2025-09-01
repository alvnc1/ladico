"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import AdminNavbar from "@/components/AdminNavbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  const isAdmin = user?.email?.endsWith('@admin.com')
  
  useEffect(() => {
    
    if (!loading && (!user || !isAdmin)) {
      router.push("/dashboard")
    }
  }, [user, loading, router, isAdmin])
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }
  
  
  if (!isAdmin && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso restringido</h2>
          <p className="text-gray-600 mb-6">
            Esta sección es exclusiva para administradores del sistema. Solo usuarios con correo terminado en @admin.com 
            pueden acceder al panel de administración.
          </p>
          <Button onClick={() => router.push("/dashboard")} className="w-full">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    )
  }
  
  
  return (
    <div className="admin-layout">
      <AdminNavbar />
      {children}
    </div>
  )
}