import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { w3cSearch } from './w3c-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

const depsAnswering = (pages: unknown[], urls: string[] = []): Deps => ({
  fetch: async (url) => {
    urls.push(String(url))
    const page = Number(new URL(String(url)).searchParams.get('page'))
    return Response.json(pages[page - 1])
  },
  cache: emptyCache(),
})

const pageOf = (specifications: unknown[], pages = 1): unknown => ({ pages, _links: { specifications } })

describe('w3cSearch', () => {
  it('keeps specifications whose title holds the query, in any case', { meta: { steps: 19 } }, async () => {
    const specs = [
      { title: 'CSS Grid', href: 'https://w3.org/grid' },
      { title: 'SVG', href: 'https://w3.org/svg' },
    ]

    expect(await w3cSearch(depsAnswering([pageOf(specs)]), 'css')).toEqual([{ title: 'CSS Grid', url: 'https://w3.org/grid' }])
  })

  it('prefers the shortlink to the href', { meta: { steps: 14 } }, async () => {
    const specs = [{ title: 'CSS', href: 'https://api.w3.org/css', shortlink: 'https://w3.org/TR/css/' }]

    expect(await w3cSearch(depsAnswering([pageOf(specs)]), 'css')).toEqual([{ title: 'CSS', url: 'https://w3.org/TR/css/' }])
  })

  it('skips specifications without a title or link', { meta: { steps: 16 } }, async () => {
    const specs = [{ href: 'https://w3.org/x' }, { title: 'CSS' }]

    expect(await w3cSearch(depsAnswering([pageOf(specs)]), '')).toEqual([])
  })

  it('reads every page the first one counts', { meta: { steps: 26 } }, async () => {
    const urls: string[] = []
    const pages = [pageOf([{ title: 'CSS 1', href: 'a' }], 3), pageOf([{ title: 'CSS 2', href: 'b' }]), pageOf([{ title: 'CSS 3', href: 'c' }])]

    const results = await w3cSearch(depsAnswering(pages, urls), 'css')

    expect(urls).toEqual([1, 2, 3].map((page) => 'https://api.w3.org/specifications?items=1000&page=' + page))
    expect(results.map((result) => result.url)).toEqual(['a', 'b', 'c'])
  })

  it('reads one page when the answer has no count or list', { meta: { steps: 9 } }, async () => {
    const urls: string[] = []

    expect(await w3cSearch(depsAnswering([{}], urls), 'css')).toEqual([])
    expect(urls.length).toEqual(1)
  })

  it('returns twenty by default and up to the limit given, caching the whole list', { meta: { steps: 138 } }, async () => {
    const urls: string[] = []
    const specs = Array.from({ length: 25 }, (_, n) => ({ title: 'CSS ' + n, href: 'u' + n }))
    const deps = depsAnswering([pageOf(specs)], urls)

    expect((await w3cSearch(deps, 'css')).length).toEqual(20)
    expect((await w3cSearch(deps, 'css', 3)).length).toEqual(3)
    expect(urls.length).toEqual(1)
  })

  it('throws the status of a failed page', { meta: { steps: 7 } }, async () => {
    const deps: Deps = { fetch: async () => new Response('', { status: 500, statusText: 'Server Error' }), cache: emptyCache() }

    await expect(w3cSearch(deps, 'css')).rejects.toThrow('W3C API returned 500 Server Error')
  })
})

describe('w3cSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json(pageOf([{ title: 'q other', href: 'u' }]))
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
    const deps = depsWith({ 'w3c:q': { data: [{ title: 'saved', url: 'u' }], timestamp: 0 } }, [], urls)

    expect(await w3cSearch(deps, 'q')).toEqual([{ title: 'saved', url: 'u' }])
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 26 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await w3cSearch(deps, 'q')
    await w3cSearch(deps, 'other')

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['w3c:q', 'w3c:other'])
    expect(saved['w3c:q'].data).toEqual(first)
  })

  it('still answers when the results cannot be saved', { meta: { steps: 28 } }, async () => {
    const answer = await w3cSearch(depsWith({}, [], [], true), 'q')

    expect(answer).toEqual(await w3cSearch(depsWith({}, [], []), 'q'))
  })
})
