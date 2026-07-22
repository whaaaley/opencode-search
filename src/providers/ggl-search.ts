import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from '../cache.ts'
import { baseHeaders, detectBlock, runStrategies } from '../strategies.ts'

const GOOGLE_URL = 'https://www.google.com/search'
const BRAVE_URL = 'https://search.brave.com/search'
const MOJEEK_URL = 'https://www.mojeek.com/search'

// 'enablejs' / 'Update your browser' are Google's JS-mandatory walls (rolled
// out 2025) — treat them as blocks so the fallback engines get a chance.
const BLOCK_MARKERS = ['sorry/IndexRedirect', 'sorry/index', 'enablejs', 'Update your browser']

export type GoogleResult = {
  title: string
  url: string
  abstract: string
}

// Generate a random base64 string like googler's sei param
const randomSei = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
}

// Extract real URL from Google's /url?q=<real_url>&sa=... redirect wrapper
const unwrapUrl = (href: string): string => {
  if (href.startsWith('/url?')) {
    const params = new URLSearchParams(href.slice(5))
    return params.get('q') ?? href
  }

  return href
}

const searchParams = (query: string): URLSearchParams => (
  new URLSearchParams({
    q: query,
    ie: 'UTF-8',
    oe: 'UTF-8',
    sei: randomSei(),
    num: '10',
    hl: 'en',
    gl: 'us',
  })
)

// Cookie capture and replay, ported from googler: hit the endpoint once,
// keep whatever cookie it sets, and retry with it if we got bounced.
const fetchGoogle = async (query: string, userAgent: string): Promise<string> => {
  const params = searchParams(query)
  const headers: Record<string, string> = {
    ...baseHeaders(userAgent),
    'Connection': 'keep-alive',
  }

  const init = await fetch(GOOGLE_URL + '?' + params, {
    headers,
    redirect: 'manual',
  })

  const location = init.headers.get('location') ?? ''
  detectBlock('Google', location, BLOCK_MARKERS)

  const setCookie = init.headers.get('set-cookie')
  if (setCookie) {
    const [cookie = ''] = setCookie.split(';')
    headers['Cookie'] = cookie
  }

  const res = init.redirected || init.status >= 300
    ? await fetch(GOOGLE_URL + '?' + params, { headers })
    : init

  if (!res.ok) {
    throw new Error(res.status + ' ' + res.statusText)
  }

  const html = await res.text()
  detectBlock('Google', html, BLOCK_MARKERS)

  return html
}

const parseResults = (html: string): GoogleResult[] => {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {
    // Silently ignore JSDOM errors
  })

  const dom = new JSDOM(html, { url: GOOGLE_URL, virtualConsole })
  const doc = dom.window.document

  // Google result containers: div.g
  // WARNING: Google changes class names periodically — these selectors are fragile
  const containers = doc.querySelectorAll('div.g')
  const results: GoogleResult[] = []

  for (const container of containers) {
    const anchor = container.querySelector('a')
    const heading = container.querySelector('a > h3')
    const snippet = container.querySelector('div.IsZvec') ?? container.querySelector('[data-sncf]')

    const title = heading?.textContent?.trim() ?? ''
    const rawHref = anchor?.getAttribute('href') ?? ''
    const url = unwrapUrl(rawHref)
    const abstract = snippet?.textContent?.trim() ?? ''

    if (title && url && url.startsWith('http')) {
      results.push({ title, url, abstract })
    }
  }

  return results
}

const makeDom = (html: string, url: string): Document => {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {
    // Silently ignore JSDOM errors
  })

  return new JSDOM(html, { url, virtualConsole }).window.document
}

const fetchHtml = async (url: string, userAgent: string): Promise<string> => {
  const res = await fetch(url, { headers: baseHeaders(userAgent) })

  if (!res.ok) {
    throw new Error(res.status + ' ' + res.statusText)
  }

  return res.text()
}

const braveSearch = async (query: string, userAgent: string): Promise<GoogleResult[]> => {
  const html = await fetchHtml(BRAVE_URL + '?q=' + encodeURIComponent(query), userAgent)
  const doc = makeDom(html, BRAVE_URL)

  const containers = doc.querySelectorAll('div.snippet[data-type="web"]')
  const results: GoogleResult[] = []

  for (const container of containers) {
    const anchor = container.querySelector('a')
    const title = container.querySelector('.title')?.textContent?.trim() ?? ''
    const url = anchor?.getAttribute('href') ?? ''
    const abstract = container.querySelector('.generic-snippet .content')?.textContent?.trim() ?? ''

    if (title && url.startsWith('http')) {
      results.push({ title, url, abstract })
    }
  }

  return results
}

const mojeekSearch = async (query: string, userAgent: string): Promise<GoogleResult[]> => {
  const html = await fetchHtml(MOJEEK_URL + '?q=' + encodeURIComponent(query), userAgent)
  const doc = makeDom(html, MOJEEK_URL)

  const items = doc.querySelectorAll('ul.results-standard li')
  const results: GoogleResult[] = []

  for (const item of items) {
    const anchor = item.querySelector('h2 a.title')
    const title = anchor?.textContent?.trim() ?? ''
    const url = anchor?.getAttribute('href') ?? ''
    const abstract = item.querySelector('p.s')?.textContent?.trim() ?? ''

    if (title && url.startsWith('http')) {
      results.push({ title, url, abstract })
    }
  }

  return results
}

export const googleSearch = async (query: string): Promise<GoogleResult[]> => {
  const cacheKey = 'ggl:' + query

  const cached = await cache.get<GoogleResult[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Google mandates JavaScript for search as of 2025, so the direct scrape
  // (googler's approach) usually hits a block marker now. Brave and Mojeek
  // serve server-rendered HTML and act as stand-ins when it does.
  const results = await runStrategies([
    { name: 'ggl-direct', run: (userAgent) => fetchGoogle(query, userAgent).then(parseResults) },
    { name: 'ggl-brave', run: (userAgent) => braveSearch(query, userAgent) },
    { name: 'ggl-mojeek', run: (userAgent) => mojeekSearch(query, userAgent) },
  ])

  await cache.set(cacheKey, results)

  return results
}
