"use client"

import React, {
    useMemo,
    useState,
    useEffect,
    forwardRef,
    useImperativeHandle,
} from "react"

type StepId = "read" | "parseA" | "parseB" | "sum" | "print" | "concat" | "compare"

const ALL_STEPS: { id: StepId; label: string }[] = [
    { id: "read",   label: "Leer variables a y b (llegan como cadenas)" },
    { id: "parseA", label: "Convertir a a número (Number(a))" },
    { id: "parseB", label: "Convertir b a número (Number(b))" },
    { id: "sum",    label: "Calcular suma = a + b" },
    { id: "print",  label: "Mostrar suma en consola" },
    { id: "concat", label: "Concatenar a y b como cadenas (a + b)" },
    { id: "compare", label: "Comparar si a es igual a b (a === b)" },
]

const VALID_ORDERS: StepId[][] = [
    ["read", "parseA", "parseB", "sum", "print"],
    ["read", "parseB", "parseA", "sum", "print"],
]

function shuffle<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5)
}

export type ProgrammingExerciseHandle = {
    /** Devuelve true si el orden es correcto (o false si falta algo / incorrecto) */
    check: () => boolean
    }

    const ProgrammingExercise = forwardRef<ProgrammingExerciseHandle, {}>(function ProgrammingExercise(_, ref) {
    const [sequence, setSequence] = useState<(StepId | "")[]>(["", "", "", "", ""])
    const used = useMemo(() => new Set(sequence.filter(Boolean)), [sequence])
    const [shuffledOptions, setShuffledOptions] = useState(ALL_STEPS)

    useEffect(() => {
        setShuffledOptions(shuffle(ALL_STEPS))
    }, [])

    const rowStyle = "grid grid-cols-1 sm:grid-cols-[100px,20rem] items-center gap-2"
    const fieldStyle =
        "px-2 py-1 rounded-md border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#286575] w-full sm:w-80 text-sm font-inherit"

    const onChange = (idx: number, val: StepId | "") => {
        const next = [...sequence]
        next[idx] = val
        setSequence(next)
    }

    // Expone check() a la page
    useImperativeHandle(ref, () => ({
        check() {
        if (sequence.some(s => s === "")) return false
        return VALID_ORDERS.some(order => order.every((step, i) => step === sequence[i]))
        },
    }))

    return (
        <div className="rounded-2xl border bg-white p-6">
        <pre className="bg-gray-900 text-green-200 text-sm p-4 rounded-xl overflow-x-auto mb-6">
{`let a = "7";
let b = "5";
.
.
.`}
    </pre>

        <p className="mb-4 text-sm text-gray-700">
            Selecciona el <b>orden correcto</b> de instrucciones para resolver la tarea.
        </p>

        <div className="space-y-3 text-sm text-gray-700">
            {sequence.map((val, idx) => (
            <div key={idx} className={rowStyle}>
                <span>Paso {idx + 1}</span>
                <select
                value={val}
                onChange={e => onChange(idx, e.target.value as StepId | "")}
                className={fieldStyle}
                >
                <option value="">Selecciona…</option>
                {shuffledOptions.map(s => (
                    <option
                    key={s.id}
                    value={s.id}
                    disabled={used.has(s.id) && s.id !== val}
                    >
                    {s.label}
                    </option>
                ))}
                </select>
            </div>
            ))}
        </div>
        </div>
    )
})

export default ProgrammingExercise
