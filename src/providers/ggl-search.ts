import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from '../cache.ts'
import { getProxyCacheScope, isTorProxy, proxyFetch } from '../proxy.ts'

const GOOGLE_URL = 'https://www.google.com/search'
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

export const googleSearch = async (query: string): Promise<GoogleResult[]> => {
  const cacheKey = getProxyCacheScope() + 'ggl:' + query

  const cached = await cache.get<GoogleResult[]>(cacheKey)
  if (cached) {
    return cached
  }

  if (await isTorProxy()) {
    throw new Error('Google search is unavailable over Tor because Google requires a JavaScript challenge')
  }

  const params = new URLSearchParams({
    q: query,
    ie: 'UTF-8',
    oe: 'UTF-8',
    sei: randomSei(),
    num: '10',
    hl: 'en',
    gl: 'us',
  })

  const headers: Record<string, string> = {
    'Accept': 'text/html',
    'Accept-Encoding': 'gzip',
    'User-Agent': USER_AGENT,
    'Connection': 'keep-alive',
    'DNT': '1',
  }

  // Initial request to capture cookies (like googler does)
  const init = await proxyFetch(GOOGLE_URL + '?' + params, {
    headers,
    redirect: 'manual',
  })

  // Check for block/CAPTCHA redirect
  const location = init.headers.get('location') ?? ''
  if (location.includes('sorry/IndexRedirect') || location.includes('sorry/index')) {
    throw new Error('Google returned a CAPTCHA/block redirect')
  }

  // Capture and replay cookies
  const setCookie = init.headers.get('set-cookie')
  if (setCookie) {
    const [cookie = ''] = setCookie.split(';')
    headers['Cookie'] = cookie
  }

  // Follow through if we got a redirect, otherwise use the initial response
  const res = init.redirected || init.status >= 300
    ? await proxyFetch(GOOGLE_URL + '?' + params, { headers })
    : init

  if (!res.ok) {
    throw new Error(res.status + ' ' + res.statusText)
  }

  const html = await res.text()

  if (html.includes('sorry/IndexRedirect') || html.includes('sorry/index')) {
    throw new Error('Google returned a CAPTCHA/block page')
  }

  if (html.includes('/httpservice/retry/enablejs')) {
    throw new Error('Google requires JavaScript for this network route')
  }

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

  if (results.length === 0) {
    throw new Error('Google returned no parseable results; this network route may be blocked')
  }

  await cache.set(cacheKey, results)

  return results
}
