import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { googleSearch } from './google-search.ts'

describe('googleSearch', () => {
  it('returns search results', async () => {
    const results = await googleSearch('OpenAI')

    assertEquals(results.kind, 'customsearch#search')
    assertEquals(results.items.length > 0, true)
  })
})
