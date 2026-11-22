import type { Deps } from '../deps.ts'
import { fetchHtml, makeDom, type SearchResult } from '../html.ts'
import { detectBlock, nextUserAgent } from '../strategies.ts'

const BRAVE_URL = 'https://search.brave.com/search'

// A challenge returns HTTP 200, so without this a block reads as an empty result set.
// Only phrases unique to it: a bare 'captcha' also matches normal results pages.
const BLOCK_MARKERS = ['Verifying you are human', 'challenge-error']

export type BraveResult = SearchResult

const textOf = (element: Element | null): string => element?.textContent.trim() ?? ''

export const braveSearch = async ({ fetch, cache }: Deps, query: string): Promise<BraveResult[]> => {
  const cacheKey = 'brave:' + query

  const cached = await cache.get<BraveResult[]>(cacheKey)
  if (cached) return cached

  const html = await fetchHtml({ fetch, url: BRAVE_URL + '?q=' + encodeURIComponent(query), userAgent: nextUserAgent() })
  detectBlock('Brave', html, BLOCK_MARKERS)

  const doc = makeDom(html, BRAVE_URL)
  const results: BraveResult[] = []

  for (const container of doc.querySelectorAll('div.snippet[data-type="web"]')) {
    const title = textOf(container.querySelector('.title'))
    const url = container.querySelector('a')?.getAttribute('href')
    const abstract = textOf(container.querySelector('.generic-snippet .content'))

    if (title && url?.startsWith('http')) results.push({ title, url, abstract })
  }

  await cache.set(cacheKey, results)

  return results
}
