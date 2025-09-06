"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  // Header / UI
  ChevronRight,
  Search,
  // Escritorio
  Trash2,
  Settings,
  Folder,
  FileText,
  Mail,
  Volume2,
  HelpCircle,
} from "lucide-react";



export default function LadicoDeletedListRecoveryExercise() {
  const totalQuestions = 1;
  const [currentIndex] = useState(0);
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header Ladico */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between text-white space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard">
                <img
                  src="/ladico_green.png"
                  alt="Ladico Logo"
                  className="w-24 h-24 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
              <span className="text-[#2e6372] sm:text-sm opacity-80 bg-white/10 px-2 sm:px-3 py-1 rounded-full text-center">
                | 1.3 Gestión de Datos, Información y Contenidos Digitales - Nivel Intermedio
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso Ladico */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between text-white mb-4">
          <span className="text-xs text-[#286575] sm:text-sm font-medium bg-white/10 px-2 sm:px-3 py-1 rounded-full">
            Pregunta {currentIndex + 1} de {totalQuestions}
          </span>
          <div className="flex space-x-1 sm:space-x-2">
            {Array.from({ length: totalQuestions }, (_, index) => (
              <div
                key={index}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  index <= currentIndex ? "bg-[#286575] shadow-lg" : "bg-[#dde3e8]"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="bg-[#dde3e8] rounded-full h-2 sm:h-3 overflow-hidden">
          <div
            className="h-full bg-[#286575] rounded-full transition-all duration-500 ease-in-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tarjeta Ladico + ejercicio dentro */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones cortas arriba de la escena (como en la imagen) */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border-l-4 border-[#286575]">
                <div className="flex items-start gap-3 text-gray-800">
                  <Volume2 className="w-5 h-5 mt-0.5 text-[#286575]" />
                  <div className="text-sm sm:text-base leading-relaxed">
                    <p>Ayoub borró accidentalmente su lista de compras a continuación.</p>
                    <p className="font-semibold">Recupéralo.</p>
                    <p>¿Qué necesita comprar?</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Escena tipo escritorio + respuesta */}
            <DesktopRecoveryExercise />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   Ejercicio de escritorio (Papelera → Restaurar → abrir nota → validar)
   ========================================================================= */

function clsx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type WindowKind = "recycle" | "note" | "folder" | "mail" | null;

type DesktopFile = {
  id: string;
  name: string;
  kind: "recycle" | "settings" | "folder" | "note" | "mail";
  restored?: boolean; // se usa para mostrar que la nota fue restaurada
};

const initialIcons: DesktopFile[] = [
  { id: "recycle", name: "Recycle Bin", kind: "recycle" },
  { id: "settings", name: "Settings", kind: "settings" },
  { id: "folder", name: "Need to be sorted", kind: "folder" },
  // La nota parte "eliminada": solo abre cuando restored === true
  { id: "note", name: "Note.txt", kind: "note", restored: false },
  { id: "mail", name: "Mail", kind: "mail" },
];

const ANSWER = "leche"; // cambia aquí si necesitas otra palabra

function DesktopRecoveryExercise() {
  const [icons, setIcons] = useState<DesktopFile[]>(initialIcons);
  const [openWindow, setOpenWindow] = useState<WindowKind>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"idle" | "ok" | "err">("idle");

  const noteRestored = useMemo(
    () => icons.find((i) => i.id === "note")?.restored === true,
    [icons]
  );
  const mailBadge = 1;

  const handleIconOpen = (id: DesktopFile["id"]) => {
    if (id === "recycle") setOpenWindow("recycle");
    if (id === "settings") setOpenWindow(null);
    if (id === "folder") setOpenWindow("folder");
    if (id === "note") setOpenWindow(noteRestored ? "note" : "recycle");
    if (id === "mail") setOpenWindow("mail");
  };

  const restoreNote = () => {
    setIcons((prev) =>
      prev.map((i) => (i.id === "note" ? { ...i, restored: true } : i))
    );
  };

  const validate = () => {
    const ok = input.trim().toLowerCase() === ANSWER;
    setResult(ok ? "ok" : "err");
  };

  const resetValidation = () => setResult("idle");

  return (
    <div className="rounded-2xl border shadow-lg overflow-hidden bg-white">

      {/* Escritorio */}
      <div
        className="relative min-h-[420px]"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0.82)), url('https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Íconos */}
        <div className="p-6 grid grid-cols-5 gap-10 max-w-3xl">
          <DesktopIcon
            title="Recycle Bin"
            onOpen={() => handleIconOpen("recycle")}
            icon={<Trash2 className="w-10 h-10" />}
          />
          <DesktopIcon
            title="Settings"
            onOpen={() => handleIconOpen("settings")}
            icon={<Settings className="w-10 h-10" />}
          />
          <DesktopIcon
            title="Need to be sorted"
            onOpen={() => handleIconOpen("folder")}
            icon={<Folder className="w-10 h-10" />}
          />
          <DesktopIcon
            title="Note.txt"
            dim={!noteRestored}
            subtitle={!noteRestored ? "eliminado" : undefined}
            onOpen={() => handleIconOpen("note")}
            icon={<FileText className="w-10 h-10" />}
          />
          <DesktopIcon
            title="Mail"
            onOpen={() => handleIconOpen("mail")}
            badge={mailBadge}
            icon={<Mail className="w-10 h-10" />}
          />
        </div>

        {/* Ventanas */}
        {openWindow === "recycle" && (
          <Window title="Recycle Bin" onClose={() => setOpenWindow(null)}>
            <div className="text-sm">
              <p className="mb-3 text-gray-600">Archivos recientemente eliminados:</p>
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">lista_compras.txt</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={restoreNote}>
                    Restaurar
                  </Button>
                </div>
              </div>
              {noteRestored && (
                <p className="mt-3 text-green-600">
                  ✓ Archivo restaurado al escritorio. Haz doble clic en{" "}
                  <strong>Note.txt</strong>.
                </p>
              )}
            </div>
          </Window>
        )}

        {openWindow === "note" && (
          <Window title="Note.txt" onClose={() => setOpenWindow(null)}>
            <article className="prose prose-sm max-w-none">
              <h4 className="mt-0">Lista de compras</h4>
              <p>
                Ayoub escribió: <strong>“Comprar: LECHÉ”</strong>
                <br />
                <em>(Escribe solo la palabra, en minúsculas y sin acentos)</em>
              </p>
            </article>
          </Window>
        )}

        {openWindow === "folder" && (
          <Window title="Need to be sorted" onClose={() => setOpenWindow(null)}>
            <div className="text-sm text-gray-600">
              Esta carpeta no contiene la lista de compras.
            </div>
          </Window>
        )}

        {openWindow === "mail" && (
          <Window title="Mail" onClose={() => setOpenWindow(null)}>
            <div className="text-sm">
              <p className="mb-2">(1) Nuevo: “Recuerdo de compras de Ayoub”</p>
              <div className="rounded border p-3 text-gray-700">
                Hola, si perdiste la lista, revisa la <strong>Papelera</strong>.
              </div>
            </div>
          </Window>
        )}
      </div>

      {/* Barra inferior de respuesta */}
      <div className="border-t px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm text-gray-700 flex-1">
          Él necesita comprar:
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resetValidation();
            }}
            placeholder="una palabra"
            className={clsx(
              "ml-2 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm w-60",
              result === "err" && "border-red-300 ring-red-200",
              result === "ok" && "border-green-300 ring-green-200"
            )}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setInput("");
              setResult("idle");
            }}
          >
            Saltar
          </Button>
          <Button onClick={validate}>Validar</Button>
        </div>
      </div>

      {/* Feedback */}
      {result !== "idle" && (
        <div
          className={clsx(
            "px-6 pb-5 -mt-1",
            result === "ok" ? "text-green-700" : "text-red-700"
          )}
        >
          {result === "ok"
            ? "¡Correcto! Recuperaste la nota y escribiste la palabra correcta."
            : "Respuesta incorrecta. Pista: restaura ‘lista_compras.txt’ desde la Papelera y abre la nota."}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Subcomponentes de escritorio
   ========================================================================= */

function DesktopIcon({
  title,
  subtitle,
  icon,
  badge,
  dim,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: number;
  dim?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onDoubleClick={onOpen}
      onClick={onOpen}
      className={clsx(
        "group relative flex flex-col items-center gap-2 text-gray-700",
        "bg-white/60 hover:bg-white/80 backdrop-blur rounded-xl px-4 py-3",
        "shadow-sm hover:shadow"
      )}
      title={title}
    >
      <div className="relative">
        <div className={clsx(dim && "opacity-40")}>{icon}</div>
        {badge && (
          <span className="absolute -top-2 -right-2 text-xs bg-red-500 text-white rounded-full w-5 h-5 grid place-content-center">
            {badge}
          </span>
        )}
      </div>
      <div className="text-xs text-center leading-tight">
        <div>{title}</div>
        {subtitle && <div className="text-[10px] text-gray-500">{subtitle}</div>}
      </div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">
        doble clic
      </span>
    </button>
  );
}

function Window({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-6 right-6 top-20 bottom-24 bg-white border shadow-2xl rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded"
          aria-label="Cerrar"
          title="Cerrar"
        >
          ✕
        </button>
      </div>
      <div className="p-4 overflow-auto">{children}</div>
    </div>
  );
}
