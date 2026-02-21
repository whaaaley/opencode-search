import { describe, expect, it } from 'bun:test'
import { standardSearch } from './standard-search.ts'

describe('standardSearch', () => {
  it('returns document results', async () => {
    const results = await standardSearch('atproto')

    expect(results.documents.length > 0).toEqual(true)
    expect(results.documents[0].title).toBeDefined()
    expect(results.documents[0].url).toBeDefined()
  })
})
