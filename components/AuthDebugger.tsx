"use client"

import { useState } from "react"
import { auth } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"

export default function AuthDebugger() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testRegister = async () => {
    if (!auth) {
      setStatus("❌ Firebase Auth no inicializado")
      return
    }

    setLoading(true)
    setStatus("🔄 Registrando usuario...")

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      setStatus(`✅ Usuario registrado: ${userCredential.user.email}`)
    } catch (error: any) {
      setStatus(`❌ Error al registrar: ${error.code} - ${error.message}`)
      console.error("Registration error:", error)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    if (!auth) {
      setStatus("❌ Firebase Auth no inicializado")
      return
    }

    setLoading(true)
    setStatus("🔄 Iniciando sesión...")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setStatus(`✅ Sesión iniciada: ${userCredential.user.email}`)
    } catch (error: any) {
      setStatus(`❌ Error al iniciar sesión: ${error.code} - ${error.message}`)
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  const testFirebaseConnection = () => {
    if (!auth) {
      setStatus("❌ Firebase Auth no está disponible")
      return
    }

    setStatus("✅ Firebase Auth está conectado correctamente")
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Depurador de Autenticación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Email de prueba</Label>
          <Input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-password">Contraseña de prueba</Label>
          <Input
            id="test-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testFirebaseConnection} 
            variant="outline" 
            className="w-full"
            disabled={loading}
          >
            Probar Conexión Firebase
          </Button>
          
          <Button 
            onClick={testRegister} 
            className="w-full"
            disabled={loading || !email || !password}
          >
            Registrar Usuario de Prueba
          </Button>
          
          <Button 
            onClick={testLogin} 
            variant="secondary" 
            className="w-full"
            disabled={loading || !email || !password}
          >
            Iniciar Sesión de Prueba
          </Button>
        </div>

        {status && (
          <div className="mt-4 p-3 bg-gray-50 border rounded">
            <p className="text-sm whitespace-pre-wrap">{status}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
