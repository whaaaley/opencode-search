import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { standardSearch } from './standard-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

const depsAnswering = (response: () => Response, urls: string[] = []): Deps => ({
  fetch: async (url) => {
    urls.push(String(url))
    return response()
  },
  cache: emptyCache(),
})

const json = (body: unknown): (() => Response) => {
  return () => Response.json(body)
}

const post = {
  type: 'article',
  uri: 'at://did:plc:a/site.standard.document/1',
  title: 'Relays explained',
  snippet: 'How <b>relays</b> work',
  createdAt: '2026-11-17T14:48:33.000Z',
  platform: 'leaflet',
  url: 'https://example.leaflet.pub/relays',
}

describe('standardSearch', () => {
  it('reads each result into a document', { meta: { steps: 12 } }, async () => {
    const documents = await standardSearch(depsAnswering(json({ results: [post], hasMore: false })), { query: 'q' })

    expect(documents).toEqual([{ title: 'Relays explained', url: 'https://example.leaflet.pub/relays', snippet: 'How <b>relays</b> work', date: '2026-11-17T14:48:33.000Z', platform: 'leaflet' }])
  })

  it('asks for twenty from the start by default, in the paged format', { meta: { steps: 9 } }, async () => {
    const urls: string[] = []

    await standardSearch(depsAnswering(json({ results: [] }), urls), { query: 'a b' })

    expect(urls).toEqual(['https://api.pub-search.waow.tech/search?q=a+b&format=v2&limit=20&offset=0'])
  })

  it('passes the limit and offset, asking for at most forty', { meta: { steps: 18 } }, async () => {
    const urls: string[] = []

    await standardSearch(depsAnswering(json({ results: [] }), urls), { query: 'q', limit: 5, offset: 10 })
    await standardSearch(depsAnswering(json({ results: [] }), urls), { query: 'q', limit: 100 })

    expect(urls.map((url) => [new URL(url).searchParams.get('limit'), new URL(url).searchParams.get('offset')])).toEqual([
      ['5', '10'],
      ['40', '0'],
    ])
  })

  it('skips results without a title or url and fills missing fields', { meta: { steps: 17 } }, async () => {
    const results = [{ url: 'https://a' }, { title: 'No url' }, { title: 'B', url: 'https://b' }]

    expect(await standardSearch(depsAnswering(json({ results })), { query: 'q' })).toEqual([{ title: 'B', url: 'https://b', snippet: '', date: '', platform: '' }])
  })

  it('returns nothing for an answer without results', { meta: { steps: 9 } }, async () => {
    expect(await standardSearch(depsAnswering(json({})), { query: 'q' })).toEqual([])
  })

  it('throws the status of a failed search', { meta: { steps: 8 } }, async () => {
    const deps = depsAnswering(() => new Response('', { status: 429, statusText: 'Too Many Requests' }))

    await expect(standardSearch(deps, { query: 'q' })).rejects.toThrow('pub-search returned 429 Too Many Requests')
  })
})

describe('standardSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[]): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ results: [post] })
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

  it('answers from the entry saved under its key', { meta: { steps: 8 } }, async () => {
    const urls: string[] = []
    const saved = [{ title: 'saved', url: 'u', snippet: '', date: '', platform: '' }]

    expect(await standardSearch(depsWith({ 'standard:q:20:0': { data: saved, timestamp: 0 } }, [], urls), { query: 'q' })).toEqual(saved)
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query, limit and offset', { meta: { steps: 22 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await standardSearch(deps, { query: 'q' })
    await standardSearch(deps, { query: 'q', offset: 20 })

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['standard:q:20:0', 'standard:q:20:20'])
    expect(saved['standard:q:20:0'].data).toEqual(first)
  })
})
