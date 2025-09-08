"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Settings, Folder, FileText, Mail } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import {
  getProgress,
  setPoint,
  levelPoints,
  isLevelPassed,
  getPoint,
} from "@/lib/levelProgress";

// Clave de sesión por-usuario (igual que en ej1/ej2)
const SESSION_PREFIX = "session:1.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================= Pantalla principal (P3) ================= */

export default function LadicoDeletedListRecoveryExercise() {
  const totalQuestions = 3;
  const [currentIndex] = useState(2); // P3 (0-based)
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-3">
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
                | 1.3 Gestión de Datos, Información y Contenidos Digitales -
                Nivel Intermedio
              </span>
            </div>
          </div>

          {/* Progreso */}
          <div className="mt-1">
            <div className="flex items-center justify-between text-[#286575] mb-2">
              <span className="text-xs sm:text-sm font-medium bg-white/40 px-2 sm:px-3 py-1 rounded-full">
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
            <div className="h-1.5 sm:h-2 bg-[#dde3e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#286575] rounded-full transition-all duration-500 ease-in-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Ladico + ejercicio dentro */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Instrucciones */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border-l-4 border-[#286575]">
                <div className="text-sm sm:text-base leading-relaxed text-gray-800">
                  <p>Debes ir de compras, pero accidentalmente borraste tu lista del escritorio.</p>
                  <p className="font-semibold">Recupérala desde la Papelera y revisa su contenido.</p>
                  <p>
                    En la lista aparece un producto marcado como <i>importante</i> que no debes olvidar.
                    Encuéntralo y escríbelo abajo.
                  </p>
                </div>
              </div>
            </div>

            {/* Escena + respuesta + Finalizar */}
            <DesktopRecoveryExercise />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================================
   Utilidades
   ========================================================================= */

function clsx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

type WindowKind = "recycle" | "note" | "list" | "folder" | "mail" | null;

type DesktopIconItem = {
  id: string;
  title: string;
  kind: "recycle" | "settings" | "folder" | "note" | "mail" | "file";
  x: number;
  y: number;
  badge?: number;
  disabled?: boolean;
};

/* =========================================================================
   Ejercicio P3 con puntaje y Finalizar → Results
   ========================================================================= */

function DesktopRecoveryExercise() {
  const router = useRouter();
  const { user } = useAuth();

  // ====== Config sesión/puntaje (P3) ======
  const COMPETENCE = "1.3";
  const LEVEL = "intermedio";
  const QUESTION_IDX_ZERO = 2; // P3 (0-based)
  const QUESTION_IDX_ONE = 3;  // P3 (1-based) para setPoint

  const [sessionId, setSessionId] = useState<string | null>(null);
  const ensuringRef = useRef(false); // evita dobles llamados en StrictMode

  // 1) Cargar sesión cacheada por-usuario
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // 2) Asegurar/crear sesión por-usuario si no hay cache
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      return;
    }

    const LS_KEY = sessionKeyFor(user.uid);
    const cached = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    if (cached) {
      if (!sessionId) setSessionId(cached);
      return;
    }

    if (ensuringRef.current) return;
    ensuringRef.current = true;

    (async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Intermedio",
          totalQuestions: 3,
        });
        setSessionId(id);
        if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test (P3):", e);
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [user?.uid, sessionId]);

  // ====== Estado del ejercicio ======
  const deskRef = useRef<HTMLDivElement | null>(null);
  const [icons, setIcons] = useState<DesktopIconItem[]>([
    { id: "recycle", title: "Recycle Bin", kind: "recycle", x: 40, y: 24 },
    { id: "settings", title: "Settings", kind: "settings", x: 180, y: 24 },
    { id: "folder", title: "Need to be sorted", kind: "folder", x: 320, y: 24 },
    { id: "note", title: "Note.txt", kind: "note", x: 520, y: 24 },
    { id: "mail", title: "Mail", kind: "mail", x: 640, y: 24, badge: 1 },
  ]);

  const [open, setOpen] = useState<WindowKind>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"idle" | "ok" | "err">("idle");

  // ----- Drag (posición absoluta con “snap a grid”) -----
  const [drag, setDrag] = useState<{ id: string | null; offsetX: number; offsetY: number }>(
    { id: null, offsetX: 0, offsetY: 0 }
  );

  const onMouseDownIcon = (e: React.MouseEvent, id: string) => {
    const el = e.currentTarget as HTMLButtonElement;
    const rect = el.getBoundingClientRect();
    setDrag({ id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.id || !deskRef.current) return;
      const deskRect = deskRef.current.getBoundingClientRect();
      const rawX = e.clientX - deskRect.left - drag.offsetX + 28;
      const rawY = e.clientY - deskRect.top - drag.offsetY + 32;
      const snapped = snapToGrid(rawX, rawY, deskRect);
      setIcons((prev) => prev.map((it) => (it.id === drag.id ? { ...it, x: snapped.x, y: snapped.y } : it)));
    };
    const onUp = () => setDrag({ id: null, offsetX: 0, offsetY: 0 });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag]);

  // ----- Abrir ventanas según icono -----
  const openIcon = (it: DesktopIconItem) => {
    if (it.kind === "recycle") setOpen("recycle");
    if (it.kind === "settings") setOpen(null);
    if (it.kind === "folder") setOpen("folder");
    if (it.kind === "note") setOpen("note");
    if (it.kind === "file" && it.id === "lista") setOpen("list");
    if (it.kind === "mail") setOpen("mail");
  };

  // ----- Validación del ejercicio -----
  const ANSWER = "papel higiénico"; // se acepta también sin tilde / con espacios extra
  const passConditions = () => {
    const restored = icons.some((x) => x.id === "lista"); // archivo restaurado al escritorio
    const correctWord = normalize(input) === normalize(ANSWER);
    return restored && correctWord;
  };

  // ----- Drag MIME para recuperación desde Papelera -----
  const DRAG_MIME = "application/x-desktop-file";
  const GRID = { w: 96, h: 90, marginX: 24, marginY: 24 };

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  function snapToGrid(x: number, y: number, deskRect: DOMRect) {
    const col = clamp(Math.round((x - GRID.marginX) / GRID.w), 0, Math.floor((deskRect.width - GRID.marginX) / GRID.w));
    const row = clamp(Math.round((y - GRID.marginY) / GRID.h), 0, Math.floor((deskRect.height - GRID.marginY) / GRID.h));
    const sx = GRID.marginX + col * GRID.w;
    const sy = GRID.marginY + row * GRID.h;
    return { x: sx, y: sy, col, row };
  }

  function placeOnFreeCell(
    desired: { x: number; y: number; col: number; row: number },
    list: DesktopIconItem[],
    deskRect: DOMRect
  ) {
    const taken = new Set(list.map((i) => `${i.x},${i.y}`));
    let { col, row } = desired;
    const maxCols = Math.floor((deskRect.width - GRID.marginX) / GRID.w);
    const maxRows = Math.floor((deskRect.height - GRID.marginY) / GRID.h);

    for (let r = row; r <= maxRows; r++) {
      for (let c = r === row ? col : 0; c <= maxCols; c++) {
        const x = GRID.marginX + c * GRID.w;
        const y = GRID.marginY + r * GRID.h; // FIX: y correcto
        if (!taken.has(`${x},${y}`)) return { x, y };
      }
    }
    return { x: desired.x, y: desired.y };
  }

  // ====== FINALIZAR: guarda 1/0 y va a results ======
  const handleFinalize = async () => {
    const ok = passConditions();
    setResult(ok ? "ok" : "err");

    const point: 0 | 1 = ok ? 1 : 0;

    // 1) progreso local
    setPoint(COMPETENCE, LEVEL, QUESTION_IDX_ONE, point);
    const prog = getProgress(COMPETENCE, LEVEL);
    const totalPts = levelPoints(prog);
    const passed = isLevelPassed(prog);
    const score = Math.round((totalPts / 3) * 100);
    const q1 = getPoint(prog, 1);
    const q2 = getPoint(prog, 2);
    const q3 = getPoint(prog, 3);

    // 2) Firestore (sesión POR-USUARIO; crea si falta)
    let sid = sessionId;
    try {
      if (!sid && user) {
        const LS_KEY = sessionKeyFor(user.uid);
        const cached =
          typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
        if (cached) {
          sid = cached;
        } else if (!ensuringRef.current) {
          ensuringRef.current = true;
          try {
            const { id } = await ensureSession({
              userId: user.uid,
              competence: COMPETENCE,
              level: "Intermedio",
              totalQuestions: 3,
            });
            sid = id;
            setSessionId(id);
            if (typeof window !== "undefined") localStorage.setItem(LS_KEY, id);
          } finally {
            ensuringRef.current = false;
          }
        }
      }
    } catch (e) {
      console.warn("No se pudo (re)asegurar la sesión al guardar P3:", e);
    }

    try {
      if (sid) {
        await markAnswered(sid, QUESTION_IDX_ZERO, point === 1);
      }
    } catch (e) {
      console.warn("No se pudo marcar P3 respondida:", e);
    }

    // 3) Navegar a RESULTS de 1.3 (pasando sid para que finalizeSession corra allí)
    const qs = new URLSearchParams({
      score: String(score),
      passed: String(passed),
      correct: String(totalPts),
      total: "3",
      competence: "1.3",
      level: "intermedio",
      q1: String(q1),
      q2: String(q2),
      q3: String(q3),
      sid: sid ?? "", // <-- IMPORTANTE
    });
    router.push(`/test/comp-1-3-intermedio/results?${qs.toString()}`);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-black/5">
      {/* Escritorio */}
      <div
        ref={deskRef}
        className="relative min-h-[440px] select-none pb-10"
        style={{
          backgroundImage: "url('/isla.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (!deskRef.current) return;
          e.preventDefault();
          const payload = e.dataTransfer.getData(DRAG_MIME);
          if (!payload) return;

          const data = JSON.parse(payload) as { id: string; title: string };
          setIcons((prev) => {
            if (prev.some((p) => p.id === data.id)) return prev;
            const deskRect = deskRef.current!.getBoundingClientRect();
            const snapped = snapToGrid(e.clientX - deskRect.left, e.clientY - deskRect.top, deskRect);
            const pos = placeOnFreeCell(snapped, prev, deskRect);
            return [...prev, { id: data.id, title: data.title, kind: "file", x: pos.x, y: pos.y }];
          });
          setOpen(null);
        }}
      >
        {/* Iconos */}
        {icons.map((it) => (
          <DesktopIcon key={it.id} item={it} onOpen={() => openIcon(it)} onMouseDown={onMouseDownIcon} />
        ))}

        {/* Ventanas */}
        {open === "recycle" && (
          <Window title="Recycle Bin" onClose={() => setOpen(null)}>
            <div className="text-sm">
              {!icons.some((x) => x.id === "lista") && (
                <div className="inline-flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 select-none">
                  <div
                    className="relative cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        DRAG_MIME,
                        JSON.stringify({ id: "lista", title: "lista_compras.txt" })
                      );
                      e.dataTransfer.effectAllowed = "copyMove";
                    }}
                    title="lista_compras.txt"
                  >
                    <FileText className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="mt-1 text-[12px] text-gray-700 text-center leading-tight px-1">
                    lista_compras.txt
                  </div>
                </div>
              )}
            </div>
          </Window>
        )}

        {open === "note" && (
          <Window title="Note.txt" onClose={() => setOpen(null)}>
            <div className="prose prose-sm max-w-none">
              <h4 className="mt-0">Notas rápidas</h4>
              <ul className="list-disc pl-5">
                <li>Llevar bolsas reutilizables.</li>
                <li>Usar puntos del supermercado si hay descuento.</li>
                <li>Comparar precios: marca blanca vs. marca conocida.</li>
                <li>Revisar fechas de vencimiento.</li>
              </ul>
            </div>
          </Window>
        )}

        {open === "list" && (
          <Window title="lista_compras.txt" onClose={() => setOpen(null)}>
            <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
{`Lista de compras
  - leche
  - pan integral
  - huevos (docena)
  - arroz 1 kg
  - fideos / pasta
  - pollo (pechuga)
  - tomate
  - cebolla
  - papa
  - aceite de oliva
  - azúcar
  - sal fina
  - café
  - yogur natural
  - queso en fetas
  - jamón
  - papel higiénico (importante)
  - detergente para ropa
  - lavavajillas
  - esponjas`}
            </pre>
          </Window>
        )}

        {open === "folder" && (
          <Window title="Need to be sorted" onClose={() => setOpen(null)}>
            <div className="text-sm">
              <p className="text-gray-700 mb-3">Archivos pendientes de ordenar:</p>
              <ul className="divide-y border rounded-md">
                <li className="px-3 py-2 flex items-center justify-between">
                  <span>garantia_lavadora.pdf</span>
                  <span className="text-xs text-gray-400">PDF · 320 KB</span>
                </li>
                <li className="px-3 py-2 flex items-center justify-between">
                  <span>captura_factura.png</span>
                  <span className="text-xs text-gray-400">Imagen · 1.2 MB</span>
                </li>
                <li className="px-3 py-2 flex items-center justify-between">
                  <span>borrador_presupuesto.xlsx</span>
                  <span className="text-xs text-gray-400">Hoja de cálculo · 88 KB</span>
                </li>
                <li className="px-3 py-2 flex items-center justify-between">
                  <span>ideas_cena.txt</span>
                  <span className="text-xs text-gray-400">Texto · 3 KB</span>
                </li>
              </ul>
            </div>
          </Window>
        )}

        {open === "mail" && (
          <Window title="Mail" onClose={() => setOpen(null)}>
            <div className="text-sm space-y-2">
              <div className="border rounded p-3 hover:bg-gray-50 cursor-default">
                <div className="font-semibold">Supermercado Sol</div>
                <div className="text-gray-700">Promociones de la semana</div>
                <p className="text-xs text-gray-500 mt-1">
                  Frutas y verduras con 20% OFF. Canjea tus puntos al pagar…
                </p>
              </div>
              <div className="border rounded p-3 hover:bg-gray-50 cursor-default">
                <div className="font-semibold">Banco Río</div>
                <div className="text-gray-700">Resumen mensual de tu cuenta</div>
                <p className="text-xs text-gray-500 mt-1">
                  Tu resumen ya está disponible. Para ver los movimientos del último mes…
                </p>
              </div>
              <div className="border rounded p-3 hover:bg-gray-50 cursor-default">
                <div className="font-semibold">Sistema</div>
                <div className="text-gray-700">Elemento movido a la Papelera</div>
                <p className="text-xs text-gray-500 mt-1">
                  Eliminaste un archivo recientemente. Puedes restaurarlo desde la Papelera si fue un error.
                </p>
              </div>
              <div className="border rounded p-3 hover:bg-gray-50 cursor-default">
                <div className="font-semibold">Club de Descuentos</div>
                <div className="text-gray-700">Nuevos cupones disponibles</div>
                <p className="text-xs text-gray-500 mt-1">
                  2x1 en limpieza del hogar este fin de semana. Consulta términos y condiciones…
                </p>
              </div>
            </div>
          </Window>
        )}

        {/* Barra inferior (gris) */}
        <div className="absolute left-0 right-0 bottom-0 h-10 bg-gray-300 flex items-center justify-end pr-4 z-10">
          <div className="text-white text-[11px] leading-tight text-right font-medium">
            <div>17:30</div>
            <div>2/09/2025</div>
          </div>
        </div>
      </div>

      {/* Respuesta + Finalizar */}
      <div className="border-t px-4 sm:px-6 py-4 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-sm text-gray-700 flex-1">
            Importante comprar:
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setResult("idle");
              }}
              placeholder="escribe el producto importante"
              className={clsx(
                "ml-2 px-3 py-2 rounded-md border focus:outline-none focus:ring-2 text-sm w-60",
                result === "ok" && "border-green-300 ring-green-200",
                result === "err" && "border-red-300 ring-red-200"
              )}
            />
          </label>

          <Button
            onClick={handleFinalize}
            className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
          >
            Finalizar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================== Icono con posición absoluta ================== */
function DesktopIcon({
  item,
  onOpen,
  onMouseDown,
}: {
  item: DesktopIconItem;
  onOpen: () => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}) {
  const IconSVG = React.useMemo(() => {
    switch (item.kind) {
      case "recycle":
        return <Trash2 className="w-14 h-14 text-zinc-200" />;
      case "settings":
        return <Settings className="w-14 h-14 text-zinc-100" />;
      case "folder":
        return <Folder className="w-14 h-14 text-yellow-400" />;
      case "note":
        return <FileText className="w-14 h-14 text-blue-500" />;
      case "file":
        return <FileText className="w-14 h-14 text-blue-600" />;
      case "mail":
        return <Mail className="w-14 h-14 text-blue-600" />;
      default:
        return <FileText className="w-14 h-14" />;
    }
  }, [item.kind]);

  return (
    <button
      onMouseDown={(e) => onMouseDown(e, item.id)}
      onDoubleClick={onOpen}
      onClick={onOpen}
      className="absolute text-white select-none flex flex-col items-center"
      style={{ left: item.x, top: item.y, width: 80 }}
      title={item.title}
    >
      <div className={clsx(item.disabled && "opacity-40", "relative mx-auto")}>
        {IconSVG}
        {item.badge && (
          <span className="absolute -top-1 -right-2 text-[10px] bg-red-500 text-white rounded-full w-5 h-5 grid place-content-center shadow">
            {item.badge}
          </span>
        )}
      </div>
      <div className="mt-1 text-[12px] text-center leading-tight break-words w-full drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)]">
        {item.title}
      </div>
    </button>
  );
}

/* ================== Ventana simple ================== */
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
    <div className="absolute inset-x-6 top-20 bottom-12 bg-white border shadow-2xl rounded-xl flex flex-col overflow-hidden z-20">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 shrink-0">
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
      <div className="p-4 overflow-auto grow">{children}</div>
    </div>
  );
}
