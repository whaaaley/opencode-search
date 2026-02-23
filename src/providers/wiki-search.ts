import { z } from 'zod'
import * as cache from '../cache.ts'
import { normalizeBlurb } from '../normalize-blurb.ts'
import { USER_AGENT } from '../user-agent.ts'

const WIKI_API = 'https://en.wikipedia.org/w/rest.php/v1/search/page'

const thumbnailSchema = z.object({
  url: z.string().min(1),
  width: z.number(),
  height: z.number(),
})

const pageSchema = z.object({
  id: z.number().default(0),
  key: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().default('').transform(normalizeBlurb),
  description: z.string().nullable().default(null),
  matched_title: z.string().nullable().default(null),
  thumbnail: thumbnailSchema.nullable().default(null),
})

const responseSchema = z.object({
  pages: z.array(z.unknown()),
})

export type WikiPage = z.infer<typeof pageSchema>

export type WikiSearchResult = {
  pages: Array<WikiPage>
}

type WikiSearchOptions = {
  query: string
  limit?: number
}

export const wikiSearch = async (options: WikiSearchOptions): Promise<WikiSearchResult> => {
  const cacheKey = 'wiki:' + options.query + ':' + (options.limit ?? 10)

  const cached = await cache.get<WikiSearchResult>(cacheKey)
  if (cached && cached.pages && cached.pages.length > 0) {
    return cached
  }

  const params = new URLSearchParams({ q: options.query })

  if (options.limit) {
    params.set('limit', String(options.limit))
  }

  const url = WIKI_API + '?' + params.toString()
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error('Wikipedia search error (' + res.status + '): ' + text)
  }

  const json: unknown = await res.json()
  const response = responseSchema.parse(json)

  const pages = response.pages.flatMap((raw) => {
    const parsed = pageSchema.safeParse(raw)
    return parsed.success ? [parsed.data] : []
  })

  const result: WikiSearchResult = { pages }

  if (pages.length > 0) {
    await cache.set(cacheKey, result)
  }

  return result
}
