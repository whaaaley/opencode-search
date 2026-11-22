import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { firecrawlSearch } from './firecrawl-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

type Call = { url: string; init: RequestInit | undefined }

const depsAnswering = (response: () => Response, calls: Call[] = []): Deps => ({
  fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return response()
  },
  cache: emptyCache(),
})

const json = (body: unknown): (() => Response) => {
  return () => Response.json(body)
}

const page = { url: 'https://example.com/', title: 'Example', description: 'An example page', position: 1 }

describe('firecrawlSearch', () => {
  it('reads each web result', async () => {
    const results = await firecrawlSearch(depsAnswering(json({ success: true, data: { web: [page] } })), 'q')

    expect(results).toEqual([{ title: 'Example', url: 'https://example.com/', abstract: 'An example page' }])
  })

  it('posts the query and limit for web results, with no key', async () => {
    const calls: Call[] = []

    await firecrawlSearch(depsAnswering(json({ data: { web: [] } }), calls), 'a b', 5)

    expect(calls).toEqual([
      {
        url: 'https://api.firecrawl.dev/v2/search',
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"query":"a b","limit":5,"sources":["web"]}' },
      },
    ])
  })

  it('asks for ten by default', async () => {
    const calls: Call[] = []

    await firecrawlSearch(depsAnswering(json({ data: { web: [] } }), calls), 'q')

    expect(JSON.parse(String(calls[0]?.init?.body)).limit).toEqual(10)
  })

  it('skips results without a title or url and fills a missing description', async () => {
    const results = await firecrawlSearch(depsAnswering(json({ data: { web: [{ url: 'https://a' }, { title: 'No url' }, { url: 'https://b', title: 'B' }] } })), 'q')

    expect(results).toEqual([{ title: 'B', url: 'https://b', abstract: '' }])
  })

  it('returns nothing for an answer without data', async () => {
    expect(await firecrawlSearch(depsAnswering(json({ success: true })), 'q')).toEqual([])
    expect(await firecrawlSearch(depsAnswering(json({ data: {} })), 'q')).toEqual([])
  })

  it('throws the status of a failed search', async () => {
    const deps = depsAnswering(() => new Response('', { status: 429, statusText: 'Too Many Requests' }))

    await expect(firecrawlSearch(deps, 'q')).rejects.toThrow('Firecrawl returned 429 Too Many Requests')
  })
})

describe('firecrawlSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[]): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ data: { web: [page] } })
    },
    cache: createCache({
      file: {
        read: async () => JSON.stringify(store),
        write: async (text) => {
          writes.push(text)
        },
      },
      now: () => 0,
    }),
  })

  it('answers from the entry saved under its key', async () => {
    const urls: string[] = []
    const saved = [{ title: 'saved', url: 'u', abstract: '' }]

    expect(await firecrawlSearch(depsWith({ 'firecrawl:q:10': { data: saved, timestamp: 0 } }, [], urls), 'q')).toEqual(saved)
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query and limit', async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await firecrawlSearch(deps, 'q')
    await firecrawlSearch(deps, 'q', 3)

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['firecrawl:q:10', 'firecrawl:q:3'])
    expect(saved['firecrawl:q:10'].data).toEqual(first)
  })
})
