import * as cache from './cache.ts'
import { env } from './env.ts'

export type SearchItem = {
  kind: string
  title: string
  htmlTitle: string
  link: string
  displayLink: string
  snippet: string
  htmlSnippet: string
  formattedUrl: string
  htmlFormattedUrl: string
}

type SearchQuery = {
  totalResults: string
}

export type SearchResult = {
  kind: string
  queries: Record<string, Array<SearchQuery>>
  items: Array<SearchItem>
}

const buildUrl = (baseUrl: string, params: Record<string, string>): string => {
  return baseUrl + '?' + new URLSearchParams(params).toString()
}

const BLOCKED_HOSTS = ['twitter.com', 'mobile.twitter.com']

export const googleSearch = async (query: string): Promise<SearchResult> => {
  const cacheKey = 'search:' + query

  const cached = await cache.get<SearchResult>(cacheKey)
  if (cached && cached.items && cached.items.length > 0) {
    return cached
  }

  const url = buildUrl('https://www.googleapis.com/customsearch/v1', {
    key: env.GOOGLE_SEARCH_API_KEY,
    cx: env.GOOGLE_SEARCH_ENGINE_ID,
    q: query,
  })

  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(['Google Search API error (', res.status, '): ', text].join(''))
  }

  const json = await res.json()

  if (!json.items || json.items.length === 0) {
    throw new Error('Google Search returned no results for: ' + query)
  }

  // Filter blocked domains after the initial empty check
  const filtered = json.items.filter((item: SearchItem) => {
    return !BLOCKED_HOSTS.includes(new URL(item.link).hostname)
  })

  if (filtered.length === 0) {
    throw new Error('Google Search: all results were from blocked domains for: ' + query)
  }

  const result = { ...json, items: filtered }
  await cache.set(cacheKey, result)

  return result
}
