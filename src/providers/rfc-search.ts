import * as cache from '../cache.ts'

const DATATRACKER_URL = 'https://datatracker.ietf.org/api/v1/doc/document/'
const DEFAULT_LIMIT = 20

export type RfcResult = {
  id: string
  title: string
  url: string
  date: string
  abstract: string
}

type DatatrackerDoc = {
  name?: string
  title?: string
  time?: string
  abstract?: string
}

export const rfcSearch = async (query: string, limit = DEFAULT_LIMIT): Promise<RfcResult[]> => {
  const cacheKey = 'rfc:' + query

  const cached = await cache.get<RfcResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const params = new URLSearchParams({
    title__icontains: query,
    type: 'rfc',
    limit: String(Math.min(limit, 100)),
    format: 'json',
  })

  const res = await fetch(DATATRACKER_URL + '?' + params)

  if (!res.ok) throw new Error('IETF Datatracker returned ' + res.status + ' ' + res.statusText)

  const body = await res.json() as { objects?: DatatrackerDoc[] }
  const results: RfcResult[] = []

  for (const doc of body.objects ?? []) {
    const id = doc.name ?? ''
    if (!id) continue

    results.push({
      id: id.toUpperCase(),
      title: doc.title ?? '',
      url: 'https://www.rfc-editor.org/rfc/' + id + '.html',
      date: doc.time ?? '',
      abstract: doc.abstract ?? '',
    })
  }

  await cache.set(cacheKey, results)

  return results.slice(0, limit)
}
