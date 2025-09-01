"use client"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CredentialTester() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testCredentials = async () => {
    if (!auth) {
      setResult("❌ Firebase Auth no está inicializado")
      return
    }

    setLoading(true)
    setResult("🔄 Validando credenciales...")

    try {
      
      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos")
      }

      if (!email.includes("@")) {
        throw new Error("Email no tiene formato válido")
      }

      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
      
      setResult(`✅ Credenciales válidas para: ${userCredential.user.email}
      
Información del usuario:
- UID: ${userCredential.user.uid}
- Email verificado: ${userCredential.user.emailVerified ? "Sí" : "No"}
- Proveedor: ${userCredential.user.providerData[0]?.providerId || "email"}
- Fecha de creación: ${userCredential.user.metadata.creationTime}
- Último acceso: ${userCredential.user.metadata.lastSignInTime}`)

    } catch (error: any) {
      let errorMessage = `❌ Error: ${error.code || 'unknown'}`
      
      switch (error.code) {
        case "auth/invalid-credential":
          errorMessage += `
          
El error 'invalid-credential' significa que:
• El email no existe en Firebase Auth
• La contraseña es incorrecta
• El usuario fue eliminado
• Hay un problema con la configuración de Firebase

Soluciones:
1. Verificar que el email esté registrado
2. Verificar que la contraseña sea correcta
3. Intentar registrar el usuario primero
4. Verificar la configuración de Firebase`
          break
        case "auth/user-not-found":
          errorMessage += `
          
El usuario no existe. Necesitas registrarlo primero.`
          break
        case "auth/wrong-password":
          errorMessage += `
          
La contraseña es incorrecta.`
          break
        case "auth/too-many-requests":
          errorMessage += `
          
Demasiados intentos fallidos. Espera un momento.`
          break
        case "auth/user-disabled":
          errorMessage += `
          
Esta cuenta ha sido deshabilitada.`
          break
        default:
          errorMessage += `
          
Mensaje: ${error.message}`
      }
      
      setResult(errorMessage)
      console.error("Credential test error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Probador de Credenciales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cred-email">Email</Label>
          <Input
            id="cred-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cred-password">Contraseña</Label>
          <Input
            id="cred-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="tu contraseña"
            disabled={loading}
          />
        </div>

        <Button 
          onClick={testCredentials}
          className="w-full"
          disabled={loading || !email || !password}
        >
          {loading ? "Validando..." : "Probar Credenciales"}
        </Button>

        {result && (
          <Alert className="mt-4">
            <AlertDescription>
              <pre className="text-xs whitespace-pre-wrap">{result}</pre>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Nota:</strong> Este componente solo valida credenciales existentes.</p>
          <p>Si el usuario no existe, usa el "Depurador de Autenticación" para registrarlo primero.</p>
        </div>
      </CardContent>
    </Card>
  )
}
