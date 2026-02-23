import { describe, expect, it } from 'bun:test'
import { safe, safeAsync } from './safe.ts'

describe('safe', () => {
  it('returns data on success', () => {
    const result = safe(() => 42)

    expect(result.data).toEqual(42)
    expect(result.error).toEqual(null)
  })

  it('returns data for string values', () => {
    const result = safe(() => 'hello')

    expect(result.data).toEqual('hello')
    expect(result.error).toEqual(null)
  })

  it('returns error when function throws an Error', () => {
    const result = safe(() => {
      throw new Error('boom')
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('boom')
  })

  it('wraps non-Error throws in an Error', () => {
    const result = safe(() => {
      throw 'string error'
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('string error')
  })

  it('returns null data as success', () => {
    const result = safe(() => null)

    expect(result.data).toEqual(null)
    expect(result.error).toEqual(null)
  })

  it('returns undefined data as success', () => {
    const result = safe(() => undefined)

    expect(result.data).toEqual(undefined)
    expect(result.error).toEqual(null)
  })
})

describe('safeAsync', () => {
  it('returns data on success', async () => {
    const result = await safeAsync(() => Promise.resolve(42))

    expect(result.data).toEqual(42)
    expect(result.error).toEqual(null)
  })

  it('returns error when promise rejects with Error', async () => {
    const result = await safeAsync(() => Promise.reject(new Error('async boom')))

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('async boom')
  })

  it('wraps non-Error rejections in an Error', async () => {
    const result = await safeAsync(() => Promise.reject('string rejection'))

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('string rejection')
  })

  it('returns error when async function throws', async () => {
    const result = await safeAsync(async () => {
      throw new Error('thrown in async')
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('thrown in async')
  })
})
