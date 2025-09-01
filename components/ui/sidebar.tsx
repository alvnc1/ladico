"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Home, Award, BookOpen, HelpCircle, LogOut, Settings, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Competencias", href: "/dashboard", icon: Award },
]

export default function Sidebar() {
  const { logout, userData, user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  
  const isAdmin = user?.email?.endsWith('@admin.com') || false

  return (
    <>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[110] p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg focus:outline-none"
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        style={{ margin: 0, border: 0 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[120]"
          onClick={() => setIsOpen(false)}
        />
      )}

      
      <div className={`
        fixed top-0 left-0 h-[100dvh] w-[80vw] max-w-xs lg:inset-y-0 lg:left-4 lg:w-56 Ladico-sidebar rounded-none lg:rounded-2xl shadow-xl border border-indigo-300/20 z-[105] transition-transform duration-300
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-64'}
      `}>
        <div className="flex flex-col h-full justify-between py-4 lg:py-6">
          <div>
            <div className="flex items-center justify-center h-14 px-3 border-b border-white/10">
              <h1 className="text-xl font-bold text-white">Ladico</h1>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)} 
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors border border-transparent ${isActive ? "bg-white/20 text-white border-white/20" : "text-white/70 hover:bg-white/10 hover:text-white hover:border-white/10"
                      }`}
                  >
                    <item.icon className="w-4 h-4 mr-2.5" />
                    {item.name}
                  </Link>
                )
              })}

              
              {isAdmin && (
                <>
                  <div className="my-3 border-t border-white/10"></div>
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors border border-transparent ${pathname.startsWith('/admin')
                      ? "bg-orange-500/20 text-orange-200 border-orange-400/20"
                      : "text-orange-200/70 hover:bg-orange-500/10 hover:text-orange-200 hover:border-orange-400/10"
                      }`}
                  >
                    <Settings className="w-4 h-4 mr-2.5" />
                    Administración
                  </Link>
                </>
              )}
            </nav>

            <div className="p-3 border-t border-white/20 mt-auto">
              <div className="flex items-center mb-3 p-2.5 bg-white/10 rounded-lg border border-white/10">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold border border-white/20 text-sm">
                  {userData?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="ml-2.5 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{userData?.name}</p>
                  <p className="text-xs text-white/70 truncate">{userData?.email}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
              >
                <LogOut className="w-3.5 h-3.5 mr-2.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
