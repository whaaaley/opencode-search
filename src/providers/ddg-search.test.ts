import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { ddgSearch } from './ddg-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

type Call = { url: string; init: RequestInit | undefined }

const depsAnswering = (responses: Response[], calls: Call[] = []): Deps => ({
  fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    const response = responses.shift()
    if (!response) throw new Error('no response left')
    return response
  },
  cache: emptyCache(),
})

const htmlPage = ['<a class="result__a" href="https://a.com"> A </a><div class="result__snippet"> about a </div>', '<a class="result__a" href="https://b.com">B</a>'].join('')

const litePage = '<a class="result-link" href="https://l.com">L</a><td class="result-snippet">lite</td>'

describe('ddgSearch', () => {
  it('reads results from the html frontend', { meta: { steps: 24 } }, async () => {
    const results = await ddgSearch(depsAnswering([new Response(htmlPage)]), 'q')

    expect(results).toEqual([
      { title: 'A', url: 'https://a.com', abstract: 'about a' },
      { title: 'B', url: 'https://b.com', abstract: '' },
    ])
  })

  it('posts the query form with the base headers', { meta: { steps: 24 } }, async () => {
    const calls: Call[] = []

    await ddgSearch(depsAnswering([new Response(htmlPage)], calls), 'a b')

    const [call] = calls
    const headers = new Headers(call?.init?.headers)
    expect(call?.url).toEqual('https://html.duckduckgo.com/html/')
    expect(call?.init?.method).toEqual('POST')
    expect(String(call?.init?.body)).toEqual('q=a+b&b=&kf=-1&kh=1&kl=us-en&kp=1&k1=-1')
    expect(headers.get('Content-Type')).toEqual('application/x-www-form-urlencoded')
    expect(headers.get('Accept')).toEqual('text/html')
  })

  it('skips links without a title or href', { meta: { steps: 35 } }, async () => {
    const page = '<a class="result__a" href="https://a.com"> </a><a class="result__a">No href</a>' + litePage

    const calls: Call[] = []
    const results = await ddgSearch(depsAnswering([new Response(page), new Response('<table><tr>' + litePage + '</tr></table>')], calls), 'q')

    expect(calls.length).toEqual(2)
    expect(results).toEqual([{ title: 'L', url: 'https://l.com', abstract: 'lite' }])
  })

  it('falls back to the lite frontend when the html one is blocked', { meta: { steps: 25 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering([new Response('<div class="anomaly-modal"></div>'), new Response('<table><tr>' + litePage + '</tr></table>')], calls)

    const results = await ddgSearch(deps, 'q')

    expect(calls.map((call) => call.url)).toEqual(['https://html.duckduckgo.com/html/', 'https://lite.duckduckgo.com/lite/'])
    expect(results).toEqual([{ title: 'L', url: 'https://l.com', abstract: 'lite' }])
  })

  it('throws the status when both frontends fail', { meta: { steps: 14 } }, async () => {
    const deps = depsAnswering([new Response('', { status: 500 }), new Response('', { status: 503, statusText: 'Unavailable' })])

    await expect(ddgSearch(deps, 'q')).rejects.toThrow('503 Unavailable')
  })

  it('throws when the lite frontend also asks to try again', { meta: { steps: 20 } }, async () => {
    const deps = depsAnswering([new Response(''), new Response('Please try again')])

    await expect(ddgSearch(deps, 'q')).rejects.toThrow('DuckDuckGo blocked the request')
  })

  it('answers a repeated query from the cache', { meta: { steps: 28 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering([new Response(htmlPage)], calls)

    await ddgSearch(deps, 'q')
    const again = await ddgSearch(deps, 'q')

    expect(calls.length).toEqual(1)
    expect(again.length).toEqual(2)
  })
})

describe('ddgSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return new Response(htmlPage)
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

  it('answers from the entry saved under its key', { meta: { steps: 6 } }, async () => {
    const urls: string[] = []
    const deps = depsWith({ 'ddg:q': { data: [{ title: 'saved', url: 'https://s', abstract: '' }], timestamp: 0 } }, [], urls)

    expect(await ddgSearch(deps, 'q')).toEqual([{ title: 'saved', url: 'https://s', abstract: '' }])
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 46 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await ddgSearch(deps, 'q')
    await ddgSearch(deps, 'other')

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['ddg:q', 'ddg:other'])
    expect(saved['ddg:q'].data).toEqual(first)
  })

  it('fails when the results cannot be saved', async () => {
    await expect(ddgSearch(depsWith({}, [], [], true), 'q')).rejects.toThrow('disk full')
  })
})
