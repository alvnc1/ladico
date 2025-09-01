"use client"

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserResult } from '@/types'

interface CompetenceProgressData {
  progress: Record<string, number>
  loading: boolean
  error: Error | null
}

export function useCompetenceProgress(): CompetenceProgressData {
  const { user } = useAuth()
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user?.uid || !db) {
      setLoading(false)
      return
    }

    setLoading(true)
    let unsubscribe: Unsubscribe | null = null

    try {
     
      const q = query(collection(db, "userResults"), where("userId", "==", user.uid))
      
      unsubscribe = onSnapshot(q, (querySnapshot) => {
        const competenceProgress: Record<string, { passed: number, total: number }> = {}
        
        querySnapshot.forEach((doc) => {
          const result = doc.data() as UserResult
          
          const competenceResults: Record<string, { correct: number, total: number }> = {}
          
          result.respuestas.forEach(respuesta => {
            if (!competenceResults[respuesta.competence]) {
              competenceResults[respuesta.competence] = { correct: 0, total: 0 }
            }
            
            competenceResults[respuesta.competence].total++
            if (respuesta.correcta) {
              competenceResults[respuesta.competence].correct++
            }
          })
          
          Object.entries(competenceResults).forEach(([competence, data]) => {
            if (!competenceProgress[competence]) {
              competenceProgress[competence] = { passed: 0, total: 0 }
            }
            
            competenceProgress[competence].total++
            
            if (data.correct / data.total >= 0.66) {
              competenceProgress[competence].passed++
            }
          })
        })
        
        const progressPercentages: Record<string, number> = {}
        
        Object.entries(competenceProgress).forEach(([competence, counts]) => {
          if (counts.passed > 0) {
            progressPercentages[competence] = 100
          } else if (counts.total > 0) {
            progressPercentages[competence] = 25
          } else {
            progressPercentages[competence] = 0
          }
        })
        
        setProgress(progressPercentages)
        setLoading(false)
        setError(null)
      }, (err) => {
        console.error("Error al cargar el progreso de las competencias:", err)
        setError(err instanceof Error ? err : new Error('Error desconocido'))
        setLoading(false)
      })
      
    } catch (err) {
      console.error("Error al configurar listener:", err)
      setError(err instanceof Error ? err : new Error('Error desconocido'))
      setLoading(false)
    }

   
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user?.uid])
  
  return { progress, loading, error }
}
