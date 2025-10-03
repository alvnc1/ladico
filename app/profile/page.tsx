// app/account/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Trash2, User, Link as LinkIcon, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

type TabKey = "profile" | "auth" | "delete"

{/* const countries = [
  "Argentina","Bolivia","Brasil","Chile","Colombia","Costa Rica","Cuba",
  "Ecuador","El Salvador","Guatemala","Honduras","México","Nicaragua",
  "Panamá","Paraguay","Perú","República Dominicana","Uruguay","Venezuela",
]
*/}
const countries = [
  "Argentina","Chile","Colombia","Perú","Uruguay"
]

const genders = ["Femenino", "Masculino", "Prefiero no decir"]

export default function AccountPage() {
  const { user, userData, isProfesor } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>("profile")

  // Estado editable (solo profesor)
  const [country, setCountry] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [age, setAge] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) router.push("/")
  }, [user, router])

  useEffect(() => {
    setCountry((userData?.country ?? "").trim())
    setGender((userData?.gender ?? "").trim())
    setAge(userData?.age != null ? String(userData.age) : "")
  }, [userData?.country, userData?.gender, userData?.age])

  const brand = useMemo(
    () => ({
      primary: "#286675",
      primarySoft: "#94b2ba",
    }),
    []
  )

  const handleSave = async () => {
    if (!user || !isProfesor) return
    try {
      setSaving(true)

      const ageNum =
        age.trim() === "" ? null : Number.isFinite(Number(age)) ? Number(age) : NaN
      if (ageNum !== null && Number.isNaN(ageNum)) {
        alert("Edad debe ser un número válido.")
        return
      }

      const payload: Record<string, any> = {
        country: country.trim() || "",
        gender: gender.trim() || "",
        age: ageNum,
      }

      await updateDoc(doc(db, "users", user.uid), payload)
      alert("Datos actualizados correctamente.")
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "No se pudo actualizar la información.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-11">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">Mi cuenta</h1>
            <div className="h-px w-full" style={{ background: `${brand.primary}22` }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
            {/* Sidebar interno */}
            <aside
              className="rounded-2xl p-3 md:p-4 bg-white self-start"
              style={{ border: `1px solid ${brand.primary}22` }}
            >
              <nav className="space-y-2">
                <button
                  onClick={() => setTab("profile")}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                    tab === "profile" ? "text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ background: tab === "profile" ? brand.primary : "transparent" }}
                >
                  <User className="w-4 h-4" />
                  Mi información personal
                </button>

                <button
                  onClick={() => setTab("auth")}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                    tab === "auth" ? "text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ background: tab === "auth" ? brand.primary : "transparent" }}
                >
                  <LinkIcon className="w-4 h-4" />
                  Mis métodos de inicio de sesión
                </button>

                <button
                  onClick={() => setTab("delete")}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
                    tab === "delete" ? "text-white" : "text-red-600 hover:bg-red-50"
                  }`}
                  style={{ background: tab === "delete" ? "#e11d48" : "transparent" }}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar mi cuenta
                </button>
              </nav>
            </aside>

            {/* Panel derecho */}
            <section
              className="rounded-2xl bg-white"
              style={{ border: `1px solid ${brand.primary}22` }}
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: `${brand.primary}22` }}>
                {tab === "profile" && (
                  <h2 className="text-base font-semibold text-gray-900">Información personal</h2>
                )}
                {tab === "auth" && (
                  <h2 className="text-base font-semibold text-gray-900">
                    Métodos de inicio de sesión
                  </h2>
                )}
                {tab === "delete" && (
                  <h2 className="text-base font-semibold text-gray-900">Eliminar cuenta</h2>
                )}
              </div>

              <div className="p-5 md:p-6">
                {tab === "profile" && (
                  <div className="space-y-4">
                    <Row label="Nombre" value={userData?.name || "-"} />
                    <Row label="Correo" value={user?.email || "-"} />

                    {/* Rol visible */}
                    <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] py-3 border-b border-gray-300">
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        Rol
                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-900">
                        {userData?.role ?? "user"}
                        {isProfesor && (
                          <span
                            className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                            style={{ borderColor: `${brand.primary}55`, color: brand.primary }}
                          >
                            profesor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Campos nuevos: solo edita profesor; resto, lectura */}
                    {isProfesor ? (
                      <>
                        {/* País */}
                        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] py-3 border-b border-gray-300">
                          <div className="text-sm text-gray-600">País</div>
                          <div className="flex items-center gap-3">
                            <div className="w-full max-w-sm">
                              <Select value={country} onValueChange={setCountry} disabled={saving}>
                              <SelectTrigger className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] h-11 lg:h-12">
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                              <SelectContent className="bg-white rounded-2xl border border-gray-200 shadow-lg">
                                {countries.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>
                          </div>
                        </div>

                        {/* Género */}
                        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] py-3 border-b border-gray-300">
                          <div className="text-sm text-gray-600">Género</div>
                          <div className="w-full max-w-sm">
                            <Select value={gender} onValueChange={setGender} disabled={saving}>
                            <SelectTrigger className="rounded-2xl border-2 border-gray-200 focus:border-[#286675] h-11 lg:h-12">
                              <SelectValue placeholder="Selecciona" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-2xl border border-gray-200 shadow-lg">
                              {genders.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          </div>
                        </div>

                        {/* Edad */}
                        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] py-3 border-b border-gray-300">
                          <div className="text-sm text-gray-600">Edad</div>
                          <div className="w-full max-w-sm">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="rounded-2xl border-2 border-gray-200 focus-visible:ring-0 focus-visible:border-[#286675] h-11 lg:h-12"
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            className="rounded-2xl bg-[#286675] hover:bg-[#1f4e59] text-white"
                            onClick={handleSave}
                            disabled={
                              saving ||
                              (country.trim() === (userData?.country ?? "").trim() &&
                                gender.trim() === (userData?.gender ?? "").trim() &&
                                (age.trim() === "" ? null : Number(age)) ===
                                  (userData?.age ?? null))
                            }
                          >
                            {saving ? "Guardando..." : "Guardar"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Row label="País" value={userData?.country || "-"} />
                        <Row label="Género" value={userData?.gender || "-"} />
                        <Row label="Edad" value={String(userData?.age ?? "-")} />
                      </>
                    )}
                  </div>
                )}

                {tab === "auth" && (
                  <div className="space-y-5">
                    <div
                      className="p-4 rounded-xl border"
                      style={{ borderColor: `${brand.primary}22` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: `${brand.primary}10`, color: brand.primary }}
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Proveedor</p>
                          <p className="text-xs text-gray-500">Email &amp; Password (Firebase Auth)</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button className="bg-[#286675] hover:bg-[#1f4e59] text-white">
                        Cambiar contraseña
                      </Button>
                    </div>
                  </div>
                )}

                {tab === "delete" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Esta acción eliminará permanentemente tu cuenta y todos tus datos asociados. No se puede deshacer.
                    </p>
                    <Button
                      variant="destructive"
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-3xl"
                      onClick={() => alert("Aquí llamas a tu lógica de borrado")}
                    >
                      Eliminar mi cuenta
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] py-3 border-b border-gray-300 last:border-b-0">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  )
}
