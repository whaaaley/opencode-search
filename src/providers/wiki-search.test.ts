import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { USER_AGENT } from '../user-agent.ts'
import { wikiSearch } from './wiki-search.ts'

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

const page = {
  id: 7,
  key: 'TypeScript',
  title: 'TypeScript',
  excerpt: 'A <span class="searchmatch">typed</span> language',
  description: 'Language',
  matched_title: null,
  thumbnail: { url: 'https://img', width: 60, height: 40 },
}

describe('wikiSearch', () => {
  it('returns pages with their excerpt normalized', { meta: { steps: 11 } }, async () => {
    const result = await wikiSearch(depsAnswering(json({ pages: [page] })), { query: 'q' })

    expect(result).toEqual({ pages: [{ ...page, excerpt: 'A typed language' }] })
  })

  it('fills missing fields with defaults', { meta: { steps: 11 } }, async () => {
    const result = await wikiSearch(depsAnswering(json({ pages: [{ key: 'K', title: 'T' }] })), { query: 'q' })

    expect(result.pages).toEqual([{ id: 0, key: 'K', title: 'T', excerpt: '', description: null, matched_title: null, thumbnail: null }])
  })

  it('drops pages without a key or title', { meta: { steps: 13 } }, async () => {
    const result = await wikiSearch(depsAnswering(json({ pages: [{ key: '', title: 'T' }, { key: 'K', title: '' }, page] })), { query: 'q' })

    expect(result.pages.map((kept) => kept.id)).toEqual([7])
  })

  it('asks with the package user agent, sending the limit only when given', { meta: { steps: 18 } }, async () => {
    const calls: Call[] = []

    await wikiSearch(depsAnswering(json({ pages: [] }), calls), { query: 'a b' })
    await wikiSearch(depsAnswering(json({ pages: [] }), calls), { query: 'q', limit: 3 })

    expect(calls).toEqual([
      { url: 'https://en.wikipedia.org/w/rest.php/v1/search/page?q=a+b', init: { headers: { 'User-Agent': USER_AGENT } } },
      { url: 'https://en.wikipedia.org/w/rest.php/v1/search/page?q=q&limit=3', init: { headers: { 'User-Agent': USER_AGENT } } },
    ])
  })

  it('throws the status and body of a failed search', { meta: { steps: 8 } }, async () => {
    const deps = depsAnswering(() => new Response('busy', { status: 429 }))

    await expect(wikiSearch(deps, { query: 'q' })).rejects.toThrow('Wikipedia search error (429): busy')
  })

  it('throws on an answer without pages', { meta: { steps: 8 } }, async () => {
    await expect(wikiSearch(depsAnswering(json({})), { query: 'q' })).rejects.toThrow()
  })

  it('caches pages under the default limit, apart from other limits', { meta: { steps: 25 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ pages: [page] }), calls)

    await wikiSearch(deps, { query: 'q' })
    await wikiSearch(deps, { query: 'q', limit: 10 })
    await wikiSearch(deps, { query: 'q', limit: 5 })

    expect(calls.length).toEqual(2)
  })

  it('does not cache an empty answer', { meta: { steps: 16 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ pages: [] }), calls)

    await wikiSearch(deps, { query: 'q' })
    await wikiSearch(deps, { query: 'q' })

    expect(calls.length).toEqual(2)
  })
})

describe('wikiSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ pages: [page] })
    },
    cache: createCache({
      file: {
        read: async () => JSON.stringify(store),
        write: async (text) => {
          if (failing) throw new Error('disk full')
          writes.push(text)
        },
      },
      now: () => 0,
    }),
  })

  it('answers from the entry saved under its key', { meta: { steps: 7 } }, async () => {
    const urls: string[] = []
    const deps = depsWith({ 'wiki:q:10': { data: { pages: [] }, timestamp: 0 } }, [], urls)

    expect(await wikiSearch(deps, { query: 'q' })).toEqual({ pages: [] })
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 20 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await wikiSearch(deps, { query: 'q' })
    await wikiSearch(deps, { query: 'other' })

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['wiki:q:10', 'wiki:other:10'])
    expect(saved['wiki:q:10'].data).toEqual(first)
  })

  it('fails when the results cannot be saved', async () => {
    await expect(wikiSearch(depsWith({}, [], [], true), { query: 'q' })).rejects.toThrow('disk full')
  })
})
