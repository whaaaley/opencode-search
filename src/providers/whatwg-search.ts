import * as cache from '../cache.ts'

// WHATWG publishes its whole standards index as one small JSON file, and offers no search endpoint.
const DB_URL = 'https://raw.githubusercontent.com/whatwg/sg/main/db.json'
const DEFAULT_LIMIT = 20

export type WhatwgResult = {
  title: string
  url: string
  abstract: string
  workstream: string
}

type Standard = {
  name?: string
  href?: string
  description?: string
}

type Workstream = {
  name?: string
  standards?: Standard[]
}

export const whatwgSearch = async (query: string, limit = DEFAULT_LIMIT): Promise<WhatwgResult[]> => {
  const cacheKey = 'whatwg:' + query

  const cached = await cache.get<WhatwgResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const res = await fetch(DB_URL)

  if (!res.ok) throw new Error('WHATWG index returned ' + res.status + ' ' + res.statusText)

  const body = await res.json() as { workstreams?: Workstream[] }
  const needle = query.toLowerCase()
  const results: WhatwgResult[] = []

  for (const workstream of body.workstreams ?? []) {
    for (const standard of workstream.standards ?? []) {
      const title = standard.name ?? ''
      const url = standard.href ?? ''
      const abstract = standard.description ?? ''

      if (!title || !url) continue
      if (!(title + ' ' + abstract).toLowerCase().includes(needle)) continue

      results.push({ title, url, abstract, workstream: workstream.name ?? '' })
    }
  }

  await cache.set(cacheKey, results)

  return results.slice(0, limit)
}
