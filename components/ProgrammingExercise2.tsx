"use client"

import React, {
    useState,
    forwardRef,
    useImperativeHandle,
} from "react"

type Answer = {
    firstLine: string
    secondLine: string
    thirdLine: string
}

export type ProgrammingExercise2Handle = {
    /** Devuelve true si TODAS las respuestas son correctas */
    check: () => boolean
    }

    function normalizeText(s: string) {
    return s.trim().replace(/['"]+/g, "").toUpperCase()
    }
    function normalizeNum(s: string) {
    return s.trim()
    }

    const ProgrammingExercise2 = forwardRef<ProgrammingExercise2Handle, {}>(
    function ProgrammingExercise2(_, ref) {
        const [answers, setAnswers] = useState<Answer>({
        firstLine: "",
        secondLine: "",
        thirdLine: "",
        })

        const rowStyle =
        "grid grid-cols-1 sm:grid-cols-[500px,20rem] items-center gap-2"
        const fieldStyle =
        "px-2 py-1 rounded-md border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#286575] w-full sm:w-80 text-sm font-inherit"

        // Expone la verificación al padre
        useImperativeHandle(ref, () => ({
        check() {
            const ok1 = normalizeText(answers.firstLine) === "SUMA GRANDE"
            const ok2 = normalizeNum(answers.secondLine) === "6"
            const ok3 = normalizeNum(answers.thirdLine) === "18"
            return ok1 && ok2 && ok3
        },
        }))

        return (
        <div className="rounded-2xl border bg-white p-6 overflow-hidden">
            {/* Pseudocódigo */}
            <div className="bg-[#f3fbfb] border-l-4 border-[#286575] p-4 mb-6 rounded-r-xl shadow-sm">
            <div className="text-gray-800 text-sm leading-6 space-y-1 font-sans">
                <p>x ← 2</p>
                <p>y ← 3</p>
                <p>z ← 4</p>
                <br />
                <p>SI x + y &gt; z ENTONCES</p>
                <p className="ml-4">IMPRIMIR "SUMA GRANDE"</p>
                <p className="ml-4">z ← z − 1</p>
                <p>SINO</p>
                <p className="ml-4">IMPRIMIR "SUMA PEQUEÑA"</p>
                <p className="ml-4">z ← z + 1</p>
                <p>FIN SI</p>
                <br />
                <p>IMPRIMIR x * z</p>
            </div>
            </div>

            {/* Preguntas */}
            <div className="space-y-4 text-sm text-gray-700">
            <div className={rowStyle}>
                <label htmlFor="ans1" className="text-sm text-gray-800">
                ¿Qué imprime la <b>primera condición</b>?
                </label>
                <input
                id="ans1"
                type="text"
                value={answers.firstLine}
                onChange={(e) =>
                    setAnswers({ ...answers, firstLine: e.target.value })
                }
                className={fieldStyle}
                placeholder="Escriba aquí"
                />
            </div>

            <div className={rowStyle}>
                <label htmlFor="ans2" className="text-sm text-gray-800">
                ¿Qué imprime la <b>última línea</b>?
                </label>
                <input
                id="ans2"
                type="text"
                inputMode="numeric"
                value={answers.secondLine}
                onChange={(e) =>
                    setAnswers({ ...answers, secondLine: e.target.value })
                }
                className={fieldStyle}
                placeholder="Escriba aquí"
                />
            </div>

            <div className={rowStyle}>
                <label htmlFor="ans3" className="text-sm text-gray-800">
                Si al inicio cambiamos <code>z ← 8</code>, ¿qué imprime la{" "}
                <b>última línea</b>?
                </label>
                <input
                id="ans3"
                type="text"
                inputMode="numeric"
                value={answers.thirdLine}
                onChange={(e) =>
                    setAnswers({ ...answers, thirdLine: e.target.value })
                }
                className={fieldStyle}
                placeholder="Escriba aquí"
                />
            </div>
            </div>
            {/* Sin botón aquí: el avance lo maneja la page */}
        </div>
        )
    }
)

export default ProgrammingExercise2
