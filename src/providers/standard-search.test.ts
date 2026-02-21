import { describe, expect, it } from 'bun:test'
import { standardSearch } from './standard-search.ts'

describe('standardSearch', () => {
  it('returns document results', async () => {
    const results = await standardSearch({ query: 'atproto' })

    expect(results.documents.length > 0).toEqual(true)

    const first = results.documents[0]
    if (!first) {
      throw new Error('expected at least one document')
    }
    expect(first.title).toBeDefined()
    expect(first.url).toBeDefined()
  })
})
