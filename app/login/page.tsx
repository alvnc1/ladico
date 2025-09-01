"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import AuthForm from "@/components/AuthForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      
      <nav className="relative z-10 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-lg border border-white/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/")}
                  className="text-[#286675] hover:text-[#94b2ba] hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Inicio
                </Button>
              </div>
              
              <div className="text-center overflow-visible -mt-2">

              </div>
              
              <div className="w-20"></div> 
            </div>
          </div>
        </div>
      </nav>

      
      <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 lg:mb-4">
              Desarrolla tus competencias digitales
            </h2>
            <p className="text-gray-600 text-sm lg:text-base">
              Evalúa y mejora tus habilidades digitales con nuestra plataforma especializada
            </p>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 lg:py-10 px-6 lg:px-8 shadow-xl rounded-2xl lg:rounded-3xl border border-gray-200">
            <AuthForm />
          </div>
        </div>
        
        
        <div className="py-8 lg:py-12"></div>
      </div>
    </div>
  )
}
