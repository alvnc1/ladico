
export type ValidationResult = {
  ok: boolean
  normalizedUser?: string
  normalizedExpected?: string
  reason?: string
}

export function toNumberFlexible(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  let s = String(value).trim()
  if (!s) return null

 
  s = s.replace(/\s+/g, '')

 
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma !== -1 && lastDot !== -1) {
   
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '')
      s = s.replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
     
    }
  } else if (lastComma !== -1) {
   
    s = s.replace(/\./g, '')
    s = s.replace(',', '.')
  } else {
   
    s = s.replace(/,/g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function compareNumbers(user: string | number, expected: string | number, epsilon = 1e-9): ValidationResult {
  const a = toNumberFlexible(user)
  const b = toNumberFlexible(expected)
  if (a === null || b === null) return { ok: false, reason: 'Formato numérico inválido' }
  return { ok: Math.abs(a - b) <= epsilon, normalizedUser: String(a), normalizedExpected: String(b) }
}

export function normalizeText(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function compareText(user: string, expected: string): ValidationResult {
  const u = normalizeText(user)
  const e = normalizeText(expected)
  return { ok: u === e, normalizedUser: u, normalizedExpected: e }
}


export function toISODateFlexible(value: string | Date): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
   
    const y = value.getUTCFullYear()
    const m = value.getUTCMonth() + 1
    const d = value.getUTCDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  let s = String(value).trim()
  if (!s) return null

 
  s = s.replace(/[\/.]/g, '-')

 
  const parts = s.split('-').map((p) => p.padStart(2, '0'))
  if (parts.length !== 3) return null

  const [a, b, c] = parts

  const tryBuild = (y: string, m: string, d: string): string | null => {
    const yy = Number(y)
    const mm = Number(m)
    const dd = Number(d)
    if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
    const dt = new Date(Date.UTC(yy, mm - 1, dd))
    if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null
    const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    return iso
  }

 
  if (/^\d{4}$/.test(a)) {
    return tryBuild(a, b, c)
  }
 
  if (/^\d{4}$/.test(c)) {
   
    const dmy = tryBuild(c, b, a)
    if (dmy) return dmy
   
    const mdy = tryBuild(c, a, b)
    if (mdy) return mdy
  }
  return null
}

export function compareDates(user: string | Date, expected: string | Date): ValidationResult {
  const u = toISODateFlexible(user)
  const e = toISODateFlexible(expected)
  if (!u || !e) return { ok: false, reason: 'Formato de fecha inválido' }
  return { ok: u === e, normalizedUser: u, normalizedExpected: e }
}
