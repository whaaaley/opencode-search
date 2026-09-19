import { describe, expect, it } from 'bun:test'
import { rfcSearch } from './rfc-search.ts'

describe('rfcSearch', () => {
  it('returns RFCs matching a title query', async () => {
    const results = await rfcSearch('HTTP Semantics')

    expect(results.length).toBeGreaterThan(0)

    const first = results[0]
    if (!first) throw new Error('Expected at least one RFC')

    expect(first.id).toMatch(/^RFC\d+$/)
    expect(first.url).toStartWith('https://www.rfc-editor.org/rfc/')
  })

  it('respects the limit', async () => {
    const results = await rfcSearch('HTTP', 3)

    expect(results.length).toBeLessThanOrEqual(3)
  })
})
