import { describe, expect, it } from 'vite-plus/test'
import { safe, safeAsync } from './safe.ts'

describe('safe', () => {
  it('returns data on success', { meta: { steps: 0 } }, () => {
    const result = safe(() => 42)

    expect(result.data).toEqual(42)
    expect(result.error).toEqual(null)
  })

  it('returns data for string values', { meta: { steps: 0 } }, () => {
    const result = safe(() => 'hello')

    expect(result.data).toEqual('hello')
    expect(result.error).toEqual(null)
  })

  it('returns error when function throws an Error', { meta: { steps: 1 } }, () => {
    const result = safe(() => {
      throw new Error('boom')
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('boom')
  })

  it('wraps non-Error throws in an Error', { meta: { steps: 1 } }, () => {
    const result = safe(() => {
      throw 'string error'
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('string error')
  })

  it('wraps a thrown symbol in an Error', { meta: { steps: 1 } }, () => {
    const result = safe(() => {
      throw Symbol('odd')
    })

    expect(result.error?.message).toEqual('Symbol(odd)')
  })

  it('returns null data as success', { meta: { steps: 0 } }, () => {
    const result = safe(() => null)

    expect(result.data).toEqual(null)
    expect(result.error).toEqual(null)
  })

  it('returns undefined data as success', { meta: { steps: 0 } }, () => {
    const result = safe(() => undefined)

    expect(result.data).toEqual(undefined)
    expect(result.error).toEqual(null)
  })
})

describe('safeAsync', () => {
  it('returns data on success', { meta: { steps: 0 } }, async () => {
    const result = await safeAsync(() => Promise.resolve(42))

    expect(result.data).toEqual(42)
    expect(result.error).toEqual(null)
  })

  it('returns error when promise rejects with Error', { meta: { steps: 1 } }, async () => {
    const result = await safeAsync(() => Promise.reject(new Error('async boom')))

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('async boom')
  })

  it('wraps non-Error rejections in an Error', { meta: { steps: 1 } }, async () => {
    const result = await safeAsync(() => Promise.reject('string rejection'))

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('string rejection')
  })

  it('wraps a rejected symbol in an Error', { meta: { steps: 1 } }, async () => {
    const result = await safeAsync(() => Promise.reject(Symbol('odd')))

    expect(result.error?.message).toEqual('Symbol(odd)')
  })

  it('returns error when async function throws', { meta: { steps: 1 } }, async () => {
    const result = await safeAsync(async () => {
      throw new Error('thrown in async')
    })

    expect(result.data).toEqual(null)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toEqual('thrown in async')
  })
})
