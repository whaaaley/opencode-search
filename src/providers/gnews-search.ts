import * as cache from '../cache.ts'
import { baseHeaders } from '../strategies.ts'

// Not a general web search: the index is news-weighted and reference pages are largely absent.
const GNEWS_URL = 'https://news.google.com/rss/search'

export type GnewsResult = {
  title: string
  url: string
  abstract: string
  source: string
  date: string
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
}

const decodeEntities = (value: string): string => (
  value.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (match) => ENTITIES[match] ?? match)
)

// Feed titles arrive as 'Headline goes here - Publisher', with the publisher repeated in <source>.
const stripSource = (title: string, source: string): string => {
  const suffix = ' - ' + source
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

export const gnewsSearch = async (query: string): Promise<GnewsResult[]> => {
  const cacheKey = 'gnews:' + query

  const cached = await cache.get<GnewsResult[]>(cacheKey)
  if (cached) return cached

  const params = new URLSearchParams({ q: query, hl: 'en-US', gl: 'US', ceid: 'US:en' })
  const res = await fetch(GNEWS_URL + '?' + params, { headers: baseHeaders('') })

  if (!res.ok) throw new Error('Google News returned ' + res.status + ' ' + res.statusText)

  const xml = await res.text()
  const results: GnewsResult[] = []

  // Matches one <item> element and captures its body.
  // Not jsdom: it treats <link> as a void element, so every item parses as having no URL.
  for (const match of xml.matchAll(/<item>(.*?)<\/item>/gs)) {
    const item = match[1] ?? ''

    const tag = (name: string): string => {
      const [, value = ''] = item.match(new RegExp('<' + name + '[^>]*>(.*?)</' + name + '>', 's')) ?? []
      return decodeEntities(value.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim())
    }

    const source = tag('source')
    const title = stripSource(tag('title'), source)
    // A news.google.com redirector that only resolves in a browser, reported as-is.
    const url = tag('link')

    if (title && url) {
      results.push({ title, url, abstract: '', source, date: tag('pubDate') })
    }
  }

  await cache.set(cacheKey, results)

  return results
}
