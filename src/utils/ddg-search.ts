import { Readability } from '@mozilla/readability'
import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from './cache.ts'
import { parseResults } from './parse-results.ts'

const DDG_URL = 'https://html.duckduckgo.com/html/'

export const ddgSearch = async (query: string): Promise<string> => {
  const cacheKey = 'ddg:' + query

  const cached = await cache.get(cacheKey)
  if (cached) {
    return cached
  }

  const url = DDG_URL + '?q=' + encodeURIComponent(query)

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
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

  const dom = new JSDOM(html, { url, virtualConsole })
  const doc = dom.window.document

  const reader = new Readability(doc)
  const article = reader.parse()

  if (article && article.textContent) {
    await cache.set(cacheKey, article.textContent)
    return article.textContent
  }

  const result = parseResults(doc)
  if (!result) {
    throw new Error('Could not parse DuckDuckGo results')
  }

  await cache.set(cacheKey, result)

  return result
}
