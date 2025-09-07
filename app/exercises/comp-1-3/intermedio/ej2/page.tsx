"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Folder,
  File,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Video,
  ChevronRight,
  Search,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Grid as GridIcon,
  List as ListIcon,
} from "lucide-react";

// Puntaje/sesión y navegación
import { useAuth } from "@/contexts/AuthContext";
import { ensureSession, markAnswered } from "@/lib/testSession";
import { setPoint } from "@/lib/levelProgress";
import { useRouter } from "next/navigation";

// --- Config de puntaje/sesión para P2 ---
const COMPETENCE = "1.3";
const LEVEL = "intermedio";

/** ⚠️ CLAVE POR-USUARIO: evita pisar sesiones entre cuentas */
const SESSION_PREFIX = "session:1.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;

/* ================= Pantalla principal ================= */

export default function LadicoFileExplorerExercise() {
  const totalQuestions = 3;
  const [currentIndex] = useState(1);
  const progress = (2 / 3) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header */}
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

      {/* Progreso */}
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

      {/* Tarjeta con explorador */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Explorador de archivos</h2>
              </div>
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                  Crea en <b>Computer/</b> una carpeta llamada <b>Música Latina</b> y arrastra
                  <b> salsa.mp3</b> desde <b>Music</b> hacia esa carpeta. Luego pulsa <b>Siguiente</b>.
                </p>
              </div>
            </div>

            <FileExplorerEmbedded />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* =============== Explorador embebido + Validación =============== */

export type FileItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  mime?: "audio" | "image" | "video" | "text" | "generic";
  children?: FileItem[];
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const isFolder = (n: FileItem) => n.type === "folder";
const deepClone = (n: FileItem): FileItem => ({
  ...n,
  children: n.children ? n.children.map(deepClone) : undefined,
});

function removeNodeById(root: FileItem, id: string): [FileItem | undefined, FileItem] {
  const copy = deepClone(root);
  if (!copy.children) return [undefined, copy];
  const stack: FileItem[] = [copy];
  while (stack.length) {
    const cur = stack.pop()!;
    if (!cur.children) continue;
    const idx = cur.children.findIndex((c) => c.id === id);
    if (idx >= 0) {
      const [removed] = cur.children.splice(idx, 1);
      return [removed, copy];
    }
    for (const c of cur.children) stack.push(c);
  }
  return [undefined, copy];
}

function insertIntoFolder(root: FileItem, folderId: string, node: FileItem): FileItem {
  const copy = deepClone(root);
  const stack: FileItem[] = [copy];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.id === folderId && isFolder(cur)) {
      cur.children = cur.children || [];
      cur.children.push(node);
      return copy;
    }
    if (cur.children) for (const c of cur.children) stack.push(c);
  }
  return copy;
}

function isDescendant(root: FileItem, maybeAncestorId: string, maybeDescendantId: string): boolean {
  if (maybeAncestorId === maybeDescendantId) return true;
  const findInside = (n: FileItem): boolean => {
    if (!n.children) return false;
    for (const c of n.children) {
      if (c.id === maybeDescendantId) return true;
      if (findInside(c)) return true;
    }
    return false;
  };
  const stack: FileItem[] = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.id === maybeAncestorId) return findInside(cur);
    if (cur.children) stack.push(...cur.children);
  }
  return false;
}

function getFolderByPath(root: FileItem, path: string[]): FileItem {
  let cur = root;
  for (let i = 1; i < path.length; i++) {
    const name = path[i];
    const found = (cur.children || []).find((c) => c.name === name && isFolder(c));
    if (found) cur = found;
  }
  return cur;
}

/* -------- dataset demo -------- */
const demoRoot: FileItem = {
  id: "root",
  name: "Computer",
  type: "folder",
  children: [
    { id: uid(), name: "Photos", type: "folder", children: [] },
    {
      id: uid(),
      name: "Music",
      type: "folder",
      children: [
        { id: uid(), name: "hip-hop.mp3", type: "file", mime: "audio" },
        { id: uid(), name: "rap.mp3", type: "file", mime: "audio" },
        { id: uid(), name: "rock.mp3", type: "file", mime: "audio" },
        { id: uid(), name: "salsa.mp3", type: "file", mime: "audio" },
      ],
    },
    { id: uid(), name: "Download", type: "folder", children: [] },
  ],
};

/* -------- util de comparación flexible para el nombre -------- */
const normalizeName = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/* -------- validación del ejercicio -------- */
function validateExercise(root: FileItem) {
  const TARGET_FOLDER = "música latina"; // se compara con normalize
  const targetNormalized = normalizeName(TARGET_FOLDER);

  // 1) La carpeta "Música Latina" debe estar directamente en Computer/
  const rootChildren = root.children || [];
  const musicaLatina = rootChildren.find(
    (c) => isFolder(c) && normalizeName(c.name) === targetNormalized
  );
  if (!musicaLatina) {
    return { ok: false, reason: 'Crea en "Computer/" la carpeta "Música Latina".' };
  }

  // 2) Dentro de esa carpeta debe estar salsa.mp3
  const hasSalsaInside =
    (musicaLatina.children || []).some((f) => f.type === "file" && f.name === "salsa.mp3");
  if (!hasSalsaInside) {
    return { ok: false, reason: 'Arrastra "salsa.mp3" dentro de "Música Latina".' };
  }

  // 3) Y ya NO debe estar dentro de Music
  const musicFolder = rootChildren.find((c) => isFolder(c) && c.name === "Music");
  const stillInMusic =
    musicFolder && (musicFolder.children || []).some((f) => f.type === "file" && f.name === "salsa.mp3");
  if (stillInMusic) {
    return { ok: false, reason: '"salsa.mp3" no debe quedar en "Music".' };
  }

  return { ok: true, reason: "¡Correcto!" };
}

export function FileExplorerEmbedded() {
  const [tree, setTree] = useState<FileItem>(() => deepClone(demoRoot));
  const [path, setPath] = useState<string[]>(["Computer"]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const [ctxTargetId, setCtxTargetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  const QUESTION_IDX_ZERO_BASED = 1; // P2
  const QUESTION_IDX_ONE_BASED = 2; // para setPoint

  /* ==== Sesión por-usuario (evita mezclar) ==== */
  // Carga sesión cacheada (si existe) cuando conocemos el uid
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const sid = localStorage.getItem(sessionKeyFor(user.uid));
    if (sid) setSessionId(sid);
  }, [user?.uid]);

  // Si no hay cache, crear/asegurar una sesión y guardarla con clave por-usuario
  useEffect(() => {
    if (!user) return;
    if (sessionId) return;
    (async () => {
      try {
        const { id } = await ensureSession({
          userId: user.uid,
          competence: COMPETENCE,
          level: "Intermedio",
          totalQuestions: 3,
        });
        setSessionId(id);
        if (typeof window !== "undefined") {
          localStorage.setItem(sessionKeyFor(user.uid), id);
        }
      } catch (e) {
        console.error("No se pudo asegurar la sesión de test (P2):", e);
      }
    })();
  }, [user?.uid, sessionId]);

  const currentFolder = useMemo(() => getFolderByPath(tree, path), [tree, path]);

  const children = useMemo(() => {
    let list = currentFolder.children || [];
    if (query.trim())
      list = list.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
    return [...list].sort((a, b) =>
      isFolder(a) === isFolder(b) ? a.name.localeCompare(b.name) : isFolder(a) ? -1 : 1
    );
  }, [currentFolder, query]);

  /* -------------------- CRUD -------------------- */
  const createFolder = () => {
    const node: FileItem = { id: uid(), name: "Nueva carpeta", type: "folder", children: [] };
    setTree((t) => insertIntoFolder(t, currentFolder.id, node));
    setRenamingId(node.id);
    setSelectedId(node.id);
  };
  const createFile = () => {
    const node: FileItem = { id: uid(), name: "nuevo.txt", type: "file", mime: "text" };
    setTree((t) => insertIntoFolder(t, currentFolder.id, node));
    setRenamingId(node.id);
    setSelectedId(node.id);
  };
  const requestDelete = (id?: string) => {
    const target = id || selectedId;
    if (!target) return;
    if (!confirm("¿Eliminar el elemento seleccionado?")) return;
    setTree((t) => removeNodeById(t, target)[1]);
    setSelectedId(null);
  };
  const commitRename = (id: string, next: string) => {
    if (!next.trim()) return setRenamingId(null);
    const rename = (n: FileItem): FileItem =>
      n.id === id ? { ...n, name: next } : { ...n, children: n.children?.map(rename) };
    setTree((t) => rename(t));
    setRenamingId(null);
  };

  /* ---------------- Drag & Drop ----------------- */
  const onDragOverAllow = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const setDragData = (e: React.DragEvent, id: string) => {
    try {
      e.dataTransfer.setData("application/x-node-id", id);
    } catch {}
    e.dataTransfer.setData("text/plain", id);
  };
  const getDragId = (dt: DataTransfer) =>
    dt.getData("application/x-node-id") || dt.getData("text/plain");

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragData(e, id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = () => setDragOverId(null);

  const onDropInto = (e: React.DragEvent, destId: string) => {
    e.preventDefault();
    const sourceId = getDragId(e.dataTransfer);
    setDragOverId(null);
    if (!sourceId) return;

    if (isDescendant(tree, sourceId, destId)) return;

    const [node, without] = removeNodeById(tree, sourceId);
    if (!node) return;

    setTree(insertIntoFolder(without, destId, node));
  };

  const toggleExpand = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const openCtx = (e: React.MouseEvent, id: string | null) => {
    e.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : e.clientX;
    const y = rect ? e.clientY - rect.top : e.clientY;
    setCtxPos({ x, y });
    setCtxTargetId(id);
    setCtxOpen(true);
  };

  // Drop en sidebar
  const sidebarDropHandlers = (folderId: string) => ({
    onDragOver: (e: React.DragEvent) => {
      onDragOverAllow(e);
      setDragOverId(folderId);
    },
    onDragLeave: () => {
      setDragOverId((cur) => (cur === folderId ? null : cur));
    },
    onDrop: (e: React.DragEvent) => onDropInto(e, folderId),
  });

  // helper breadcrumb (recupera id de carpeta por nombre en el path activo)
  const getFolderIdByNameUnderPath = (name: string, uptoIndex: number): string | null => {
    if (name === "Computer") return "root";
    let cur: FileItem | undefined = tree;
    for (let i = 1; i <= uptoIndex; i++) {
      const seg = path[i];
      cur = (cur.children || []).find((c) => c.name === seg && isFolder(c));
      if (!cur) return null;
      if (seg === name) return cur.id;
    }
    return null;
  };

  /* ------------------- NEXT (validar + puntaje + navegar) ------------------- */
  const handleNext = async () => {
    const res = validateExercise(tree);
    const point: 0 | 1 = res.ok ? 1 : 0;

    // 1) Progreso local
    setPoint(COMPETENCE, LEVEL, QUESTION_IDX_ONE_BASED, point);

    // 2) Firestore — usa sesión por-usuario y guarda el acierto (true/false)
    let sid = sessionId;
    try {
      if (!sid && user) {
        // intenta recuperar de LS por-usuario
        const cached = typeof window !== "undefined" ? localStorage.getItem(sessionKeyFor(user.uid)) : null;
        if (cached) {
          sid = cached;
        } else {
          // crear si no existe todavía
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          sid = id;
          setSessionId(id);
          if (typeof window !== "undefined") localStorage.setItem(sessionKeyFor(user.uid), id);
        }
      }
    } catch (e) {
      console.error("No se pudo (re)asegurar la sesión al guardar P2:", e);
    }

    try {
      if (sid) {
        // Guarda en answers[1] = true/false, NO “true” fijo
        await markAnswered(sid, QUESTION_IDX_ZERO_BASED, point === 1);
      }
    } catch (e) {
      console.warn("No se pudo marcar P2 respondida:", e);
    }

    // 3) Avanzar
    router.push("/exercises/comp-1-3/intermedio/ej3");
  };

  return (
    <div className="border rounded-2xl shadow-lg h-[520px] flex flex-col overflow-hidden" ref={ref}>
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r bg-gray-50 p-2 overflow-auto">
          <div className="font-semibold text-sm px-1 mb-1">Computer</div>
          <div>
            {/* Nodo raíz */}
            <div
              className={`flex items-center py-1 px-1 rounded cursor-pointer ${
                dragOverId === "root" ? "bg-blue-100" : "hover:bg-gray-200"
              }`}
              role="button"
              onClick={() => {
                setPath(["Computer"]);
                setSelectedId("root");
              }}
              {...sidebarDropHandlers("root")}
            >
              <button
                className="w-5 h-5 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand("root");
                }}
                aria-label="Expandir"
                title="Expandir"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${expanded["root"] ? "rotate-90" : "rotate-0"}`}
                />
              </button>
              <Folder className="w-4 h-4 mr-2" />
              <span className="text-sm truncate">Computer</span>
            </div>

            {/* Hijos de raíz */}
            {expanded["root"] && (
              <div className="ml-6">
                {(tree.children || []).map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center py-1 px-1 rounded cursor-pointer ${
                      dragOverId === c.id ? "bg-blue-100" : "hover:bg-gray-200"
                    }`}
                    role="button"
                    onClick={() => {
                      if (isFolder(c)) setPath(["Computer", c.name]);
                      setSelectedId(c.id);
                    }}
                    {...(isFolder(c) ? sidebarDropHandlers(c.id) : {})}
                  >
                    {isFolder(c) ? <Folder className="w-4 h-4 mr-2" /> : <File className="w-4 h-4 mr-2" />}
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <section
          className="flex-1 flex flex-col"
          onClick={(e) => {
            const el = e.target as HTMLElement;
            if (el.closest("[data-ctx-menu]")) return;
            setCtxOpen(false);
          }}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("[data-item-context]")) return;
            openCtx(e, null);
          }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
            <div className="flex items-center gap-2">
              <button
                className="p-1 rounded hover:bg-gray-100"
                onClick={() => {
                  if (path.length > 1) setPath(path.slice(0, -1));
                }}
                aria-label="Atrás"
                title="Atrás"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-700">
                {path.map((seg, i) => {
                  const folderId = seg === "Computer" ? "root" : getFolderIdByNameUnderPath(seg, i) ?? "root";
                  const crumbPath = path.slice(0, i + 1);
                  return (
                    <div key={i} className="flex items-center">
                      <button
                        className={`px-1 rounded ${
                          dragOverId === folderId ? "bg-blue-100" : "hover:underline"
                        }`}
                        onClick={() => setPath(crumbPath)}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDragEnter={() => setDragOverId(folderId)}
                        onDragLeave={() => setDragOverId((cur) => (cur === folderId ? null : cur))}
                        onDrop={(e) => onDropInto(e, folderId)}
                      >
                        {seg}
                      </button>
                      {i < path.length - 1 && <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar"
                  className="pl-8 pr-2 py-1.5 border rounded-2xl text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <button className="p-1 rounded hover:bg-gray-100" onClick={() => setView("grid")} title="Cuadrícula">
                <GridIcon className={`w-5 h-5 ${view === "grid" ? "text-blue-600" : "text-gray-600"}`} />
              </button>
              <button className="p-1 rounded hover:bg-gray-100" onClick={() => setView("list")} title="Lista">
                <ListIcon className={`w-5 h-5 ${view === "list" ? "text-blue-600" : "text-gray-600"}`} />
              </button>
            </div>
          </div>

          {/* Contenido (drop en carpeta actual) */}
          <div
            className={`relative flex-1 overflow-auto bg-white ${
              dragOverId === currentFolder.id ? "ring-2 ring-blue-200" : ""
            }`}
            onClick={() => {
              setSelectedId(null);
              setCtxOpen(false);
            }}
            onDragOver={onDragOverAllow}
            onDragEnter={() => setDragOverId(currentFolder.id)}
            onDragLeave={() => setDragOverId((cur) => (cur === currentFolder.id ? null : cur))}
            onDrop={(e) => onDropInto(e, currentFolder.id)}
            onContextMenu={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-item-context]")) return;
              openCtx(e, null);
            }}
          >
            {view === "grid" ? (
              <div className="p-4 grid grid-cols-6 gap-4">
                {children.map((item) => (
                  <div
                    key={item.id}
                    data-item-context
                    className={`group rounded-lg p-3 border hover:shadow-sm cursor-pointer ${
                      selectedId === item.id ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-gray-200"
                    } ${dragOverId === item.id ? "ring-2 ring-blue-300" : ""}`}
                    draggable={item.type === "file"}
                    onDragStart={(e) => item.type === "file" && onDragStart(e, item.id)}
                    onDragEnd={onDragEnd}
                    onDoubleClick={() => {
                      if (isFolder(item)) setPath([...path, item.name]);
                    }}
                    onContextMenu={(e) => openCtx(e, item.id)}
                    onDragOver={isFolder(item) ? onDragOverAllow : undefined}
                    onDragEnter={() => isFolder(item) && setDragOverId(item.id)}
                    onDragLeave={() => setDragOverId((cur) => (cur === item.id ? null : cur))}
                    onDrop={isFolder(item) ? (e) => onDropInto(e, item.id) : undefined}
                  >
                    <div className="w-full h-20 rounded flex items-center justify-center">
                      {isFolder(item) ? (
                        <Folder className="w-10 h-10" />
                      ) : item.mime === "audio" ? (
                        <FileAudio className="w-10 h-10" />
                      ) : item.mime === "image" ? (
                        <ImageIcon className="w-10 h-10" />
                      ) : item.mime === "video" ? (
                        <Video className="w-10 h-10" />
                      ) : item.mime === "text" ? (
                        <FileText className="w-10 h-10" />
                      ) : (
                        <File className="w-10 h-10" />
                      )}
                    </div>
                    {renamingId === item.id ? (
                      <input
                        className="mt-2 w-full border rounded px-1 py-1 text-xs"
                        autoFocus
                        defaultValue={item.name}
                        onBlur={(e) => commitRename(item.id, e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(item.id, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                    ) : (
                      <div
                        className="mt-2 text-xs text-center truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                        }}
                      >
                        {item.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Nombre</th>
                      <th className="py-2 w-40">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((item) => (
                      <tr
                        key={item.id}
                        data-item-context
                        className={`hover:bg-gray-50 ${selectedId === item.id ? "bg-blue-50" : ""} ${
                          dragOverId === item.id ? "ring-2 ring-blue-300" : ""
                        }`}
                        onDoubleClick={() => isFolder(item) && setPath([...path, item.name])}
                        draggable={item.type === "file"}
                        onDragStart={(e) => item.type === "file" && onDragStart(e, item.id)}
                        onDragEnd={onDragEnd}
                        onContextMenu={(e) => openCtx(e, item.id)}
                        onDragOver={isFolder(item) ? onDragOverAllow : undefined}
                        onDragEnter={() => isFolder(item) && setDragOverId(item.id)}
                        onDragLeave={() => setDragOverId((cur) => (cur === item.id ? null : cur))}
                        onDrop={isFolder(item) ? (e) => onDropInto(e, item.id) : undefined}
                      >
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {isFolder(item) ? (
                              <Folder className="w-5 h-5" />
                            ) : item.mime === "audio" ? (
                              <FileAudio className="w-5 h-5" />
                            ) : item.mime === "image" ? (
                              <ImageIcon className="w-5 h-5" />
                            ) : item.mime === "video" ? (
                              <Video className="w-5 h-5" />
                            ) : item.mime === "text" ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <File className="w-5 h-5" />
                            )}
                            {renamingId === item.id ? (
                              <input
                                className="border rounded px-1 py-0.5 text-sm"
                                autoFocus
                                defaultValue={item.name}
                                onBlur={(e) => commitRename(item.id, e.currentTarget.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRename(item.id, (e.target as HTMLInputElement).value);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                              />
                            ) : (
                              <button
                                className="truncate max-w-[420px] text-left"
                                onClick={() => setSelectedId(item.id)}
                              >
                                {item.name}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>{isFolder(item) ? "Carpeta" : item.mime || "Archivo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menú contextual */}
            {ctxOpen && (
              <div
                className="absolute z-50 bg-white border shadow-lg rounded py-1 text-sm"
                style={{ left: ctxPos.x, top: ctxPos.y }}
                data-ctx-menu
              >
                {ctxTargetId ? (
                  <>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-44"
                      onClick={() => {
                        setRenamingId(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      <Edit className="w-4 h-4" /> Renombrar
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-44"
                      onClick={() => {
                        requestDelete(ctxTargetId);
                        setCtxOpen(false);
                      }}
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-44"
                      onClick={() => {
                        createFolder();
                        setCtxOpen(false);
                      }}
                    >
                      <Plus className="w-4 h-4" /> Nueva carpeta
                    </button>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 w-44"
                      onClick={() => {
                        createFile();
                        setCtxOpen(false);
                      }}
                    >
                      <Plus className="w-4 h-4" /> Nuevo archivo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer / acciones */}
          <div className="px-3 py-3 border-t bg-white flex items-center justify-end">
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto px-8 sm:px-10 py-3 bg-[#286675] rounded-xl font-medium text-white shadow-lg hover:bg-[#3a7d89]"
            >
              Siguiente
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
