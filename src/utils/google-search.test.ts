import { describe, expect, it } from 'bun:test'
import { googleSearch } from './google-search.ts'

describe('googleSearch', () => {
  it('returns search results', async () => {
    const results = await googleSearch('OpenAI')

    expect(results.kind).toEqual('customsearch#search')
    expect(results.items.length > 0).toEqual(true)
  })
})
