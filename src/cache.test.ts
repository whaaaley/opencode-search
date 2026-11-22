import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { CACHE_DURATION, createCache, fileAt, type CacheFile } from './cache.ts'

type FakeFile = CacheFile & { reads: number; writes: string[] }

const fileHolding = (text: string | null): FakeFile => {
  const file: FakeFile = {
    reads: 0,
    writes: [],
    read: async () => {
      file.reads += 1
      if (text === null) throw new Error('ENOENT')
      return text
    },
    write: async (written) => {
      file.writes.push(written)
    },
  }

  return file
}

describe('cache', () => {
  it('returns null for a key it never stored', { meta: { steps: 4 } }, async () => {
    const cache = createCache({ file: fileHolding(null), now: () => 0 })

    expect(await cache.get('missing')).toEqual(null)
  })

  it('stores and retrieves data', { meta: { steps: 6 } }, async () => {
    const cache = createCache({ file: fileHolding(null), now: () => 0 })

    await cache.set('key', { foo: 'bar' })

    expect(await cache.get('key')).toEqual({ foo: 'bar' })
  })

  it('writes the store as two-space JSON with the time it was set', { meta: { steps: 3 } }, async () => {
    const file = fileHolding(null)
    const cache = createCache({ file, now: () => 5 })

    await cache.set('key', 1)

    expect(file.writes).toEqual([JSON.stringify({ key: { data: 1, timestamp: 5 } }, null, 2)])
  })

  it('reads entries already in the file', { meta: { steps: 5 } }, async () => {
    const file = fileHolding(JSON.stringify({ key: { data: 'saved', timestamp: 0 } }))
    const cache = createCache({ file, now: () => 0 })

    expect(await cache.get('key')).toEqual('saved')
  })

  it('treats a file that is not JSON as empty', { meta: { steps: 5 } }, async () => {
    const cache = createCache({ file: fileHolding('{not json'), now: () => 0 })

    expect(await cache.get('key')).toEqual(null)
  })

  it('reads the file once across calls', { meta: { steps: 8 } }, async () => {
    const file = fileHolding('{}')
    const cache = createCache({ file, now: () => 0 })

    await cache.get('a')
    await cache.set('b', 1)
    await cache.get('b')

    expect(file.reads).toEqual(1)
  })

  it('keeps an entry exactly as old as the duration', { meta: { steps: 5 } }, async () => {
    const file = fileHolding(JSON.stringify({ key: { data: 'kept', timestamp: 0 } }))
    const cache = createCache({ file, now: () => CACHE_DURATION })

    expect(await cache.get('key')).toEqual('kept')
    expect(file.writes).toEqual([])
  })

  it('drops and saves away an entry older than the duration', { meta: { steps: 7 } }, async () => {
    const file = fileHolding(JSON.stringify({ key: { data: 'old', timestamp: 0 }, other: { data: 'new', timestamp: CACHE_DURATION } }))
    const cache = createCache({ file, now: () => CACHE_DURATION + 1 })

    expect(await cache.get('key')).toEqual(null)
    expect(file.writes).toEqual([JSON.stringify({ other: { data: 'new', timestamp: CACHE_DURATION } }, null, 2)])
    expect(await cache.get('key')).toEqual(null)
  })

  it('measures age from the time the entry was set', { meta: { steps: 10 } }, async () => {
    const file = fileHolding(JSON.stringify({ key: { data: 'kept', timestamp: 5 } }))

    expect(await createCache({ file, now: () => CACHE_DURATION + 5 }).get('key')).toEqual('kept')
    expect(await createCache({ file, now: () => CACHE_DURATION + 6 }).get('key')).toEqual(null)
  })

  it('still drops an old entry when the file cannot be written', { meta: { steps: 5 } }, async () => {
    const file = fileHolding(JSON.stringify({ key: { data: 'old', timestamp: 0 } }))
    file.write = async (): Promise<void> => {
      throw new Error('disk full')
    }

    expect(await createCache({ file, now: () => CACHE_DURATION + 1 }).get('key')).toEqual(null)
  })

  it('keeps a value in memory when the file cannot be written', { meta: { steps: 6 } }, async () => {
    const file = fileHolding(null)
    file.write = async (): Promise<void> => {
      throw new Error('disk full')
    }
    const cache = createCache({ file, now: () => 0 })

    await cache.set('key', 1)

    expect(await cache.get('key')).toEqual(1)
  })

  it('reads a file on disk as text', { meta: { steps: 0 } }, async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'cache-')), '.cache')
    await fileAt(path).write('{"é":1}')

    expect(await fileAt(path).read()).toEqual('{"é":1}')
  })

  it('keeps the store in a file on disk across caches', { meta: { steps: 8 } }, async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'cache-')), '.cache')

    await createCache({ file: fileAt(path), now: () => 0 }).set('key', 'disk')

    expect(await createCache({ file: fileAt(path), now: () => 0 }).get('key')).toEqual('disk')
    expect(JSON.parse(await readFile(path, 'utf-8'))).toEqual({ key: { data: 'disk', timestamp: 0 } })
  })

  it('starts empty when the file does not exist', { meta: { steps: 4 } }, async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'cache-')), '.cache')

    expect(await createCache({ file: fileAt(path), now: () => 0 }).get('key')).toEqual(null)
  })

  it('lasts seven days', { meta: { steps: 0 } }, () => {
    expect(CACHE_DURATION).toEqual(604800000)
  })
})
