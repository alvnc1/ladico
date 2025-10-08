"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Settings as Gear, Star } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

/** ⬇️ Namespacing por usuario (clave propia por uid) */
const STORAGE_NS = "ladico:4.2:avanzado:ej1"

/** ⬇️ Estado por defecto: TODO apagado (OFF) */
const DEFAULT_STATE: PersistedSim = {
  security: {
    changedPassword: false,
    enabled2FA: false,
    signedOutAllSessions: false,
    reviewedRecentActivity: false,
    securityAlerts: false,
    securityQuestionsEnabled: false,
    securityWord: "",
    savePasswords: false,
    rememberDevice: false,
    autoVacation: false,
  },
}

type PersistedSim = {
  security?: {
    changedPassword?: boolean
    enabled2FA?: boolean
    signedOutAllSessions?: boolean
    reviewedRecentActivity?: boolean
    securityAlerts?: boolean
    /** ⬇️ nuevo: activar preguntas de seguridad (resta 1 punto) */
    securityQuestionsEnabled?: boolean
    /** ⬇️ nuevo: palabra de seguridad (solo visible si lo anterior está activo) */
    securityWord?: string
    /** ⬇️ nuevos: distractores interactivos en login */
    savePasswords?: boolean
    rememberDevice?: boolean
    /** ⬇️ nuevo: respuestas automáticas de vacaciones (distractor interactivo) */
    autoVacation?: boolean
  }
}

type Folder = "inbox" | "sent" | "drafts" | "spam" | "bin"
type Message = {
  id: string
  from: string
  subject: string
  date: string
  unread?: boolean
  starred?: boolean
  folder: Folder
  body: string
}

/** Switch accesible con “pelota” negra y estado verde cuando está activo */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label || "toggle"}
      />
      <span
        className={`relative w-10 h-6 rounded-full border-2 transition-colors ${
          checked ? "bg-emerald-600 border-emerald-600" : "bg-gray-100 border-gray-300"
        }`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

/** Card contenedor consistente con el resto de la UI */
function SettingCard(props: { title: string; hint?: string; status?: string; done?: boolean; children: React.ReactNode }) {
  const { title, hint, status, done, children } = props
  return (
    <div className="rounded-2xl border-2 border-gray-200 p-4 hover:border-[#286575] transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          {hint && <p className="text-sm text-gray-600">{hint}</p>}
        </div>
        {status && (
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

export default function SimMailPage() {
  const { user } = useAuth()

  /** ⬇️ Clave por usuario (uid o 'anon') */
  const STORAGE_KEY = useMemo(
    () => `${STORAGE_NS}:u:${user?.uid ?? "anon"}`,
    [user?.uid]
  )

  /** ⬇️ Carga por-usuario con defaults OFF */
  const [persisted, setPersisted] = useState<PersistedSim>(DEFAULT_STATE)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setPersisted(raw ? (JSON.parse(raw) as PersistedSim) : DEFAULT_STATE)
    } catch {
      setPersisted(DEFAULT_STATE)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY])

  /** ⬇️ Guarda por-usuario */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
    } catch {}
  }, [persisted, STORAGE_KEY])

  const setFlag = (key: keyof NonNullable<PersistedSim["security"]>, value: boolean) => {
    setPersisted((p) => ({ ...p, security: { ...(p.security || {}), [key]: value } }))
  }
  const setSecurityWord = (v: string) => {
    setPersisted((p) => ({ ...p, security: { ...(p.security || {}), securityWord: v } }))
  }

  const changedPassword = !!persisted.security?.changedPassword
  const enabled2FA = !!persisted.security?.enabled2FA
  const signedOutAll = !!persisted.security?.signedOutAllSessions
  const reviewedActivity = !!persisted.security?.reviewedRecentActivity
  const alertsOn = !!persisted.security?.securityAlerts
  /** ⬇️ nuevos estados */
  const securityQEnabled = !!persisted.security?.securityQuestionsEnabled
  const securityWord = persisted.security?.securityWord ?? ""
  const savePasswords = !!persisted.security?.savePasswords
  const rememberDevice = !!persisted.security?.rememberDevice
  const autoVacation = !!persisted.security?.autoVacation

  /** ⬇️ Lógica de puntaje solicitada. */
  const score = useMemo(() => {
    let s = 0
    if (signedOutAll) s += 1
    if (alertsOn) s += 1
    if (securityQEnabled) s -= 1
    if (changedPassword) s += 1
    if (enabled2FA) s += 1
    return s
  }, [signedOutAll, alertsOn, securityQEnabled, changedPassword, enabled2FA])

  /** ⬇️ Guardamos el puntaje por usuario (no altera la UI) */
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:score`, String(score))
    } catch {}
  }, [score, STORAGE_KEY])

  // Estado correo
  const [folder, setFolder] = useState<Folder>("inbox")
  const [openSettings, setOpenSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<
    "security" | "devices" | "login" | "alerts"
  >("security")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Mensajes demo
  const MESSAGES: Message[] = [
    {
      id: "m1",
      from: "Fanny <fanny@salsa-tango.org>",
      subject: "No dance class over the holidays",
      date: "13 Sept. 2025 09:42",
      unread: true,
      folder: "inbox",
      body:
        "Hi! Just a heads up that there will be no class during the holiday period. See you next month!",
    },
    {
      id: "m2",
      from: "Mysocial <no-reply@mysocial.org>",
      subject: "Your password has been updated",
      date: "13 Sept. 2025 01:23",
      starred: true,
      folder: "inbox",
      body:
        "Security notice: Your account password was changed. If this wasn't you, please review your security settings immediately.",
    },
    {
      id: "m3",
      from: "Trail <registration@trail-mountain.net>",
      subject: "Trail - mandatory medical certificate",
      date: "12 Sept. 2025 07:28",
      folder: "inbox",
      body:
        "Remember to upload your medical certificate before race day. This is required to validate your registration.",
    },
    {
      id: "m4",
      from: "Barbara <barbara@pixmail.org>",
      subject: "Happy holidays",
      date: "11 Aug. 2025 10:34",
      folder: "inbox",
      body:
        "Wishing you a great holiday! Let’s catch up when you’re back.",
    },
  ]

  const list = MESSAGES.filter((m) => m.folder === folder)
  const selected = list.find((m) => m.id === selectedId) || null

  useEffect(() => {
    if (selectedId && !list.some((m) => m.id === selectedId)) setSelectedId(null)
  }, [folder]) // eslint-disable-line react-hooks/exhaustive-deps

  // ⬇️ UI local para que SIEMPRE inicie como Activa y sólo pase a Desactiva tras el click
  const [signedOutThisView, setSignedOutThisView] = useState(false)

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Barra superior (mantener) */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[#286575]">
              <Link href="/exercises/comp-4-2/avanzado/ej1" className="inline-flex items-center gap-2 hover:underline">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Volver al enunciado</span>
              </Link>
              <span className="text-sm opacity-70">| 4.2 Avanzado · Entorno simulado</span>
            </div>

            {/* Botón SOLO con tuerca */}
            <button
              onClick={() => setOpenSettings(true)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl border-2 border-gray-200 hover:border-[#286575] hover:bg-gray-50"
              title="Configuración"
              aria-label="Abrir configuración"
            >
              <Gear className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Cliente de correo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Card className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <CardContent className="p-0">
            {/* Grid: x (menú) | arriba lector — abajo lista */}
            <div className="grid grid-cols-12">
              {/* x: Menú izquierdo */}
              <aside className="col-span-12 md:col-span-3 border-r border-gray-200">
                <div className="p-3">
                  <Button
                    className="w-full mb-3 bg-[#286575] hover:bg-[#3a7d89] text-white rounded-xl"
                    onClick={() => setFolder("inbox")}
                  >
                    New message
                  </Button>

                  <nav className="text-sm space-y-1">
                    {([
                      { id: "inbox", label: "Inbox", badge: listCount(MESSAGES, "inbox") },
                      { id: "sent", label: "Sent messages", badge: 0 },
                      { id: "drafts", label: "Drafts", badge: 0 },
                      { id: "spam", label: 0 ? "Spam" : "Spam", badge: 0 },
                      { id: "bin", label: "Bin", badge: 0 },
                    ] as { id: Folder; label: string; badge?: number }[]).map((f) => {
                      const active = folder === f.id
                      return (
                        <button
                          key={f.id}
                          onClick={() => setFolder(f.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                            active
                              ? "bg-[#e6f2f3] text-[#1f4b57] border-2 border-[#286575]"
                              : "hover:bg-gray-50 border-2 border-transparent"
                          }`}
                        >
                          <span>{f.label}</span>
                          {!!f.badge && (
                            <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{f.badge}</span>
                          )}
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </aside>

              {/* — y ooo: Panel derecho en dos filas */}
              <section className="col-span-12 md:col-span-9">
                {/* —: Lector (arriba) */}
                <div className="p-4 border-b border-gray-200">
                  {!selected ? (
                    <div className="rounded-2xl border-2 border-gray-200 p-6 text-sm text-gray-600">
                      No selected message
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
                      <div className="mb-3">
                        <div className="text-xs text-gray-500">From</div>
                        <div className="font-medium text-gray-900">{selected.from}</div>
                      </div>
                      <div className="mb-3">
                        <div className="text-xs text-gray-500">Subject</div>
                        <div className="font-semibold text-gray-900">{selected.subject}</div>
                      </div>
                      <div className="mb-4 text-xs text-gray-500">{selected.date}</div>
                      <div className="text-sm text-gray-700 whitespace-pre-line">{selected.body}</div>
                    </div>
                  )}
                </div>

                {/* ooo: Lista (abajo) */}
                <div className="p-4">
                  <div className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="w-10 px-3 py-2 text-left">
                            <input type="checkbox" className="rounded border-gray-300" />
                          </th>
                          <th className="px-3 py-2 text-left">From</th>
                          <th className="px-3 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((m) => {
                          const active = m.id === selectedId
                          return (
                            <tr
                              key={m.id}
                              onClick={() => setSelectedId(m.id)}
                              className={`cursor-pointer border-t border-gray-100 ${
                                active ? "bg-[#e6f2f3]" : "hover:bg-gray-50"
                              }`}
                            >
                              <td className="px-3 py-2">
                                <input type="checkbox" className="rounded border-gray-300" />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {m.starred && <Star className="inline w-4 h-4 text-amber-400 mr-1" />}
                                <span className={m.unread ? "font-semibold text-gray-900" : "text-gray-800"}>
                                  {m.from}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={m.unread ? "font-semibold" : ""}>{m.subject}</span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">{m.date}</td>
                            </tr>
                          )
                        })}
                        {list.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                              No messages.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawer de Configuración */}
      {openSettings && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setOpenSettings(false)} />
          <div className="w-full max-w-xl h-full bg-white border-l border-gray-200 shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configuración</h3>
              <button
                className="text-sm px-3 py-1.5 rounded-xl border-2 border-gray-200 hover:border-[#286575]"
                onClick={() => setOpenSettings(false)}
              >
                Cerrar
              </button>
            </div>

            {/* Pestañas (solo las que pediste mantener) */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  ["security", "Seguridad de la cuenta"],
                  ["login", "Inicio de sesión y verificación"],
                  ["devices", "Dispositivos y actividad"],
                  ["alerts", "Alertas y notificaciones"],
                ] as [typeof settingsTab, string][]
              ).map(([id, label]) => {
                const active = settingsTab === id
                return (
                  <button
                    key={id}
                    onClick={() => setSettingsTab(id)}
                    className={`px-3 py-2 rounded-2xl border-2 text-sm transition-colors ${
                      active ? "border-[#286575] bg-[#e6f2f3]" : "border-gray-200 hover:border-[#286575] hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* 1) Seguridad de la cuenta */}
            {settingsTab === "security" && (
              <div className="space-y-4">
                {/* ✅ Preguntas de seguridad (resta 1 punto si se activa) */}
                <SettingCard title="Preguntas de seguridad para recuperar la contraseña">
                  <div className="flex items-center justify-between">
                    <ToggleSwitch
                      checked={securityQEnabled}
                      onChange={(v) => setFlag("securityQuestionsEnabled", v)}
                      label={securityQEnabled ? "Activadas" : "Desactivadas"}
                    />
                  </div>
                  {securityQEnabled && (
                    <div className="mt-3">
                      <label className="text-sm text-gray-700 block mb-1">Palabra de seguridad</label>
                      <input
                        type="text"
                        value={securityWord}
                        onChange={(e) => setSecurityWord(e.target.value)}
                        className="w-full rounded-2xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
                        placeholder="Escribe tu palabra de seguridad"
                      />
                    </div>
                  )}
                  {/* Nota para lógica de puntaje (no visible al usuario):
                      - Si securityQuestionsEnabled === true → resta 1 punto */}
                </SettingCard>

                {/* ⛔ Idioma y Modo oscuro ocultos (no se borran del código) */}
                {false && (
                  <SettingCard title="Configurar idioma de la interfaz">
                    <select className="rounded-2xl border-2 border-gray-200 px-3 py-2 text-sm">
                      <option>Español (Chile)</option>
                      <option>Español (México)</option>
                      <option>English (US)</option>
                    </select>
                  </SettingCard>
                )}
                {false && (
                  <SettingCard title="Activar modo oscuro">
                    <ToggleSwitch checked={false} onChange={() => {}} label="Modo oscuro" />
                  </SettingCard>
                )}

                {/* ✅ Cambiar contraseña (sin tips ni “Pendiente”) */}
                <PasswordChanger
                  done={changedPassword}
                  onSuccess={() => setFlag("changedPassword", true)}
                />
              </div>
            )}

            {/* 2) Inicio de sesión y verificación */}
            {settingsTab === "login" && (
              <div className="space-y-4">
                <SettingCard title="Guardar automáticamente contraseñas en el navegador">
                  <ToggleSwitch
                    checked={savePasswords}
                    onChange={(v) => setFlag("savePasswords" as any, v)}
                    label={savePasswords ? "Activado" : "Desactivado"}
                  />
                </SettingCard>

                {/* ✅ 2FA (sin badge de estado; solo el switch indica el estado) */}
                <SettingCard title="Activar verificación en dos pasos (2FA)">
                  <ToggleSwitch
                    checked={enabled2FA}
                    onChange={(v) => setFlag("enabled2FA", v)}
                    label={enabled2FA ? "Activado" : "Desactivado"}
                  />
                </SettingCard>

                <SettingCard title="Recordar siempre este dispositivo">
                  <ToggleSwitch
                    checked={rememberDevice}
                    onChange={(v) => setFlag("rememberDevice" as any, v)}
                    label={rememberDevice ? "Activado" : "Desactivado"}
                  />
                </SettingCard>
              </div>
            )}

            {/* 3) Dispositivos y actividad */}
            {settingsTab === "devices" && (
              <div className="space-y-4">
                {/* ✅ Administrar sesiones abiertas (ambos Activa al inicio; tras cerrar → Desactiva y suma punto) */}
                <SettingCard title="Administrar sesiones abiertas">
                  <div className="rounded-2xl border-2 border-gray-200 p-3">
                    <RowDevice name="Chrome · PC Oficina" meta="Santiago, CL · Hace 2 horas" active={!signedOutThisView} />
                    <hr className="my-3 border-gray-200" />
                    <RowDevice name="Safari · iPhone 13" meta="Providencia, CL · Hace 1 día" active={!signedOutThisView} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      className="rounded-xl bg-[#286575] hover:bg-[#3a7d89] text-white"
                      onClick={() => {
                        setFlag("signedOutAllSessions", true) // registra el punto
                        setSignedOutThisView(true)           // cambia UI a Desactiva sólo tras el click
                      }}
                    >
                      Cerrar todas las sesiones
                    </Button>
                  </div>
                </SettingCard>
              </div>
            )}

            {/* 4) Alertas y notificaciones */}
            {settingsTab === "alerts" && (
              <div className="space-y-4">
                <SettingCard title="Cambiar tono de las notificaciones">
                  <select className="rounded-2xl border-2 border-gray-200 px-3 py-2 text-sm">
                    <option>Clásico</option>
                    <option>Suave</option>
                    <option>Silencio</option>
                  </select>
                </SettingCard>

                {/* ✅ Alertas de seguridad (empieza desactivada; sin texto superior derecho; vale 1 punto) */}
                <SettingCard title="Alertas de seguridad">
                  <ToggleSwitch
                    checked={alertsOn}
                    onChange={(v) => setFlag("securityAlerts", v)}
                    label={alertsOn ? "Activadas" : "Desactivadas"}
                  />
                </SettingCard>

                <SettingCard title="Respuestas automáticas de vacaciones">
                  <ToggleSwitch
                    checked={autoVacation}
                    onChange={(v) => setFlag("autoVacation" as any, v)}
                    label={autoVacation ? "Activadas" : "Desactivadas"}
                  />
                </SettingCard>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function listCount(all: Message[], folder: Folder) {
  return all.filter((m) => m.folder === folder).length
}

function RowDevice({ name, meta, active }: { name: string; meta: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <div className="font-medium text-gray-900">{name}</div>
        <div className="text-gray-500">{meta}</div>
      </div>
      <span className="text-xs text-gray-500">{active ? "Activa" : "Desactiva"}</span>
    </div>
  )
}

/** Bloque de “Cambiar contraseña” con validación fuerte (sin pistas) */
function PasswordChanger({
  done,
  onSuccess,
}: {
  done: boolean
  onSuccess: () => void
}) {
  const [newPwd, setNewPwd] = useState("")
  const [repPwd, setRepPwd] = useState("")
  const [error, setError] = useState<string | null>(null)

  const strong = useMemo(() => {
    const len = newPwd.length >= 8
    const upper = /[A-Z]/.test(newPwd)
    const lower = /[a-z]/.test(newPwd)
    const digit = /[0-9]/.test(newPwd)
    const special = /[^A-Za-z0-9]/.test(newPwd)
    return { ok: len && upper && lower && digit && special }
  }, [newPwd])

  const handleSave = () => {
    if (!strong.ok) {
      // ❗️error genérico para no dar pistas
      setError("La contraseña no cumple los requisitos mínimos.")
      return
    }
    if (newPwd !== repPwd) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setError(null)
    onSuccess()
  }

  return (
    <SettingCard
      title="Cambiar contraseña"
      /* sin hint ni estado 'Pendiente' */
      status={done ? "Hecho" : undefined}
      done={done}
    >
      <div className="grid sm:grid-cols-3 gap-2">
        <input
          type="password"
          placeholder="Nueva contraseña"
          className="rounded-2xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
        />
        <input
          type="password"
          placeholder="Repetir nueva contraseña"
          className="rounded-2xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#286575]"
          value={repPwd}
          onChange={(e) => setRepPwd(e.target.value)}
        />
        <Button
          className="rounded-xl bg-[#286575] hover:bg-[#3a7d89] text-white"
          onClick={handleSave}
        >
          Guardar contraseña
        </Button>
      </div>

      {/* ⛔ Se quitaron los indicadores para no dar pistas */}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </SettingCard>
  )
}

function DummyBox({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 p-4 bg-white">
      <div className="font-semibold text-gray-900">{title}</div>
      <p className="text-sm text-gray-600 mt-1">{desc}</p>
      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" /> Opción A
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" /> Opción B
        </label>
      </div>
    </div>
  )
}
