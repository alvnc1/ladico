"use client"

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react"

type Dir = 0 | 1 | 2 | 3 // 0 der, 1 abj, 2 izq, 3 arrb
type Step = { type: "move" | "left" | "right" }

export type MazeHandle = {
  /** Devuelve true si el robot llegó a la meta (B) desde la última ejecución */
  check: () => boolean
  /** Igual que check(); lo dejo por simetría con otros ejercicios */
  finish: () => boolean
}

type Props = {
  /** Si lo necesitas, puedes recibir un callback opcional */
  onFinish?: (point: 0 | 1) => void
}

const BlocklyMaze = forwardRef<MazeHandle, Props>(function BlocklyMaze(
  { onFinish },
  ref
) {
  const blocklyDivRef = useRef<HTMLDivElement | null>(null)
  const workspaceRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const runnerRef = useRef<number | null>(null)
  const queueRef = useRef<Step[]>([])

  // Mundo
  const GRID = 6
  const CELL = 44
  // Inicio (A) y Meta (B)
  const START = { x: 0, y: 5 }
  const GOAL = { x: 5, y: 0 }

  // Estado del robot
  const [robot, setRobot] = useState<{ x: number; y: number; dir: Dir }>({
    x: START.x,
    y: START.y,
    dir: 0,
  })

  // UI
  const [isReady, setIsReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [msg, setMsg] = useState("")
  const [remaining, setRemaining] = useState<number>(0)

  // ¿Se alcanzó la meta en la última ejecución?
  const [reached, setReached] = useState(false)

  // Banco de laberintos
  const LABYRINTHS: boolean[][][] = [
    [
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  true,  false, false, false],
      [ true,  true,  true,  false,  true,  true ],
      [ true,  true,  false, false,  true,  true ],
      [ false, false, false,  true,  true,  true ],
    ],
    [
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  true,  true,  false, false],
      [ true,  true,  true,  true,  false,  true],
      [ true,  true,  true,  false, false,  true],
      [ true,  true,  true,  false,  true,  true],
      [ false, false, false, false,  true,  true],
    ],
    [
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  false, false, false,  false],
      [ false, false, false,  true,  true,  true ],
      [ false,  true,  true,  true,  true,  true ],
      [ false,  true,  true,  true,  true,  true ],
    ],
    [
      [ true,  true,  true,  true,  true,  false],
      [ true,  true,  false, false, false,  false],
      [ true,  true,  false,  true,  true,  true ],
      [ true,  true,  false,  true,  true,  true ],
      [ true,  true,  false,  true,  true,  true ],
      [ false, false, false,  true,  true,  true ],
    ],
  ]

  // Elegir uno aleatorio al cargar
  const [walls] = useState<boolean[][]>(
    LABYRINTHS[Math.floor(Math.random() * LABYRINTHS.length)]
  )

  const isWall = (x: number, y: number) => {
    if (y < 0 || y >= GRID || x < 0 || x >= GRID) return true
    return walls[y][x] === true
  }

  // Dibujo del canvas
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const w = GRID * CELL
    const h = GRID * CELL
    canvas.width = w
    canvas.height = h

    // Fondo
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)

    // Grid
    ctx.strokeStyle = "#e5e7eb"
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL + 0.5, 0)
      ctx.lineTo(i * CELL + 0.5, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL + 0.5)
      ctx.lineTo(w, i * CELL + 0.5)
      ctx.stroke()
    }

    // Paredes
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (walls[y][x]) {
          ctx.fillStyle = "#111827" // gris oscuro
          ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4)
        }
      }
    }

    // Inicio A
    ctx.fillStyle = "#38bdf8" // celeste
    ctx.fillRect(START.x * CELL + 6, START.y * CELL + 6, CELL - 12, CELL - 12)
    ctx.fillStyle = "#075985"
    ctx.font = "bold 14px sans-serif"
    ctx.fillText("A", START.x * CELL + CELL / 2 - 4, START.y * CELL + CELL / 2 + 5)

    // Meta B
    ctx.fillStyle = "#22c55e" // verde
    ctx.fillRect(GOAL.x * CELL + 6, GOAL.y * CELL + 6, CELL - 12, CELL - 12)
    ctx.fillStyle = "#14532d"
    ctx.font = "bold 14px sans-serif"
    ctx.fillText("B", GOAL.x * CELL + CELL / 2 - 4, GOAL.y * CELL + CELL / 2 + 5)

    // Robot
    const { x, y, dir } = robot
    ctx.save()
    ctx.translate(x * CELL + CELL / 2, y * CELL + CELL / 2)
    ctx.rotate((Math.PI / 2) * dir)
    ctx.fillStyle = "#f72020"
    ctx.beginPath()
    ctx.moveTo(CELL * 0.28, 0)
    ctx.lineTo(-CELL * 0.22, CELL * 0.18)
    ctx.lineTo(-CELL * 0.22, -CELL * 0.18)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  useEffect(() => {
    draw()
  }, [robot])

  // Blockly
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const Blockly = await import("blockly")
      // Locale (distintas versiones exportan distinto shape)
      try {
        const es = await import("blockly/msg/es")
        const locale = (es as any).locale ?? es
        ;(Blockly as any).setLocale?.(locale)
      } catch {
        // sigue en inglés si falla
      }

      // Bloques personalizados básicos
      ;(Blockly as any).Blocks["move_forward"] = {
        init: function () {
          this.appendDummyInput().appendField("Avanzar 1")
          this.setPreviousStatement(true, null)
          this.setNextStatement(true, null)
          this.setColour(210)
          this.setTooltip("Avanza 1 celda en la dirección actual")
        },
      }
      ;(Blockly as any).Blocks["turn_left"] = {
        init: function () {
          this.appendDummyInput().appendField("Girar izquierda")
          this.setPreviousStatement(true, null)
          this.setNextStatement(true, null)
          this.setColour(210)
          this.setTooltip("Gira 90° a la izquierda")
        },
      }
      ;(Blockly as any).Blocks["turn_right"] = {
        init: function () {
          this.appendDummyInput().appendField("Girar derecha")
          this.setPreviousStatement(true, null)
          this.setNextStatement(true, null)
          this.setColour(210)
          this.setTooltip("Gira 90° a la derecha")
        },
      }

      // ✅ Definimos nuestro propio controls_repeat (para no depender de 'blockly/blocks')
      ;(Blockly as any).Blocks["controls_repeat"] = {
        init: function () {
          this.appendDummyInput()
            .appendField("repetir")
            .appendField(new (Blockly as any).FieldNumber(0, 0, 99, 1), "TIMES")
            .appendField("veces")
          this.appendStatementInput("DO").appendField("hacer")
          this.setPreviousStatement(true, null)
          this.setNextStatement(true, null)
          this.setColour(120)
          this.setTooltip("Repite las acciones indicadas el número de veces")
        },
      }

      // Generadores JS
      const { javascriptGenerator } = await import("blockly/javascript")
      ;(javascriptGenerator as any).forBlock["move_forward"] = function () {
        return "api.enqueue('move');\n"
      }
      ;(javascriptGenerator as any).forBlock["turn_left"] = function () {
        return "api.enqueue('left');\n"
      }
      ;(javascriptGenerator as any).forBlock["turn_right"] = function () {
        return "api.enqueue('right');\n"
      }
      ;(javascriptGenerator as any).forBlock["controls_repeat"] = function (block: any) {
        const repeats = Number(block.getFieldValue("TIMES")) || 0
        const branch = (javascriptGenerator as any).statementToCode(block, "DO")
        return `for (let i = 0; i < ${repeats}; i++) {\n${branch}}\n`
      }

      // Toolbox
      const toolboxXml = `
        <xml id="toolbox" style="display: none">
          <block type="move_forward"></block>
          <block type="turn_left"></block>
          <block type="turn_right"></block>
          <sep gap="12"></sep>
          <block type="controls_repeat">
            <field name="TIMES">0</field>
          </block>
        </xml>
      `

      if (!mounted || !blocklyDivRef.current) return

      // Límite de bloques
      const MAX_BLOCKS = 15

      const workspace = (Blockly as any).inject(blocklyDivRef.current, {
        toolbox: toolboxXml,
        trashcan: true,
        scrollbars: true,
        zoom: { controls: true },
        media: "https://unpkg.com/blockly/media/",
        maxBlocks: MAX_BLOCKS,
      })
      workspaceRef.current = workspace
      setRemaining(workspace.remainingCapacity())

      // Actualiza contador al cambiar
      const listener = () => setRemaining(workspace.remainingCapacity())
      workspace.addChangeListener(listener)

      setIsReady(true)
      draw()
    })()

    return () => {
      mounted = false
      try {
        workspaceRef.current?.dispose()
      } catch {}
      if (runnerRef.current) window.clearInterval(runnerRef.current)
    }
  }, [])

  const resetWorld = () => {
    setRobot({ x: START.x, y: START.y, dir: 0 })
    setReached(false)
    setMsg("")
    draw()
  }

  const stop = () => {
    if (runnerRef.current) {
      window.clearInterval(runnerRef.current)
      runnerRef.current = null
    }
    setIsRunning(false)
  }

  const run = async () => {
    if (!workspaceRef.current) return
    stop()
    setMsg("")
    setReached(false) // nueva ejecución ⇒ reinicia "éxito"

    const { javascriptGenerator } = await import("blockly/javascript")
    const code = (javascriptGenerator as any).workspaceToCode(workspaceRef.current)

    // API pasa comandos a una cola
    queueRef.current = []
    const api = {
      enqueue: (type: Step["type"]) => queueRef.current.push({ type }),
    }

    try {
      const fn = new Function("api", code)
      fn(api)
    } catch (e: any) {
      setMsg("Error en el programa: " + e.message)
      return
    }

    setIsRunning(true)
    runnerRef.current = window.setInterval(() => {
      const step = queueRef.current.shift()
      if (!step) {
        stop()
        if (robot.x === GOAL.x && robot.y === GOAL.y) {
          setMsg("¡Misión completada!")
          setReached(true)
          onFinish?.(1)
        } else {
          setMsg("No llegaste a la meta. Reiniciando...")
          onFinish?.(0)
          setTimeout(() => resetWorld(), 2000)
        }
        return
      }

      setRobot((r) => {
        let nx = r.x,
          ny = r.y,
          nd = r.dir

        if (step.type === "move") {
          if (nd === 0) nx = r.x + 1
          if (nd === 1) ny = r.y + 1
          if (nd === 2) nx = r.x - 1
          if (nd === 3) ny = r.y - 1

          // paredes/bordes
          if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || isWall(nx, ny)) {
            stop()
            setMsg("Te chocaste con una pared o borde. Reiniciando...")
            onFinish?.(0)
            setTimeout(() => resetWorld(), 1500)
            return r
          }
        } else if (step.type === "left") {
          nd = ((r.dir + 3) % 4) as Dir
        } else if (step.type === "right") {
          nd = ((r.dir + 1) % 4) as Dir
        }

        // comprobar meta
        if (nx === GOAL.x && ny === GOAL.y) {
          const next = { x: nx, y: ny, dir: nd }
          setTimeout(() => {
            stop()
            setMsg("¡Misión completada!")
            setReached(true)
            onFinish?.(1)
          }, 0)
          return next
        }

        return { x: nx, y: ny, dir: nd }
      })
    }, 350)
  }

  const clearBlocks = async () => {
    const Blockly = await import("blockly")
    workspaceRef.current && (Blockly as any).getMainWorkspace?.()?.clear()
  }

  // Exponer API al padre
  useImperativeHandle(ref, () => ({
    check: () => reached,
    finish: () => reached,
  }))

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-180px)]">
      {/* Editor Blockly */}
      <div className="rounded-2xl border p-2 md:p-3 bg-white shadow-sm h-full flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-lg font-semibold">Laberinto 6×6</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Bloques restantes: <b>{remaining}</b>
            </span>
            <button
              onClick={run}
              disabled={!isReady || isRunning}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50"
            >
              Ejecutar
            </button>
            <button onClick={clearBlocks} className="px-3 py-2 rounded-xl bg-gray-100">
              Limpiar
            </button>
          </div>
        </div>
        <div
          ref={blocklyDivRef}
          className="w-full flex-1 min-h-[360px] md:min-h-[420px] border bg-[#f9fafb] rounded-xl overflow-hidden"
        />
      </div>

      {/* Simulación */}
      <div className="rounded-2xl border p-2 md:p-3 bg-white shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Mundo simulado</h2>
        </div>
        <canvas
          ref={canvasRef}
          className="rounded-xl border self-center"
          width={GRID * CELL}
          height={GRID * CELL}
        />
        <p className="text-sm text-gray-600 mt-3 min-h-[24px]">{msg}</p>
        <ul className="text-xs text-gray-500 mt-2 list-disc ml-5">
          <li>El robot inicia en A (celda celeste). Debe llegar a B (celda verde)</li>
          <li>No puede atravesar paredes (bloques negros) ni salir del tablero</li>
          <li>Bloques disponibles: avanzar, girar izquierda/derecha y repetir</li>
        </ul>
      </div>
    </div>
  )
})

export default BlocklyMaze
