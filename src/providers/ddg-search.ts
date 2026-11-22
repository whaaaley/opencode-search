import type { Deps } from '../deps.ts'
import { makeDom } from '../html.ts'
import { baseHeaders, detectBlock, runStrategies, type Strategy } from '../strategies.ts'

// The lite frontend is the fallback when the html frontend is blocked or empty
const DDG_HTML_URL = 'https://html.duckduckgo.com/html/'
const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/'

const BLOCK_MARKERS = ['anomaly-modal', 'Please try again']

export type DdgResult = {
  title: string
  url: string
  abstract: string
}

type Frontend = {
  url: string
  link: string
  snippet: string
}

const HTML_FRONTEND: Frontend = { url: DDG_HTML_URL, link: '.result__a', snippet: '.result__snippet' }
const LITE_FRONTEND: Frontend = { url: DDG_LITE_URL, link: 'a.result-link', snippet: 'td.result-snippet' }

type FetchDdgInput = {
  fetch: typeof fetch
  url: string
  query: string
  userAgent: string
}

const fetchDdg = async ({ fetch, url, query, userAgent }: FetchDdgInput): Promise<string> => {
  const body = new URLSearchParams({ q: query, b: '', kf: '-1', kh: '1', kl: 'us-en', kp: '1', k1: '-1' })
  const headers = { ...baseHeaders(userAgent), 'Content-Type': 'application/x-www-form-urlencoded' }
  const response = await fetch(url, { method: 'POST', headers, body })

  if (!response.ok) throw new Error(response.status + ' ' + response.statusText)

  const html = await response.text()
  detectBlock('DuckDuckGo', html, BLOCK_MARKERS)

  return html
}

// Snippets line up with links by position, and a result can lack one.
const parseResults = (html: string, frontend: Frontend): DdgResult[] => {
  const doc = makeDom(html, frontend.url)
  const snippets = Array.from(doc.querySelectorAll(frontend.snippet))

  return Array.from(doc.querySelectorAll(frontend.link)).flatMap((link, i) => {
    const title = link.textContent.trim()
    const url = link.getAttribute('href')
    const abstract = snippets[i]?.textContent.trim() ?? ''

    return title && url ? [{ title, url, abstract }] : []
  })
}

export const ddgSearch = async ({ fetch, cache }: Deps, query: string): Promise<DdgResult[]> => {
  const cacheKey = 'ddg:' + query

  const cached = await cache.get<DdgResult[]>(cacheKey)
  if (cached) return cached

  const strategyOf = (name: string, frontend: Frontend): Strategy<DdgResult> => ({
    name,
    run: async (userAgent) => parseResults(await fetchDdg({ fetch, url: frontend.url, query, userAgent }), frontend),
  })

  const results = await runStrategies([strategyOf('ddg-html', HTML_FRONTEND), strategyOf('ddg-lite', LITE_FRONTEND)])

  await cache.set(cacheKey, results)

  return results
}
