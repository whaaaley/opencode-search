import * as cache from '../utils/cache.ts'
import { isArray, isNumber, isRecord, isString } from '../utils/guards.ts'

const BSKY_API = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts'

type BskyAuthor = {
  did: string
  handle: string
  displayName: string
}

type BskyRecord = {
  text: string
  createdAt: string
}

type BskyPost = {
  uri: string
  cid: string
  author: BskyAuthor
  record: BskyRecord
  likeCount: number
  repostCount: number
  replyCount: number
}

export type BskySearchResult = {
  posts: Array<BskyPost>
  hitsTotal: number
  cursor: string
}

type BskySearchOptions = {
  query: string
  sort?: string
  limit?: number
}

const parseAuthor = (raw: unknown): BskyAuthor | null => {
  if (!isRecord(raw)) {
    return null
  }

  const did = isString(raw.did) ? raw.did : ''
  const handle = isString(raw.handle) ? raw.handle : ''
  const displayName = isString(raw.displayName) ? raw.displayName : ''

  if (!handle) {
    return null
  }

  return { did, handle, displayName }
}

const parseRecord = (raw: unknown): BskyRecord | null => {
  if (!isRecord(raw)) {
    return null
  }

  const text = isString(raw.text) ? raw.text : ''
  const createdAt = isString(raw.createdAt) ? raw.createdAt : ''

  if (!text) {
    return null
  }

  return { text, createdAt }
}

const parsePost = (raw: unknown): BskyPost | null => {
  if (!isRecord(raw)) {
    return null
  }

  const uri = isString(raw.uri) ? raw.uri : ''
  const cid = isString(raw.cid) ? raw.cid : ''

  const author = parseAuthor(raw.author)
  if (!author) {
    return null
  }

  const record = parseRecord(raw.record)
  if (!record) {
    return null
  }

  return {
    uri,
    cid,
    author,
    record,
    likeCount: isNumber(raw.likeCount) ? raw.likeCount : 0,
    repostCount: isNumber(raw.repostCount) ? raw.repostCount : 0,
    replyCount: isNumber(raw.replyCount) ? raw.replyCount : 0,
  }
}

export const bskySearch = async (options: BskySearchOptions): Promise<BskySearchResult> => {
  const cacheKey = [
    'bsky',
    options.query,
    options.sort ?? 'latest',
    options.limit ?? 25,
  ].join(':')

  const cached = await cache.get<BskySearchResult>(cacheKey)
  if (cached && cached.posts && cached.posts.length > 0) {
    return cached
  }

  const params = new URLSearchParams({ q: options.query })

  if (options.sort) {
    params.set('sort', options.sort)
  }

  if (options.limit) {
    params.set('limit', String(options.limit))
  }

  const url = BSKY_API + '?' + params.toString()
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error('Bluesky search error (' + res.status + '): ' + text)
  }

  const json: unknown = await res.json()

  if (!isRecord(json) || !isArray(json.posts)) {
    throw new Error('Bluesky returned an unexpected response shape')
  }

  const posts: Array<BskyPost> = []
  for (const raw of json.posts) {
    const post = parsePost(raw)
    if (post) {
      posts.push(post)
    }
  }

  if (posts.length === 0) {
    throw new Error('Bluesky search returned no results for: ' + options.query)
  }

  const hitsTotal = isNumber(json.hitsTotal) ? json.hitsTotal : posts.length
  const cursor = isString(json.cursor) ? json.cursor : ''

  const result: BskySearchResult = { posts, hitsTotal, cursor }
  await cache.set(cacheKey, result)

  return result
}
