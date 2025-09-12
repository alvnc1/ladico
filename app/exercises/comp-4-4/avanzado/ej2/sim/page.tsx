"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Wifi,
  Plane,
  Bluetooth,
  Signal,
  BatteryFull,
  Cog,
  Info,
  Bell,
  Accessibility,
  Smartphone,
  Mail,
  Youtube,
  Grid,
  Globe,
} from "lucide-react"

type Screen =
  | "root"
  | "wifi"
  | "bluetooth"
  | "celular"
  | "bateria"
  | "general"
  | "info"
  | "software"
  | "accesibilidad"
  | "accesibilidad_display"
  | "notificaciones"
  | "apps"            // ← nueva pantalla contenedora
  | "app_gmail"
  | "app_youtube"

export default function SettingsSim() {
  const [screen, setScreen] = useState<Screen>("root")

  // === Estado inicial EXACTO según tu mapa ===
  const [modoVuelo, setModoVuelo] = useState(false)

  const [wifiOn, setWifiOn] = useState(true)
  const [wifiAskToJoin, setWifiAskToJoin] = useState(false)

  const [btOn, setBtOn] = useState(true)
  const [btAutoConnect, setBtAutoConnect] = useState(true)

  const [cellData, setCellData] = useState(true)
  const [hotspot, setHotspot] = useState(true)

  const [batteryPercent, setBatteryPercent] = useState(true)
  const [batterySaver, setBatterySaver] = useState(true)

  const [autoUpdate, setAutoUpdate] = useState(true)

  const [boldText, setBoldText] = useState(true)
  const [largerText, setLargerText] = useState(true)
  const [labels, setLabels] = useState(true)

  const [notifMaster, setNotifMaster] = useState(true)
  const [notifPreview, setNotifPreview] = useState(true)

  const [gmailWifiOnlyAttachments, setGmailWifiOnlyAttachments] = useState(false)
  const [gmailPush, setGmailPush] = useState(false)

  const [ytDefaultQuality, setYtDefaultQuality] = useState(false)
  const [ytOfflineDownloads, setYtOfflineDownloads] = useState(false)

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Breadcrumb */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3 text-[#286575]">
            <Link href="/exercises/comp-4-4/avanzado/ej2" className="inline-flex items-center gap-2 hover:underline">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver al enunciado</span>
            </Link>
            <span className="text-sm opacity-70">| 4.4 Avanzado · Entorno simulado</span>
          </div>
        </div>
      </div>

      {/* Teléfono */}
      <div className="flex items-center justify-center p-6">
        <PhoneFrame>
          <StatusBar />

          {/* Encabezado raíz y nav interno */}
          {screen === "root" ? (
            <div className="px-5 pt-4 pb-3 text-white">
              <div className="text-[28px] font-extrabold leading-tight">Configuración</div>
            </div>
          ) : (
            <TopNav
              title={
                screen === "wifi" ? "Wi-Fi" :
                screen === "bluetooth" ? "Bluetooth" :
                screen === "celular" ? "Red celular" :
                screen === "bateria" ? "Batería" :
                screen === "general" ? "General" :
                screen === "info" ? "Información" :
                screen === "software" ? "Actualización de software" :
                screen === "accesibilidad" ? "Accesibilidad" :
                screen === "accesibilidad_display" ? "Pantalla y tamaño de texto" :
                screen === "notificaciones" ? "Notificaciones" :
                screen === "apps" ? "Apps" :
                screen === "app_gmail" ? "Gmail" : "YouTube"
              }
              onBack={() => {
                if (screen === "info" || screen === "software") return setScreen("general")
                if (screen === "accesibilidad_display") return setScreen("accesibilidad")
                if (screen === "app_gmail" || screen === "app_youtube") return setScreen("apps")
                setScreen("root")
              }}
            />
          )}

          {/* CONTENIDO */}
          <div className="flex-1 overflow-y-auto px-3 pb-5 text-white">
            {screen === "root" && (
              <>
                <Card className="mt-1">
                  <RowSwitch
                    icon={<Plane className="w-5 h-5 text-orange-400" />}
                    title="Modo de vuelo"
                    value={modoVuelo}
                    onChange={setModoVuelo}
                  />
                  <Divider />
                  <RowNav
                    icon={<Wifi className="w-5 h-5 text-blue-400" />}
                    title="Wi-Fi"
                    valueRight={wifiOn ? "CASA" : "Desactivado"}
                    onClick={() => setScreen("wifi")}
                  />
                  <Divider />
                  <RowNav
                    icon={<Bluetooth className="w-5 h-5 text-blue-400" />}
                    title="Bluetooth"
                    valueRight={btOn ? "Activado" : "Desactivado"}
                    onClick={() => setScreen("bluetooth")}
                  />
                  <Divider />
                  <RowNav
                    icon={<Signal className="w-5 h-5 text-green-400" />}
                    title="Red celular"
                    onClick={() => setScreen("celular")}
                  />
                  <Divider />
                  <RowNav
                    icon={<Globe className="w-5 h-5 text-green-400" />}
                    title="Compartir Internet"
                    valueRight={hotspot ? "Activado" : "Desactivado"}
                    onClick={() => setScreen("celular")}
                  />
                  <Divider />
                  <RowNav
                    icon={<BatteryFull className="w-5 h-5 text-green-400" />}
                    title="Batería"
                    onClick={() => setScreen("bateria")}
                  />
                </Card>

                <Card className="mt-4">
                  <RowNav icon={<Cog className="w-5 h-5 text-gray-300" />} title="General" onClick={() => setScreen("general")} />
                  <Divider />
                  <RowNav icon={<Accessibility className="w-5 h-5 text-blue-400" />} title="Accesibilidad" onClick={() => setScreen("accesibilidad")} />
                  <Divider />
                  <RowNav icon={<Bell className="w-5 h-5 text-red-400" />} title="Notificaciones" onClick={() => setScreen("notificaciones")} />
                  <Divider />
                  {/* Nuevo: Apps como item único */}
                  <RowNav icon={<Grid className="w-5 h-5 text-white/80" />} title="Apps" onClick={() => setScreen("apps")} />
                </Card>
              </>
            )}

            {/* Wi-Fi */}
            {screen === "wifi" && (
              <Card>
                <RowSwitch title="Wi-Fi" value={wifiOn} onChange={setWifiOn} />
                <Divider />
                <RowSwitch title="Preguntar al conectar" value={wifiAskToJoin} onChange={setWifiAskToJoin} />
              </Card>
            )}

            {/* Bluetooth */}
            {screen === "bluetooth" && (
              <Card>
                <RowSwitch title="Bluetooth" value={btOn} onChange={setBtOn} />
                <Divider />
                <RowSwitch title="Nuevas conexiones automáticas" value={btAutoConnect} onChange={setBtAutoConnect} />
              </Card>
            )}

            {/* Red celular */}
            {screen === "celular" && (
              <Card>
                <RowSwitch title="Datos celulares" value={cellData} onChange={setCellData} />
                <Divider />
                <RowSwitch title="Compartir Internet" value={hotspot} onChange={setHotspot} />
              </Card>
            )}

            {/* Batería */}
            {screen === "bateria" && (
              <Card>
                <RowSwitch title="Porcentaje de carga" value={batteryPercent} onChange={setBatteryPercent} />
                <Divider />
                <RowSwitch title="Ahorrar batería" value={batterySaver} onChange={setBatterySaver} />
              </Card>
            )}

            {/* General */}
            {screen === "general" && (
              <Card>
                <RowNav title="Información" icon={<Info className="w-5 h-5 text-gray-300" />} onClick={() => setScreen("info")} />
                <Divider />
                <RowNav
                  title="Actualización de software"
                  icon={<Smartphone className="w-5 h-5 text-gray-300" />}
                  valueRight={autoUpdate ? "Automática" : "Manual"}
                  onClick={() => setScreen("software")}
                />
              </Card>
            )}

            {/* General > Información */}
            {screen === "info" && (
              <Card>
                <KV label="Nombre" value="iPhone de Josefa" />
                <Divider />
                <KV label="Versión" value="iOS 17.5 (21F90)" />
                <Divider />
                <KV label="Nombre del modelo" value="iPhone 14 Pro" />
                <Divider />
                <KV label="Número de serie" value="F4K9X1Q2M8N" />
              </Card>
            )}

            {/* General > Actualización de software */}
            {screen === "software" && (
              <Card>
                <RowSwitch title="Automática" value={autoUpdate} onChange={setAutoUpdate} />
              </Card>
            )}

            {/* Accesibilidad */}
            {screen === "accesibilidad" && (
              <Card>
                <RowNav title="Pantalla y tamaño de texto" onClick={() => setScreen("accesibilidad_display")} />
              </Card>
            )}

            {/* Accesibilidad > Pantalla y tamaño de texto */}
            {screen === "accesibilidad_display" && (
              <Card>
                <RowSwitch title="Negritas" value={boldText} onChange={setBoldText} />
                <Divider />
                <RowSwitch title="Texto más grande" value={largerText} onChange={setLargerText} />
                <Divider />
                <RowSwitch title="Etiquetas" value={labels} onChange={setLabels} />
              </Card>
            )}

            {/* Notificaciones */}
            {screen === "notificaciones" && (
              <Card>
                <RowSwitch title="Notificaciones" value={notifMaster} onChange={setNotifMaster} />
                <Divider />
                <RowSwitch title="Previsualizar" value={notifPreview} onChange={setNotifPreview} />
              </Card>
            )}

            {/* Apps (contenedor) */}
            {screen === "apps" && (
              <Card>
                <RowNav icon={<Mail className="w-5 h-5 text-sky-400" />} title="Gmail" onClick={() => setScreen("app_gmail")} />
                <Divider />
                <RowNav icon={<Youtube className="w-5 h-5 text-rose-500" />} title="YouTube" onClick={() => setScreen("app_youtube")} />
              </Card>
            )}

            {/* Apps > Gmail */}
            {screen === "app_gmail" && (
              <Card>
                <RowSwitch
                  title="Descargar adjuntos automático solo en Wi-Fi"
                  value={gmailWifiOnlyAttachments}
                  onChange={setGmailWifiOnlyAttachments}
                />
                <Divider />
                <RowSwitch
                  title="Notificaciones push en tiempo real"
                  value={gmailPush}
                  onChange={setGmailPush}
                />
              </Card>
            )}

            {/* Apps > YouTube */}
            {screen === "app_youtube" && (
              <Card>
                <RowSwitch
                  title="Calidad de video predeterminada"
                  value={ytDefaultQuality}
                  onChange={setYtDefaultQuality}
                />
                <Divider />
                <RowSwitch
                  title="Descargar videos para ver sin conexión"
                  value={ytOfflineDownloads}
                  onChange={setYtOfflineDownloads}
                />
              </Card>
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}

/* ===================== COMPONENTES UI ===================== */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[380px] max-w-full aspect-[9/19.5] bg-black rounded-[34px] shadow-2xl ring-8 ring-black/70 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 h-6 w-36 rounded-b-2xl bg-black z-20" />
      <div className="absolute inset-[10px] rounded-[26px] overflow-hidden flex flex-col bg-black text-white">
        {children}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="relative h-6 w-full px-3">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px]">01:38</div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[12px]">
        <span>100%</span>
        <BatteryFull className="w-4 h-4" />
      </div>
    </div>
  )
}

/* Barra “Atrás + Título centrado” (sin choque) */
function TopNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2">
      <div className="justify-self-start">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sky-400 px-2 py-1 rounded-lg hover:bg-white/5"
          aria-label="Atrás"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[16px]">Atrás</span>
        </button>
      </div>
      <div className="justify-self-center">
        <div className="text-[18px] font-semibold">{title}</div>
      </div>
      <div className="justify-self-end w-[78px]" />
    </div>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#1c1c1e] rounded-2xl overflow-hidden ${className}`}>{children}</div>
}

function RowNav({
  icon,
  title,
  valueRight,
  onClick,
}: {
  icon?: React.ReactNode
  title: string
  valueRight?: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 text-left"
    >
      <div className="flex items-center gap-3">
        {icon && <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">{icon}</div>}
        <div className="text-[16px]">{title}</div>
      </div>
      <div className="flex items-center gap-2 text-white/70">
        {valueRight && <span className="text-[13px]">{valueRight}</span>}
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  )
}

function RowSwitch({
  icon,
  title,
  value,
  onChange,
}: {
  icon?: React.ReactNode
  title: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="w-full flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {icon && <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">{icon}</div>}
        <div className="text-[16px]">{title}</div>
      </div>
      <IOSwitch on={value} setOn={onChange} />
    </div>
  )
}

/* Switch compacto tipo iOS */
function IOSwitch({ on, setOn, disabled = false }: { on: boolean; setOn: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && setOn(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-emerald-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-pressed={on}
      aria-label="switch"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-black shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-white/10" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-2 text-[12px] text-white/50">{children}</div>
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="text-[14px] text-white/80">{label}</div>
      <div className="text-[13px] text-white/60">{value}</div>
    </div>
  )
}
