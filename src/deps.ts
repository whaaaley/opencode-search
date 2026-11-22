import type { Cache } from './cache.ts'

export type Deps = {
  fetch: typeof fetch
  cache: Cache
}
