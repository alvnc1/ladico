// app/exercises/comp-4-3/avanzado/ej3/sim/page.tsx
"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  UserCircle2,
  Settings as SettingsIcon,
  Check as CheckIcon,
} from "lucide-react"

/* ================== Persistencia ================== */
const STORAGE_KEY = "ladico:4.3:avanzado:ej3"

type Persisted = {
  chat?: { pablo?: { blocked?: boolean; muted?: boolean } }
  settings?: { isPrivate?: boolean; disableMsgRequests?: boolean }
}
const loadPersisted = (): Persisted => {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : {}
  } catch {
    return {}
  }
}
const savePersisted = (next: Persisted) => {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

/* ================== Tipos ================== */
type ChatId = "pablo" | "fernanda" | "josefa" | "catalina"
type Screen =
  | "inbox"
  | "requests"
  | "thread"
  | "profile"
  | "settings"
  | "privacy"
  | "notifications"
  | "notif_messages"

type Chat = {
  id: ChatId
  name: string
  color?: string
  unread?: boolean
}

type Msg = { id: string; from: "me" | "them"; text: string; time: string }

/* ================== Datos ================== */
const THREADS: Record<ChatId, Msg[]> = {
  pablo: [
    { id: "p1", from: "them", text: "¿Por qué no respondes?", time: "Ahora" },
    { id: "p2", from: "them", text: "Contesta ahora.", time: "Ahora" },
    { id: "p3", from: "them", text: "Si no respondes te va a ir mal.", time: "Ahora" },
  ],
  fernanda: [
    { id: "f1", from: "them", text: "¿Viste la historia? Te etiqueté 😄", time: "Ayer" },
    { id: "f2", from: "me", text: "Siii, gracias!", time: "Ayer" },
    { id: "f3", from: "them", text: "Después te mando las fotos", time: "Ayer" },
  ],
  josefa: [
    { id: "j1", from: "them", text: "¿Vamos al cine el viernes?", time: "Ayer" },
    { id: "j2", from: "me", text: "Dale, compro entradas luego.", time: "Ayer" },
    { id: "j3", from: "them", text: "Ok! te aviso hora", time: "Ayer" },
  ],
  catalina: [
    { id: "c1", from: "them", text: "Subí fotos del viaje 💫", time: "Ayer" },
    { id: "c2", from: "me", text: "Las vi, están bacanes!", time: "Ayer" },
  ],
}

const ALL_CHATS: Chat[] = [
  { id: "pablo", name: "Pablo", unread: true, color: "bg-rose-600" },
  { id: "fernanda", name: "Fernanda", color: "bg-fuchsia-500" },
  { id: "josefa", name: "Josefa", color: "bg-emerald-500" },
  { id: "catalina", name: "Catalina", color: "bg-amber-500" },
]

/* ================== Página ================== */
export default function InstaInboxSim() {
  const { user, userData } = useAuth() as any
  const username = useMemo(
  () => userData?.username || user?.displayName || (user?.email ? user.email.split("@")[0] : "Usuario"),
  [userData?.username, user?.displayName, user?.email]
)

  const [screen, setScreen] = useState<Screen>("inbox")
  const [activeChatId, setActiveChatId] = useState<ChatId | null>(null)

  // ======== ESTADO: inicializa *desde* localStorage para no pisar lo guardado ========
  const initial = loadPersisted()

  const [isPrivate, setIsPrivate] = useState<boolean>(() => !!initial.settings?.isPrivate)
  // En SIM el switch muestra "Activadas" cuando notifMessagesEnabled === true,
  // pero guardamos disableMsgRequests invertido:
  const [notifMessagesEnabled, setNotifMessagesEnabled] = useState<boolean>(
    () => !(initial.settings?.disableMsgRequests ?? false)
  )

  const [pabloMuted, setPabloMuted] = useState<boolean>(() => !!initial.chat?.pablo?.muted)
  const [pabloBlocked, setPabloBlocked] = useState<boolean>(() => !!initial.chat?.pablo?.blocked)

  // 🔵 Estado local para “no leído” en la bandeja
  const [unreadById, setUnreadById] = useState<Record<ChatId, boolean>>({
    pablo: true,
    fernanda: false,
    josefa: false,
    catalina: false,
  })

  // UI: modal confirmación bloquear + “Listo”
  const [showBlockModal, setShowBlockModal] = useState<null | "pablo">(null)
  const [showBlockedToast, setShowBlockedToast] = useState(false)

  // Guardar en localStorage cuando cambien los switches (después de montar)
  useEffect(() => {
    const next: Persisted = loadPersisted()
    next.settings = {
      isPrivate,
      disableMsgRequests: !notifMessagesEnabled,
    }
    next.chat = {
      pablo: { muted: pabloMuted, blocked: pabloBlocked },
    }
    savePersisted(next)
  }, [isPrivate, notifMessagesEnabled, pabloMuted, pabloBlocked])

  // Bandeja visible (si Pablo está bloqueado, no aparece)
  const chats: Chat[] = useMemo(() => {
    return ALL_CHATS.filter((c) => (c.id === "pablo" ? !pabloBlocked : true))
  }, [pabloBlocked])

  const openThread = (id: ChatId) => {
    // Al abrir un chat, lo marcamos como leído (quita el punto azul)
    setUnreadById((prev) => ({ ...prev, [id]: false }))
    setActiveChatId(id)
    setScreen("thread")
  }
  const backToInbox = () => {
    setScreen("inbox")
    setActiveChatId(null)
  }

  // Confirmar bloqueo → guardar → toast → volver a inbox
  const confirmBlockPablo = () => {
    setPabloBlocked(true)
    setShowBlockModal(null)
    setShowBlockedToast(true)
    setTimeout(() => {
      setShowBlockedToast(false)
      backToInbox()
    }, 900)
  }

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Barra superior */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center gap-3 text-[#286575]">
            <Link href="/exercises/comp-4-3/avanzado/ej3" className="inline-flex items-center gap-2 hover:underline">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Volver al enunciado</span>
            </Link>
            <span className="text-sm opacity-70">| 4.3 Avanzado · Entorno simulado</span>
          </div>
        </div>
      </div>

      {/* Teléfono */}
      <div className="flex items-center justify-center p-6">
        <PhoneFrame>
          <StatusBar />

          {screen === "inbox" && (
            <>
              <DMHeader
                username={username}
                right={
                  <button aria-label="Configuración" onClick={() => setScreen("settings")}>
                    <SettingsIcon className="w-5 h-5 opacity-80" />
                  </button>
                }
              />
              <TopTabs onOpenRequests={() => setScreen("requests")} />
              <InboxList chats={chats} onOpen={openThread} unreadById={unreadById} />
              <BottomSafeArea />
            </>
          )}

          {screen === "requests" && (
            <>
              <DMHeader username="Solicitudes" left={<BackBtn onClick={() => setScreen("inbox")} />} />
              <div className="flex-1 flex items-center justify-center text-white/70 text-sm">
                No hay solicitudes de mensajes.
              </div>
              <BottomSafeArea />
            </>
          )}

          {screen === "thread" && activeChatId && (
            <ThreadView chatId={activeChatId} onBack={backToInbox} onOpenProfile={() => setScreen("profile")} />
          )}

          {screen === "profile" && activeChatId && (
            <ProfileView
              chatId={activeChatId}
              muted={activeChatId === "pablo" ? pabloMuted : false}
              blocked={activeChatId === "pablo" ? pabloBlocked : false}
              onChangeMute={(v) => activeChatId === "pablo" && setPabloMuted(Boolean(v))}
              onRequestBlock={() => activeChatId === "pablo" && setShowBlockModal("pablo")}
              onBack={() => setScreen("thread")}
            />
          )}

          {/* Ajustes */}
          {screen === "settings" && (
            <>
              <DMHeader username="Configuración y actividad" left={<BackBtn onClick={() => setScreen("inbox")} />} />
              <div className="flex-1 overflow-y-auto">
                <SectionTitle title="Cómo usas Instagram" />
                <MenuItem title="Guardado" />
                <MenuItem title="Archivo" />
                <MenuItem title="Tu actividad" />
                <MenuItem title="Notificaciones" onClick={() => setScreen("notifications")} chevron />
                <MenuItem title="Administración del tiempo" />
                <Divider />
                <SectionTitle title="Quién puede ver tu contenido" />
                <MenuItem
                  title="Privacidad de la cuenta"
                  valueRight={isPrivate ? "Privada" : "Pública"}
                  onClick={() => setScreen("privacy")}
                  chevron
                />
                <MenuItem title="Mejores amigos" valueRight="23" chevron />
                <MenuItem title="Publicaciones cruzadas" chevron />
                <MenuItem title="Bloqueados" valueRight="50" chevron />
                <MenuItem title="Historia, video en vivo y ubicación" chevron />
                <MenuItem title='Actividad en la pestaña "Amigos"' chevron />
              </div>
              <BottomSafeArea />
            </>
          )}

          {/* Privacidad */}
          {screen === "privacy" && (
            <>
              <DMHeader username="Privacidad de la cuenta" left={<BackBtn onClick={() => setScreen("settings")} />} />
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-base font-medium">Cuenta privada</div>
                  <Switch on={isPrivate} setOn={setIsPrivate} />
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">
                  Si tu cuenta es pública, cualquiera podrá ver tu perfil y publicaciones. Al hacerla privada, solo tus
                  seguidores aprobados verán tu contenido.
                </p>
              </div>
              <BottomSafeArea />
            </>
          )}

          {/* Notificaciones */}
          {screen === "notifications" && (
            <>
              <DMHeader username="Notificaciones" left={<BackBtn onClick={() => setScreen("settings")} />} />
              <div className="flex-1 overflow-y-auto">
                <SectionTitle title="Notificaciones push" />
                <MenuItem title="Pausar todas" right={<Switch on={false} setOn={() => {}} disabled />} />
                <MenuItem title="Modo descanso" chevron />
                <Divider />
                <MenuItem title="Publicaciones, historias y comentarios" chevron />
                <MenuItem title="Seguidos y seguidores" chevron />
                <MenuItem title="Mensajes" onClick={() => setScreen("notif_messages")} chevron />
                <MenuItem title="Llamadas" chevron />
                <MenuItem title="Videos en vivo y reels" chevron />
                <MenuItem title="Recaudaciones de fondos" chevron />
                <MenuItem title="De Instagram" chevron />
              </div>
              <BottomSafeArea />
            </>
          )}

          {/* Notificaciones → Mensajes (Solicitudes de mensajes) */}
          {screen === "notif_messages" && (
            <>
              <DMHeader username="Mensajes" left={<BackBtn onClick={() => setScreen("notifications")} />} />
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <div className="text-sm text-white/70 mb-1">Solicitudes de mensajes de personas que no te siguen</div>
                <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-3">
                  <div className="text-sm">{notifMessagesEnabled ? "Activadas" : "Desactivadas"}</div>
                  <Switch on={notifMessagesEnabled} setOn={setNotifMessagesEnabled} />
                </div>
              </div>
              <BottomSafeArea />
            </>
          )}
        </PhoneFrame>
      </div>

      {/* Modal bloquear (Pablo) */}
      {showBlockModal === "pablo" && (
        <BlockModal name="Pablo" onCancel={() => setShowBlockModal(null)} onConfirm={confirmBlockPablo} />
      )}

      {/* Toast “Listo” */}
      {showBlockedToast && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-black/80 text-white rounded-2xl px-5 py-4 flex items-center gap-2 shadow-2xl">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckIcon className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-medium">Listo</div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================== UI Teléfono ================== */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[380px] max-w-full aspect-[9/19.5] bg-black rounded-[38px] shadow-2xl ring-8 ring-black/70 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 h-6 w-36 rounded-b-2xl bg-black z-20" />
      <div className="absolute inset-[10px] rounded-[28px] overflow-hidden flex flex-col bg-[#0c0f14] text-white">
        {children}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="relative h-6 w-full">
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-80">23:51 · 18%</div>
    </div>
  )
}

function DMHeader({ username, left, right }: { username: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {left}
        <div className="font-semibold truncate max-w-[200px]">{username}</div>
      </div>
      <div className="flex items-center gap-4">{right}</div>
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Volver">
      <ChevronLeft className="w-5 h-5 opacity-80" />
    </button>
  )
}

function TopTabs({ onOpenRequests }: { onOpenRequests: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
      <div className="text-sm font-semibold">Mensajes</div>
      <button onClick={onOpenRequests} className="text-sm text-white/70">
        Solicitudes
      </button>
    </div>
  )
}

/* ================== Inbox ================== */
function InboxList({
  chats,
  onOpen,
  unreadById,
}: {
  chats: Chat[]
  onOpen: (id: ChatId) => void
  unreadById: Record<ChatId, boolean>
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {chats.map((c) => {
        const msgs = THREADS[c.id]
        const last = msgs[msgs.length - 1]
        const preview = `${last.text} · ${last.time}`
        const isUnread = unreadById[c.id]
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 text-left"
          >
            <StoryRing color={c.color}>
              <Avatar name={c.name} />
            </StoryRing>
            <div className="flex-1">
              <div className="font-medium text-sm leading-none">{c.name}</div>
              <div className="text-[12px] text-white/70 leading-tight mt-0.5 truncate">{preview}</div>
            </div>
            <div className="flex items-center gap-3">
              {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              <Camera className="w-5 h-5 text-white/60" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ================== Hilo ================== */
function ThreadView({
  chatId,
  onBack,
  onOpenProfile,
}: {
  chatId: ChatId
  onBack: () => void
  onOpenProfile: () => void
}) {
  const chat = useMemo(() => ALL_CHATS.find((c) => c.id === chatId)!, [chatId])
  const messages = THREADS[chatId]
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    scrollerRef.current && (scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight)
  }, [chatId])

  return (
    <>
      <DMHeader
        username={chat.name}
        left={<BackBtn onClick={onBack} />}
        right={
          <button onClick={onOpenProfile} aria-label="Perfil">
            <ChevronRight className="w-5 h-5 opacity-80" />
          </button>
        }
      />
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.map((m) => (
          <Bubble key={m.id} side={m.from} text={m.text} time={m.time} warning={chatId === "pablo" && m.from === "them"} />
        ))}
      </div>
      <ComposerBar />
      <FakeKeyboard />
    </>
  )
}

function Bubble({
  side,
  text,
  time,
  warning,
}: {
  side: "me" | "them"
  text: string
  time: string
  warning?: boolean
}) {
  const isMe = side === "me"
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow
        ${isMe ? "bg-[#286575] text-white rounded-tr-sm" : "bg-white/10 text-white rounded-tl-sm"}
        ${warning ? "ring-1 ring-rose-400/60" : ""}`}
      >
        <div>{text}</div>
        <div className="text-[10px] opacity-70 mt-0.5">{time}</div>
      </div>
    </div>
  )
}

/* ===== SettingRow (permite onChange opcional para "Bloquear") ===== */
function SettingRow({
  title,
  value,
  onChange,
}: {
  title: string
  value: boolean
  onChange: (v?: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="text-sm">{title}</div>
      <Switch on={value} setOn={(v) => onChange(v)} />
    </div>
  )
}

/* ================== Perfil del chat (silenciar / bloquear) ================== */
function ProfileView({
  chatId,
  onBack,
  muted,
  blocked,
  onChangeMute,
  onRequestBlock,
}: {
  chatId: ChatId
  onBack: () => void
  muted: boolean
  blocked: boolean
  onChangeMute: (v: boolean) => void
  onRequestBlock: () => void
}) {
  const chat = ALL_CHATS.find((c) => c.id === chatId)!
  return (
    <>
      <DMHeader username="" left={<BackBtn onClick={onBack} />} />
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          <StoryRing color={chat.color}>
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              <UserCircle2 className="w-20 h-20 text-white/80" />
            </div>
          </StoryRing>
          <div className="text-xl font-semibold">{chat.name.toLowerCase()}</div>
        </div>

        <SettingRow title="Silenciar" value={muted} onChange={(v) => onChangeMute(Boolean(v))} />
        <div className="h-px bg-white/10 my-2" />
        <SettingRow title="Bloquear" value={blocked} onChange={() => onRequestBlock()} />
      </div>
      <BottomSafeArea />
    </>
  )
}

/* ================== Varios UI ================== */
function ComposerBar() {
  return (
    <div className="px-3 py-2 bg-[#0c0f14]">
      <div className="flex items-center gap-2 bg-[#151a21] rounded-full px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-violet-600" />
        <input disabled className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/60" placeholder="Mensaje…" />
        <div className="flex items-center gap-3 text-white/70">
          <span className="text-xs">🎙️</span>
          <span className="text-xs">🖼️</span>
          <span className="text-xs">🙂</span>
          <span className="text-xs">＋</span>
        </div>
      </div>
    </div>
  )
}

function FakeKeyboard() {
  return (
    <div className="bg-[#151a21] border-t border-white/10">
      <div className="grid grid-cols-10 gap-1 px-2 pt-2 pb-3">
        {[..."QWERTYUIOP", ..."ASDFGHJKLÑ", ..."ZXCVBNM"].map((ch, i) => (
          <div key={i} className="text-center text-xs font-medium text-white/90 bg-[#222831] rounded-md py-2">
            {ch}
          </div>
        ))}
      </div>
      <div className="px-6 pb-3">
        <div className="w-full h-1.5 bg-white/70 rounded-full mx-auto" />
      </div>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <div className="px-4 pt-3 pb-2 text-[12px] text-white/60">{title}</div>
}

function MenuItem({
  title,
  valueRight,
  right,
  onClick,
  chevron,
}: {
  title: string
  valueRight?: string
  right?: React.ReactNode
  onClick?: () => void
  chevron?: boolean
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5">
      <div className="text-sm text-white">{title}</div>
      <div className="flex items-center gap-2">
        {right}
        {valueRight && <span className="text-xs text-white/70">{valueRight}</span>}
        {chevron && <ChevronRight className="w-4 h-4 text-white/60" />}
      </div>
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-white/10 my-1" />
}

function StoryRing({ children, color = "bg-fuchsia-500" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className={`p-0.5 rounded-full ${color}`}>
      <div className="p-0.5 bg-[#0c0f14] rounded-full">{children}</div>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
      <UserCircle2 className="w-10 h-10 text-white/80" />
    </div>
  )
}

function BottomSafeArea() {
  return <div className="h-5" />
}

function Switch({ on, setOn, disabled = false }: { on: boolean; setOn: (v: boolean) => void; disabled?: boolean }) {
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

/* ================== Modal de Bloqueo (estilo IG) ================== */
function BlockModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[360px] max-w-[92vw] bg-[#1a1f29] text-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
            <UserCircle2 className="w-12 h-12 text-white/80" />
          </div>
          <div className="text-lg font-bold text-center">¿Bloquear a {name.toLowerCase()}?</div>
          <p className="text-sm text-white/80">
            También se bloquearán otras cuentas que tenga o cree en el futuro. Puedes volver a desbloquear cuando
            quieras.
          </p>
          <ul className="text-[13px] text-white/80 space-y-1 mt-1">
            <li>• No podrá enviarte mensajes ni encontrar tu perfil ni tu contenido.</li>
            <li>• No se notificará a esta persona que la bloqueaste o reportaste.</li>
          </ul>
          <div className="pt-3 grid grid-cols-2 gap-2">
            <button onClick={onCancel} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm">
              Cancelar
            </button>
            <button onClick={onConfirm} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold">
              Bloquear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
