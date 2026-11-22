import { describe, expect, it } from 'vite-plus/test'
import { renderBskyPost, renderGnewsItem, renderMdnDoc, renderRfc, renderStandardDoc, renderW3c, renderWebResult, renderWhatwg, renderWikiPage } from './renderers.ts'

describe('renderWebResult', () => {
  it('renders the numbered title, url and normalized abstract', { meta: { steps: 0 } }, () => {
    const result = { title: 'Example', url: 'https://example.com/', abstract: 'An  <b>example</b>' }

    expect(renderWebResult(result, 2)).toBe('3. Example\n   https://example.com/\n   An example')
  })
})

describe('renderGnewsItem', () => {
  const item = {
    title: 'Rust 2.0 announced',
    url: 'https://news.google.com/rss/articles/CBMiabc',
    abstract: '',
    source: 'The Register',
    date: 'Fri, 18 Sep 2026 16:55:50 GMT',
  }

  it('returns three lines: title, source and date, url', { meta: { steps: 3 } }, () => {
    const lines = renderGnewsItem(item, 0).split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('1. Rust 2.0 announced')
    expect(lines[1]).toContain('The Register')
    expect(lines[2]).toContain('news.google.com')
  })

  it('omits the separator when there is no date', { meta: { steps: 1 } }, () => {
    const lines = renderGnewsItem({ ...item, date: '' }, 0).split('\n')

    expect(lines[1]).not.toContain('—')
  })

  it('renders the exact lines with a formatted date', { meta: { steps: 3 } }, () => {
    expect(renderGnewsItem(item, 2)).toBe(['3. Rust 2.0 announced', '   The Register — Sep 18, 2026', '   https://news.google.com/rss/articles/CBMiabc'].join('\n'))
  })

  it('renders only the source when there is no date', { meta: { steps: 1 } }, () => {
    expect(renderGnewsItem({ ...item, date: '' }, 0).split('\n')[1]).toBe('   The Register')
  })
})

describe('renderRfc', () => {
  it('renders the number, title, url and normalized abstract', { meta: { steps: 0 } }, () => {
    const rfc = { id: 'RFC9110', title: 'HTTP Semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110.html', date: '', abstract: 'The  <b>core</b>' }

    expect(renderRfc(rfc, 1)).toBe(['2. RFC9110 — HTTP Semantics', '   https://www.rfc-editor.org/rfc/rfc9110.html', '   The core'].join('\n'))
  })
})

describe('renderW3c', () => {
  it('renders the title and url', { meta: { steps: 0 } }, () => {
    expect(renderW3c({ title: 'CSS Grid', url: 'https://w3.org/TR/css-grid/' }, 2)).toBe('3. CSS Grid\n   https://w3.org/TR/css-grid/')
  })
})

describe('renderWhatwg', () => {
  it('renders the title, url and normalized abstract', { meta: { steps: 0 } }, () => {
    const standard = { title: 'DOM', url: 'https://dom.spec.whatwg.org/', abstract: 'Trees &amp; events', workstream: 'Web' }

    expect(renderWhatwg(standard, 4)).toBe('5. DOM\n   https://dom.spec.whatwg.org/\n   Trees & events')
  })
})

describe('renderBskyPost', () => {
  const post = {
    uri: 'at://did:plc:test/app.bsky.feed.post/abc',
    cid: 'cid123',
    author: {
      did: 'did:plc:test',
      handle: 'alice.bsky.social',
      displayName: 'Alice',
    },
    record: {
      text: 'Hello world from Bluesky!',
      createdAt: '2025-06-15T14:30:00.000Z',
    },
    likeCount: 42,
    repostCount: 7,
    replyCount: 3,
  }

  it('returns three lines', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes index and author handle on first line', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[0]).toContain('1. @alice.bsky.social')
  })

  it('uses 1-based index', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 4).split('\n')
    expect(lines[0]).toMatch(/^5\. @/)
  })

  it('includes formatted date with time on first line', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[0]).toContain('Jun')
    expect(lines[0]).toContain('2025')
    expect(lines[0]).toMatch(/AM|PM/)
  })

  it('includes post text on second line', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[1]).toContain('Hello world from Bluesky!')
  })

  it('includes engagement counts on third line', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[2]).toContain('Likes: 42')
    expect(lines[2]).toContain('Reposts: 7')
    expect(lines[2]).toContain('Replies: 3')
  })

  it('indents second and third lines', { meta: { steps: 2 } }, () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[1]).toMatch(/^ {3}/)
    expect(lines[2]).toMatch(/^ {3}/)
  })
})

describe('renderStandardDoc', () => {
  const doc = { title: 'Relays', url: 'https://x.leaflet.pub/r', snippet: 'How <b>relays</b> work', date: '2026-11-17T14:48:33.000Z', platform: 'leaflet' }

  it('renders the numbered title with its date, the url and the normalized snippet', () => {
    expect(renderStandardDoc(doc, 1)).toBe('2. Relays (Nov 17, 2026)\n   https://x.leaflet.pub/r\n   How relays work')
  })

  it('leaves the date off when there is none', () => {
    expect(renderStandardDoc({ ...doc, date: '' }, 0).split('\n')[0]).toBe('1. Relays')
  })
})

describe('renderWikiPage', () => {
  const described = {
    id: 1,
    key: 'TypeScript',
    title: 'TypeScript',
    excerpt: 'A programming language',
    description: 'Open-source language',
    matched_title: null,
    thumbnail: null,
  }
  const undescribed = { ...described, id: 2, key: 'JavaScript', title: 'JavaScript', excerpt: 'A scripting language', description: null }

  it('includes title and wikipedia url', { meta: { steps: 1 } }, () => {
    const result = renderWikiPage(described, 0)
    expect(result).toContain('1. TypeScript')
    expect(result).toContain('https://en.wikipedia.org/wiki/TypeScript')
  })

  it('includes description when present', { meta: { steps: 1 } }, () => {
    expect(renderWikiPage(described, 0)).toContain('Open-source language')
  })

  it('omits description when null', { meta: { steps: 1 } }, () => {
    expect(renderWikiPage(undescribed, 0)).toBe('1. JavaScript\n   https://en.wikipedia.org/wiki/JavaScript\n   A scripting language')
  })

  it('returns four lines when description is present', { meta: { steps: 1 } }, () => {
    expect(renderWikiPage(described, 0).split('\n')).toHaveLength(4)
  })

  it('uses 1-based index', { meta: { steps: 1 } }, () => {
    expect(renderWikiPage(undescribed, 2)).toMatch(/^3\. /)
  })

  it('indents all lines after the title', { meta: { steps: 1 } }, () => {
    const [, ...rest] = renderWikiPage(described, 0).split('\n')
    for (const line of rest) {
      expect(line).toMatch(/^ {3}/)
    }
  })
})

describe('renderMdnDoc', () => {
  const doc = {
    mdn_url: '/en-US/docs/Web/API/Fetch_API',
    title: 'Fetch API',
    summary: 'The Fetch API provides an interface for fetching resources.',
    slug: 'Web/API/Fetch_API',
    locale: 'en-US',
    popularity: 0.5,
  }

  it('returns three lines: title, url, summary', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes index and title on first line', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[0]).toBe('1. Fetch API')
  })

  it('uses 1-based index', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 4).split('\n')
    expect(lines[0]).toMatch(/^5\. /)
  })

  it('includes full MDN url on second line', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[1]).toContain('https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API')
  })

  it('includes summary on third line', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[2]).toContain('The Fetch API provides an interface for fetching resources.')
  })

  it('indents url and summary lines', { meta: { steps: 0 } }, () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[1]).toMatch(/^ {3}/)
    expect(lines[2]).toMatch(/^ {3}/)
  })
})
