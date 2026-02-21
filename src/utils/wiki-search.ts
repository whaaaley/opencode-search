import * as cache from './cache.ts'

const WIKI_API = 'https://en.wikipedia.org/w/rest.php/v1/search/page'

const USER_AGENT = 'opencode-search/0.1 (https://github.com/anomalyco/opencode-search)'

type WikiThumbnail = {
  url: string
  width: number
  height: number
}

type WikiPage = {
  id: number
  key: string
  title: string
  excerpt: string
  description: string | null
  matched_title: string | null
  thumbnail: WikiThumbnail | null
}

export type WikiSearchResult = {
  pages: Array<WikiPage>
}

type WikiSearchOptions = {
  query: string
  limit?: number
}

const stripTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '')
}

export const wikiSearch = async (options: WikiSearchOptions): Promise<WikiSearchResult> => {
  const { query, limit } = options
  const cacheKey = 'wiki:' + query + ':' + (limit ?? 10)

  const cached = await cache.get<WikiSearchResult>(cacheKey)
  if (cached && cached.pages && cached.pages.length > 0) {
    return cached
  }

  const params = new URLSearchParams({ q: query })

  if (limit) {
    params.set('limit', String(limit))
  }

  const url = WIKI_API + '?' + params.toString()
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error('Wikipedia search error (' + res.status + '): ' + text)
  }

  const json = await res.json()

  if (!json.pages || json.pages.length === 0) {
    throw new Error('Wikipedia search returned no results for: ' + query)
  }

  const pages: Array<WikiPage> = json.pages.map((p: WikiPage) => ({
    id: p.id,
    key: p.key,
    title: p.title,
    excerpt: stripTags(p.excerpt),
    description: p.description,
    matched_title: p.matched_title,
    thumbnail: p.thumbnail,
  }))

  const result: WikiSearchResult = { pages }

  await cache.set(cacheKey, result)

  return result
}
