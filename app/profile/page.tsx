"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Trash2, User, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Sidebar from "@/components/Sidebar"

type TabKey = "profile" | "auth" | "delete"

export default function AccountPage() {
  const { user, userData } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>("profile")

  useEffect(() => {
    if (!user) router.push("/")
  }, [user, router])

  // Colores Ladico
  const brand = {
    primary: "#286675",
    primarySoft: "#94b2ba",
  }

  return (
    // === Igual que Dashboard: contenedor flex + Sidebar + main con lg:ml-64 ===
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* main con los mismos paddings que Dashboard */}
      <main className="flex-1 lg:ml-64 px-4 lg:px-8 py-4 lg:py-11">
        {/* ancho máximo igual que Dashboard */}
        <div className="max-w-7xl mx-auto">
          {/* Encabezado alineado como "Competencias" */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">Mi cuenta</h1>
            {/* Línea separadora sutil */}
            <div className="h-px w-full" style={{ background: `${brand.primary}22` }} />
          </div>

          {/* Contenido principal en tarjeta, similar a los bloques del Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
            {/* Sidebar interno */}
            <aside
              className="rounded-2xl p-3 md:p-4 bg-white"
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
              {/* Encabezado de panel */}
              <div className="px-5 py-4 border-b" style={{ borderColor: `${brand.primary}22` }}>
                {tab === "profile" && (
                  <h2 className="text-base font-semibold text-gray-900">Información personal</h2>
                )}
                {tab === "auth" && (
                  <h2 className="text-base font-semibold text-gray-900">Métodos de inicio de sesión</h2>
                )}
                {tab === "delete" && (
                  <h2 className="text-base font-semibold text-gray-900">Eliminar cuenta</h2>
                )}
              </div>

              {/* Contenido */}
              <div className="p-5 md:p-6">
                {tab === "profile" && (
                  <div className="space-y-4">
                    <Row label="Nombre" value={userData?.name || "-"} />
                    <Row label="Correo" value={user?.email || "-"} />
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

          {/* Footer simple (opcional) */}
          <div className="px-1 lg:px-0 pt-8 pb-2 text-xs text-gray-500">
            © {new Date().getFullYear()} Ladico
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
