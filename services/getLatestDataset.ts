export async function getLatestDataset(competence: string, level: string, exercise: string): Promise<string | null> {
  try {
   
    const comp = encodeURIComponent(competence.trim())
    const lvl = encodeURIComponent(level.trim().toLowerCase())
    const ex = encodeURIComponent(exercise.trim())
    const url = `/api/datasets/${comp}/${lvl}/${ex}/latest`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    if (json && typeof json.url === 'string' && json.url.length > 0) return json.url
    return null
  } catch (e) {
    console.error('getLatestDataset (local) error', e)
    return null
  }
}
