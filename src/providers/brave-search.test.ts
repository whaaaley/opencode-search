import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { BlockedError } from '../strategies.ts'
import { braveSearch } from './brave-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

const depsAnswering = (html: string, urls: string[] = []): Deps => ({
  fetch: async (url) => {
    urls.push(String(url))
    return new Response(html)
  },
  cache: emptyCache(),
})

const snippet = (inner: string): string => '<div class="snippet" data-type="web">' + inner + '</div>'

describe('braveSearch', () => {
  it('reads each web snippet into a result', { meta: { steps: 22 } }, async () => {
    const html = snippet('<a href="https://a.com"><div class="title"> A </div></a><div class="generic-snippet"><div class="content"> about a </div></div>')

    const results = await braveSearch(depsAnswering(html), 'q')

    expect(results).toEqual([{ title: 'A', url: 'https://a.com', abstract: 'about a' }])
  })

  it('asks Brave for the encoded query', { meta: { steps: 13 } }, async () => {
    const urls: string[] = []

    await braveSearch(depsAnswering('', urls), 'a b&c')

    expect(urls).toEqual(['https://search.brave.com/search?q=a%20b%26c'])
  })

  it('keeps a result with no snippet text', { meta: { steps: 22 } }, async () => {
    const results = await braveSearch(depsAnswering(snippet('<a href="https://a.com"></a><span class="title">A</span>')), 'q')

    expect(results).toEqual([{ title: 'A', url: 'https://a.com', abstract: '' }])
  })

  it('skips snippets without a title, a link, an href or a web url', { meta: { steps: 47 } }, async () => {
    const html = [
      snippet('<a href="https://a.com"></a>'),
      snippet('<span class="title">No link</span>'),
      snippet('<a><span class="title">No href</span></a>'),
      snippet('<a href="/local"><span class="title">Local</span></a>'),
      '<div class="snippet" data-type="video"><a href="https://v.com"><span class="title">Video</span></a></div>',
    ].join('')

    expect(await braveSearch(depsAnswering(html), 'q')).toEqual([])
  })

  it('throws when Brave answers with a challenge', { meta: { steps: 21 } }, async () => {
    await expect(braveSearch(depsAnswering('<p>Verifying you are human</p>'), 'q')).rejects.toThrow(BlockedError)
    await expect(braveSearch(depsAnswering('<div class="challenge-error"></div>'), 'q')).rejects.toThrow(BlockedError)
  })

  it('answers a repeated query from the cache', { meta: { steps: 26 } }, async () => {
    const urls: string[] = []
    const deps = depsAnswering(snippet('<a href="https://a.com"><span class="title">A</span></a>'), urls)

    await braveSearch(deps, 'q')
    const again = await braveSearch(deps, 'q')

    expect(urls.length).toEqual(1)
    expect(again).toEqual([{ title: 'A', url: 'https://a.com', abstract: '' }])
  })
})

describe('braveSearch cache', () => {
  const page = snippet('<a href="https://a.com"><span class="title">A</span></a>')
  const result = { title: 'A', url: 'https://a.com', abstract: '' }

  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return new Response(page)
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

  it('reads each web snippet of a page', { meta: { steps: 31 } }, async () => {
    const two = page + snippet('<a href="https://b.com"><span class="title">B</span></a>')

    expect(await braveSearch(depsAnswering(two), 'q')).toEqual([result, { title: 'B', url: 'https://b.com', abstract: '' }])
  })

  it('answers from the entry saved under brave:<query>', { meta: { steps: 6 } }, async () => {
    const urls: string[] = []

    expect(await braveSearch(depsWith({ 'brave:q': { data: ['saved'], timestamp: 0 } }, [], urls), 'q')).toEqual(['saved'])
    expect(urls).toEqual([])
  })

  it('saves the results under brave:<query>, apart for each query', { meta: { steps: 42 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    await braveSearch(deps, 'a')
    await braveSearch(deps, 'b')

    expect(urls.length).toEqual(2)
    expect(Object.keys(JSON.parse(writes.at(-1) ?? '{}'))).toEqual(['brave:a', 'brave:b'])
    expect(JSON.parse(writes.at(-1) ?? '{}')['brave:a'].data).toEqual([result])
  })

  it('still answers when the results cannot be saved', { meta: { steps: 44 } }, async () => {
    const answer = await braveSearch(depsWith({}, [], [], true), 'q')

    expect(answer).toEqual(await braveSearch(depsWith({}, [], []), 'q'))
  })
})
