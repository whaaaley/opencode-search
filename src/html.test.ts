import { describe, expect, it } from 'vite-plus/test'
import { fetchHtml, makeDom, statusHeadingPattern } from './html.ts'
import { BlockedError } from './strategies.ts'

type Call = { url: string; init: RequestInit | undefined }

const fetchAnswering = (response: Response, calls: Call[] = []): typeof fetch => {
  return async (url, init) => {
    calls.push({ url: String(url), init })
    return response
  }
}

const failingBody = (): ReadableStream =>
  new ReadableStream({
    start: (controller) => controller.error(new Error('reset')),
  })

describe('makeDom', () => {
  it('parses html at the given url', { meta: { steps: 0 } }, () => {
    const doc = makeDom('<a href="/x">link</a>', 'https://example.com/page')

    expect(doc.querySelector('a')?.href).toEqual('https://example.com/x')
  })

  it('parses broken markup without throwing', { meta: { steps: 0 } }, () => {
    const doc = makeDom('<style>a { color: </style><p>text', 'https://example.com/')

    expect(doc.querySelector('p')?.textContent).toEqual('text')
  })
})

describe('statusHeadingPattern', () => {
  it('matches forbidden and rate-limit headings in any case', { meta: { steps: 0 } }, () => {
    expect('403 Forbidden, 429 - too many requests, 404 Not Found'.replace(statusHeadingPattern, '')).toEqual(', , 404 Not Found')
  })
})

describe('fetchHtml', () => {
  it('returns the body of an ok response, sent with the base headers', { meta: { steps: 2 } }, async () => {
    const calls: Call[] = []
    const fetch = fetchAnswering(new Response('<p>ok</p>'), calls)

    const html = await fetchHtml({ fetch, url: 'https://example.com/s', userAgent: 'agent' })

    expect(html).toEqual('<p>ok</p>')
    expect(calls).toEqual([
      {
        url: 'https://example.com/s',
        init: { headers: { 'User-Agent': 'agent', Accept: 'text/html', 'Accept-Encoding': 'gzip', DNT: '1' } },
      },
    ])
  })

  it('reports a 403 as blocked with the page sentence', { meta: { steps: 2 } }, async () => {
    const page = '<html><h1>403 Forbidden</h1>\n<p>Your   request was flagged.</p></html>'
    const fetch = fetchAnswering(new Response(page, { status: 403 }))

    const attempt = fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })

    await expect(attempt).rejects.toThrow(new BlockedError('example.com — Your request was flagged.'))
  })

  it('keeps words in separate tags apart', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response('<p>Access</p><p>denied</p>', { status: 403 }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow(new BlockedError('example.com — Access denied'))
  })

  it('reports a 429 as blocked', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response('slow down', { status: 429 }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow(new BlockedError('example.com — slow down'))
  })

  it('cuts the reason to 140 characters', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response('a'.repeat(200), { status: 403 }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow(new BlockedError('example.com — ' + 'a'.repeat(140)))
  })

  it('names only the host when the block page says nothing', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response('<h1>429 Too Many Requests</h1>', { status: 429 }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow(new BlockedError('example.com'))
  })

  it('names only the host when the block page cannot be read', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response(failingBody(), { status: 403 }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow(new BlockedError('example.com'))
  })

  it('throws the status of any other failure', { meta: { steps: 2 } }, async () => {
    const fetch = fetchAnswering(new Response('gone', { status: 404, statusText: 'Not Found' }))

    await expect(fetchHtml({ fetch, url: 'https://example.com/s', userAgent: '' })).rejects.toThrow('404 Not Found')
  })
})
