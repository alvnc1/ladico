import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'Ejercicio_3_Avanzado.xlsx')
    const data = await fs.readFile(filePath)
    const arrayBuf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    const blob = new Blob([arrayBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    return new Response(blob, {
      headers: {
        'Content-Disposition': 'attachment; filename="ejercicio3-avanzado.xlsx"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
}
