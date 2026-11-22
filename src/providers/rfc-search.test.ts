import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { rfcNumberPattern, rfcSearch } from './rfc-search.ts'

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

const rfc = (n: number): Record<string, string> => ({ name: 'rfc' + n, title: 'T' + n, time: '2024-01-01', abstract: 'A' + n })

describe('rfcNumberPattern', () => {
  it('matches a number with an optional rfc prefix', { meta: { steps: 0 } }, () => {
    for (const query of ['9421', 'RFC9421', 'rfc 9421', 'rfc-9421']) {
      expect(query.match(rfcNumberPattern)?.[1]).toEqual('9421')
    }
  })

  it('rejects words and numbers longer than five digits', { meta: { steps: 0 } }, () => {
    expect('HTTP 9421'.match(rfcNumberPattern)).toEqual(null)
    expect('123456'.match(rfcNumberPattern)).toEqual(null)
  })
})

describe('rfcSearch', () => {
  it('reads each RFC into a result linking the editor page', { meta: { steps: 11 } }, async () => {
    const results = await rfcSearch(depsAnswering(json({ objects: [rfc(9110)] })), 'HTTP')

    expect(results).toEqual([{ id: 'RFC9110', title: 'T9110', url: 'https://www.rfc-editor.org/rfc/rfc9110.html', date: '2024-01-01', abstract: 'A9110' }])
  })

  it('fills missing fields and skips documents without a name', { meta: { steps: 12 } }, async () => {
    const results = await rfcSearch(depsAnswering(json({ objects: [{ title: 'Nameless' }, { name: 'rfc1' }] })), 'q')

    expect(results).toEqual([{ id: 'RFC1', title: '', url: 'https://www.rfc-editor.org/rfc/rfc1.html', date: '', abstract: '' }])
  })

  it('returns nothing for an answer without objects', { meta: { steps: 10 } }, async () => {
    expect(await rfcSearch(depsAnswering(json({})), 'q')).toEqual([])
  })

  it('searches titles for a word query', { meta: { steps: 10 } }, async () => {
    const urls: string[] = []

    await rfcSearch(depsAnswering(json({ objects: [] }), urls), 'HTTP Semantics')

    expect(urls).toEqual(['https://datatracker.ietf.org/api/v1/doc/document/?title__icontains=HTTP+Semantics&type=rfc&limit=20&format=json'])
  })

  it('looks up a number query by name', { meta: { steps: 10 } }, async () => {
    const urls: string[] = []

    await rfcSearch(depsAnswering(json({ objects: [] }), urls), ' rfc 9421 ')

    expect(urls).toEqual(['https://datatracker.ietf.org/api/v1/doc/document/?name=rfc9421&type=rfc&limit=20&format=json'])
  })

  it('asks for at most 100 documents', { meta: { steps: 18 } }, async () => {
    const urls: string[] = []

    await rfcSearch(depsAnswering(json({ objects: [] }), urls), 'q', 500)
    await rfcSearch(depsAnswering(json({ objects: [] }), urls), 'q', 100)

    expect(urls.map((url) => new URL(url).searchParams.get('limit'))).toEqual(['100', '100'])
  })

  it('returns up to the limit, caching the whole answer', { meta: { steps: 16 } }, async () => {
    const urls: string[] = []
    const deps = depsAnswering(json({ objects: [rfc(1), rfc(2), rfc(3)] }), urls)

    expect((await rfcSearch(deps, 'q', 1)).length).toEqual(1)
    expect((await rfcSearch(deps, 'q', 2)).length).toEqual(2)
    expect(urls.length).toEqual(1)
  })

  it('throws the status of a failed lookup', { meta: { steps: 9 } }, async () => {
    const deps = depsAnswering(() => new Response('', { status: 502, statusText: 'Bad Gateway' }))

    await expect(rfcSearch(deps, 'q')).rejects.toThrow('IETF Datatracker returned 502 Bad Gateway')
  })
})

describe('rfcSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ objects: [rfc(1)] })
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
    const deps = depsWith({ 'rfc:q': { data: [{ id: 'RFC2', title: '', url: 'u', date: '', abstract: '' }], timestamp: 0 } }, [], urls)

    expect(await rfcSearch(deps, 'q')).toEqual([{ id: 'RFC2', title: '', url: 'u', date: '', abstract: '' }])
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 20 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await rfcSearch(deps, 'q')
    await rfcSearch(deps, 'other')

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['rfc:q', 'rfc:other'])
    expect(saved['rfc:q'].data).toEqual(first)
  })

  it('still answers when the results cannot be saved', { meta: { steps: 22 } }, async () => {
    const answer = await rfcSearch(depsWith({}, [], [], true), 'q')

    expect(answer).toEqual(await rfcSearch(depsWith({}, [], []), 'q'))
  })
})
