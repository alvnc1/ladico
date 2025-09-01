"use client"

import Sidebar from "@/components/Sidebar"

export default function CertificacionPage() {
  return (
    <div className="min-h-[100dvh] bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 lg:ml-64">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-[#286575]/20 p-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#286575] mb-4">
            Tu perfil aún no es certificable
          </h1>

          <p className="text-gray-700 mb-8 leading-relaxed">
            Para acceder a la certificación es necesario que hayas obtenido un{" "}
            <span className="font-semibold text-[#286575]">nivel superior a 0</span>{" "}
            en al menos <span className="font-semibold text-[#286575]">5 competencias</span>.
          </p>

          <a
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#286575] text-white font-semibold shadow-md hover:bg-[#3a7d89] transition-all"
          >
            Regresar al Dashboard
          </a>
        </div>
      </main>
    </div>
  )
}
