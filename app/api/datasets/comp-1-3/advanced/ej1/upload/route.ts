import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), 'public', 'datasets', 'comp-1-3', 'advanced', 'ej1')
const INDEX_FILE = path.join(DATA_DIR, 'index.json')

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return new Response(JSON.stringify({ error: 'file requerido' }), { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buf = Buffer.from(arrayBuffer)

    await fs.mkdir(DATA_DIR, { recursive: true })
    const stamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
    const filename = `${stamp}_${safeName}`
    const dest = path.join(DATA_DIR, filename)
    await fs.writeFile(dest, buf)

    // mantener índice simple
    const record = { filename, url: `/datasets/comp-1-3/advanced/ej1/${filename}`, uploadedAt: stamp }
    let index: any[] = []
    try {
      index = JSON.parse(await fs.readFile(INDEX_FILE, 'utf-8'))
    } catch {}
    index.unshift(record)
    await fs.writeFile(INDEX_FILE, JSON.stringify(index.slice(0, 10), null, 2))

    return new Response(JSON.stringify({ ok: true, url: record.url, filename }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Fallo al subir' }), { status: 500 })
  }
}
