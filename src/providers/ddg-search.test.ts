import { describe, expect, it } from 'bun:test'
import { ddgSearch } from './ddg-search.ts'

describe('ddgSearch', () => {
  it('returns text content', async () => {
    const result = await ddgSearch('typescript programming language')

    expect(typeof result).toEqual('string')
    expect(result.length > 0).toEqual(true)
  })
})
