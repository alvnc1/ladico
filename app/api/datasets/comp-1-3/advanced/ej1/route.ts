import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// Genera un workbook con una hoja "Datos" y fechas incrementales en la columna A
function buildWorkbook() {
  const wsData: Array<Array<string | number | Date>> = []

  // Fecha base: 2017-08-05 UTC
  const base = new Date(Date.UTC(2017, 7, 5))
  for (let i = 0; i < 100; i++) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    wsData.push([iso])
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  return wb
}

export async function GET() {
  try {
    const wb = buildWorkbook()
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const ab = new Uint8Array(buf).buffer as ArrayBuffer
    const filename = `comp-1-3-avanzado-ej1.xlsx`
  return new Response(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${filename}`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    console.error('Error generating XLSX:', err)
    return new Response(JSON.stringify({ error: 'No se pudo generar el dataset' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
