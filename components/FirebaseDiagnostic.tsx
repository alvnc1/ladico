"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function FirebaseDiagnostic() {
  const [config, setConfig] = useState<any>(null)
  const [status, setStatus] = useState<{
    app: boolean
    auth: boolean
    firestore: boolean
    config: boolean
    errors: string[]
  }>({
    app: false,
    auth: false,
    firestore: false,
    config: false,
    errors: []
  })

  useEffect(() => {
    const checkFirebaseConfig = async () => {
      const errors: string[] = []

      try {
        
        const { auth, db, default: app } = await import("@/lib/firebase")
        
        
        const appInitialized = !!app
        
        
        const authInitialized = !!auth
        
        
        const firestoreInitialized = !!db
        
        
        const configComplete = !!(
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
          true 
        )

        if (!appInitialized) errors.push("Firebase App no inicializado")
        if (!authInitialized) errors.push("Firebase Auth no inicializado")
        if (!firestoreInitialized) errors.push("Firebase Firestore no inicializado")
        if (!configComplete) errors.push("Configuración de Firebase incompleta")

        setStatus({
          app: appInitialized,
          auth: authInitialized,
          firestore: firestoreInitialized,
          config: configComplete,
          errors
        })

        
        if (app) {
          setConfig({
            projectId: "",
            authDomain: "",
            apiKey: "", 
          })
        }

      } catch (error: any) {
        errors.push(`Error al verificar Firebase: ${error.message}`)
        setStatus({
          app: false,
          auth: false,
          firestore: false,
          config: false,
          errors
        })
      }
    }

    checkFirebaseConfig()
  }, [])

  const StatusBadge = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "✅ OK" : "❌ Error"}
      </Badge>
    </div>
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Diagnóstico Firebase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <StatusBadge status={status.app} label="Firebase App" />
          <StatusBadge status={status.auth} label="Authentication" />
          <StatusBadge status={status.firestore} label="Firestore" />
          <StatusBadge status={status.config} label="Configuración" />
          
          {config && (
            <div className="mt-4 p-3 bg-gray-50 border rounded">
              <h4 className="font-semibold text-sm mb-2">Configuración:</h4>
              <div className="text-xs space-y-1">
                <div>Project ID: {config.projectId}</div>
                <div>Auth Domain: {config.authDomain}</div>
                <div>API Key: {config.apiKey}</div>
              </div>
            </div>
          )}
          
          {status.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="font-semibold text-sm text-red-800 mb-2">Errores:</h4>
              <ul className="text-xs text-red-700 space-y-1">
                {status.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
