import { z } from 'zod'
import * as cache from '../cache.ts'
import { USER_AGENT } from '../user-agent.ts'

const MDN_API = 'https://developer.mozilla.org/api/v1/search'

const documentSchema = z.object({
  mdn_url: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().default(''),
  slug: z.string().default(''),
  locale: z.string().default('en-US'),
  popularity: z.number().default(0),
})

const responseSchema = z.object({
  documents: z.array(z.unknown()),
  metadata: z.object({
    total: z.object({
      value: z.number(),
    }),
  }).optional(),
})

export type MdnDocument = z.infer<typeof documentSchema>

export type MdnSearchResult = {
  documents: Array<MdnDocument>
  total: number
}

type MdnSearchOptions = {
  query: string
  limit?: number
  page?: number
}

export const mdnSearch = async (options: MdnSearchOptions): Promise<MdnSearchResult> => {
  const cacheKey = [
    'mdn',
    options.query,
    options.limit ?? 10,
    options.page ?? 1,
  ].join(':')

  const cached = await cache.get<MdnSearchResult>(cacheKey)
  if (cached && cached.documents && cached.documents.length > 0) {
    return cached
  }

  const params = new URLSearchParams({
    q: options.query,
    locale: 'en-US',
  })

  if (options.limit) {
    params.set('size', String(options.limit))
  }

  if (options.page) {
    params.set('page', String(options.page))
  }

  const url = MDN_API + '?' + params.toString()
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error('MDN search error (' + res.status + '): ' + text)
  }

  const json: unknown = await res.json()
  const response = responseSchema.parse(json)

  const documents = response.documents.flatMap((raw) => {
    const parsed = documentSchema.safeParse(raw)
    return parsed.success ? [parsed.data] : []
  })

  const total = response.metadata?.total.value ?? documents.length

  const result: MdnSearchResult = { documents, total }

  if (documents.length > 0) {
    await cache.set(cacheKey, result)
  }

  return result
}
