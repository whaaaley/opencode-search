import { z } from 'zod'
import type { Deps } from '../deps.ts'
import type { WebResult } from '../web-result.ts'

// Firecrawl answers search without an API key, up to a daily cap per IP address.
const FIRECRAWL_URL = 'https://api.firecrawl.dev/v2/search'

const DEFAULT_LIMIT = 10

// https://docs.firecrawl.dev/features/search
const webSchema = z.object({
  url: z.string().default(''),
  title: z.string().default(''),
  description: z.string().default(''),
})

const responseSchema = z.object({
  data: z.object({ web: z.array(webSchema).default([]) }).default({ web: [] }),
})

export const firecrawlSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<WebResult[]> => {
  const cacheKey = 'firecrawl:' + query + ':' + limit

  const cached = await cache.get<WebResult[]>(cacheKey)
  if (cached) return cached

  const body = JSON.stringify({ query, limit, sources: ['web'] })
  const res = await fetch(FIRECRAWL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

  if (!res.ok) throw new Error('Firecrawl returned ' + res.status + ' ' + res.statusText)

  const { data } = responseSchema.parse(await res.json())
  const found = data.web.filter((result) => result.title && result.url).map((result) => ({ title: result.title, url: result.url, abstract: result.description }))

  void cache.set(cacheKey, found)

  return found
}
