import * as cache from '../cache.ts'
import { fetchHtml, makeDom, type SearchResult } from '../html.ts'
import { detectBlock, nextUserAgent } from '../strategies.ts'

const BRAVE_URL = 'https://search.brave.com/search'

// A challenge returns HTTP 200, so without this a block reads as an empty result set.
// Only phrases unique to it: a bare 'captcha' also matches normal results pages.
const BLOCK_MARKERS = ['Verifying you are human', 'challenge-error']

export type BraveResult = SearchResult

export const braveSearch = async (query: string): Promise<BraveResult[]> => {
  const cacheKey = 'brave:' + query

  const cached = await cache.get<BraveResult[]>(cacheKey)
  if (cached) return cached

  const html = await fetchHtml(BRAVE_URL + '?q=' + encodeURIComponent(query), nextUserAgent())
  detectBlock('Brave', html, BLOCK_MARKERS)

  const doc = makeDom(html, BRAVE_URL)

  const containers = doc.querySelectorAll('div.snippet[data-type="web"]')
  const results: BraveResult[] = []

  for (const container of containers) {
    const anchor = container.querySelector('a')
    const title = container.querySelector('.title')?.textContent?.trim() ?? ''
    const url = anchor?.getAttribute('href') ?? ''
    const abstract = container.querySelector('.generic-snippet .content')?.textContent?.trim() ?? ''

    if (title && url.startsWith('http')) results.push({ title, url, abstract })
  }

  await cache.set(cacheKey, results)

  return results
}
