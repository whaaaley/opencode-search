import { z } from 'zod'
import type { Deps } from '../deps.ts'

const DATATRACKER_URL = 'https://datatracker.ietf.org/api/v1/doc/document/'
const DEFAULT_LIMIT = 20

export type RfcResult = {
  id: string
  title: string
  url: string
  date: string
  abstract: string
}

// https://datatracker.ietf.org/api/v1/doc/document/?format=json
const documentSchema = z.object({
  name: z.string().default(''),
  title: z.string().default(''),
  time: z.string().default(''),
  abstract: z.string().default(''),
})

const responseSchema = z.object({
  objects: z.array(documentSchema).default([]),
})

// Matches an RFC number query, with an optional 'rfc' prefix and space or dash, and captures the digits.
export const rfcNumberPattern = /^(?:rfc[\s-]?)?(\d{1,5})$/i

export const rfcSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<RfcResult[]> => {
  const cacheKey = 'rfc:' + query

  const cached = await cache.get<RfcResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  // A number query is a lookup, not a title search.
  const number = rfcNumberPattern.exec(query.trim())?.[1]

  const params = new URLSearchParams({
    ...(number ? { name: 'rfc' + number } : { title__icontains: query }),
    type: 'rfc',
    limit: String(Math.min(limit, 100)),
    format: 'json',
  })

  const res = await fetch(DATATRACKER_URL + '?' + params)

  if (!res.ok) throw new Error('IETF Datatracker returned ' + res.status + ' ' + res.statusText)

  const { objects } = responseSchema.parse(await res.json())

  const results = objects
    .filter((doc) => doc.name)
    .map((doc) => ({
      id: doc.name.toUpperCase(),
      title: doc.title,
      url: 'https://www.rfc-editor.org/rfc/' + doc.name + '.html',
      date: doc.time,
      abstract: doc.abstract,
    }))

  await cache.set(cacheKey, results)

  return results.slice(0, limit)
}
