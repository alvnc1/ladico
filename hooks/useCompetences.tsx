"use client"

import { useState, useEffect } from 'react'
import { loadCompetences } from '@/services/questionsService'
import type { Competence } from '@/types'

let sharedCompetences: Competence[] | null = null;
let fetchPromise: Promise<Competence[]> | null = null;

interface UseCompetencesResult {
  competences: Competence[]
  loading: boolean
  error: Error | null
}

export function useCompetences(): UseCompetencesResult {
  const [competences, setCompetences] = useState<Competence[]>(sharedCompetences || [])
  const [loading, setLoading] = useState<boolean>(!sharedCompetences)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
   
    if (sharedCompetences) {
      return;
    }

   
    if (fetchPromise) {
      fetchPromise.then(data => {
        setCompetences(data);
        setLoading(false);
      }).catch(err => {
        console.error("Error al cargar competencias en useCompetences:", err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        setLoading(false);
      });
      return;
    }

   
    const fetchCompetences = async () => {
      try {
        setLoading(true);
        setError(null);
        
       
        fetchPromise = loadCompetences();
        const data = await fetchPromise;
        
       
        sharedCompetences = data;
        setCompetences(data);
      } catch (err) {
        console.error("Error al cargar competencias en useCompetences:", err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setLoading(false);
        fetchPromise = null;
      }
    };

    fetchCompetences();
  }, []);

  return { competences, loading, error };
}
