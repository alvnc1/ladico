"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function FirebaseTest() {
  const [status, setStatus] = useState({
    auth: false,
    firestore: false,
    error: null as string | null,
  })

  useEffect(() => {
    const checkFirebase = () => {
      try {
        setStatus({
          auth: !!auth,
          firestore: !!db,
          error: null,
        })
      } catch (error: any) {
        setStatus({
          auth: false,
          firestore: false,
          error: error.message,
        })
      }
    }

    checkFirebase()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Estado de Firebase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Authentication:</span>
            <span className={status.auth ? "text-green-600" : "text-red-600"}>
              {status.auth ? "✅ Conectado" : "❌ Error"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Firestore:</span>
            <span className={status.firestore ? "text-green-600" : "text-red-600"}>
              {status.firestore ? "✅ Conectado" : "❌ Error"}
            </span>
          </div>
          {status.error && (
            <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">Error: {status.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
 