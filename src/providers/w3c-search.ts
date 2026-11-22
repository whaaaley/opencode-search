import { z } from 'zod'
import type { Deps } from '../deps.ts'

// The W3C API accepts a `q` parameter and ignores it: 'css' and a nonsense string both return all
// 1713 specifications.
// So the whole list is fetched and filtered here, 1000 per page.
const API_URL = 'https://api.w3.org/specifications'
const PAGE_SIZE = 1000
const DEFAULT_LIMIT = 20

// The index fits in two pages, so a count far past that is a bad answer, and fetching it would fire that many requests at once.
const MAX_PAGES = 5

export type W3cResult = {
  title: string
  url: string
}

// https://api.w3.org/doc
const specSchema = z.object({
  title: z.string().default(''),
  href: z.string().default(''),
  shortlink: z.string().optional(),
})

const pageSchema = z.object({
  pages: z.number().int().positive().default(1),
  _links: z.object({ specifications: z.array(specSchema).default([]) }).default({ specifications: [] }),
})

type Page = z.infer<typeof pageSchema>

const fetchPage = async (fetch: Deps['fetch'], page: number): Promise<Page> => {
  const params = new URLSearchParams({ items: String(PAGE_SIZE), page: String(page) })
  const res = await fetch(API_URL + '?' + params)

  if (!res.ok) throw new Error('W3C API returned ' + res.status + ' ' + res.statusText)

  return pageSchema.parse(await res.json())
}

export const w3cSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<W3cResult[]> => {
  const cacheKey = 'w3c:' + query

  const cached = await cache.get<W3cResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const first = await fetchPage(fetch, 1)

  // `pages` counts pages at the requested size, so the rest come 1000 at a time from page 2.
  const rest = await Promise.all(Array.from({ length: Math.min(first.pages, MAX_PAGES) - 1 }, (_, i) => fetchPage(fetch, i + 2)))
  const specs = [first, ...rest].flatMap((page) => page._links.specifications)

  const needle = query.toLowerCase()
  const results: W3cResult[] = []

  for (const spec of specs) {
    const url = spec.shortlink ?? spec.href

    if (spec.title && url && spec.title.toLowerCase().includes(needle)) results.push({ title: spec.title, url })
  }

  void cache.set(cacheKey, results)

  return results.slice(0, limit)
}
