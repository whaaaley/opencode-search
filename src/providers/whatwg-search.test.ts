import { describe, expect, it } from 'bun:test'
import { whatwgSearch } from './whatwg-search.ts'

describe('whatwgSearch', () => {
  it('finds a living standard by name', async () => {
    const results = await whatwgSearch('HTML')

    expect(results.length).toBeGreaterThan(0)

    const first = results[0]
    if (!first) throw new Error('Expected at least one standard')

    expect(first.url).toContain('spec.whatwg.org')
  })

  it('returns nothing for a query that matches no standard', async () => {
    const results = await whatwgSearch('zzzznotastandard')

    expect(results.length).toEqual(0)
  })
})
