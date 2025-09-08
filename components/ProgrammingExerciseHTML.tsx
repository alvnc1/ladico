"use client"

import React, { useState, forwardRef, useImperativeHandle } from "react"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import xml from "react-syntax-highlighter/dist/esm/languages/hljs/xml"
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs"

// Registrar lenguaje para el build Light
SyntaxHighlighter.registerLanguage("xml", xml)

type Answer = {
  hidroClass: string
  solarHeading: string
  plantaClass: string
}

type Props = {
  /** callback que recibe 0|1 cuando el usuario finaliza */
  onFinish?: (point: 0 | 1) => void
  /** si quieres mostrar además un botón “Finalizar” interno (opcional) */
  showFinishButton?: boolean
}

export type HtmlExerciseHandle = {
  /** método imperativo para que la página dispare el finish desde afuera */
  finish: () => void
}

const ProgrammingExerciseHTML = forwardRef<HtmlExerciseHandle, Props>(
  ({ onFinish, showFinishButton = false }, ref) => {
    const [answers, setAnswers] = useState<Answer>({
      hidroClass: "",
      solarHeading: "",
      plantaClass: "",
    })
    const [feedback, setFeedback] = useState<string | null>(null)

    const normalizeClass = (value: string) =>
      value.trim().toLowerCase().replace(/^class\s*=?\s*/, "").replace(/['"]/g, "").trim()

    /** calcula 0|1 */
    const computePoint = (): 0 | 1 => {
      const okHidro = normalizeClass(answers.hidroClass) === "celeste"
      const okSolar = answers.solarHeading === "h3"
      const okPlanta = normalizeClass(answers.plantaClass) === "verde"
      return okHidro && okSolar && okPlanta ? 1 : 0
    }

    /** llamado desde afuera por la page */
    const finish = () => {
      const point = computePoint()
      setFeedback(point ? "✅ ¡Perfecto! Todas las respuestas son correctas." : "❌ Algunas respuestas no son correctas. Revisa y vuelve a intentar.")
      onFinish?.(point)
    }

    useImperativeHandle(ref, () => ({ finish }))

    const rowStyle = "grid grid-cols-1 sm:grid-cols-[minmax(240px,1fr),20rem] items-center gap-2"
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
    <p id="viento" class="verdoso">El viento se utiliza mediante aerogeneradores...</p>

    <h3>Hidráulica</h3>
    <p id="hidro">El agua de ríos y embalses produce energía hidráulica...</p>

    <h3>Hidrógeno verde</h3>
    <p id="planta" class="verde subrayado">El hidrógeno verde es una fuente en crecimiento...</p>

    <p id="fuente" class="fuente">Fuente: Agencia Internacional de Energías Renovables</p>
  </body>
</html>`

    return (
      <div className="space-y-6">{/* sin borde/fondo: hereda de la tarjeta padre */}
        {/* Vista previa + código */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Vista previa</span>
              <a
                href="/preview/renovables-latam.html"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#286675] text-white text-sm hover:bg-[#3a7d89]"
              >
                Abrir en pestaña
              </a>
            </div>
            <iframe
              src="/preview/renovables-latam.html"
              title="Vista previa renovables"
              className="w-full h-[420px] bg-white"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="lazy"
            />
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700">HTML</span>
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
        <div className="space-y-4 text-sm text-gray-700" role="group" aria-labelledby="preguntas-html">
          <span id="preguntas-html" className="sr-only">Preguntas del ejercicio HTML</span>

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
              {/* Correctas compatibles con el normalizador */}
              <option value='class="celeste"'>class="celeste"</option>
              <option value="celeste">celeste</option>
              {/* Distractores */}
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
              <option value="h3">h3</option> {/* ✅ */}
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
              {/* Correctas */}
              <option value='class="verde"'>class="verde"</option>
              <option value="verde">verde</option>
              {/* Distractores */}
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
      </div>
    )
  }
)

ProgrammingExerciseHTML.displayName = "ProgrammingExerciseHTML"
export default ProgrammingExerciseHTML
