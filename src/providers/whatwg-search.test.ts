import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { whatwgSearch } from './whatwg-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

const depsAnswering = (response: () => Response, urls: string[] = []): Deps => ({
  fetch: async (url) => {
    urls.push(String(url))
    return response()
  },
  cache: emptyCache(),
})

const index = (...standards: unknown[]): (() => Response) => {
  return () => Response.json({ workstreams: [{ name: 'Web', standards }] })
}

const html = { name: 'HTML', href: 'https://html.spec.whatwg.org/', description: 'Living standard for markup' }

describe('whatwgSearch', () => {
  it('fetches the standards index once', { meta: { steps: 12 } }, async () => {
    const urls: string[] = []

    await whatwgSearch(depsAnswering(index(html), urls), 'html')

    expect(urls).toEqual(['https://raw.githubusercontent.com/whatwg/sg/main/db.json'])
  })

  it('matches the name or description in any case', { meta: { steps: 16 } }, async () => {
    const dom = { name: 'DOM', href: 'https://dom.spec.whatwg.org/', description: 'Trees' }
    const deps = depsAnswering(index(html, dom))

    expect(await whatwgSearch(deps, 'MARKUP')).toEqual([{ title: 'HTML', url: 'https://html.spec.whatwg.org/', abstract: 'Living standard for markup', workstream: 'Web' }])
  })

  it('does not match across the gap between name and description', { meta: { steps: 12 } }, async () => {
    const deps = depsAnswering(index({ name: 'Fe', href: 'https://x.org', description: 'tch' }))

    expect(await whatwgSearch(deps, 'fetch')).toEqual([])
  })

  it('skips standards without a name or link', { meta: { steps: 13 } }, async () => {
    const deps = depsAnswering(index({ href: 'https://x.org', description: 'html' }, { name: 'HTML' }))

    expect(await whatwgSearch(deps, 'html')).toEqual([])
  })

  it('fills a missing description and workstream name', { meta: { steps: 12 } }, async () => {
    const deps = depsAnswering(() => Response.json({ workstreams: [{ standards: [{ name: 'URL', href: 'https://url.spec.whatwg.org/' }] }] }))

    expect(await whatwgSearch(deps, 'url')).toEqual([{ title: 'URL', url: 'https://url.spec.whatwg.org/', abstract: '', workstream: '' }])
  })

  it('returns nothing for an index without workstreams or standards', { meta: { steps: 16 } }, async () => {
    const noWorkstreams = depsAnswering(() => Response.json({}))
    const noStandards = depsAnswering(() => Response.json({ workstreams: [{ name: 'Web' }] }))

    expect(await whatwgSearch(noWorkstreams, 'html')).toEqual([])
    expect(await whatwgSearch(noStandards, 'html')).toEqual([])
  })

  it('returns twenty by default and up to the limit given, caching the whole list', { meta: { steps: 112 } }, async () => {
    const urls: string[] = []
    const standards = Array.from({ length: 25 }, (_, n) => ({ name: 'S' + n, href: 'u' + n }))
    const deps = depsAnswering(index(...standards), urls)

    expect((await whatwgSearch(deps, 's')).length).toEqual(20)
    expect((await whatwgSearch(deps, 's', 2)).length).toEqual(2)
    expect(urls.length).toEqual(1)
  })

  it('throws the status of a failed fetch', { meta: { steps: 7 } }, async () => {
    const deps = depsAnswering(() => new Response('', { status: 404, statusText: 'Not Found' }))

    await expect(whatwgSearch(deps, 'html')).rejects.toThrow('WHATWG index returned 404 Not Found')
  })
})

describe('whatwgSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return index({ name: 'q other', href: 'u' })()
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
    const deps = depsWith({ 'whatwg:q': { data: [{ title: 'saved', url: 'u', abstract: '', workstream: '' }], timestamp: 0 } }, [], urls)

    expect(await whatwgSearch(deps, 'q')).toEqual([{ title: 'saved', url: 'u', abstract: '', workstream: '' }])
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 22 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await whatwgSearch(deps, 'q')
    await whatwgSearch(deps, 'other')

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['whatwg:q', 'whatwg:other'])
    expect(saved['whatwg:q'].data).toEqual(first)
  })

  it('still answers when the results cannot be saved', { meta: { steps: 24 } }, async () => {
    const answer = await whatwgSearch(depsWith({}, [], [], true), 'q')

    expect(answer).toEqual(await whatwgSearch(depsWith({}, [], []), 'q'))
  })
})
