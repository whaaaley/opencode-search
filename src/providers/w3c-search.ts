import * as cache from '../cache.ts'

// The W3C API accepts a `q` parameter and ignores it: 'css' and a nonsense string both return all
// 1713 specifications.
// So the whole list is fetched and filtered here, 1000 per page.
const API_URL = 'https://api.w3.org/specifications'
const PAGE_SIZE = 1000
const DEFAULT_LIMIT = 20

export type W3cResult = {
  title: string
  url: string
}

type Spec = {
  title?: string
  href?: string
  'shortlink'?: string
}

type Page = {
  pages?: number
  _links?: { specifications?: Spec[] }
}

const fetchPage = async (page: number): Promise<Page> => {
  const params = new URLSearchParams({ items: String(PAGE_SIZE), page: String(page) })
  const res = await fetch(API_URL + '?' + params)

  if (!res.ok) throw new Error('W3C API returned ' + res.status + ' ' + res.statusText)

  return await res.json() as Page
}

export const w3cSearch = async (query: string, limit = DEFAULT_LIMIT): Promise<W3cResult[]> => {
  const cacheKey = 'w3c:' + query

  const cached = await cache.get<W3cResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const first = await fetchPage(1)
  const specs = [...first._links?.specifications ?? []]

  // `pages` counts pages at the requested size, so a second fetch covers the rest at 1000 each.
  const total = first.pages ?? 1
  for (let page = 2; page <= total; page++) {
    const next = await fetchPage(page)
    specs.push(...next._links?.specifications ?? [])
  }

  const needle = query.toLowerCase()
  const results: W3cResult[] = []

  for (const spec of specs) {
    const title = spec.title ?? ''
    const url = spec.shortlink ?? spec.href ?? ''

    if (!title || !url) continue
    if (!title.toLowerCase().includes(needle)) continue

    results.push({ title, url })
  }

  await cache.set(cacheKey, results)

  return results.slice(0, limit)
}
