import { describe, expect, it } from 'bun:test'
import { wikiSearch } from './wiki-search.ts'

describe('wikiSearch', () => {
  it('returns page results', async () => {
    const results = await wikiSearch({ query: 'typescript programming' })

    expect(results.pages.length > 0).toEqual(true)

    const first = results.pages[0]
    if (!first) {
      throw new Error('expected at least one page')
    }
    expect(first.title).toBeDefined()
    expect(first.key).toBeDefined()
    expect(first.excerpt).toBeDefined()
  })
})
