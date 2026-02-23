import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { safe, safeAsync } from './safe.ts'

const CACHE_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.cache')
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

type CacheEntry = {
  data: unknown
  timestamp: number
}

type CacheStore = Record<string, CacheEntry>

let store: CacheStore = {}
let loaded = false

const loadCache = async () => {
  if (loaded) {
    return
  }

  const { data } = await safeAsync(() => readFile(CACHE_FILE, 'utf-8'))

  if (data) {
    const { data: parsed } = safe(() => JSON.parse(data) as CacheStore)
    store = parsed ?? {}
  }

  loaded = true
}

const saveCache = async () => {
  await writeFile(CACHE_FILE, JSON.stringify(store, null, 2))
}

export const get = async <T = unknown>(key: string): Promise<T | null> => {
  await loadCache()

  const entry = store[key]
  if (!entry) {
    return null
  }

  const age = Date.now() - entry.timestamp
  if (age > CACHE_DURATION) {
    delete store[key]
    await saveCache()
    return null
  }

  return entry.data as T
}

export const set = async (key: string, data: unknown): Promise<void> => {
  await loadCache()

  store[key] = {
    data,
    timestamp: Date.now(),
  }

  await saveCache()
}
