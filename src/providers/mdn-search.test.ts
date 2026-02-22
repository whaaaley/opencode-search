import { describe, expect, it } from 'bun:test'
import { mdnSearch } from './mdn-search.ts'

describe('mdnSearch', () => {
  it('should return MDN documents for a valid query', async () => {
    const results = await mdnSearch({ query: 'fetch' })

    expect(results.documents.length).toBeGreaterThan(0)

    const first = results.documents[0]
    if (!first) {
      throw new Error('Expected at least one document')
    }

    expect(first.title).toBeDefined()
    expect(first.mdn_url).toBeDefined()
    expect(first.summary).toBeDefined()
  })
})
