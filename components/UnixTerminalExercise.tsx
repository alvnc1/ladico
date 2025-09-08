"use client"

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"

// ---- Tipos y helpers de FS ----
type NodeType = "dir" | "file"
type FSNode = {
    type: NodeType
    children?: Record<string, FSNode> // sólo si type=dir
    content?: string                  // sólo si type=file
}

type ExecResult = { output: string; done?: boolean }

export type UnixTerminalHandle = {
    /** Evalúa las respuestas actuales y devuelve true/false */
    finish: () => boolean
    /** Devuelve el último estado de corrección sin recalcular */
    check: () => boolean
}

type Props = {
    /** Se invoca cuando el usuario presiona “Comprobar respuestas” (opcional) */
    onFinish?: (point: 0 | 1) => void
}

const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj))

// Estructura inicial del FS
const initialFS: FSNode = {
    type: "dir",
    children: {
        home: {
        type: "dir",
        children: {
            alumno: {
            type: "dir",
            children: {
                Docs: {
                type: "dir",
                children: {
                    misc: {
                    type: "dir",
                    children: {
                        "granja_solar.jpg": { type: "file", content: "[binary]" },
                        "readme.txt": {
                        type: "file",
                        content: "Mueve la foto a la carpeta Renovables",
                        },
                    },
                    },
                },
                },
                Pics: {
                type: "dir",
                children: {
                    Renovables: { type: "dir", children: {} },
                    Familia: { type: "dir", children: { "IMG_0012.jpg": { type: "file", content: "[binary]" } } },
                },
                },
            },
            },
        },
        },
    },
}

const HOME = "/home/alumno"
const TARGET = "/home/alumno/Pics/Renovables/granja_solar.jpg"
const MISPLACED = "/home/alumno/Docs/misc/granja_solar.jpg"

// Normaliza ruta (quita dobles /)
const normPath = (p: string) => p.replace(/\/+/g, "/").replace(/\/$/, "") || "/"
// Divide ruta en segmentos
const segs = (p: string) => normPath(p).split("/").filter(Boolean)
// Resuelve ruta relativa desde cwd
const resolvePath = (cwd: string, p: string) => {
    if (!p || p === ".") return cwd
    let parts = p.startsWith("/") ? segs(p) : [...segs(cwd), ...segs(p)]
    const out: string[] = []
    for (const s of parts) {
        if (s === "." || s === "") continue
        if (s === "..") out.pop()
        else out.push(s)
    }
    return "/" + out.join("/")
}

// Obtiene nodo
function getNode(root: FSNode, path: string): { parent?: FSNode; key?: string; node?: FSNode } {
    const parts = segs(path)
    if (parts.length === 0) return { node: root }
    let cur: FSNode = root
    let parent: FSNode | undefined
    let key: string | undefined
    for (const part of parts) {
        if (cur.type !== "dir" || !cur.children || !(part in cur.children)) {
        return {}
        }
        parent = cur
        key = part
        cur = cur.children[part]
    }
    return { parent, key, node: cur }
}

// Listado
function ls(root: FSNode, path: string): string[] {
    const n = getNode(root, path).node
    if (!n || n.type !== "dir" || !n.children) return []
    return Object.keys(n.children)
        .sort((a, b) => a.localeCompare(b))
        .map(k => {
        const child = n.children![k]
        return child.type === "dir" ? k + "/" : k
        })
}

// Mover o renombrar
function mv(root: FSNode, src: string, dst: string): boolean {
    const srcInfo = getNode(root, src)
    if (!srcInfo.node || !srcInfo.parent || !srcInfo.key) return false
    const dstInfo = getNode(root, dst)

    // Si dst es dir existente → colocar dentro con mismo nombre
    if (dstInfo.node && dstInfo.node.type === "dir" && dstInfo.node.children) {
        if (dstInfo.node.children[srcInfo.key]) return false
        dstInfo.node.children[srcInfo.key] = srcInfo.node
        delete srcInfo.parent.children![srcInfo.key]
        return true
    }

    // Si dst NO existe → crear con ese nombre en su parent
    const parentPath = normPath(dst.split("/").slice(0, -1).join("/")) || "/"
    const name = segs(dst).slice(-1)[0]
    const parent = getNode(root, parentPath).node
    if (!parent || parent.type !== "dir" || !parent.children || !name) return false
    if (parent.children[name]) return false
    parent.children[name] = srcInfo.node
    delete srcInfo.parent.children![srcInfo.key]
    return true
}

// ---------- Autocompletado (TAB) ----------
const COMMANDS = ["help", "pwd", "ls", "cd", "cat", "mv", "clear", "reset"]

// Lista nombres en un directorio (con "./" y "../" añadidos)
function listEntries(root: FSNode, dirPath: string): string[] {
    const n = getNode(root, dirPath).node
    if (!n || n.type !== "dir" || !n.children) return ["./", "../"]
    const base = Object.keys(n.children).map(name => {
        const child = n.children![name]
        return child.type === "dir" ? name + "/" : name
    })
    return ["./", "../", ...base].sort((a, b) => a.localeCompare(b))
}

// Prefijo común
function commonPrefix(strings: string[]): string {
    if (strings.length === 0) return ""
    let pref = strings[0]
    for (const s of strings.slice(1)) {
        let i = 0
        while (i < pref.length && i < s.length && pref[i] === s[i]) i++
        pref = pref.slice(0, i)
        if (!pref) break
    }
    return pref
}

function getTabCandidates(fs: FSNode, cwd: string, currentToken: string, isCmdPosition: boolean): string[] {
    // Autocompletar primer token (comandos)
    if (isCmdPosition) {
        const want = currentToken.toLowerCase()
        return COMMANDS.filter(c => c.startsWith(want))
    }

    // Autocompletar rutas (argumentos)
    const raw = currentToken
    const lastSlash = raw.lastIndexOf("/")
    const dirPart = lastSlash >= 0 ? raw.slice(0, lastSlash + 1) : ""
    const basePref = lastSlash >= 0 ? raw.slice(lastSlash + 1) : raw

    const dirResolved = resolvePath(cwd, dirPart || ".")
    const entries = listEntries(fs, dirResolved)

    const filtered = entries.filter(name => name.toLowerCase().startsWith(basePref.toLowerCase()))
    return filtered.map(n => (dirPart || "") + n)
}

// ---------- Respuestas ----------
type Answers = {
    location: string
    moveCmd: string
    readme: string
}

const UnixTerminalExercise = forwardRef<UnixTerminalHandle, Props>(function UnixTerminalExercise(
    { onFinish },
    ref
    ) {
    const [fs, setFs] = useState<FSNode>(() => clone(initialFS))
    const [cwd, setCwd] = useState<string>(HOME)
    const [lines, setLines] = useState<string[]>([])
    const [input, setInput] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Historial de comandos (↑/↓)
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState<number | null>(null)

    // TAB-cycle state
    const [tabMatches, setTabMatches] = useState<string[] | null>(null)
    const [tabIndex, setTabIndex] = useState<number>(0)
    const [tabBase, setTabBase] = useState<{ token: string; isCmd: boolean } | null>(null)

    // Respuestas y feedback
    const [answers, setAnswers] = useState<Answers>({ location: "", moveCmd: "", readme: "" })
    const [feedback, setFeedback] = useState<string | null>(null)
    const [lastCorrect, setLastCorrect] = useState(false)

    // Reset completo al montar
    useEffect(() => {
        resetAll()
    }, [])

    const resetAll = () => {
        setFs(clone(initialFS))
        setCwd(HOME)
        setLines([""])
        setHistory([])
        setHistoryIndex(null)
        setInput("")
        setAnswers({ location: "", moveCmd: "", readme: "" })
        setFeedback(null)
        setTabMatches(null)
        setTabBase(null)
        setTabIndex(0)
        inputRef.current?.focus()
    }

    // Autoscroll al final
    useEffect(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines, input])

    const prompt = () => {
        const homeRel = cwd.startsWith(HOME) ? "~" + cwd.slice(HOME.length) : cwd
        return `usuario@ladico:${homeRel || "~"}$`
    }

    const append = (text: string) => setLines(prev => [...prev, text])

    // ----- Intérprete de comandos mínimos -----
    const exec = (commandLine: string): ExecResult => {
        const raw = commandLine.trim()
        if (!raw) return { output: "" }

        // split simple respetando comillas
        const tokens: string[] = []
        raw.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_m, d, s, w) => {
        tokens.push(d ?? s ?? w)
        return ""
        })
        const [cmd, ...args] = tokens

        switch (cmd) {
        case "help":
            return {
            output: [
                "Comandos:",
                "  pwd               Muestra ruta actual",
                "  ls [ruta]         Lista contenidos",
                "  cd <ruta>         Cambia de directorio",
                "  cat <archivo>     Lee contenido de un archivo",
                "  mv <src> <dst>    Mueve/renombra (rutas relativas o absolutas)",
                "  clear             Limpia la pantalla",
                "  reset             Reinicia el ejercicio",
            ].join("\n"),
            }

        case "pwd":
            return { output: cwd }

        case "ls": {
            const p = resolvePath(cwd, args[0] || ".")
            return { output: ls(fs, p).join("\n") || "" }
        }

        case "cd": {
            if (!args[0]) return { output: "Uso: cd <ruta>" }
            const p = resolvePath(cwd, args[0])
            const n = getNode(fs, p).node
            if (!n || n.type !== "dir") return { output: `cd: no existe el directorio: ${args[0]}` }
            setCwd(p)
            return { output: "" }
        }

        case "mv": {
            if (args.length < 2) return { output: "Uso: mv <src> <dst>" }
            const src = resolvePath(cwd, args[0])
            const dst = resolvePath(cwd, args[1])
            const fs2 = clone(fs)
            const ok = mv(fs2, src, dst)
            if (!ok) return { output: "mv: operación fallida (ruta inválida o conflicto)" }
            setFs(fs2)
            return { output: "" }
        }

        case "cat": {
            if (!args[0]) return { output: "Uso: cat <archivo>" }
            const p = resolvePath(cwd, args[0])
            const n = getNode(fs, p).node
            if (!n || n.type !== "file") return { output: `cat: no es un archivo: ${args[0]}` }
            return { output: n.content || "" }
        }

        case "clear":
            setLines([])
            return { output: "" }

        case "reset":
            resetAll()
            return { output: "" }

        default:
            return { output: `${cmd}: comando no encontrado. Escribe 'help'.` }
        }
    }

    // Submit de comandos (guarda en historial)
    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const cmd = input.trim()
        if (!cmd) return

        setHistory(prev => [...prev, cmd])
        setHistoryIndex(null)

        append(`${prompt()} ${cmd}`)
        const { output } = exec(cmd)
        if (output) append(output)
        setInput("")

        // Romper ciclo TAB tras ejecutar
        setTabMatches(null); setTabBase(null); setTabIndex(0)
    }

    // Navegación del historial + TAB autocompletar
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Tab") {
        e.preventDefault()

        const raw = input
        // tokens (conserva comillas)
        const tokens: string[] = []
        raw.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_m, d, s, w) => {
            tokens.push(d ?? s ?? w)
            return ""
        })

        const isCmdPosition = tokens.length === 0 || (tokens.length === 1 && !raw.endsWith(" "))
        const parts = raw.split(/(\s+)/)
        let editableIndex = parts.length - 1
        while (editableIndex >= 0 && /^\s+$/.test(parts[editableIndex])) editableIndex--
        let tokenText = parts[editableIndex] ?? ""
        if (isCmdPosition && tokens.length === 0) tokenText = ""

        if (tabMatches && tabBase && tabBase.token === tokenText) {
            if (tabMatches.length === 1) return
            const nextI = (tabIndex + 1) % tabMatches.length
            const nextToken = tabMatches[nextI]
            parts[editableIndex] = nextToken
            setInput(parts.join(""))
            setTabIndex(nextI)
            return
        }

        const cands = getTabCandidates(fs, cwd, tokenText, isCmdPosition)
        if (cands.length === 0) {
            setTabMatches(null); setTabBase(null); setTabIndex(0)
            return
        }

        if (cands.length === 1) {
            parts[editableIndex] = cands[0]
            setInput(parts.join(""))
            setTabMatches(cands)
            setTabBase({ token: cands[0], isCmd: isCmdPosition })
            setTabIndex(0)
            return
        }

        const cp = commonPrefix(cands)
        let replaced = false
        if (cp && cp.toLowerCase() !== tokenText.toLowerCase()) {
            parts[editableIndex] = cp
            setInput(parts.join(""))
            replaced = true
        }
        append(cands.join("  "))

        setTabMatches(cands)
        setTabBase({ token: replaced ? cp : tokenText, isCmd: isCmdPosition })
        setTabIndex(0)
        return
        }

        if (e.key === "ArrowUp") {
        e.preventDefault()
        setHistoryIndex(prev => {
            const nextIndex = prev === null ? history.length - 1 : Math.max(prev - 1, 0)
            setInput(history[nextIndex] ?? "")
            return nextIndex
        })
        setTabMatches(null); setTabBase(null); setTabIndex(0)
        return
        }

        if (e.key === "ArrowDown") {
        e.preventDefault()
        setHistoryIndex(prev => {
            if (prev === null) return null
            const nextIndex = prev + 1
            if (nextIndex >= history.length) {
            setInput("")
            return null
            }
            setInput(history[nextIndex] ?? "")
            return nextIndex
        })
        setTabMatches(null); setTabBase(null); setTabIndex(0)
        return
        }

        setTabMatches(null); setTabBase(null); setTabIndex(0)
    }

    const normalizeCmd = (s: string) =>
        s.trim().replace(/\s+/g, " ").replace(/\/+/g, "/")

    // === Reglas de corrección ===
    const checkNow = (): boolean => {
        const locOK = answers.location === "/home/alumno/Docs/misc"

        const validMv = new Set([
        "mv /home/alumno/Docs/misc/granja_solar.jpg /home/alumno/Pics/Renovables/",
        "mv Docs/misc/granja_solar.jpg Pics/Renovables/",
        ])
        const moveOK = validMv.has(normalizeCmd(answers.moveCmd))

        const txt = answers.readme.trim().toLowerCase()
        const readmeOK = txt.includes("mueve") && txt.includes("renovables")

        const allOK = locOK && moveOK && readmeOK
        setLastCorrect(allOK)
        return allOK
    }

    const checkAnswers = () => {
        const ok = checkNow()
        onFinish?.(ok ? 1 : 0)
    }

    // Exponer API al padre
    useImperativeHandle(ref, () => ({
        finish: () => checkNow(),
        check: () => lastCorrect,
    }))

    return (
        <div className="rounded-2xl border bg-white p-4">
        {/* Terminal */}
        <div
            ref={scrollRef}
            className="rounded-xl border bg-gray-50 p-3 h-[360px] overflow-auto font-mono text-sm"
        >
            {lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap">{l}</div>
            ))}
            {/* Línea de entrada estilo terminal (sin caja) */}
            <form onSubmit={onSubmit} className="flex items-center gap-2 mt-2">
            <span className="text-gray-600">{prompt()}</span>
            <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                aria-label="Comando de terminal"
                className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
            />
            </form>
        </div>

        {/* Preguntas */}
        <div className="mt-4 rounded-xl border bg-white p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Preguntas</h3>

            <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">
                ¿Dónde está la foto <code>granja_solar.jpg</code>?
            </label>
            <select
                value={answers.location}
                onChange={e => setAnswers(a => ({ ...a, location: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
            >
                <option value="">Selecciona…</option>
                <option value="/home/alumno/Docs/misc">/home/alumno/Docs/misc</option>
                <option value="/home/alumno/Pics/Renovables">/home/alumno/Pics/Renovables</option>
                <option value="/home/alumno/Pics/Familia">/home/alumno/Pics/Familia</option>
                <option value="/home/alumno/Docs">/home/alumno/Docs</option>
            </select>
            </div>

            <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">
                La foto granja_solar.jpg está mal ubicada. Debería estar la carpeta 'Renovables' ¿Qué comando usarías para moverla a la carpeta correcta?
            </label>
            <select
                value={answers.moveCmd}
                onChange={e => setAnswers(a => ({ ...a, moveCmd: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
            >
                <option value="">Selecciona…</option>
                <option value='mv /home/alumno/Docs/misc/granja_solar.jpg /home/alumno/Pics/Renovables/'>
                mv /home/alumno/Docs/misc/granja_solar.jpg /home/alumno/Pics/Renovables/
                </option>
                <option value='mv granja_solar.jpg Pics/Familia/'>mv granja_solar.jpg Pics/Familia/</option>
                <option value='mv /home/granja_solar.jpg /home/alumno/Pics/Renovables/'>
                mv /home/granja_solar.jpg /home/alumno/Pics/Renovables/
                </option>
                <option value='mv Docs/misc/granja_solar.jpg Pics/Renovables/'>
                mv Docs/misc/granja_solar.jpg Pics/Renovables/
                </option>
            </select>
            </div>

            {/* 3. Contenido de readme.txt */}
            <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">
                Hay un archivo llamado <code>readme.txt</code> ¿Qué dice en dicho archivo?
            </label>
            <input
                type="text"
                value={answers.readme}
                onChange={e => setAnswers(a => ({ ...a, readme: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white"
                placeholder='Escriba aquí'
            />
            </div>

            <div className="mt-4">
            </div>

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
        </div>
    )
})

export default UnixTerminalExercise
