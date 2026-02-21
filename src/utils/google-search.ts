import { env } from './env.ts'
import * as cache from './cache.ts'

export type SearchRequestInfo = {
  title: string
  totalResults: string
  searchTerms: string
  count: number
  startIndex: number
  inputEncoding: string
  outputEncoding: string
  safe: string
  cx: string
}

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

export type SearchQueries = {
  request: Array<SearchRequestInfo>
}

export type SearchUrl = {
  type: string
  template: string
}

export type SearchResult = {
  kind: string
  url: SearchUrl
  queries: SearchQueries
  items: Array<SearchItem>
}

const buildUrl = (baseUrl: string, params: Record<string, string>): string => {
  return baseUrl + '?' + new URLSearchParams(params).toString()
}

const BLOCKED_HOSTS = ['twitter.com', 'mobile.twitter.com']

export const googleSearch = async (query: string): Promise<SearchResult> => {
  const cacheKey = 'search:' + query

  const cached = await cache.get(cacheKey)
  if (cached && cached.items?.length > 0) {
    return cached
  }

  const url = buildUrl('https://www.googleapis.com/customsearch/v1', {
    key: env.GOOGLE_SEARCH_API_KEY,
    cx: env.GOOGLE_SEARCH_ENGINE_ID,
    q: query,
  })

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const json = await res.json()

  if (!res.ok) {
    const errorMessage = json.error?.message || 'Unknown error'
    const errorCode = json.error?.code || res.status
    throw new Error('Google Search API error (' + errorCode + '): ' + errorMessage)
  }

  if (!json.items || json.items.length === 0) {
    throw new Error('Google Search returned no results for: ' + query)
  }

  // Filter blocked domains after the initial empty check
  const filtered = json.items.filter((item: SearchItem) => {
    return !BLOCKED_HOSTS.includes(new URL(item.link).hostname)
  })

  if (filtered.length === 0) {
    throw new Error('Google Search returned results but all were from blocked domains for: ' + query)
  }

  const result: SearchResult = { ...json, items: filtered }
  await cache.set(cacheKey, result)

  return result
}
