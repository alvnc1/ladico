"use client"

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'

interface QuestionsCountData {
  counts: Record<string, number>
  loading: boolean
  error: Error | null
}

export function useQuestionsCount(): QuestionsCountData {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchQuestionsCount = async () => {
      if (!db) {
        console.error("Firestore no está inicializado")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        
        const competenceCodes = ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4"]
        const competenceCounts: Record<string, number> = {}
        
        
        await Promise.all(competenceCodes.map(async (code) => {
          if (!db) return;
          
          const q = query(
            collection(db, "questions"),
            where("competence", "==", code)
          )
          
          const snapshot = await getCountFromServer(q)
          competenceCounts[code] = snapshot.data().count
        }))
        
        setCounts(competenceCounts)
        setLoading(false)
      } catch (err) {
        console.error("Error al obtener conteo de preguntas:", err)
        setError(err instanceof Error ? err : new Error('Error desconocido'))
        setLoading(false)
      }
    }

    if (user) {
      fetchQuestionsCount()
    }
  }, [user])

  return { counts, loading, error }
}
