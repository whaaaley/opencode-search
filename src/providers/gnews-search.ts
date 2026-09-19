import * as cache from '../cache.ts'
import { baseHeaders } from '../strategies.ts'

// Google News' RSS feed, which is a different serving stack from google.com/search and still
// answers a plain HTTP request.
// The web search endpoint does not: it returns a JavaScript wall to every non-browser client
// regardless of TLS fingerprint, headers, cookies or region, so the old ggl-search provider was
// removed rather than repaired.
//
// This is NOT a general web search.
// The index is news and tech-media weighted, so documentation and reference pages are largely
// absent.
// It is good for what is being written about a subject now.
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

  // Parsed with regex rather than jsdom on purpose.
  // jsdom parses this feed as HTML, where <link> is a void element: it closes immediately, its text
  // becomes a sibling node, and every item reads as having no URL.
  // The feed is flat, machine-generated XML, so matching the tags directly is both simpler and more
  // honest than relying on where an HTML parser happens to leave the text.
  for (const match of xml.matchAll(/<item>(.*?)<\/item>/gs)) {
    const item = match[1] ?? ''

    const tag = (name: string): string => {
      const [, value = ''] = item.match(new RegExp('<' + name + '[^>]*>(.*?)</' + name + '>', 's')) ?? []
      return decodeEntities(value.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim())
    }

    const source = tag('source')
    const title = stripSource(tag('title'), source)
    // The feed's <link> is a news.google.com redirector that only resolves in a browser, so it is
    // reported as-is.
    // Claiming to return the publisher's URL would be a lie the agent cannot check.
    const url = tag('link')

    if (title && url) {
      results.push({ title, url, abstract: '', source, date: tag('pubDate') })
    }
  }

  await cache.set(cacheKey, results)

  return results
}
