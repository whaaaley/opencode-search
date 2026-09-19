import { describe, expect, it } from 'bun:test'
import { w3cSearch } from './w3c-search.ts'

describe('w3cSearch', () => {
  it('filters specifications by title', async () => {
    const results = await w3cSearch('CSS')

    expect(results.length).toBeGreaterThan(0)

    const first = results[0]
    if (!first) throw new Error('Expected at least one specification')

    expect(first.title.toLowerCase()).toContain('css')
    expect(first.url).toStartWith('http')
  })

  it('respects the limit', async () => {
    const results = await w3cSearch('CSS', 5)

    expect(results.length).toBeLessThanOrEqual(5)
  })
})
