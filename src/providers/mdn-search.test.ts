import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { USER_AGENT } from '../user-agent.ts'
import { mdnSearch } from './mdn-search.ts'

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

const doc = { mdn_url: '/en-US/docs/Web/API/Fetch_API', title: 'Fetch API', summary: 's', slug: 'Web/API/Fetch_API', locale: 'en-US', popularity: 0.5 }

describe('mdnSearch', () => {
  it('returns the documents with the total MDN gives', { meta: { steps: 15 } }, async () => {
    const result = await mdnSearch(depsAnswering(json({ documents: [doc], metadata: { total: { value: 90 } } })), { query: 'q' })

    expect(result).toEqual({ documents: [doc], total: 90 })
  })

  it('counts the documents when MDN gives no total, filling defaults', { meta: { steps: 15 } }, async () => {
    const result = await mdnSearch(depsAnswering(json({ documents: [{ mdn_url: '/x', title: 'X' }] })), { query: 'q' })

    expect(result).toEqual({ documents: [{ mdn_url: '/x', title: 'X', summary: '', slug: '', locale: 'en-US', popularity: 0 }], total: 1 })
  })

  it('drops documents without a url or title', { meta: { steps: 17 } }, async () => {
    const result = await mdnSearch(depsAnswering(json({ documents: [{ mdn_url: '', title: 'X' }, { mdn_url: '/x', title: '' }, doc] })), { query: 'q' })

    expect(result.documents).toEqual([doc])
  })

  it('asks for English results with the package user agent', { meta: { steps: 13 } }, async () => {
    const calls: Call[] = []

    await mdnSearch(depsAnswering(json({ documents: [] }), calls), { query: 'a b' })

    expect(calls).toEqual([{ url: 'https://developer.mozilla.org/api/v1/search?q=a+b&locale=en-US', init: { headers: { 'User-Agent': USER_AGENT } } }])
  })

  it('sends the size and page when given', { meta: { steps: 13 } }, async () => {
    const calls: Call[] = []

    await mdnSearch(depsAnswering(json({ documents: [] }), calls), { query: 'q', limit: 5, page: 2 })

    expect(calls[0]?.url).toEqual('https://developer.mozilla.org/api/v1/search?q=q&locale=en-US&size=5&page=2')
  })

  it('throws the status and body of a failed search', { meta: { steps: 10 } }, async () => {
    const deps = depsAnswering(() => new Response('nope', { status: 500 }))

    await expect(mdnSearch(deps, { query: 'q' })).rejects.toThrow('MDN search error (500): nope')
  })

  it('throws on an answer without documents', { meta: { steps: 10 } }, async () => {
    await expect(mdnSearch(depsAnswering(json({})), { query: 'q' })).rejects.toThrow()
  })

  it('caches a page with documents under the default limit and page', { meta: { steps: 21 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ documents: [doc] }), calls)

    await mdnSearch(deps, { query: 'q' })
    await mdnSearch(deps, { query: 'q', limit: 10, page: 1 })

    expect(calls.length).toEqual(1)
  })

  it('caches each limit and page apart', { meta: { steps: 41 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ documents: [doc] }), calls)

    await mdnSearch(deps, { query: 'q' })
    await mdnSearch(deps, { query: 'q', limit: 5 })
    await mdnSearch(deps, { query: 'q', page: 2 })

    expect(calls.length).toEqual(3)
  })

  it('does not cache an empty page', { meta: { steps: 24 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ documents: [] }), calls)

    await mdnSearch(deps, { query: 'q' })
    await mdnSearch(deps, { query: 'q' })

    expect(calls.length).toEqual(2)
  })
})

describe('mdnSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ documents: [doc] })
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

  it('answers from the entry saved under its key', { meta: { steps: 8 } }, async () => {
    const urls: string[] = []
    const deps = depsWith({ 'mdn:q:10:1': { data: { documents: [], total: 7 }, timestamp: 0 } }, [], urls)

    expect(await mdnSearch(deps, { query: 'q' })).toEqual({ documents: [], total: 7 })
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 28 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await mdnSearch(deps, { query: 'q' })
    await mdnSearch(deps, { query: 'other' })

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['mdn:q:10:1', 'mdn:other:10:1'])
    expect(saved['mdn:q:10:1'].data).toEqual(first)
  })

  it('still answers when the results cannot be saved', { meta: { steps: 30 } }, async () => {
    const answer = await mdnSearch(depsWith({}, [], [], true), { query: 'q' })

    expect(answer).toEqual(await mdnSearch(depsWith({}, [], []), { query: 'q' }))
  })
})
