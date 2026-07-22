import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from '../cache.ts'
import { baseHeaders, detectBlock, runStrategies } from '../strategies.ts'

// The lite frontend is the fallback when the html frontend is blocked or empty
const DDG_HTML_URL = 'https://html.duckduckgo.com/html/'
const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/'

const BLOCK_MARKERS = ['anomaly-modal', 'Please try again']

export type DdgResult = {
  title: string
  url: string
  abstract: string
}

const searchParams = (query: string): URLSearchParams => (
  new URLSearchParams({
    q: query,
    b: '',
    kf: '-1',
    kh: '1',
    kl: 'us-en',
    kp: '1',
    k1: '-1',
  })
)

const parseDom = (html: string, url: string): Document => {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {
    // Silently ignore JSDOM errors
  })

  return new JSDOM(html, { url, virtualConsole }).window.document
}

const fetchDdg = async (url: string, query: string, userAgent: string): Promise<string> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...baseHeaders(userAgent),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: searchParams(query),
  })

  if (!response.ok) {
    throw new Error(response.status + ' ' + response.statusText)
  }

  const html = await response.text()
  detectBlock('DuckDuckGo', html, BLOCK_MARKERS)

  return html
}

const parseHtmlResults = (html: string): DdgResult[] => {
  const doc = parseDom(html, DDG_HTML_URL)

  const links = doc.querySelectorAll('.result__a')
  const snippets = doc.querySelectorAll('.result__snippet')

  const results: DdgResult[] = []

  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) {
      continue
    }

    const title = link.textContent?.trim() ?? ''
    const href = link.getAttribute('href') ?? ''
    const abstract = snippets[i]?.textContent?.trim() ?? ''

    if (title && href) {
      results.push({ title, url: href, abstract })
    }
  }

  return results
}

const parseLiteResults = (html: string): DdgResult[] => {
  const doc = parseDom(html, DDG_LITE_URL)

  const links = doc.querySelectorAll('a.result-link')
  const snippets = doc.querySelectorAll('td.result-snippet')

  const results: DdgResult[] = []

  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) {
      continue
    }

    const title = link.textContent?.trim() ?? ''
    const href = link.getAttribute('href') ?? ''
    const abstract = snippets[i]?.textContent?.trim() ?? ''

    if (title && href) {
      results.push({ title, url: href, abstract })
    }
  }

  return results
}

export const ddgSearch = async (query: string): Promise<DdgResult[]> => {
  const cacheKey = 'ddg:' + query

  const cached = await cache.get<DdgResult[]>(cacheKey)
  if (cached) {
    return cached
  }

  const results = await runStrategies([
    {
      name: 'ddg-html',
      run: async (userAgent) => parseHtmlResults(await fetchDdg(DDG_HTML_URL, query, userAgent)),
    },
    {
      name: 'ddg-lite',
      run: async (userAgent) => parseLiteResults(await fetchDdg(DDG_LITE_URL, query, userAgent)),
    },
  ])

  await cache.set(cacheKey, results)

  return results
}
