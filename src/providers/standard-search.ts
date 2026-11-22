import { z } from 'zod'
import type { Deps } from '../deps.ts'

// pub-search indexes long-form posts published on the AT Protocol, standard.site documents among them, and needs no key.
const PUB_SEARCH_URL = 'https://api.pub-search.waow.tech/search'

const DEFAULT_LIMIT = 20

export type StandardDocument = {
  title: string
  url: string
  snippet: string
  date: string
  platform: string
}

// https://github.com/zzstoatzz/pub-search/blob/main/docs/api.md
const resultSchema = z.object({
  title: z.string().default(''),
  url: z.string().default(''),
  snippet: z.string().default(''),
  createdAt: z.string().default(''),
  platform: z.string().default(''),
})

const responseSchema = z.object({
  results: z.array(resultSchema).default([]),
})

type StandardSearchOptions = {
  query: string
  limit?: number
  offset?: number
}

export const standardSearch = async ({ fetch, cache }: Deps, options: StandardSearchOptions): Promise<StandardDocument[]> => {
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 40)
  const offset = options.offset ?? 0
  const cacheKey = ['standard', options.query, limit, offset].join(':')

  const cached = await cache.get<StandardDocument[]>(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({ q: options.query, format: 'v2', limit: String(limit), offset: String(offset) })
  const res = await fetch(PUB_SEARCH_URL + '?' + params)

  if (!res.ok) throw new Error('pub-search returned ' + res.status + ' ' + res.statusText)

  const { results } = responseSchema.parse(await res.json())
  const documents = results.filter((result) => result.title && result.url).map((result) => ({ title: result.title, url: result.url, snippet: result.snippet, date: result.createdAt, platform: result.platform }))

  void cache.set(cacheKey, documents)

  return documents
}
