import { z } from 'zod'
import type { Deps } from '../deps.ts'

// WHATWG publishes its whole standards index as one small JSON file, and offers no search endpoint.
const DB_URL = 'https://raw.githubusercontent.com/whatwg/sg/main/db.json'
const DEFAULT_LIMIT = 20

export type WhatwgResult = {
  title: string
  url: string
  abstract: string
  workstream: string
}

// https://github.com/whatwg/sg/blob/main/db.json
const standardSchema = z.object({
  name: z.string().default(''),
  href: z.string().default(''),
  description: z.string().default(''),
})

const workstreamSchema = z.object({
  name: z.string().default(''),
  standards: z.array(standardSchema).default([]),
})

const indexSchema = z.object({
  workstreams: z.array(workstreamSchema).default([]),
})

export const whatwgSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<WhatwgResult[]> => {
  const cacheKey = 'whatwg:' + query

  const cached = await cache.get<WhatwgResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const res = await fetch(DB_URL)

  if (!res.ok) throw new Error('WHATWG index returned ' + res.status + ' ' + res.statusText)

  const { workstreams } = indexSchema.parse(await res.json())
  const needle = query.toLowerCase()

  const results = workstreams.flatMap((workstream) =>
    workstream.standards.flatMap((standard) => {
      const matches = (standard.name + ' ' + standard.description).toLowerCase().includes(needle)
      if (!standard.name || !standard.href || !matches) return []

      return [{ title: standard.name, url: standard.href, abstract: standard.description, workstream: workstream.name }]
    }),
  )

  void cache.set(cacheKey, results)

  return results.slice(0, limit)
}
