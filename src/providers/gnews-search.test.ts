import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from '../cache.ts'
import type { Deps } from '../deps.ts'
import { cdataPattern, gnewsSearch, itemPattern } from './gnews-search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

type Call = { url: string; init: RequestInit | undefined }

const depsAnswering = (response: () => Response, calls: Call[] = []): Deps => ({
  fetch: async (url, init) => {
    calls.push({ url: String(url), init })
    return response()
  },
  cache: emptyCache(),
})

const feed = (...items: string[]): (() => Response) => {
  return () => new Response('<rss><channel>' + items.map((item) => '<item>' + item + '</item>').join('\n') + '</channel></rss>')
}

const story = (n: number): string => '<title>Story ' + n + '</title><link>https://news.google.com/' + n + '</link>'

describe('itemPattern', () => {
  it('matches each item across lines', { meta: { steps: 0 } }, () => {
    expect('<item>a\nb</item><x/><item>c</item>'.match(itemPattern)).toEqual(['<item>a\nb</item>', '<item>c</item>'])
  })
})

describe('cdataPattern', () => {
  it('captures the text of each CDATA section', { meta: { steps: 0 } }, () => {
    expect('<![CDATA[a]]> and <![CDATA[b\nc]]>'.replace(cdataPattern, '$1')).toEqual('a and b\nc')
  })
})

describe('gnewsSearch', () => {
  it('reads each item, stripping the publisher from its title', { meta: { steps: 21 } }, async () => {
    const item = '<title>Rust 2.0 - The Register</title><link>https://news.google.com/a</link><pubDate>Fri, 18 Sep 2026</pubDate><source url="https://theregister.com">The Register</source>'

    const results = await gnewsSearch(depsAnswering(feed(item)), 'q')

    expect(results).toEqual([{ title: 'Rust 2.0', url: 'https://news.google.com/a', abstract: '', source: 'The Register', date: 'Fri, 18 Sep 2026' }])
  })

  it('reads a tag whose text spans lines', { meta: { steps: 21 } }, async () => {
    const [result] = await gnewsSearch(depsAnswering(feed('<title>Two\nlines</title><link>https://news.google.com/a</link>')), 'q')

    expect(result?.title).toEqual('Two\nlines')
  })

  it('keeps a title that does not end with its publisher', { meta: { steps: 21 } }, async () => {
    const item = '<title>Rust - Other</title><link>https://news.google.com/a</link><source>The Register</source>'

    const [result] = await gnewsSearch(depsAnswering(feed(item)), 'q')

    expect(result?.title).toEqual('Rust - Other')
  })

  it('unwraps CDATA and decodes entities once', { meta: { steps: 21 } }, async () => {
    const item = '<title><![CDATA[ A &lt;b&gt; &quot;c&quot; &apos;d&apos; &#39;e&#39; &amp;lt; ]]></title><link>https://news.google.com/a</link>'

    const [result] = await gnewsSearch(depsAnswering(feed(item)), 'q')

    expect(result?.title).toEqual("A <b> \"c\" 'd' 'e' &lt;")
  })

  it('leaves the source and date empty when an item lacks them', { meta: { steps: 21 } }, async () => {
    const [result] = await gnewsSearch(depsAnswering(feed(story(1))), 'q')

    expect(result).toEqual({ title: 'Story 1', url: 'https://news.google.com/1', abstract: '', source: '', date: '' })
  })

  it('skips items without a title or link', { meta: { steps: 28 } }, async () => {
    const results = await gnewsSearch(depsAnswering(feed('<link>https://news.google.com/a</link>', '<title>No link</title>')), 'q')

    expect(results).toEqual([])
  })

  it('asks the US English feed with the base headers', { meta: { steps: 9 } }, async () => {
    const calls: Call[] = []

    await gnewsSearch(depsAnswering(feed(), calls), 'a b')

    expect(calls).toEqual([
      {
        url: 'https://news.google.com/rss/search?q=a+b&hl=en-US&gl=US&ceid=US%3Aen',
        init: { headers: { 'User-Agent': '', Accept: 'text/html', 'Accept-Encoding': 'gzip', DNT: '1' } },
      },
    ])
  })

  it('returns twenty items by default', { meta: { steps: 309 } }, async () => {
    const items = Array.from({ length: 25 }, (_, n) => story(n))

    expect((await gnewsSearch(depsAnswering(feed(...items)), 'q')).length).toEqual(20)
  })

  it('returns up to the limit given', { meta: { steps: 68 } }, async () => {
    const items = Array.from({ length: 5 }, (_, n) => story(n))

    expect((await gnewsSearch(depsAnswering(feed(...items)), 'q', 3)).length).toEqual(3)
  })

  it('caches the whole feed and cuts a cached answer to the limit', { meta: { steps: 72 } }, async () => {
    const calls: Call[] = []
    const deps = depsAnswering(feed(...Array.from({ length: 5 }, (_, n) => story(n))), calls)

    await gnewsSearch(deps, 'q', 2)
    const again = await gnewsSearch(deps, 'q', 4)

    expect(calls.length).toEqual(1)
    expect(again.length).toEqual(4)
  })

  it('throws the status of a failed feed', { meta: { steps: 7 } }, async () => {
    const deps = depsAnswering(() => new Response('', { status: 503, statusText: 'Unavailable' }))

    await expect(gnewsSearch(deps, 'q')).rejects.toThrow('Google News returned 503 Unavailable')
  })
})

describe('gnewsSearch cache', () => {
  const depsWith = (store: object, writes: string[], urls: string[], failing = false): Deps => ({
    fetch: async (url) => {
      urls.push(String(url))
      return feed(story(1))()
    },
    cache: createCache({
      file: {
        read: async () => JSON.stringify(store),
        write: async (text) => {
          if (failing) throw new Error('disk full')
          writes.push(text)
        },
      },
      now: () => 0,
    }),
  })

  it('answers from the entry saved under its key', { meta: { steps: 7 } }, async () => {
    const urls: string[] = []
    const deps = depsWith({ 'gnews:q': { data: [{ title: 'saved', url: 'https://s', abstract: '', source: '', date: '' }], timestamp: 0 } }, [], urls)

    expect(await gnewsSearch(deps, 'q')).toEqual([{ title: 'saved', url: 'https://s', abstract: '', source: '', date: '' }])
    expect(urls).toEqual([])
  })

  it('saves the results under its key, apart for each query', { meta: { steps: 40 } }, async () => {
    const writes: string[] = []
    const urls: string[] = []
    const deps = depsWith({}, writes, urls)

    const first = await gnewsSearch(deps, 'q')
    await gnewsSearch(deps, 'other')

    const saved = JSON.parse(writes.at(-1) ?? '{}')
    expect(urls.length).toEqual(2)
    expect(Object.keys(saved)).toEqual(['gnews:q', 'gnews:other'])
    expect(saved['gnews:q'].data).toEqual(first)
  })

  it('fails when the results cannot be saved', async () => {
    await expect(gnewsSearch(depsWith({}, [], [], true), 'q')).rejects.toThrow('disk full')
  })
})
