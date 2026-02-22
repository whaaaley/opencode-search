import * as cache from '../utils/cache.ts'
import { isArray, isNumber, isRecord, isString } from '../utils/guards.ts'
import { USER_AGENT } from '../utils/user-agent.ts'

const MDN_API = 'https://developer.mozilla.org/api/v1/search'

type MdnDocument = {
  mdn_url: string
  title: string
  summary: string
  slug: string
  locale: string
  popularity: number
}

export type MdnSearchResult = {
  documents: Array<MdnDocument>
  total: number
}

type MdnSearchOptions = {
  query: string
  limit?: number
  page?: number
}

const parseDocument = (raw: unknown): MdnDocument | null => {
  if (!isRecord(raw)) {
    return null
  }

  const mdn_url = isString(raw.mdn_url) ? raw.mdn_url : ''
  const title = isString(raw.title) ? raw.title : ''
  const summary = isString(raw.summary) ? raw.summary : ''
  const slug = isString(raw.slug) ? raw.slug : ''
  const locale = isString(raw.locale) ? raw.locale : 'en-US'
  const popularity = isNumber(raw.popularity) ? raw.popularity : 0

  if (!mdn_url || !title) {
    return null
  }

  return {
    mdn_url,
    title,
    summary,
    slug,
    locale,
    popularity,
  }
}

export const mdnSearch = async (options: MdnSearchOptions): Promise<MdnSearchResult> => {
  const cacheKey = [
    'mdn',
    options.query,
    options.limit ?? 10,
    options.page ?? 1,
  ].join(':')

  const cached = await cache.get<MdnSearchResult>(cacheKey)
  if (cached && cached.documents && cached.documents.length > 0) {
    return cached
  }

  const params = new URLSearchParams({
    q: options.query,
    locale: 'en-US',
  })

  if (options.limit) {
    params.set('size', String(options.limit))
  }

  if (options.page) {
    params.set('page', String(options.page))
  }

  const url = MDN_API + '?' + params.toString()
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error('MDN search error (' + res.status + '): ' + text)
  }

  const json: unknown = await res.json()

  if (!isRecord(json) || !isArray(json.documents)) {
    throw new Error('MDN returned an unexpected response shape')
  }

  const documents: Array<MdnDocument> = []
  for (const raw of json.documents) {
    const doc = parseDocument(raw)
    if (doc) {
      documents.push(doc)
    }
  }

  if (documents.length === 0) {
    throw new Error('MDN search returned no results for: ' + options.query)
  }

  const total = isRecord(json.metadata) && isRecord(json.metadata.total) && isNumber(json.metadata.total.value)
    ? json.metadata.total.value
    : documents.length

  const result: MdnSearchResult = { documents, total }
  await cache.set(cacheKey, result)

  return result
}
