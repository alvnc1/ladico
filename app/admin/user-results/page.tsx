"use client"

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Users, AlertCircle, Plus, X, Trash2 } from "lucide-react"

type UserDoc = {
  uid: string
  name?: string
  email?: string
  country?: string
  currentLevel?: string
  LadicoScore?: number
  completedCompetences?: string[]
}

type SortMode = "default" | "completed" | "competence" | "selected"

export default function UserResultsPage() {
  const [users, setUsers] = useState<UserDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("completed")

  // selección manual de competencias (chips)
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([])
  const [compInput, setCompInput] = useState("")
  const [requireAllSelected, setRequireAllSelected] = useState(false)

  // 👉 NUEVO: selección de usuarios
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const snap = await getDocs(collection(db, "users"))
      const rows: UserDoc[] = snap.docs.map((d) => {
        const data = d.data() as Partial<UserDoc>
        return {
          uid: d.id,
          name: (data?.name as string) || "",
          email: (data?.email as string) || "",
          country: (data?.country as string) || "",
          currentLevel: (data?.currentLevel as string) || "",
          LadicoScore: typeof data?.LadicoScore === "number" ? (data.LadicoScore as number) : undefined,
          completedCompetences: Array.isArray(data?.completedCompetences)
            ? (data!.completedCompetences as string[])
            : [],
        }
      })
      setUsers(rows)
    } catch (e) {
      console.error(e)
      setError("No se pudieron cargar los usuarios.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Helpers para ordenar por código de competencia
  const parseCode = (code: string): [number, number] => {
    const [a, b] = code.split(".")
    const A = Number.parseInt(a || "", 10)
    const B = Number.parseInt(b || "", 10)
    return [Number.isNaN(A) ? Number.POSITIVE_INFINITY : A, Number.isNaN(B) ? Number.POSITIVE_INFINITY : B]
  }
  const compareCodes = (c1: string, c2: string) => {
    const [a1, b1] = parseCode(c1)
    const [a2, b2] = parseCode(c2)
    if (a1 !== a2) return a1 - a2
    if (b1 !== b2) return b1 - b2
    return c1.localeCompare(c2)
  }
  const compareByCompetence = (u1: UserDoc, u2: UserDoc) => {
    const A = [...(u1.completedCompetences ?? [])].sort(compareCodes)
    const B = [...(u2.completedCompetences ?? [])].sort(compareCodes)
    const maxLen = Math.max(A.length, B.length)
    for (let i = 0; i < maxLen; i++) {
      const a = A[i], b = B[i]
      if (a == null && b == null) return 0
      if (a == null) return 1
      if (b == null) return -1
      const cmp = compareCodes(a, b)
      if (cmp !== 0) return cmp
    }
    return 0
  }

  // Orden por selección de competencias
  const compareBySelected = (u1: UserDoc, u2: UserDoc) => {
    const Aset = new Set(u1.completedCompetences ?? [])
    const Bset = new Set(u2.completedCompetences ?? [])
    const countA = selectedCompetences.reduce((acc, c) => acc + (Aset.has(c) ? 1 : 0), 0)
    const countB = selectedCompetences.reduce((acc, c) => acc + (Bset.has(c) ? 1 : 0), 0)
    if (countA !== countB) return countB - countA
    const firstIdxA = selectedCompetences.findIndex((c) => Aset.has(c))
    const firstIdxB = selectedCompetences.findIndex((c) => Bset.has(c))
    const ia = firstIdxA === -1 ? Number.POSITIVE_INFINITY : firstIdxA
    const ib = firstIdxB === -1 ? Number.POSITIVE_INFINITY : firstIdxB
    if (ia !== ib) return ia - ib
    const totalA = (u1.completedCompetences ?? []).length
    const totalB = (u2.completedCompetences ?? []).length
    if (totalA !== totalB) return totalB - totalA
    return u1.uid.localeCompare(u2.uid)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = users.filter(
      (u) =>
        u.uid.toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    )

    if (requireAllSelected && selectedCompetences.length > 0) {
      list = list.filter((u) =>
        selectedCompetences.every((c) => (u.completedCompetences ?? []).includes(c))
      )
    }

    if (sortMode === "selected" && selectedCompetences.length > 0) {
      list = list.sort(compareBySelected)
    } else if (sortMode === "completed") {
      list = list.sort(
        (a, b) => (b.completedCompetences?.length || 0) - (a.completedCompetences?.length || 0)
      )
    } else if (sortMode === "competence") {
      list = list.sort(compareByCompetence)
    }
    return list
  }, [users, query, sortMode, selectedCompetences, requireAllSelected])

  // === NUEVO: selección filas ===
  const isAllSelected = filtered.length > 0 && filtered.every((u) => selectedUids.has(u.uid))
  const toggleSelectAll = () => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      if (isAllSelected) {
        filtered.forEach((u) => next.delete(u.uid))
      } else {
        filtered.forEach((u) => next.add(u.uid))
      }
      return next
    })
  }
  const toggleRow = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  // === NUEVO: borrar seleccionados ===
  const handleBulkDelete = async () => {
    const uids = Array.from(selectedUids)
    if (uids.length === 0) return
    const ok = window.confirm(`¿Eliminar ${uids.length} cuenta(s) de usuario? Esta acción es permanente.`)
    if (!ok) return

    try {
      setDeleting(true)
      // ⚠️ Necesitas enviar un ID token de un admin en el Authorization header.
      const idToken = await (await import("firebase/auth")).getAuth().currentUser?.getIdToken()
      const res = await fetch("/admin/delete-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ uids }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Error al eliminar usuarios")
      }
      // Limpieza local: quita los eliminados de la lista y de la selección
      const removed = new Set<string>(data.deleted ?? uids)
      setUsers((prev) => prev.filter((u) => !removed.has(u.uid)))
      setSelectedUids(new Set())
      alert(`Eliminadas ${removed.size} cuentas correctamente.`)
    } catch (e: any) {
      console.error(e)
      alert(e?.message || "Error al eliminar usuarios")
    } finally {
      setDeleting(false)
    }
  }

  // chips helpers
  const addCompetence = () => {
    const raw = compInput.trim()
    if (!raw) return
    const c = raw.replace(/\s+/g, "")
    if (!selectedCompetences.includes(c)) {
      setSelectedCompetences((prev) => [...prev, c])
    }
    setCompInput("")
  }
  const removeCompetence = (c: string) => {
    setSelectedCompetences((prev) => prev.filter((x) => x !== c))
  }
  const onCompKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCompetence()
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6">
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resultados de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Controles */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o UID…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Grupo de orden */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={sortMode === "selected" ? "default" : "outline"}
                  onClick={() => setSortMode("selected")}
                >
                  Por mi selección
                </Button>
                <Button
                  variant={sortMode === "completed" ? "default" : "outline"}
                  onClick={() => setSortMode("completed")}
                >
                  Más completas
                </Button>
                <Button
                  variant={sortMode === "competence" ? "default" : "outline"}
                  onClick={() => setSortMode("competence")}
                >
                  Por competencia
                </Button>
                <Button
                  variant={sortMode === "default" ? "default" : "outline"}
                  onClick={() => setSortMode("default")}
                >
                  Por defecto
                </Button>

                {/* Exportar Excel */}
                <Button
                  onClick={handleBulkDelete}
                  disabled={selectedUids.size === 0 || deleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
                  title={selectedUids.size ? `Eliminar ${selectedUids.size} seleccionados` : "Selecciona usuarios"}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Eliminando..." : `Eliminar (${selectedUids.size})`}
                </Button>

                <Button
                  onClick={async () => {
                    const XLSX = await import("xlsx")
                    const rows = filtered.map((u) => ({
                      UID: u.uid,
                      Nombre: u.name || "",
                      Email: u.email || "",
                      País: u.country || "",
                      "Nivel actual": u.currentLevel || "",
                      "Puntaje Ladico": u.LadicoScore ?? "",
                      "Competencias completadas (códigos)": (u.completedCompetences ?? []).join(", "),
                      "Total competencias": u.completedCompetences?.length || 0,
                    }))
                    const ws = XLSX.utils.json_to_sheet(rows)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, "Usuarios")
                    ws["!cols"] = [
                      { wch: 28 }, { wch: 24 }, { wch: 28 }, { wch: 14 },
                      { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 18 },
                    ]
                    XLSX.writeFile(wb, `usuarios_ladico_${new Date().toISOString().slice(0, 10)}.xlsx`)
                  }}
                  className="border bg-[#286575] hover:bg-[#3a7d89] text-white"
                  title="Descargar en Excel (filtrados)"
                >
                  Exportar Excel
                </Button>
              </div>
            </div>

            {/* Selector de competencias */}
            <div className="rounded-xl border p-3 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder='Agregar competencia (ej. "1.1", "5.2", "3.3") y presiona Enter'
                  value={compInput}
                  onChange={(e) => setCompInput(e.target.value)}
                  onKeyDown={onCompKeyDown}
                />
                <Button variant="outline" onClick={addCompetence} title="Agregar">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedCompetences.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedCompetences.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1 px-2 py-1">
                      {c}
                      <button onClick={() => removeCompetence(c)} className="ml-1 inline-flex" title="Quitar">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Agrega una o más competencias para priorizar el orden.</p>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="requireAll"
                  checked={requireAllSelected}
                  onCheckedChange={(v) => setRequireAllSelected(Boolean(v))}
                />
                <label htmlFor="requireAll" className="text-sm text-gray-700 cursor-pointer">
                  Mostrar solo usuarios que tienen <strong>todas</strong> las seleccionadas
                </label>
              </div>
            </div>
          </div>

          {/* Estados */}
          {loading && (
            <div className="py-10 text-center text-sm text-gray-500">Cargando usuarios…</div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabla */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-[#286675]"
                        aria-label="Seleccionar todo"
                      />
                    </th>
                    <th className="py-2 pr-4">Usuario</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">País</th>
                    <th className="py-2 pr-4">Nivel actual</th>
                    <th className="py-2 pr-4">Competencias completadas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.uid} className="border-t">
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={selectedUids.has(u.uid)}
                          onChange={() => toggleRow(u.uid)}
                          className="h-4 w-4 accent-[#286675]"
                          aria-label={`Seleccionar ${u.uid}`}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900">{u.name || "(sin nombre)"}</div>
                        <div className="text-xs text-gray-500">UID: {u.uid}</div>
                      </td>
                      <td className="py-3 pr-4">{u.email || "-"}</td>
                      <td className="py-3 pr-4">{u.country || "-"}</td>
                      <td className="py-3 pr-4 capitalize">{u.currentLevel || "-"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(u.completedCompetences ?? []).length > 0 ? (
                            [...(u.completedCompetences ?? [])]
                              .sort(compareCodes)
                              .map((c) => (
                                <span
                                  key={`${u.uid}-${c}`}
                                  className={`px-2 py-0.5 rounded-full text-xs border ${
                                    selectedCompetences.includes(c)
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {c}
                                </span>
                              ))
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total: {u.completedCompetences?.length || 0}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        No hay usuarios que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
