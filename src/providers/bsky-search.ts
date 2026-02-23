import { z } from 'zod'
import * as cache from '../cache.ts'

const BSKY_API = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts'

const authorSchema = z.object({
  did: z.string().default(''),
  handle: z.string().min(1),
  displayName: z.string().default(''),
})

const recordSchema = z.object({
  text: z.string().min(1),
  createdAt: z.string().default(''),
})

const postSchema = z.object({
  uri: z.string().default(''),
  cid: z.string().default(''),
  author: authorSchema,
  record: recordSchema,
  likeCount: z.number().default(0),
  repostCount: z.number().default(0),
  replyCount: z.number().default(0),
})

const responseSchema = z.object({
  posts: z.array(z.unknown()),
  hitsTotal: z.number().optional(),
  cursor: z.string().optional(),
})

type BskyPost = z.infer<typeof postSchema>

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
  const response = responseSchema.parse(json)

  const posts = response.posts.flatMap((raw) => {
    const parsed = postSchema.safeParse(raw)
    return parsed.success ? [parsed.data] : []
  })

  const hitsTotal = response.hitsTotal ?? posts.length
  const cursor = response.cursor ?? ''

  const result: BskySearchResult = { posts, hitsTotal, cursor }

  if (posts.length > 0) {
    await cache.set(cacheKey, result)
  }

  return result
}
