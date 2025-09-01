"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, onSnapshot, type Unsubscribe } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface UserData {
  uid: string
  name: string
  email: string
  age: number
  country: string
  LadicoScore: number
  completedCompetences: string[]
  currentLevel: "basico" | "intermedio" | "avanzado"
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, age: number, country: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let authUnsubscribe: (() => void) | undefined
    let userDocUnsubscribe: Unsubscribe | undefined

    const initAuth = async () => {
      try {
        if (!auth) {
          console.error("Firebase Auth not initialized")
          setLoading(false)
          return
        }

        authUnsubscribe = onAuthStateChanged(auth, async (user) => {
          try {
            if (user) {
              setUser(user)


              if (db) {
                userDocUnsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
                  if (docSnapshot.exists()) {
                    setUserData(docSnapshot.data() as UserData)
                  }
                  setLoading(false)
                }, (error) => {
                  console.error("Error en listener del documento del usuario:", error)
                  setLoading(false)
                })
              } else {
                setLoading(false)
              }
            } else {
              setUser(null)
              setUserData(null)

              if (userDocUnsubscribe) {
                userDocUnsubscribe()
                userDocUnsubscribe = undefined
              }
              setLoading(false)
            }
          } catch (error) {
            console.error("Error in auth state change:", error)
            setLoading(false)
          }
        })
      } catch (error) {
        console.error("Error initializing auth:", error)
        setLoading(false)
      }
    }


    initAuth()

    return () => {
      if (authUnsubscribe) {
        authUnsubscribe()
      }
      if (userDocUnsubscribe) {
        userDocUnsubscribe()
      }
    }
  }, [])

  const register = async (email: string, password: string, name: string, age: number, country: string) => {
    if (!auth || !db) {
      throw new Error("Firebase services not initialized")
    }

    try {

      if (!email || !password || !name || !age || !country) {
        throw new Error("Todos los campos son requeridos")
      }

      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)

      await updateProfile(user, { displayName: name })

      const userData: UserData = {
        uid: user.uid,
        name,
        email: email.trim(),
        age,
        country,
        LadicoScore: 0,
        completedCompetences: [],
        currentLevel: "basico",
      }

      await setDoc(doc(db, "users", user.uid), userData)
      setUserData(userData)
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth not initialized")
    }

    try {

      if (!email || !password) {
        throw new Error("Email y contraseña son requeridos")
      }

      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async () => {
    if (!auth) {
      throw new Error("Firebase Auth not initialized")
    }

    try {
      await signOut(auth)
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    }
  }

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
