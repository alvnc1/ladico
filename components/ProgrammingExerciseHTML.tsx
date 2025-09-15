"use client"

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
} from "react"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs"

type Answer = {
  hidroClass: string
  solarHeading: string
  plantaClass: string
}

type Props = {
  onFinish?: (point: 0 | 1) => void
  showFinishButton?: boolean
}

export type HtmlExerciseHandle = {
  finish: () => void
}


function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative mx-4 my-8 w-full ${wide ? "max-w-6xl" : "max-w-4xl"} rounded-2xl bg-white shadow-xl border`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center px-2 py-1 rounded-xl text-sm bg-gray-100 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}


const ProgrammingExerciseHTML = forwardRef<HtmlExerciseHandle, Props>(
  ({ onFinish, showFinishButton = false }, ref) => {
    const [answers, setAnswers] = useState<Answer>({
      hidroClass: "",
      solarHeading: "",
      plantaClass: "",
    })
    const [feedback, setFeedback] = useState<string | null>(null)


    const [previewOpen, setPreviewOpen] = useState(false)
    const [codeOpen, setCodeOpen] = useState(false)

    const normalizeClass = (value: string) =>
      value.trim().toLowerCase().replace(/^class\s*=?\s*/, "").replace(/['"]/g, "").trim()

    const computePoint = (): 0 | 1 => {
      const okHidro = normalizeClass(answers.hidroClass) === "celeste"
      const okSolar = answers.solarHeading === "h3"
      const okPlanta = normalizeClass(answers.plantaClass) === "verde"
      return okHidro && okSolar && okPlanta ? 1 : 0
    }

    const finish = useCallback(() => {
      const point = computePoint()
      onFinish?.(point)
      setFeedback(
        point
          ? "✅ ¡Excelente! Todas las respuestas están correctas."
          : "❌ Aún hay respuestas incorrectas. Revisa tus selecciones."
      )
    }, [onFinish, answers])

    useImperativeHandle(ref, () => ({ finish }))

    const rowStyle = "grid grid-cols-1 sm:grid-cols-[500px,20rem] items-center gap-2"
    const selectStyle =
      "px-2 py-1 rounded-md border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#286575] w-full sm:w-80 font-inherit"

    const codeString = `<!DOCTYPE html>
<html lang="es">
  <head>
    <title>Energías renovables en América Latina</title>
  </head>
  <body>
    <h1 id="titulo" class="headline">Energías renovables en América Latina</h1>

    <h2>Definición</h2>
    <p id="intro" class="celeste">Las energías renovables provienen de fuentes naturales...</p>

    <h2>Diferentes tipos</h2>

    <h3>Solar</h3>
    <p id="solar" class="amarillo">La radiación solar se puede aprovechar con paneles...</p>

    <h3>Eólica</h3>
    <p id="viento" class="verde">El viento se utiliza mediante aerogeneradores...</p>

    <h3>Hidráulica</h3>
    <p id="hidro">El agua de ríos y embalses produce energía hidráulica...</p>

    <h3>Hidrógeno verde</h3>
    <p id="planta" class="verde subrayado">El hidrógeno verde es una fuente en crecimiento...</p>

    <p id="fuente" class="fuente">Fuente: Agencia Internacional de Energías Renovables</p>
  </body>
</html>`

    return (
      <div className="rounded-2xl border bg-white p-6">
        {/* Vista previa + código */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ---- Panel Vista previa ---- */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Vista previa</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gray-200 text-gray-900 text-sm hover:bg-gray-300"
                >
                  Ampliar
                </button>
                <a
                  href="/preview/renovables-latam.html"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#286675] text-white text-sm hover:bg-[#3a7d89]"
                >
                  Abrir en pestaña
                </a>
              </div>
            </div>
            <iframe
              src="/preview/renovables-latam.html"
              title="Vista previa renovables"
              className="w-full h-[420px] bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="lazy"
            />
          </div>

          {/* ---- Panel Código ---- */}
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">HTML</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCodeOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gray-200 text-gray-900 text-sm hover:bg-gray-300"
                >
                  Ampliar
                </button>
              </div>
            </div>
            <SyntaxHighlighter
              language="xml"
              style={atomOneDark}
              customStyle={{ margin: 0, fontSize: "0.85rem", height: "428px", background: "#1e1e1e" }}
              wrapLongLines={false}
              showLineNumbers={false}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Preguntas */}
        <div className="space-y-4 text-sm text-gray-700">
          {/* 1) HIDRO */}
          <div className={rowStyle}>
            <label className="text-sm text-gray-800">
              El párrafo con ID <code>hidro</code> debe tener el mismo estilo que el párrafo de la
              definición. ¿Qué atributo debes agregar?
            </label>
            <select
              value={answers.hidroClass}
              onChange={(e) => setAnswers({ ...answers, hidroClass: e.target.value })}
              className={selectStyle}
            >
              <option value="" disabled>Selecciona…</option>
              <option value='class="celeste"'>class="celeste"</option>
              <option value="celeste">celeste</option>
              <option value='id="celeste"'>id="celeste"</option>
              <option value='class="azul"'>class="azul"</option>
              <option value='style="color: blue"'>style="color: blue"</option>
            </select>
          </div>

          {/* 2) SOLAR */}
          <div className={rowStyle}>
            <label className="text-sm text-gray-800">
              El encabezado de “Solar” es incorrecto. ¿Qué nivel de encabezado debe llevar?
            </label>
            <select
              value={answers.solarHeading}
              onChange={(e) => setAnswers({ ...answers, solarHeading: e.target.value })}
              className={selectStyle}
            >
              <option value="" disabled>Selecciona…</option>
              <option value="h1">h1</option>
              <option value="h2">h2</option>
              <option value="h3">h3</option>
              <option value="h4">h4</option>
              <option value="h5">h5</option>
              <option value="h6">h6</option>
            </select>
          </div>

          {/* 3) PLANTA */}
          <div className={rowStyle}>
            <label className="text-sm text-gray-800">
              El párrafo con ID <code>planta</code> tiene subrayado. ¿Cómo debería quedar el
              atributo para que NO tenga subrayado y mantenga el color?
            </label>
            <select
              value={answers.plantaClass}
              onChange={(e) => setAnswers({ ...answers, plantaClass: e.target.value })}
              className={selectStyle}
            >
              <option value="" disabled>Selecciona…</option>
              <option value='class="verde"'>class="verde"</option>
              <option value="verde">verde</option>
              <option value='class="subrayado"'>class="subrayado"</option>
              <option value='style="text-decoration: none"'>style="text-decoration: none"</option>
              <option value='id="verde"'>id="verde"</option>
            </select>
          </div>
        </div>

        {/* Botón interno opcional */}
        {showFinishButton && (
          <button
            onClick={finish}
            className="mt-6 px-4 py-2 rounded-xl bg-[#286675] text-white text-sm hover:bg-[#3a7d89]"
          >
            Finalizar
          </button>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-3 p-2 text-sm font-medium rounded-lg ${
              feedback.startsWith("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* ------ Modales ------ */}
        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title="Vista previa — tamaño ampliado"
          wide
        >
          <div className="w-full">
            <iframe
              src="/preview/renovables-latam.html"
              title="Vista previa renovables (ampliada)"
              className="w-full h-[75vh] bg-white rounded-xl border"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </Modal>

        <Modal
          open={codeOpen}
          onClose={() => setCodeOpen(false)}
          title="Código HTML"
          wide
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Solo lectura</span>
          </div>
          <div className="rounded-xl overflow-hidden border">
            <SyntaxHighlighter
              language="xml"
              style={atomOneDark}
              customStyle={{ margin: 0, fontSize: "0.95rem", maxHeight: "70vh", background: "#1e1e1e" }}
              wrapLongLines={false}
              showLineNumbers
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        </Modal>
      </div>
    )
  }
)

ProgrammingExerciseHTML.displayName = "ProgrammingExerciseHTML"
export default ProgrammingExerciseHTML
