import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { bskySearch } from './bsky-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

const depsAnswering = (response: () => Response, urls: string[] = []): Deps => ({
  fetch: async (url) => {
    urls.push(String(url))
    return response()
  },
  cache: emptyCache(),
})

const json = (body: unknown): (() => Response) => {
  return () => Response.json(body)
}

const post = {
  uri: 'at://p',
  cid: 'c',
  author: { did: 'did:plc:a', handle: 'alice.test', displayName: 'Alice' },
  record: { text: 'hello', createdAt: '2025-01-01T00:00:00.000Z' },
  likeCount: 1,
  repostCount: 2,
  replyCount: 3,
}

describe('bskySearch', () => {
  it('returns the posts with the total and cursor Bluesky gives', { meta: { steps: 14 } }, async () => {
    const result = await bskySearch(depsAnswering(json({ posts: [post], hitsTotal: 40, cursor: 'next' })), { query: 'q' })

    expect(result).toEqual({ posts: [post], hitsTotal: 40, cursor: 'next' })
  })

  it('fills missing counts and fields with defaults', { meta: { steps: 14 } }, async () => {
    const bare = { author: { handle: 'bob.test' }, record: { text: 'hi' } }

    const result = await bskySearch(depsAnswering(json({ posts: [bare] })), { query: 'q' })

    expect(result).toEqual({
      posts: [
        {
          uri: '',
          cid: '',
          author: { did: '', handle: 'bob.test', displayName: '' },
          record: { text: 'hi', createdAt: '' },
          likeCount: 0,
          repostCount: 0,
          replyCount: 0,
        },
      ],
      hitsTotal: 1,
      cursor: '',
    })
  })

  it('drops posts without a handle or text', { meta: { steps: 16 } }, async () => {
    const posts = [{ author: { handle: '' }, record: { text: 'x' } }, { author: { handle: 'a' }, record: { text: '' } }, post]

    const result = await bskySearch(depsAnswering(json({ posts })), { query: 'q' })

    expect(result.posts).toEqual([post])
  })

  it('sends only the query by default', { meta: { steps: 12 } }, async () => {
    const urls: string[] = []

    await bskySearch(depsAnswering(json({ posts: [] }), urls), { query: 'a b' })

    expect(urls).toEqual(['https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=a+b'])
  })

  it('sends the sort and limit when given', { meta: { steps: 12 } }, async () => {
    const urls: string[] = []

    await bskySearch(depsAnswering(json({ posts: [] }), urls), { query: 'q', sort: 'top', limit: 5 })

    expect(urls).toEqual(['https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=q&sort=top&limit=5'])
  })

  it('throws the status and body of a failed search', { meta: { steps: 10 } }, async () => {
    const deps = depsAnswering(() => new Response('bad query', { status: 400 }))

    await expect(bskySearch(deps, { query: 'q' })).rejects.toThrow('Bluesky search error (400): bad query')
  })

  it('throws on an answer without posts', { meta: { steps: 10 } }, async () => {
    await expect(bskySearch(depsAnswering(json({ hitsTotal: 1 })), { query: 'q' })).rejects.toThrow()
  })

  it('caches a page with posts under the default sort and limit', { meta: { steps: 20 } }, async () => {
    const urls: string[] = []
    const deps = depsAnswering(json({ posts: [post] }), urls)

    await bskySearch(deps, { query: 'q' })
    await bskySearch(deps, { query: 'q', sort: 'latest', limit: 25 })

    expect(urls.length).toEqual(1)
  })

  it('caches each sort and limit apart', { meta: { steps: 38 } }, async () => {
    const urls: string[] = []
    const deps = depsAnswering(json({ posts: [post] }), urls)

    await bskySearch(deps, { query: 'q' })
    await bskySearch(deps, { query: 'q', sort: 'top' })
    await bskySearch(deps, { query: 'q', limit: 5 })

    expect(urls.length).toEqual(3)
  })

  it('does not cache an empty page', { meta: { steps: 22 } }, async () => {
    const urls: string[] = []
    const deps = depsAnswering(json({ posts: [] }), urls)

    await bskySearch(deps, { query: 'q' })
    await bskySearch(deps, { query: 'q' })

    expect(urls.length).toEqual(2)
  })
})

describe('bskySearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return Response.json({ posts: [post] })
    },
    cache: createCache({
      file: {
        read: async () => JSON.stringify(store),
        write: async (text) => {
          if (failing) throw new Error('disk full')
          writes.push(text)
        },
      },
      now: () => 0,
    }),
  })

  it('answers from the entry saved under its key', { meta: { steps: 8 } }, async () => {
    const urls: string[] = []
    const deps = depsWith({ 'bsky:q:latest:25': { data: { posts: [], hitsTotal: 7, cursor: 'saved' }, timestamp: 0 } }, [], urls)

    expect(await bskySearch(deps, { query: 'q' })).toEqual({ posts: [], hitsTotal: 7, cursor: 'saved' })
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 26 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await bskySearch(deps, { query: 'q' })
    await bskySearch(deps, { query: 'other' })

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['bsky:q:latest:25', 'bsky:other:latest:25'])
    expect(saved['bsky:q:latest:25'].data).toEqual(first)
  })

  it('still answers when the results cannot be saved', { meta: { steps: 28 } }, async () => {
    const answer = await bskySearch(depsWith({}, [], [], true), { query: 'q' })

    expect(answer).toEqual(await bskySearch(depsWith({}, [], []), { query: 'q' }))
  })
})
