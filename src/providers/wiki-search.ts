import * as cache from '../utils/cache.ts'
import { isArray, isNumber, isRecord, isString } from '../utils/guards.ts'
import { USER_AGENT } from '../utils/user-agent.ts'

const WIKI_API = 'https://en.wikipedia.org/w/rest.php/v1/search/page'

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

const parseThumbnail = (raw: unknown): WikiThumbnail | null => {
  if (!isRecord(raw)) {
    return null
  }

  if (!isString(raw.url) || !isNumber(raw.width) || !isNumber(raw.height)) {
    return null
  }

  return { url: raw.url, width: raw.width, height: raw.height }
}

const parsePage = (raw: unknown): WikiPage | null => {
  if (!isRecord(raw)) {
    return null
  }

  const id = isNumber(raw.id) ? raw.id : 0
  const key = isString(raw.key) ? raw.key : ''
  const title = isString(raw.title) ? raw.title : ''
  const excerpt = isString(raw.excerpt) ? stripTags(raw.excerpt) : ''

  if (!key || !title) {
    return null
  }

  return {
    id,
    key,
    title,
    excerpt,
    description: isString(raw.description) ? raw.description : null,
    matched_title: isString(raw.matched_title) ? raw.matched_title : null,
    thumbnail: parseThumbnail(raw.thumbnail),
  }
}

export const wikiSearch = async (options: WikiSearchOptions): Promise<WikiSearchResult> => {
  const cacheKey = 'wiki:' + options.query + ':' + (options.limit ?? 10)

  const cached = await cache.get<WikiSearchResult>(cacheKey)
  if (cached && cached.pages && cached.pages.length > 0) {
    return cached
  }

  const params = new URLSearchParams({ q: options.query })

  if (options.limit) {
    params.set('limit', String(options.limit))
  }

  const url = WIKI_API + '?' + params.toString()
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error('Wikipedia search error (' + res.status + '): ' + text)
  }

  const json: unknown = await res.json()

  if (!isRecord(json) || !isArray(json.pages)) {
    throw new Error('Wikipedia returned an unexpected response shape')
  }

  const pages: Array<WikiPage> = []
  for (const raw of json.pages) {
    const page = parsePage(raw)
    if (page) {
      pages.push(page)
    }
  }

  if (pages.length === 0) {
    throw new Error('Wikipedia search returned no results for: ' + options.query)
  }

  const result: WikiSearchResult = { pages }
  await cache.set(cacheKey, result)

  return result
}
