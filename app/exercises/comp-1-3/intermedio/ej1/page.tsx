"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Type as TypeIcon, Image as ImageIcon, Video, Rows3,
  GripVertical, Copy, Trash2,
} from "lucide-react";
import Link from "next/link";

/* ======= NUEVO: progreso/registro ========= */
import { useAuth } from "@/contexts/AuthContext"; // NEW
import { ensureSession, markAnswered } from "@/lib/testSession"; // NEW
import { setPoint } from "@/lib/levelProgress"; // NEW
import { useRouter } from "next/navigation"; // NEW

// ======= NUEVO (puntaje/sesión) =======
const COMPETENCE = "1.3";
const LEVEL = "intermedio";

const SESSION_PREFIX = "session:1.3:Intermedio";
const sessionKeyFor = (uid: string) => `${SESSION_PREFIX}:${uid}`;


/* ----------------- Tipos de pregunta ----------------- */
const QUESTION_TYPES = [
  { value: "multiple", label: "Opción múltiple" },
  { value: "dropdown", label: "Desplegable" },
  { value: "short", label: "Respuesta corta" },
  { value: "paragraph", label: "Párrafo" },
  { value: "date", label: "Fecha" },
] as const;
type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

type Question = {
  id: string;
  title: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  hasOther: boolean;
};

const newQuestion = (n: number): Question => ({
  id: `q-${n}-${Math.random().toString(36).slice(2, 7)}`,
  title: "Pregunta",
  type: "multiple",
  options: ["Opción 1"],
  required: false,
  hasOther: false,
});

// --- Helpers de normalización y evaluación ---
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

type ExpectedRule = {
  keys: string[];          // títulos aceptados (normalizados)
  mustType: QuestionType;  // tipo requerido
  label: string;           // para mostrar
};

const EXPECTED: ExpectedRule[] = [
  { label: "Nombre", keys: ["nombre"], mustType: "short" },
  { label: "Apellido", keys: ["apellido"], mustType: "short" },
  { label: "Fecha de nacimiento", keys: ["fecha de nacimiento", "fecha nacimiento"], mustType: "date" },
  { label: "Género", keys: ["genero", "género"], mustType: "dropdown" },
  { label: "Alérgico a medicamentos", keys: ["alergico a medicamentos", "alérgico a medicamentos", "alergias a medicamentos"], mustType: "dropdown" },
];

type CheckItem = { label: string; ok: boolean; reason?: string };

function evaluateQuestions(questions: Question[]): { score: number; details: CheckItem[] } {
  const details: CheckItem[] = [];
  let score = 0;

  for (const rule of EXPECTED) {
    // busca una pregunta cuyo título matchee cualquiera de las keys
    const match = questions.find(q => rule.keys.includes(norm(q.title)));
    if (!match) {
      details.push({ label: rule.label, ok: false, reason: "Falta el campo o el título no coincide" });
      continue;
    }
    if (match.type !== rule.mustType) {
      details.push({
        label: rule.label,
        ok: false,
        reason: `Tipo incorrecto (${match.type}). Debe ser ${rule.mustType}.`,
      });
      continue;
    }
    details.push({ label: rule.label, ok: true });
    score += 1;
  }

  return { score, details };
}

/* ----------------- Builder ----------------- */
export default function GoogleLikeFormBuilder() {
  const router = useRouter(); // NEW
  const { user } = useAuth(); // NEW
  const [sessionId, setSessionId] = useState<string | null>(null); // NEW
  const [done, setDone] = useState(false); // NEW

  // Carga sesión cacheada (si existe)
    useEffect(() => {
      if (!user || typeof window === "undefined") return;
      const LS_KEY = sessionKeyFor(user.uid);
      const sid = localStorage.getItem(LS_KEY);
      if (sid) setSessionId(sid);
    }, [user?.uid]);
    // Crea/asegura sesión tempranamente
    useEffect(() => {
      // si no hay user, “descachea” el estado local
      if (!user) {
        setSessionId(null);
        return;
      }

      const LS_KEY = sessionKeyFor(user.uid);
      const cached =
        typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

      if (cached) {
        setSessionId(cached);
        return;
      }

      (async () => {
        try {
          const { id } = await ensureSession({
            userId: user.uid,
            competence: COMPETENCE,
            level: "Intermedio",
            totalQuestions: 3,
          });
          setSessionId(id);
          localStorage.setItem(LS_KEY, id);
        } catch (e) {
          console.error("No se pudo asegurar la sesión de test:", e);
        }
      })();
    }, [user?.uid]);


  const [formTitle, setFormTitle] = useState("Formulario sin título");
  const [formDesc, setFormDesc] = useState("Descripción del formulario");
  const [questions, setQuestions] = useState<Question[]>([newQuestion(1), newQuestion(2)]);
  const [selectedId, setSelectedId] = useState<string | null>(questions[0]?.id ?? null);
  const [currentIndex, setCurrentIndex] = useState(0)

  const totalQuestions = 3
  const progress = ((currentIndex + 1) / totalQuestions) * 100

  const canvasRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (canvasRef.current && !canvasRef.current.contains(e.target as Node)) setSelectedId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* acciones */
  const removeOption = (qid: string, optIndex: number) =>
  setQuestions((prev) =>
    prev.map((q) =>
      q.id === qid
        ? {
            ...q,
            // evita dejar 0 opciones; mínimo 1
            options:
              q.options.length > 1
                ? q.options.filter((_, i) => i !== optIndex)
                : q.options,
          }
        : q
    )
  );


  const addQuestion = () =>
    setQuestions((prev) => {
      const q = newQuestion(prev.length + 1);
      setSelectedId(q.id);
      return [...prev, q];
    });

  const updateQuestion = (id: string, patch: Partial<Question>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const addOption = (qid: string) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...q.options, `Opción ${q.options.length + 1}`] } : q,
      ),
    );

  const addOther = (qid: string) =>
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, hasOther: true } : q)));

  const removeQuestion = (qid: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
    if (selectedId === qid) setSelectedId(null);
  };

  const duplicateQuestion = (qid: string) =>
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx < 0) return prev;
      const copy: Question = {
        ...prev[idx],
        id: `q-${prev.length + 1}-${Math.random().toString(36).slice(2, 7)}`,
      };
      const next = [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
      setSelectedId(copy.id);
      return next;
    });


    function QuestionActions({
    onAddBelow,
    onDuplicate,
    onRemove,
  }: {
    onAddBelow: () => void;
    onDuplicate: () => void;
    onRemove: () => void;
  }) {
    return (
      <div
        className="
          hidden md:flex flex-col gap-2 
          absolute right-[-56px] top-1/2 -translate-y-1/2 
          z-10
        "
        onClick={(e) => e.stopPropagation()}
        aria-label="Acciones de pregunta"
      >
        <IconFab title="Agregar pregunta debajo" onClick={onAddBelow}>
          <Plus className="w-5 h-5" />
        </IconFab>
        <IconFab title="Duplicar" onClick={onDuplicate}>
          <Copy className="w-5 h-5" />
        </IconFab>
        <IconFab title="Eliminar" onClick={onRemove}>
          <Trash2 className="w-5 h-5" />
        </IconFab>
      </div>
    );
  }

  const addQuestionAfter = (qid: string) =>
  setQuestions((prev) => {
    const idx = prev.findIndex((q) => q.id === qid);
    if (idx < 0) return prev;
    const q = newQuestion(prev.length + 1);
    const next = [...prev.slice(0, idx + 1), q, ...prev.slice(idx + 1)];
    setSelectedId(q.id);
    return next;
  });

  // ---- Simulación de publicación/compartir ----
  type PublishState = {
  open: boolean;
  link: string;
  copied: boolean;
  mailed: boolean;
  shared: boolean;
  step: "idle" | "publishing" | "ready";
  result?: { score: number; details: CheckItem[] }; // <-- nuevo
};

const [pub, setPub] = useState<PublishState>({
  open: false,
  link: "",
  copied: false,
  mailed: false,
  shared: false,
  step: "idle",
  result: undefined,
});


  // Email “objetivo” solo para mostrar en la simulación
  const COORD_EMAIL = "coordinacion@colegio.edu";

  const validateBeforePublish = () => {
    if (!formTitle.trim()) return "El formulario necesita un título.";
    if (!questions.length) return "Agrega al menos una pregunta.";
    if (questions.some((q) => !q.title.trim())) return "Hay preguntas sin título.";
    return null;
  };

  const fakeGenerateLink = () => {
    const id = Math.random().toString(36).slice(2, 10);
    return `${window.location.origin}/form/publicado/${id}`;
  };

  const handlePublishSim = () => {
    const err = validateBeforePublish();
    if (err) {
      alert(err);
      return;
    }
    setPub({ open: true, link: "", copied: false, mailed: false, shared: false, step: "publishing" });

    // “Proceso” de publicación simulado
    setTimeout(() => {
      const link = fakeGenerateLink();
      setPub((p) => ({ ...p, link, step: "ready" }));
    }, 900);
  };

  // ====== NUEVO: lógica de aprobación/guardado al "enviar a coordinación (sim)" ======
  const persistScoreAndAdvance = async (score: number) => {
    const point: 0 | 1 = score >= 3 ? 1 : 0;

    // progreso local (esto puede que también necesite user-scoping; ver nota al final)
    setPoint(COMPETENCE, LEVEL, 1, point);

    // 🔧 Usa la misma clave por-usuario para leer el SID
    try {
      const LS_KEY = user ? sessionKeyFor(user.uid) : null;
      const sid =
        sessionId ||
        (LS_KEY && typeof window !== "undefined"
          ? localStorage.getItem(LS_KEY)
          : null);

      if (sid) {
        await markAnswered(sid, 0, point === 1); // índice 0 = P1
      }
    } catch (e) {
      console.warn("No se pudo marcar P1 respondida:", e);
    }

    setDone(true);
    router.push("/exercises/comp-1-3/intermedio/ej2");
  };


  // Acciones simuladas dentro del modal
  const simCopy = () => {
    setPub((p) => ({ ...p, copied: true }));
  };

  const simMail = () => {
    const result = evaluateQuestions(questions);
    setPub(p => ({ ...p, mailed: true, result }));
    // ⬆️ solo marca mailed y muestra resultado en el modal (sin guardar ni navegar)
  };

  const handleNext = async () => {
    const { score } = evaluateQuestions(questions);
    await persistScoreAndAdvance(score); // guarda punto y navega a ej2
  };

  const simShare = () => {
    setPub((p) => ({ ...p, shared: true }));
  };

  return (
    <div className="min-h-screen bg-[#f3fbfb]">
      {/* Header (idéntico en composición y colores) */}
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

      {/* Progreso (misma barra y dots) */}
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
      {/* TARJETA DE PREGUNTA LADICO (contenedor maestro) */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
        <Card className="bg-white shadow-2xl rounded-2xl sm:rounded-3xl border-0 transition-all duration-300 ring-2 ring-[#286575] ring-opacity-30 shadow-[#286575]/10">

          <CardContent className="p-4 sm:p-6 lg:p-8">
            {/* Encabezado del formulario dentro de la tarjeta */}
            {/* Header del ejercicio */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Generar Campos de un formulario</h2>
                    </div>
                  </div>

                  {/* Instrucciones*/}
                  <div className="mb-6 sm:mb-8">
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]">
                      <p className="text-gray-700 leading-relaxed font-medium text-sm sm:text-base">
                        Eres profesor/a del 4°B en el Colegio San Agustín y debes crear un formulario digital para recopilar datos de tus estudiantes de manera organizada y actualizada.
                        Tarea: Crear un formulario con los siguientes campos: Nombre, Apellido, Fecha de nacimiento, Género y Alérgico a medicamentos (Sí/No).
                        <br />
                        Una vez creado, deberás publicarlo y enviar el enlace con la coordinación académica.
                      </p>
                    </div>
                  </div>
                </div>

            {/* AQUÍ ADENTRO van las CARDS de cada pregunta */}
            <div className="space-y-4">
              {questions.map((q) => {
                const selected = selectedId === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={`relative rounded-2xl transition-all cursor-pointer ${
                      selected
                        ? "bg-white ring-2 ring-[#286575] ring-opacity-30 shadow-lg"
                        : "bg-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    {/* barra lateral cuando activa (la línea de estado) */}
                    {selected && (
                      <div className="absolute left-0 top-0 bottom-0 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-l-4 border-[#286575]" />
                    )}

                    {/* ⇩ NUEVO: acciones al costado, se mantienen centradas aunque cambie la altura */}
                    {(selected) && (
                      <QuestionActions
                        onAddBelow={() => addQuestionAfter(q.id)}
                        onDuplicate={() => duplicateQuestion(q.id)}
                        onRemove={() => removeQuestion(q.id)}
                      />
                    )}


                    <div className={`p-5 sm:p-6 ${selected ? "pl-7 sm:pl-8" : ""}`}>
                      {selected ? (
                        <ExpandedQuestion
                          q={q}
                          updateQuestion={updateQuestion}
                          duplicateQuestion={duplicateQuestion}
                          removeQuestion={removeQuestion}
                          addOption={addOption}
                          addOther={addOther}
                          removeOption={removeOption}  
                        />
                      ) : (
                        <CollapsedQuestion q={q} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* botón publicar (simulación) */}
            <div className="mt-6 flex justify-between">
            <Button
            onClick={handlePublishSim}
            className="bg-[#286675] hover:bg-[#3a7d89] rounded-xl px-6 text-white"
            >
            Publicar
            </Button>


            <Button
            onClick={handleNext}
            className="bg-[#286575] hover:bg-[#3a7d89] rounded-xl px-6 text-white"
            >
            Siguiente
            </Button>
            </div>
            {/* Modal de simulación de publicación */}
            {pub.open && (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
                  <div className="p-5 sm:p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Publicación del formulario (simulación)</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Esta es una simulación. No se copia ni se envía nada realmente.
                    </p>
                  </div>

                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Paso: “publicando” */}
                    {pub.step === "publishing" && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-3 h-3 rounded-full bg-[#286575] animate-pulse" />
                        <span className="text-gray-700">Publicando formulario…</span>
                      </div>
                    )}

                    {/* Paso: listo */}
                    {pub.step === "ready" && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enlace generado</label>
                          <div className="mt-1 w-full border rounded-xl px-3 py-2 text-gray-700 bg-gray-50 select-all break-all">
                            {pub.link}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            *Simulado: puedes seleccionarlo manualmente para “copiar”.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <Button
                            variant="outline"
                            onClick={simCopy}
                            className={`rounded-xl ${pub.copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
                          >
                            {pub.copied ? "✓ Copiado" : "Copiar enlace"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={simShare}
                            className={`rounded-xl ${pub.shared ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
                          >
                            {pub.shared ? "✓ Compartido" : "Compartir"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={simMail}
                            className={`rounded-xl ${pub.mailed ? "border-purple-300 bg-purple-50 text-purple-700" : ""}`}
                          >
                            {pub.mailed ? "✓ Email enviado" : "Enviar a coordinación"}
                          </Button>
                        </div>

                        {/* Información objetivo para el usuario */}
                        <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-[#286575]">
                          <p className="text-sm text-gray-700">
                            En un entorno real, este enlace se copiaría al portapapeles, se abriría el
                            diálogo nativo de compartir y/o se enviaría un correo a <b>{COORD_EMAIL}</b> con el enlace.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="px-5 sm:px-6 py-4 border-t flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setPub({ open: false, link: "", copied: false, mailed: false, shared: false, step: "idle" })
                      }
                      className="rounded-xl"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------- Subcomponentes ------------- */
function IconFab({
  children, title, onClick,
}: { children: React.ReactNode; title: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid place-items-center w-10 h-10 rounded-full bg-white border shadow hover:shadow-md"
    >
      {children}
    </button>
  );
}

function CollapsedQuestion({ q }: { q: Question }) {
  return (
    <div>
      <p className="text-gray-700 font-semibold mb-2">{q.title}</p>

      {q.type === "short" && (
        <div className="mt-1 w-full border-0 border-b border-gray-300 rounded-none px-0 text-sm text-gray-400 shadow-none focus-visible:ring-0">
          Respuesta corta
        </div>
      )}

      {q.type === "paragraph" && (
        <div className="mt-1 w-full border-0 border-b border-gray-300 rounded-none px-0 text-sm text-gray-400 shadow-none focus-visible:ring-0">
          Respuesta larga
        </div>
      )}

      {q.type === "multiple" && (
        <>
          <div className="text-gray-700">
            {q.options.map((opt, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <span className="text-gray-400">○</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {q.type === "dropdown" && (
        <div className="inline-flex items-center gap-2 text-gray-600">
          <span className="text-gray-400">▼</span>
          <span>{q.options.length ? q.options.join(" / ") : "—"}</span>
        </div>
      )}

      {q.type === "date" && (
        <div className="mt-1 w-full border-0 border-b border-gray-300 rounded-none px-0 
                        text-sm text-gray-400 shadow-none focus-visible:ring-0">
          Mes, día, año
        </div>
      )}
    </div>
  );
}


function ExpandedQuestion({
  q, updateQuestion, duplicateQuestion, removeQuestion, addOption, addOther, removeOption
}: {
  q: Question;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  duplicateQuestion: (id: string) => void;
  removeQuestion: (id: string) => void;
  addOption: (id: string) => void;
  addOther: (id: string) => void;
  removeOption: (qid: string, optIndex: number) => void; 
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-2 text-gray-400"><GripVertical className="w-5 h-5" /></div>

      <div className="flex-1" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_240px] gap-3">
          <Input
            value={q.title}
            onChange={(e) => updateQuestion(q.id, { title: e.target.value })}
            className="border-0 border-b px-0 focus-visible:ring-0"
            placeholder="Pregunta"
          />

          <Select
            value={q.type}
            onValueChange={(v: QuestionType) => updateQuestion(q.id, { type: v })}
          >
            <SelectTrigger
              onClick={(e) => e.stopPropagation()}
              className="justify-between bg-white border border-gray-300 rounded-md"
            >
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 shadow-lg"
            >
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>

        <div className="mt-4">
          {q.type === "short" && (
            <Input
              type="text"
              disabled
              placeholder="Texto de respuesta corta"
              className="mt-1 w-full border-0 border-b border-gray-700 rounded-none px-0 text-sm text-gray-400 shadow-none focus-visible:ring-0"
            />
          )}

          {/* Párrafo */}
          {q.type === "paragraph" && <Textarea disabled placeholder="Respuesta larga" />}

          {/* Opción múltiple (radio) */}
          {q.type === "multiple" && (
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <div key={`${q.id}-opt-m-${i}`} className="flex items-center gap-3 group">
                  <div className="w-4 h-4 rounded-full border border-gray-400" />
                  <Input
                    value={opt}
                    className="flex-1 border-0 border-b border-gray-300 rounded-none px-0 text-sm text-gray-700 shadow-none focus-visible:ring-0"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const next = [...q.options];
                      next[i] = e.target.value;
                      updateQuestion(q.id, { options: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(q.id, i);
                    }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    title="Eliminar opción"
                    disabled={q.options.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-4 pl-7">
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  className="text-sm text-gray-700 hover:text-[#286575]"
                >
                  + Agregar una opción
                </button>
                {!q.hasOther && (
                  <>
                    <span className="text-gray-400">o</span>
                    <button
                      type="button"
                      onClick={() => addOther(q.id)}
                      className="text-sm text-[#1a73e8] hover:underline"
                    >
                      agregar "Otros"
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Desplegable (dropdown) */}
          {q.type === "dropdown" && (
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <div key={`${q.id}-opt-d-${i}`} className="flex items-center gap-3 group">
                  <div className="w-4 h-4 rounded border border-gray-400 grid place-items-center text-[10px] text-gray-400">▼</div>
                  <Input
                    value={opt}
                    className="h-9 flex-1 border-0 border-b border-gray-300 rounded-none px-0 text-sm text-gray-700 shadow-none focus-visible:ring-0"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const next = [...q.options];
                      next[i] = e.target.value;
                      updateQuestion(q.id, { options: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(q.id, i);
                    }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    title="Eliminar opción"
                    disabled={q.options.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-4 pl-7">
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  className="text-sm text-gray-700 hover:text-[#286575]"
                >
                  + Agregar una opción
                </button>
              </div>
            </div>
          )}
          {q.type === "date" && (
            <div className="mt-1 w-full border-0 border-b border-gray-300 rounded-none px-0 
                            text-sm text-gray-400 shadow-none focus-visible:ring-0">
              Mes, día, año
            </div>
          )}

        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-1 text-gray-500">
            <Button variant="ghost" size="icon" onClick={() => duplicateQuestion(q.id)} className="hover:bg-gray-100" title="Duplicar">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="hover:bg-gray-100" title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Obligatoria</span>
            <Switch checked={q.required} onCheckedChange={(v) => updateQuestion(q.id, { required: v })} />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mt-2 text-gray-500 hover:text-gray-700"
        title="Agregar imagen"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ImageIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
