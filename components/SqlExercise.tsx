"use client"

import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react"
import alasql from "alasql/dist/alasql.min.js"

type FlowerRow = { id: number; nombre: string; precio: number }

export type SqlExerciseHandle = {
    /** Vuelve a evaluar la respuesta actual y retorna true/false */
    finish: () => boolean
    /** Devuelve el último estado de corrección sin recalcular */
    check: () => boolean
}

type Props = {
    onFinish?: (point: 0 | 1) => void
}

const DATASET_FILES = [
    "/datasets/flores_dataset_1.csv",
    "/datasets/flores_dataset_2.csv",
    "/datasets/flores_dataset_3.csv",
]

// Parser CSV
function parseCSV(text: string): FlowerRow[] {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length <= 1) return []
    const header = lines[0].split(",").map(s => s.trim().toLowerCase())
    const iId = header.indexOf("id")
    const iNombre = header.indexOf("nombre")
    const iPrecio = header.indexOf("precio")
    return lines.slice(1).map(line => {
        const cols = line.split(",")
        return {
        id: Number(cols[iId]),
        nombre: String(cols[iNombre]),
        precio: Number(cols[iPrecio]),
        }
    })
}

const SqlExercise = forwardRef<SqlExerciseHandle, Props>(function SqlExercise(
    { onFinish },
    ref
    ) {
    const [datasetUrl] = useState(
        DATASET_FILES[Math.floor(Math.random() * DATASET_FILES.length)]
    )

    const [rows, setRows] = useState<FlowerRow[]>([])
    const [filteredRows, setFilteredRows] = useState<FlowerRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Editor
    const [sql, setSql] = useState<string>("")

    // Respuesta y feedback
    const [answer, setAnswer] = useState<string>("")
    const [feedback, setFeedback] = useState<string | null>(null)
    const [lastCorrect, setLastCorrect] = useState<boolean>(false)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
        try {
            setLoading(true)
            setError(null)

            const res = await fetch(datasetUrl, { cache: "no-store" })
            if (!res.ok) throw new Error(`No se pudo cargar ${datasetUrl}`)
            const text = await res.text()
            const data = parseCSV(text)

            if (cancelled) return
            setRows(data)
            setFilteredRows(data)

            alasql("DROP TABLE IF EXISTS FLORES")
            alasql("CREATE TABLE FLORES (id INT, nombre STRING, precio INT)")
            alasql("INSERT INTO FLORES SELECT * FROM ?", [data])
        } catch (e: any) {
            if (!cancelled) setError(e?.message || "Error al cargar el dataset")
        } finally {
            if (!cancelled) setLoading(false)
        }
        }

        load()
        return () => {
        cancelled = true
        }
    }, [datasetUrl])

    const runQuery = () => {
        try {
        if (loading) return
        const q = sql.trim()

        if (!q) {
            setFilteredRows(rows)
            return
        }

        if (!/^\s*select\b/i.test(q)) {
            throw new Error("Solo se permiten consultas SELECT")
        }
        if (q.includes(";")) {
            throw new Error("Escribe una única consulta SELECT sin ';'")
        }

        const out = alasql(q) as any[]
        const arr = Array.isArray(out) ? out : [out]
        const ids = new Set<number>(
            arr.map((r: any) => Number(r?.id)).filter((v: number) => Number.isFinite(v))
        )

        const next = rows.filter(r => ids.has(r.id))
        setFilteredRows(next)
        } catch (e: any) {
        setFilteredRows([])
        alert(e?.message || "Error al ejecutar la consulta")
        }
    }

    // Restablecer tabla
    const resetTable = () => {
        setFilteredRows(rows)
        setSql("")
        setFeedback(null)
    }

    // Evalúa la respuesta actual
    const checkNow = (): boolean => {
        const expected = rows.filter(r => r.precio > 15).length
        const ok = Number(answer) === expected
        setLastCorrect(ok)
        return ok
    }

    // Botón “Comprobar”
    const checkAnswer = () => {
        const ok = checkNow()
        onFinish?.(ok ? 1 : 0)
    }

    // Exponer API al padre
    useImperativeHandle(ref, () => ({
        finish: () => checkNow(),
        check: () => lastCorrect,
    }))

    return (
        <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabla */}
            <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
                <h3 className="font-semibold">FLORES</h3>
                {loading ? (
                <span className="text-xs text-gray-500">Cargando…</span>
                ) : (
                <span className="text-xs text-gray-500">
                    {filteredRows.length}/{rows.length} filas
                </span>
                )}
            </div>
            <div className="max-h-[320px] overflow-auto">
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                    <th className="text-left px-3 py-2 border-b">id</th>
                    <th className="text-left px-3 py-2 border-b">nombre</th>
                    <th className="text-left px-3 py-2 border-b">precio</th>
                    </tr>
                </thead>
                <tbody>
                    {!loading &&
                    filteredRows.map(r => (
                        <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2 border-b">{r.id}</td>
                        <td className="px-3 py-2 border-b">{r.nombre}</td>
                        <td className="px-3 py-2 border-b">{r.precio}</td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>
            {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
                {error}
                </div>
            )}
            </div>

            {/* Editor + Respuesta */}
            <div className="rounded-2xl border bg-white p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Editor SQL</h3>
                <div className="flex gap-2">
                <button
                    onClick={runQuery}
                    className="px-3 py-1.5 rounded-xl bg-[#286675] text-white text-sm hover:bg-[#3a7d89]"
                    disabled={loading}
                >
                    Ejecutar
                </button>
                <button
                    onClick={resetTable}
                    className="px-3 py-1.5 rounded-xl bg-gray-200 text-sm hover:bg-gray-300"
                    disabled={loading}
                >
                    Restablecer
                </button>
                </div>
            </div>

            <textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                spellCheck={false}
                className="font-mono text-sm rounded-xl border p-3 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-[#286575]"
                placeholder="Escriba su consulta SQL aquí"
            />

            {/* Respuesta */}
            <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Indique cuantas filas se obtuvieron aquí</p>
                <div className="flex gap-2">
                <input
                    type="number"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    className="border rounded-lg px-3 py-1 text-sm w-28"
                    placeholder="Número"
                />
                </div>
                {feedback && (
                <div
                    className={`mt-2 text-sm font-medium p-2 rounded-lg ${
                    feedback.includes("Respuesta correcta!")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                >
                    {feedback}
                </div>
                )}
            </div>
            </div>
        </div>
        </div>
    )
})

export default SqlExercise
