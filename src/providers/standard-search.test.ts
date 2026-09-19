import { describe, expect, it } from 'bun:test'
import { safeAsync } from '../safe.ts'
import { standardSearch } from './standard-search.ts'

const isServiceDown = (error: Error): boolean => (
  error.message.includes('Unable to connect') || error.message.includes('ConnectionRefused')
)

describe('standardSearch', () => {
  it('returns document results', async () => {
    const { data: results, error } = await safeAsync(() => standardSearch({ query: 'atproto' }))
    if (error) {
      // An unreachable appview host is a service outage, not a plugin bug
      if (isServiceDown(error)) {
        console.warn('standard-search appview unreachable, skipping live assertion')
        return
      }

      throw error
    }

    expect(results.documents.length > 0).toEqual(true)

    const first = results.documents[0]
    if (!first) {
      throw new Error('expected at least one document')
    }
    expect(first.title).toBeDefined()
    expect(first.url).toBeDefined()
  })
})
