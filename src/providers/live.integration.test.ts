import { describe, expect, it } from 'vite-plus/test'
import { createCache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { bskySearch } from './bsky-search.ts'
import { mdnSearch } from './mdn-search.ts'
import { rfcSearch } from './rfc-search.ts'
import { w3cSearch } from './w3c-search.ts'
import { whatwgSearch } from './whatwg-search.ts'
import { wikiSearch } from './wiki-search.ts'

const live = (): Deps => ({ fetch, cache: createCache({ file: { read: async () => '{}', write: async () => {} }, now: Date.now }) })

describe('live providers', () => {
  it('finds Bluesky posts', async () => {
    expect((await bskySearch(live(), { query: 'atproto' })).posts.length).toBeGreaterThan(0)
  })

  it('finds MDN documents', async () => {
    expect((await mdnSearch(live(), { query: 'fetch' })).documents.length).toBeGreaterThan(0)
  })

  it('looks up an RFC by number and by title', async () => {
    expect((await rfcSearch(live(), 'RFC9421')).map((result) => result.id)).toEqual(['RFC9421'])
    expect((await rfcSearch(live(), 'HTTP Semantics')).length).toBeGreaterThan(0)
  })

  it('finds W3C specifications by title', async () => {
    expect((await w3cSearch(live(), 'CSS', 5)).length).toEqual(5)
  })

  it('finds a WHATWG standard', async () => {
    expect((await whatwgSearch(live(), 'HTML')).length).toBeGreaterThan(0)
  })

  it('finds Wikipedia pages', async () => {
    expect((await wikiSearch(live(), { query: 'typescript programming' })).pages.length).toBeGreaterThan(0)
  })
})
