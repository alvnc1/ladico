"use client"

import FirebaseTest from "@/components/FirebaseTest"
import AuthDebugger from "@/components/AuthDebugger"
import FirebaseDiagnostic from "@/components/FirebaseDiagnostic"
import CredentialTester from "@/components/CredentialTester"

export default function TestFirebasePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Test de Conexión Firebase
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="flex justify-center">
            <FirebaseTest />
          </div>
          
          <div className="flex justify-center">
            <FirebaseDiagnostic />
          </div>
          
          <div className="flex justify-center">
            <AuthDebugger />
          </div>
          
          <div className="flex justify-center">
            <CredentialTester />
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Instrucciones para resolver el error "invalid-credential"
          </h2>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Primero, verifica que Firebase esté correctamente conectado usando el "Estado de Firebase"</li>
            <li>Usa el "Depurador de Autenticación" para registrar un usuario de prueba</li>
            <li>Luego usa el "Probador de Credenciales" para validar que las credenciales funcionan</li>
            <li>Si todo funciona aquí, el problema está en tu formulario principal</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
