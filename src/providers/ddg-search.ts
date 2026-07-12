import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from '../cache.ts'
import { getProxyCacheScope, getProxyStatus, isTorProxy, proxyFetch } from '../proxy.ts'

const DDG_URL = 'https://html.duckduckgo.com/html/'
const DDG_ONION_URL = 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/html'
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type DdgResult = {
  title: string
  url: string
  abstract: string
}

export const ddgSearch = async (query: string): Promise<DdgResult[]> => {
  const cacheKey = getProxyCacheScope() + 'ddg:' + query

  const cached = await cache.get<DdgResult[]>(cacheKey)
  if (cached) {
    return cached
  }

  const params = new URLSearchParams({
    q: query,
    b: '',
    kf: '-1',
    kh: '1',
    kl: 'us-en',
    kp: '1',
    k1: '-1',
  })
  const useOnion = await isTorProxy()
  let responseUrl = useOnion ? DDG_ONION_URL : DDG_URL
  let response = useOnion
    ? await fetchOnion(params)
    : await fetchClearnet(params)

  if (response.status === 403 && getProxyStatus().proxyType === 'socks') {
    const blockedHtml = await response.text()
    if (blockedHtml.includes('detected that you have connected over Tor')) {
      responseUrl = DDG_ONION_URL
      response = await fetchOnion(params)
    }
  }

  if (!response.ok) {
    throw new Error(response.status + ' ' + response.statusText)
  }

  const html = await response.text()

  // Detect CAPTCHA
  if (html.includes('anomaly-modal') || html.includes('Please try again')) {
    throw new Error('DuckDuckGo returned a CAPTCHA. Try again later.')
  }

  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {
    // Silently ignore JSDOM errors
  })

  const dom = new JSDOM(html, { url: responseUrl, virtualConsole })
  const doc = dom.window.document

  const links = doc.querySelectorAll('.result__a')
  const snippets = doc.querySelectorAll('.result__snippet')

  const results: DdgResult[] = []

  for (let i = 0; i < links.length; i++) {
    const link = links[i]
    if (!link) {
      continue
    }

    const title = link.textContent?.trim() ?? ''
    const href = normalizeResultUrl(link.getAttribute('href') ?? '', responseUrl)
    const abstract = snippets[i]?.textContent?.trim() ?? ''

    if (title && href) {
      results.push({ title, url: href, abstract })
    }
  }

  await cache.set(cacheKey, results)

  return results
}

const fetchClearnet = (params: URLSearchParams) =>
  proxyFetch(DDG_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/x-www-form-urlencoded',
      'DNT': '1',
    },
    body: params,
  })

const fetchOnion = (params: URLSearchParams) =>
  proxyFetch(DDG_ONION_URL + '?' + params.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip',
      'DNT': '1',
    },
  })

const normalizeResultUrl = (href: string, baseUrl: string): string => {
  if (!href) return ''

  try {
    const url = new URL(href, baseUrl)
    return url.searchParams.get('uddg') ?? url.toString()
  } catch {
    return href
  }
}
