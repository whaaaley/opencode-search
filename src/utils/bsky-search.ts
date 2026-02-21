import * as cache from './cache.ts'

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

export const bskySearch = async (options: BskySearchOptions): Promise<BskySearchResult> => {
  const { query, sort, limit } = options
  const cacheKey = 'bsky:' + query + ':' + (sort ?? 'latest') + ':' + (limit ?? 25)

  const cached = await cache.get<BskySearchResult>(cacheKey)
  if (cached && cached.posts && cached.posts.length > 0) {
    return cached
  }

  const params = new URLSearchParams({ q: query })

  if (sort) {
    params.set('sort', sort)
  }

  if (limit) {
    params.set('limit', String(limit))
  }

  const url = BSKY_API + '?' + params.toString()
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error('Bluesky search error (' + res.status + '): ' + text)
  }

  const json = await res.json()

  if (!json.posts || json.posts.length === 0) {
    throw new Error('Bluesky search returned no results for: ' + query)
  }

  const result: BskySearchResult = {
    posts: json.posts,
    hitsTotal: json.hitsTotal || json.posts.length,
    cursor: json.cursor || '',
  }

  await cache.set(cacheKey, result)

  return result
}
