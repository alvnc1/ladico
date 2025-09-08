// app/admin/page.tsx
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { collection, addDoc, deleteDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AdminPanel() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [datasetFile, setDatasetFile] = useState<File | null>(null)
  const [datasetUrl, setDatasetUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.email) {
      setIsAdmin(user.email.endsWith("@admin.com"))
    } else {
      setIsAdmin(false)
    }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        JSON.parse(content)
        setFileContent(content)
      } catch {
        setFileError("El archivo no contiene JSON válido")
        setFileContent(null)
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileContent) {
      setFileError("No se ha cargado ningún archivo");
      return;
    }

    if (!db) {
      setFileError("Error de conexión a la base de datos");
      return;
    }

    setUploading(true);

    try {
      const questions = JSON.parse(fileContent);
      const questionsArray = Array.isArray(questions) ? questions : [questions];

      // Validación para multiple-choice y multiple-response
      const validQuestions = questionsArray.filter((q) => {
        const isMultiChoice = q.type === "multiple-choice";
        const isMultiResponse = q.type === "multiple-response";

        if (!(isMultiChoice || isMultiResponse)) return false;

        // Campos obligatorios comunes
        const commonValid =
          q.competence &&
          q.level &&
          q.gender &&
          q.age &&
          q.country &&
          q.title &&
          q.scenario &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          q.feedback &&
          q.feedback.correct &&
          q.feedback.incorrect;

        if (!commonValid) return false;

        // Validación específica por tipo
        if (isMultiChoice) {
          return typeof q.correctAnswerIndex === "number";
        }
        if (isMultiResponse) {
          return (
            Array.isArray(q.correctAnswerIndex) &&
            q.correctAnswerIndex.every((i: any) => typeof i === "number")
          );
        }

        return false;
      });

      if (validQuestions.length === 0) {
        throw new Error(
          "No hay preguntas válidas en el archivo. Verifica el formato."
        );
      }

      if (validQuestions.length !== questionsArray.length) {
        toast({
          title: "Advertencia",
          description: `Solo ${validQuestions.length} de ${questionsArray.length} preguntas tienen formato válido.`,
          variant: "destructive",
        });
      }

      let addedCount = 0;
      for (const question of validQuestions) {
        await addDoc(collection(db, "questions"), { ...question });
        addedCount++;
      }

      toast({
        title: "Éxito",
        description: `Se han agregado ${addedCount} preguntas a la base de datos.`,
      });

      setFileContent(null);
      const fileInput = document.getElementById("fileInput") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error al procesar el archivo:", error);
      setFileError(
        error instanceof Error
          ? error.message
          : "Error desconocido al procesar el archivo"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al procesar el archivo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };


  const handleDatasetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setDatasetFile(f)
  }

  const handleUploadDataset = async () => {
    if (!datasetFile) {
      toast({
        title: "Sin archivo",
        description: "Selecciona un CSV o XLSX",
        variant: "destructive",
      })
      return
    }
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", datasetFile)
      const res = await fetch("/api/datasets/comp-1-3/advanced/ej1/upload", {
        method: "POST",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error desconocido")
      setDatasetUrl(json.url)
      toast({ title: "Dataset subido", description: json.filename })
    } catch (err) {
      console.error(err)
      toast({
        title: "Error al subir dataset",
        description: (err as Error).message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAllQuestions = async () => {
    if (!db || !isAdmin) return
    if (
      !confirm(
        "¿Estás seguro? Esta acción eliminará TODAS las preguntas de la base de datos y no se puede deshacer.",
      )
    ) {
      return
    }
    try {
      setUploading(true)
      const querySnapshot = await getDocs(collection(db, "questions"))
      let deletedCount = 0
      for (const document of querySnapshot.docs) {
        await deleteDoc(document.ref)
        deletedCount++
      }
      toast({
        title: "Base de datos limpiada",
        description: `Se han eliminado ${deletedCount} preguntas.`,
      })
    } catch (error) {
      console.error("Error al eliminar preguntas:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar todas las preguntas.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Acceso no autorizado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center ">
              <FileText className="h-6 w-6 mr-2" />
              Panel de Administración — Cargar Preguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fileError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">Formato requerido</h2>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4 overflow-auto">
                <pre className="text-xs text-gray-800">{`{ 
  "type": "multiple-choice" || "multiple-response", 
  "competence": "1.3", 
  "level": "Básico 2",
  "gender": "{género}",
  "age": {edad},
  "country": "{país}",
  "title": "Título de la pregunta",
  "scenario": "Escenario o contexto más la pregunta",
  "options": [
    "Primera opción",
    "Segunda opción",
    "Tercera opción",
    "Cuarta opción"
  ],
  "correctAnswerIndex": "opción correcta" || "opciones correctas",
  "feedback": {
    "correct": "Retroalimentación para respuesta correcta",
    "incorrect": "Retroalimentación para respuesta incorrecta" 
  }
}`}</pre>
              </div>
              <p className="text-sm text-gray-600">
                El archivo debe contener un solo objeto JSON o un array de objetos con la estructura mostrada arriba.
                <br />
                <strong>Nota:</strong> El índice de la respuesta correcta (<code>correctAnswerIndex</code>) empieza en 0.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Selecciona un archivo JSON</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Arrastra y suelta un archivo o haz clic para seleccionarlo
                </p>
                <Input
                  id="fileInput"
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("fileInput")?.click()}
                  className="mb-2 rounded-xl"
                >
                  Seleccionar archivo
                </Button>
                {fileContent && (
                  <div className="text-sm text-green-600 mt-2">
                    ✓ Archivo JSON válido cargado y listo para procesar
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1" disabled={!fileContent || uploading}>
                  {uploading ? "Procesando..." : "Cargar preguntas"}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteAllQuestions}
                  disabled={uploading}
                  title="Esta acción eliminará todas las preguntas de la base de datos"
                >
                  Borrar todas las preguntas
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
