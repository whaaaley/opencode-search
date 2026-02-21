import { describe, expect, it } from 'bun:test'
import { bskySearch } from './bsky-search.ts'

describe('bskySearch', () => {
  it('returns post results', async () => {
    const results = await bskySearch({ query: 'atproto' })

    expect(results.posts.length > 0).toEqual(true)
    expect(results.posts[0].uri).toBeDefined()
    expect(results.posts[0].author).toBeDefined()
    expect(results.posts[0].record).toBeDefined()
  })
})
