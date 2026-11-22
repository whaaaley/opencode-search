import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { awsDocsSearch } from './aws-docs-search.ts'

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

const excerpt = (n: number): unknown => ({ textExcerptSuggestion: { title: 'Page ' + n, link: 'https://docs.aws.amazon.com/' + n, summary: 'Summary ' + n } })

describe('awsDocsSearch', () => {
  it('reads each excerpt suggestion into a web result', { meta: { steps: 13 } }, async () => {
    const results = await awsDocsSearch(depsAnswering(json({ suggestions: [excerpt(1)] })), 'q')

    expect(results).toEqual([{ title: 'Page 1', url: 'https://docs.aws.amazon.com/1', abstract: 'Summary 1' }])
  })

  it('uses the suggestion body when there is no summary', { meta: { steps: 13 } }, async () => {
    const suggestions = [{ textExcerptSuggestion: { title: 'T', link: 'https://docs.aws.amazon.com/t', suggestionBody: 'Body text' } }]

    expect(await awsDocsSearch(depsAnswering(json({ suggestions })), 'q')).toEqual([{ title: 'T', url: 'https://docs.aws.amazon.com/t', abstract: 'Body text' }])
  })

  it('skips suggestions without an excerpt, a title or a link', { meta: { steps: 23 } }, async () => {
    const suggestions = [{}, { textExcerptSuggestion: { link: 'https://docs.aws.amazon.com/x' } }, { textExcerptSuggestion: { title: 'No link' } }, excerpt(2)]

    expect((await awsDocsSearch(depsAnswering(json({ suggestions })), 'q')).map((result) => result.title)).toEqual(['Page 2'])
  })

  it('returns nothing for an answer without suggestions', { meta: { steps: 8 } }, async () => {
    expect(await awsDocsSearch(depsAnswering(json({})), 'q')).toEqual([])
  })

  it('posts the query for docs.aws.amazon.com in English, in a fresh session', { meta: { steps: 16 } }, async () => {
    const calls: Call[] = []

    await awsDocsSearch(depsAnswering(json({ suggestions: [] }), calls), 's3 versioning')
    await awsDocsSearch(depsAnswering(json({ suggestions: [] }), calls), 's3 versioning')

    const [first, second] = calls
    expect(first?.url).toMatch(/^https:\/\/proxy\.search\.docs\.aws\.com\/search\?session=[0-9a-f-]{36}$/)
    expect(first?.url).not.toEqual(second?.url)
    expect(first?.init?.method).toEqual('POST')
    expect(first?.init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(String(first?.init?.body))).toEqual({
      textQuery: { input: 's3 versioning' },
      contextAttributes: [{ key: 'domain', value: 'docs.aws.amazon.com' }],
      acceptSuggestionBody: 'RawText',
      locales: ['en_us'],
    })
  })

  it('returns ten by default and up to the limit given, caching the whole list', { meta: { steps: 87 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(json({ suggestions: Array.from({ length: 15 }, (_, n) => excerpt(n)) }), calls)

    expect((await awsDocsSearch(deps, 'q')).length).toEqual(10)
    expect((await awsDocsSearch(deps, 'q', 3)).length).toEqual(3)
    expect(calls.length).toEqual(1)
  })

  it('throws the status of a failed search', { meta: { steps: 7 } }, async () => {
    const deps = depsAnswering(() => new Response('', { status: 500, statusText: 'Server Error' }))

    await expect(awsDocsSearch(deps, 'q')).rejects.toThrow('AWS docs search returned 500 Server Error')
  })
})

describe('awsDocsSearch cache', () => {
  it('answers from the entry saved under aws-docs:<query>', { meta: { steps: 7 } }, async () => {
    const calls: Call[] = []
    const saved = [{ title: 'saved', url: 'u', abstract: '' }]
    const deps: Deps = {
      fetch: async (url) => {
        calls.push({ url: String(url), init: undefined })
        return Response.json({ suggestions: [] })
      },
      cache: createCache({ file: { read: async () => JSON.stringify({ 'aws-docs:q': { data: saved, timestamp: 0 } }), write: async () => {} }, now: () => 0 }),
    }

    expect(await awsDocsSearch(deps, 'q')).toEqual(saved)
    expect(calls).toEqual([])
  })
})
