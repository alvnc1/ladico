// contexts/AuthContext.tsx
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

export type UserRole = "admin" | "profesor" | "user"

export interface UserData {
  uid: string
  name: string
  email: string
  age: number
  country: string
  gender: string
  LadicoScore: number
  completedCompetences: string[]
  currentLevel: "basico" | "intermedio" | "avanzado"
  role?: UserRole
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name: string,
    age: number,
    country: string,
    gender: string
  ) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isProfesor: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isProfesor, setIsProfesor] = useState(false)

  useEffect(() => {
    let authUnsub: (() => void) | undefined
    let userDocUnsub: Unsubscribe | undefined

    const init = async () => {
      try {
        if (!auth) {
          console.error("Firebase Auth not initialized")
          setLoading(false)
          return
        }

        authUnsub = onAuthStateChanged(auth, async (u) => {
          try {
            if (u) {
              setUser(u)

              if (db) {
                userDocUnsub = onSnapshot(
                  doc(db, "users", u.uid),
                  async (snap) => {
                    const fromDoc = snap.exists() ? (snap.data() as UserData) : null
                    const email = u.email || ""

                    // Inferir role si no existe en Firestore (puedes reemplazar por custom claims)
                    const inferredRole: UserRole =
                      fromDoc?.role ??
                      (email.endsWith("@admin.com")
                        ? "admin"
                        : email.endsWith("@profesor.com")
                        ? "profesor"
                        : "user")

                    const composed: UserData = {
                      uid: u.uid,
                      name: fromDoc?.name ?? u.displayName ?? "",
                      email: fromDoc?.email ?? email,
                      age: fromDoc?.age ?? 0,
                      country: fromDoc?.country ?? "",
                      gender: fromDoc?.gender ?? "",
                      LadicoScore: fromDoc?.LadicoScore ?? 0,
                      completedCompetences: fromDoc?.completedCompetences ?? [],
                      currentLevel: fromDoc?.currentLevel ?? "basico",
                      role: inferredRole,
                    }

                    setUserData(composed)
                    setIsAdmin(inferredRole === "admin")
                    setIsProfesor(inferredRole === "profesor")

                    // Persistir role inferido si faltaba
                    if (fromDoc && !fromDoc.role) {
                      try {
                        await setDoc(
                          doc(db, "users", u.uid),
                          { role: inferredRole },
                          { merge: true }
                        )
                      } catch (e) {
                        console.warn("No se pudo persistir role inferido:", e)
                      }
                    }

                    setLoading(false)
                  },
                  (err) => {
                    console.error("Error en listener del documento del usuario:", err)
                    setLoading(false)
                  }
                )
              } else {
                setLoading(false)
              }
            } else {
              setUser(null)
              setUserData(null)
              setIsAdmin(false)
              setIsProfesor(false)
              if (userDocUnsub) userDocUnsub()
              setLoading(false)
            }
          } catch (e) {
            console.error("Error in auth state change:", e)
            setLoading(false)
          }
        })
      } catch (e) {
        console.error("Error initializing auth:", e)
        setLoading(false)
      }
    }

    init()

    return () => {
      if (authUnsub) authUnsub()
      if (userDocUnsub) userDocUnsub()
    }
  }, [])

  const register: AuthContextType["register"] = async (
    email,
    password,
    name,
    age,
    country,
    gender
  ) => {
    if (!auth || !db) throw new Error("Firebase services not initialized")

    // Validaciones mínimas
    if (!email || !password || !name || age == null || !country || !gender) {
      throw new Error("Todos los campos son requeridos")
    }
    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres")
    }

    const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password)
    await updateProfile(u, { displayName: name })

    // Rol por dominio (mismo criterio que en el listener)
    const role: UserRole = email.endsWith("@admin.com")
      ? "admin"
      : email.endsWith("@profesor.com")
      ? "profesor"
      : "user"

    const data: UserData = {
      uid: u.uid,
      name,
      email: email.trim(),
      age,
      country,
      gender,
      LadicoScore: 0,
      completedCompetences: [],
      currentLevel: "basico",
      role,
    }

    await setDoc(doc(db, "users", u.uid), data)
    setUserData(data)
    setIsAdmin(role === "admin")
    setIsProfesor(role === "profesor")
  }

  const login: AuthContextType["login"] = async (email, password) => {
    if (!auth) throw new Error("Firebase Auth not initialized")
    if (!email || !password) throw new Error("Email y contraseña son requeridos")
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }

  const logout: AuthContextType["logout"] = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized")
    await signOut(auth)
  }

  const value: AuthContextType = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isProfesor,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
