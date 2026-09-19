import { describe, expect, it } from 'bun:test'
import {
  renderBskyPost,
  renderDdgResult,
  renderGnewsItem,
  renderMdnDoc,
  renderWebResult,
  renderWikiPage,
} from './renderers.ts'

describe('renderDdgResult', () => {
  it('returns three lines: title, url, abstract', () => {
    const result = { title: 'TypeScript', url: 'https://typescriptlang.org', abstract: 'A typed superset of JavaScript' }
    const lines = renderDdgResult(result, 0).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('1. TypeScript')
    expect(lines[1]).toContain('https://typescriptlang.org')
    expect(lines[2]).toContain('A typed superset of JavaScript')
  })

  it('uses 1-based index', () => {
    const result = { title: 'Test', url: 'https://example.com', abstract: 'Abstract' }
    const lines = renderDdgResult(result, 4).split('\n')
    expect(lines[0]).toStartWith('5. ')
  })

  it('indents url and abstract lines', () => {
    const result = { title: 'Test', url: 'https://example.com', abstract: 'Abstract' }
    const lines = renderDdgResult(result, 0).split('\n')
    expect(lines[1]).toStartWith('   ')
    expect(lines[2]).toStartWith('   ')
  })
})

describe('renderWebResult', () => {
  it('returns three lines: title, url, abstract', () => {
    const result = { title: 'TypeScript', url: 'https://typescriptlang.org', abstract: 'A typed superset of JavaScript' }
    const lines = renderWebResult(result, 0).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('1. TypeScript')
    expect(lines[1]).toContain('https://typescriptlang.org')
    expect(lines[2]).toContain('A typed superset of JavaScript')
  })

  it('uses 1-based index', () => {
    const result = { title: 'Test', url: 'https://example.com', abstract: 'Abstract' }
    const lines = renderWebResult(result, 4).split('\n')
    expect(lines[0]).toStartWith('5. ')
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

  it('returns three lines: title, source and date, url', () => {
    const lines = renderGnewsItem(item, 0).split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('1. Rust 2.0 announced')
    expect(lines[1]).toContain('The Register')
    expect(lines[2]).toContain('news.google.com')
  })

  it('omits the separator when there is no date', () => {
    const lines = renderGnewsItem({ ...item, date: '' }, 0).split('\n')

    expect(lines[1]).not.toContain('—')
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

  it('returns three lines', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes index and author handle on first line', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[0]).toContain('1. @alice.bsky.social')
  })

  it('uses 1-based index', () => {
    const lines = renderBskyPost(post, 4).split('\n')
    expect(lines[0]).toStartWith('5. @')
  })

  it('includes formatted date with time on first line', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[0]).toContain('Jun')
    expect(lines[0]).toContain('2025')
    expect(lines[0]).toMatch(/AM|PM/)
  })

  it('includes post text on second line', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[1]).toContain('Hello world from Bluesky!')
  })

  it('includes engagement counts on third line', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[2]).toContain('Likes: 42')
    expect(lines[2]).toContain('Reposts: 7')
    expect(lines[2]).toContain('Replies: 3')
  })

  it('indents second and third lines', () => {
    const lines = renderBskyPost(post, 0).split('\n')
    expect(lines[1]).toStartWith('   ')
    expect(lines[2]).toStartWith('   ')
  })
})

describe('renderWikiPage', () => {
  it('includes title and wikipedia url', () => {
    const result = renderWikiPage({
      id: 1,
      key: 'TypeScript',
      title: 'TypeScript',
      excerpt: 'A programming language',
      description: 'Open-source language',
      matched_title: null,
      thumbnail: null,
    }, 0)
    expect(result).toContain('1. TypeScript')
    expect(result).toContain('https://en.wikipedia.org/wiki/TypeScript')
  })

  it('includes description when present', () => {
    const result = renderWikiPage({
      id: 1,
      key: 'TypeScript',
      title: 'TypeScript',
      excerpt: 'A programming language',
      description: 'Open-source language',
      matched_title: null,
      thumbnail: null,
    }, 0)
    expect(result).toContain('Open-source language')
  })

  it('omits description when null', () => {
    const result = renderWikiPage({
      id: 2,
      key: 'JavaScript',
      title: 'JavaScript',
      excerpt: 'A scripting language',
      description: null,
      matched_title: null,
      thumbnail: null,
    }, 0)
    const lines = result.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('1. JavaScript')
    expect(lines[1]).toContain('https://en.wikipedia.org/wiki/JavaScript')
    expect(lines[2]).toContain('A scripting language')
  })

  it('returns four lines when description is present', () => {
    const lines = renderWikiPage({
      id: 1,
      key: 'TypeScript',
      title: 'TypeScript',
      excerpt: 'A programming language',
      description: 'Open-source language',
      matched_title: null,
      thumbnail: null,
    }, 0).split('\n')
    expect(lines).toHaveLength(4)
  })

  it('uses 1-based index', () => {
    const lines = renderWikiPage({
      id: 1,
      key: 'Test',
      title: 'Test',
      excerpt: 'Excerpt',
      description: null,
      matched_title: null,
      thumbnail: null,
    }, 2).split('\n')
    expect(lines[0]).toStartWith('3. ')
  })

  it('indents all lines after the title', () => {
    const lines = renderWikiPage({
      id: 1,
      key: 'Test',
      title: 'Test',
      excerpt: 'Excerpt',
      description: 'Desc',
      matched_title: null,
      thumbnail: null,
    }, 0).split('\n')
    for (let i = 1; i < lines.length; i++) {
      expect(lines[i]).toStartWith('   ')
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

  it('returns three lines: title, url, summary', () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('includes index and title on first line', () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[0]).toBe('1. Fetch API')
  })

  it('uses 1-based index', () => {
    const lines = renderMdnDoc(doc, 4).split('\n')
    expect(lines[0]).toStartWith('5. ')
  })

  it('includes full MDN url on second line', () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[1]).toContain('https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API')
  })

  it('includes summary on third line', () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[2]).toContain('The Fetch API provides an interface for fetching resources.')
  })

  it('indents url and summary lines', () => {
    const lines = renderMdnDoc(doc, 0).split('\n')
    expect(lines[1]).toStartWith('   ')
    expect(lines[2]).toStartWith('   ')
  })
})
