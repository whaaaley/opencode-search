import { describe, expect, it } from 'bun:test'
import { bskySearch } from './bsky-search.ts'

describe('bskySearch', () => {
  it('returns post results', async () => {
    const results = await bskySearch({ query: 'atproto' })

    expect(results.posts.length > 0).toEqual(true)

    const first = results.posts[0]
    if (!first) {
      throw new Error('expected at least one post')
    }
    expect(first.uri).toBeDefined()
    expect(first.author).toBeDefined()
    expect(first.record).toBeDefined()
  })
})
