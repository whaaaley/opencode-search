import { describe, expect, it } from 'bun:test'
import { standardSearch } from './standard-search.ts'

const isServiceDown = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('Unable to connect') || message.includes('ConnectionRefused')
}

describe('standardSearch', () => {
  it('returns document results', async () => {
    let results
    try {
      results = await standardSearch({ query: 'atproto' })
    } catch (error) {
      // The community appview (standard-search.octet-stream.net) goes down
      // periodically — an unreachable host isn't a bug in this plugin.
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
