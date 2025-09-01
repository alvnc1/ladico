import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = path.join(process.cwd(), 'public', 'datasets', 'comp-1-3', 'advanced', 'ej1')
const INDEX_FILE = path.join(DATA_DIR, 'index.json')

export async function GET() {
  try {
    const content = await fs.readFile(INDEX_FILE, 'utf-8')
    const list = JSON.parse(content) as Array<{ url: string }>
    if (!Array.isArray(list) || list.length === 0) return new Response(JSON.stringify({ url: null }), { status: 200 })
    return new Response(JSON.stringify({ url: list[0].url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ url: null }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
