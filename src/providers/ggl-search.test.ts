import { describe, expect, it } from 'bun:test'
import { googleSearch } from './ggl-search.ts'

describe('googleSearch', () => {
  it('returns structured results', async () => {
    const results = await googleSearch('typescript programming language')

    expect(Array.isArray(results)).toEqual(true)
    expect(results.length > 0).toEqual(true)

    expect(typeof results[0].title).toEqual('string')
    expect(typeof results[0].url).toEqual('string')
    expect(typeof results[0].abstract).toEqual('string')
  })
})
