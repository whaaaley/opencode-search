import { describe, expect, it } from 'bun:test'
import { get, set } from './cache.ts'

describe('cache', () => {
  it('stores and retrieves data', async () => {
    const testKey = 'test:cache-key'
    const testData = { foo: 'bar', nested: { value: 123 } }

    await set(testKey, testData)
    const result = await get(testKey)

    expect(result).toEqual(testData)
  })
})
