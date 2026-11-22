import type { Deps } from '../deps.ts'

// Not a general web search: the index is news-weighted and reference pages are largely absent.
const GNEWS_URL = 'https://news.google.com/rss/search'

const FEED_HEADERS = { 'User-Agent': '', Accept: 'text/html', 'Accept-Encoding': 'gzip', DNT: '1' }

export type GnewsResult = {
  title: string
  url: string
  abstract: string
  source: string
  date: string
}

// `&amp;` decodes after the other names, so an escaped `&amp;lt;` stays `&lt;` instead of decoding twice.
const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

// Feed titles arrive as 'Headline goes here - Publisher', with the publisher repeated in <source>.
const stripSource = (title: string, source: string): string => {
  const suffix = ' - ' + source
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

// Matches one <item> element whole.
export const itemPattern = /<item>.*?<\/item>/gs

// Matches a CDATA section and captures its text.
export const cdataPattern = /<!\[CDATA\[(.*?)\]\]>/gs

// Reads one tag's text from an item, or '' when the item lacks it.
// Not jsdom: it treats <link> as a void element, so every item parses as having no URL.
const tagOf = (item: string, name: string): string => {
  // Matches the text between the tag's opening, attributes and all, and its close.
  const tagPattern = new RegExp('(?<=<' + name + '[^>]*>).*?(?=</' + name + '>)', 's')
  const value = item.match(tagPattern)?.[0] ?? ''
  return decodeEntities(value.replace(cdataPattern, '$1').trim())
}

// The feed always returns about 100 items, which is ~10k tokens of context for one call.
const DEFAULT_LIMIT = 20

export const gnewsSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<GnewsResult[]> => {
  const cacheKey = 'gnews:' + query

  const cached = await cache.get<GnewsResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const params = new URLSearchParams({ q: query, hl: 'en-US', gl: 'US', ceid: 'US:en' })
  const res = await fetch(GNEWS_URL + '?' + params, { headers: FEED_HEADERS })

  if (!res.ok) throw new Error('Google News returned ' + res.status + ' ' + res.statusText)

  const results: GnewsResult[] = []

  for (const [item] of (await res.text()).matchAll(itemPattern)) {
    const source = tagOf(item, 'source')
    const title = stripSource(tagOf(item, 'title'), source)
    // A news.google.com redirector that only resolves in a browser, reported as-is.
    const url = tagOf(item, 'link')

    if (title && url) results.push({ title, url, abstract: '', source, date: tagOf(item, 'pubDate') })
  }

  void cache.set(cacheKey, results)

  return results.slice(0, limit)
}
