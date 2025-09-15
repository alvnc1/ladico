"use client"

import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react"

type Dir = 0 | 1 | 2 | 3
type Step = { type: "move" | "left" | "right" }

export type MazeHandle = {
    check: () => boolean
    finish: () => boolean
    }

    type Props = {
    onFinish?: (point: 0 | 1) => void
    }

    /** Carga Blockly y aplica locale ES de forma robusta (soporta distintas distros/versiones) */
    const getBlockly = async () => {
    const mod: any = await import("blockly")
    const Blockly = mod?.default ?? mod
    try {
        const esMod: any = await import("blockly/msg/es")
        const locale = esMod?.default ?? esMod
        if (locale && typeof locale === "object" && typeof Blockly.setLocale === "function") {
        Blockly.setLocale(locale)
        }
    } catch {}
    return Blockly as any
    }

    /* ---------- Ajusta canvas al contenedor (HiDPI-safe) y devuelve tamaño de celda ---------- */
    const fitCanvasToBox = (
    canvas: HTMLCanvasElement,
    box: HTMLElement,
    grid: number
    ) => {
    const size = Math.floor(box.clientWidth) // tamaño CSS disponible (cuadrado)
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))

    // CSS size
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    // Buffer interno
    canvas.width = size * dpr
    canvas.height = size * dpr

    // Dibujo en coords CSS (no en coords del buffer)
    const ctx = canvas.getContext("2d")!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Tamaño de celda en píxeles CSS
    return Math.max(1, Math.floor(size / grid))
    }

    const BlocklyMaze = forwardRef<MazeHandle, Props>(function BlocklyMaze(
    { onFinish },
    ref
    ) {
    const blocklyDivRef = useRef<HTMLDivElement | null>(null)
    const workspaceRef = useRef<any>(null)

    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const canvasBoxRef = useRef<HTMLDivElement | null>(null)

    const runnerRef = useRef<number | null>(null)
    const queueRef = useRef<Step[]>([])

    const GRID = 6

    // Estado "visual" (opcional) y ref inmediato para usar en draw()
    const [CELL, setCELL] = useState(0)
    const cellRef = useRef(0)

    const START = { x: 0, y: 5 }
    const GOAL = { x: 5, y: 0 }

    const [robot, setRobot] = useState<{ x: number; y: number; dir: Dir }>({
        x: START.x,
        y: START.y,
        dir: 0,
    })

    const [isReady, setIsReady] = useState(false)
    const [isRunning, setIsRunning] = useState(false)
    const [msg, setMsg] = useState("")
    const [remaining, setRemaining] = useState<number>(0)
    const [reached, setReached] = useState(false)

    const LABYRINTHS: boolean[][][] = [
        [
        [true, true, true, true, true, false],
        [true, true, true, true, true, false],
        [true, true, true, false, false, false],
        [true, true, true, false, true, true],
        [true, true, false, false, true, true],
        [false, false, false, true, true, true],
        ],
        [
        [true, true, true, true, true, false],
        [true, true, true, true, false, false],
        [true, true, true, true, false, true],
        [true, true, true, false, false, true],
        [true, true, true, false, true, true],
        [false, false, false, false, true, true],
        ],
        [
        [true, true, true, true, true, false],
        [true, true, true, true, true, false],
        [true, true, false, false, false, false],
        [false, false, false, true, true, true],
        [false, true, true, true, true, true],
        [false, true, true, true, true, true],
        ],
        [
        [true, true, true, true, true, false],
        [true, true, false, false, false, false],
        [true, true, false, true, true, true],
        [true, true, false, true, true, true],
        [true, true, false, true, true, true],
        [false, false, false, true, true, true],
        ],
    ]

    const [walls] = useState<boolean[][]>(
        LABYRINTHS[Math.floor(Math.random() * LABYRINTHS.length)]
    )

    const isWall = (x: number, y: number) => {
        if (y < 0 || y >= GRID || x < 0 || x >= GRID) return true
        return walls[y][x] === true
    }

    const draw = () => {
        const canvas = canvasRef.current
        const CELL_NOW = cellRef.current
        if (!canvas || CELL_NOW <= 0) return

        const ctx = canvas.getContext("2d")!
        const w = GRID * CELL_NOW
        const h = GRID * CELL_NOW

        ctx.clearRect(0, 0, w, h)

        // Fondo
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, w, h)

        // Grilla
        ctx.strokeStyle = "#e5e7eb"
        for (let i = 0; i <= GRID; i++) {
        ctx.beginPath()
        ctx.moveTo(i * CELL_NOW + 0.5, 0)
        ctx.lineTo(i * CELL_NOW + 0.5, h)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * CELL_NOW + 0.5)
        ctx.lineTo(w, i * CELL_NOW + 0.5)
        ctx.stroke()
        }

        // Muros
        for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
            if (walls[y][x]) {
            ctx.fillStyle = "#111827"
            ctx.fillRect(x * CELL_NOW + 2, y * CELL_NOW + 2, CELL_NOW - 4, CELL_NOW - 4)
            }
        }
        }

        // A
        ctx.fillStyle = "#38bdf8"
        ctx.fillRect(START.x * CELL_NOW + 6, START.y * CELL_NOW + 6, CELL_NOW - 12, CELL_NOW - 12)
        ctx.fillStyle = "#075985"
        ctx.font = "bold 14px sans-serif"
        ctx.fillText("A", START.x * CELL_NOW + CELL_NOW / 2 - 4, START.y * CELL_NOW + CELL_NOW / 2 + 5)

        // B
        ctx.fillStyle = "#22c55e"
        ctx.fillRect(GOAL.x * CELL_NOW + 6, GOAL.y * CELL_NOW + 6, CELL_NOW - 12, CELL_NOW - 12)
        ctx.fillStyle = "#14532d"
        ctx.font = "bold 14px sans-serif"
        ctx.fillText("B", GOAL.x * CELL_NOW + CELL_NOW / 2 - 4, GOAL.y * CELL_NOW + CELL_NOW / 2 + 5)

        // Robot
        const { x, y, dir } = robot
        ctx.save()
        ctx.translate(x * CELL_NOW + CELL_NOW / 2, y * CELL_NOW + CELL_NOW / 2)
        ctx.rotate((Math.PI / 2) * dir)
        ctx.fillStyle = "#f72020"
        ctx.beginPath()
        ctx.moveTo(CELL_NOW * 0.28, 0)
        ctx.lineTo(-CELL_NOW * 0.22, CELL_NOW * 0.18)
        ctx.lineTo(-CELL_NOW * 0.22, -CELL_NOW * 0.18)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
    }

    // Dibuja cuando cambie el robot (CELL visual ya no es necesario)
    useEffect(() => {
        draw()
    }, [robot])

    // Primer ajuste/dibujo antes del primer pintado
    useLayoutEffect(() => {
        let raf = 0
        const init = () => {
        const box = canvasBoxRef.current
        const canvas = canvasRef.current
        if (!box || !canvas) return
        if (box.clientWidth === 0) {
            raf = requestAnimationFrame(init)
            return
        }
        const cell = fitCanvasToBox(canvas, box, GRID)
        cellRef.current = cell
        setCELL(cell) // solo para que puedas mostrar valores si quieres
        requestAnimationFrame(draw)
        }
        init()
        return () => cancelAnimationFrame(raf)
    }, [])

    // ResizeObserver para cambios posteriores de tamaño
    useEffect(() => {
        if (!canvasBoxRef.current || !canvasRef.current) return
        const box = canvasBoxRef.current
        const canvas = canvasRef.current

        const ro = new ResizeObserver(() => {
        const cell = fitCanvasToBox(canvas, box, GRID)
        cellRef.current = cell
        setCELL(cell)
        requestAnimationFrame(draw)
        })
        ro.observe(box)

        // primer ajuste extra por seguridad
        const cell = fitCanvasToBox(canvas, box, GRID)
        cellRef.current = cell
        setCELL(cell)
        requestAnimationFrame(draw)

        return () => ro.disconnect()
    }, [GRID])

    // Blockly
    useEffect(() => {
        let disposed = false
        let workspace: any | null = null

        ;(async () => {
        const Blockly = await getBlockly()
        await import("blockly/blocks")
        const { javascriptGenerator } = await import("blockly/javascript")

        Blockly.Blocks["move_forward"] = {
            init: function () {
            this.appendDummyInput().appendField("Avanzar 1")
            this.setPreviousStatement(true, null)
            this.setNextStatement(true, null)
            this.setColour(210)
            },
        }
        Blockly.Blocks["turn_left"] = {
            init: function () {
            this.appendDummyInput().appendField("Girar izquierda")
            this.setPreviousStatement(true, null)
            this.setNextStatement(true, null)
            this.setColour(210)
            },
        }
        Blockly.Blocks["turn_right"] = {
            init: function () {
            this.appendDummyInput().appendField("Girar derecha")
            this.setPreviousStatement(true, null)
            this.setNextStatement(true, null)
            this.setColour(210)
            },
        }

        javascriptGenerator.forBlock["move_forward"] = () => "api.enqueue('move');\n"
        javascriptGenerator.forBlock["turn_left"] = () => "api.enqueue('left');\n"
        javascriptGenerator.forBlock["turn_right"] = () => "api.enqueue('right');\n"

        const toolboxXml = `
            <xml id="toolbox" style="display:none">
            <block type="move_forward"></block>
            <block type="turn_left"></block>
            <block type="turn_right"></block>
            <sep gap="12"></sep>
            <block type="controls_repeat">
                <field name="TIMES">0</field>
            </block>
            </xml>`

        if (!blocklyDivRef.current || disposed) return

        const MAX_BLOCKS = 15
        workspace = Blockly.inject(blocklyDivRef.current, {
            toolbox: toolboxXml,
            trashcan: true,
            scrollbars: true,
            zoom: { controls: true },
            media: "https://unpkg.com/blockly/media/",
            maxBlocks: MAX_BLOCKS,
        })
        workspaceRef.current = workspace
        setRemaining(workspace.remainingCapacity())

        const onChange = () => setRemaining(workspace.remainingCapacity())
        workspace.addChangeListener(onChange)

        const resizeBlockly = () => {
            if (!blocklyDivRef.current || !workspace) return
            const h = Math.max(320, Math.min(window.innerHeight - 280, 640))
            blocklyDivRef.current.style.height = `${h}px`
            Blockly.svgResize(workspace)
        }
        resizeBlockly()
        window.addEventListener("resize", resizeBlockly)

        setIsReady(true)
        draw()

        const cleanup = () => {
            try { workspace && workspace.removeChangeListener(onChange) } catch {}
            window.removeEventListener("resize", resizeBlockly)
            try { workspace && workspace.dispose() } catch {}
        }
        ;(workspaceRef as any)._cleanup = cleanup
        })()

        return () => {
        disposed = true
        if ((workspaceRef as any)._cleanup) (workspaceRef as any)._cleanup()
        if (runnerRef.current) window.clearInterval(runnerRef.current)
        }
    }, [])

    const resetWorld = () => {
        setRobot({ x: START.x, y: START.y, dir: 0 })
        setReached(false)
        setMsg("")
        requestAnimationFrame(draw)
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
        setReached(false)

        const { javascriptGenerator } = await import("blockly/javascript")
        const code = javascriptGenerator.workspaceToCode(workspaceRef.current)

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
            let nx = r.x, ny = r.y, nd = r.dir

            if (step.type === "move") {
            if (nd === 0) nx = r.x + 1
            if (nd === 1) ny = r.y + 1
            if (nd === 2) nx = r.x - 1
            if (nd === 3) ny = r.y - 1
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
        workspaceRef.current && (Blockly as any).getMainWorkspace()?.clear()
    }

    useImperativeHandle(ref, () => ({
        check: () => reached,
        finish: () => reached,
    }))

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                className="px-3 py-2 rounded-xl bg-[#3a7d89] text-white disabled:opacity-50"
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
            className="w-full flex-1 min-h-[200px] border bg-[#f9fafb] rounded-xl overflow-hidden"
            />
        </div>

        {/* Simulación */}
        <div className="rounded-2xl border p-2 md:p-3 bg-white shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Mundo simulado</h2>
            </div>

            {/* Contenedor cuadrado responsivo */}
            <div ref={canvasBoxRef} className="w-full relative aspect-square">
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full rounded-xl border block mx-auto"
                style={{ imageRendering: "crisp-edges" as any }}
            />
            </div>

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
