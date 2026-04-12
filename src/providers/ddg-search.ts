import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from '../cache.ts'

const DDG_URL = 'https://html.duckduckgo.com/html/'
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type DdgResult = {
  title: string
  url: string
  abstract: string
}

export const ddgSearch = async (query: string): Promise<DdgResult[]> => {
  const cacheKey = 'ddg:' + query

  const cached = await cache.get<DdgResult[]>(cacheKey)
  if (cached) {
    return cached
  }

  const response = await fetch(DDG_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Encoding': 'gzip',
      'Content-Type': 'application/x-www-form-urlencoded',
      'DNT': '1',
    },
    body: new URLSearchParams({
      q: query,
      b: '',
      kf: '-1',
      kh: '1',
      kl: 'us-en',
      kp: '1',
      k1: '-1',
    }),
  })

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

  const dom = new JSDOM(html, { url: DDG_URL, virtualConsole })
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
    const href = link.getAttribute('href') ?? ''
    const abstract = snippets[i]?.textContent?.trim() ?? ''

    if (title && href) {
      results.push({ title, url: href, abstract })
    }
  }

  await cache.set(cacheKey, results)

  return results
}
