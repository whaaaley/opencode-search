import { readFile, writeFile } from 'node:fs/promises'
import { safe, safeAsync } from './safe.ts'

export const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000

type CacheEntry = {
  data: unknown
  timestamp: number
}

type CacheStore = Record<string, CacheEntry>

export type CacheFile = {
  read: () => Promise<string>
  write: (text: string) => Promise<void>
}

export const fileAt = (path: string): CacheFile => ({
  read: () => readFile(path, 'utf-8'),
  write: (text) => writeFile(path, text),
})

type CacheInput = {
  file: CacheFile
  now: () => number
}

export type Cache = {
  get: <T>(key: string) => Promise<T | null>
  set: (key: string, data: unknown) => Promise<void>
}

// A missing or unreadable file starts an empty store, so the first search of a fresh install still runs.
const loadStore = async (file: CacheFile): Promise<CacheStore> => {
  const { data: text, error: readError } = await safeAsync(file.read)
  if (readError) return {}

  const { data: parsed, error: parseError } = safe(() => JSON.parse(text) as CacheStore)
  if (parseError) return {}

  return parsed
}

export const createCache = ({ file, now }: CacheInput): Cache => {
  let loading: Promise<CacheStore> | null = null

  const storeOf = (): Promise<CacheStore> => {
    loading ??= loadStore(file)
    return loading
  }

  const save = (store: CacheStore): Promise<void> => file.write(JSON.stringify(store, null, 2))

  return {
    get: async <T>(key: string): Promise<T | null> => {
      const store = await storeOf()
      const entry = store[key]
      if (!entry) return null

      if (now() - entry.timestamp > CACHE_DURATION) {
        delete store[key]
        await save(store)
        return null
      }

      return entry.data as T
    },
    set: async (key: string, data: unknown): Promise<void> => {
      const store = await storeOf()
      store[key] = { data, timestamp: now() }
      await save(store)
    },
  }
}
