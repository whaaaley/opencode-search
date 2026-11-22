import type { Plugin } from '@opencode/plugin'
import type * as Tool from '@opencode/plugin/promise/tool'
import { describe, expect, it } from 'vite-plus/test'
import { createCache, type Cache } from './cache.ts'
import type { Deps } from './deps.ts'
import { createSearchTools } from './search.ts'

const emptyCache = (): Cache => createCache({ file: { read: async () => '{}', write: async () => {} }, now: () => 0 })

type Posted = { sessionID: string; text: string; description: string }

// The tools read only `session.synthetic` from the context, so a stand-in carries just that.
const contextPosting = (posted: Posted[], failing = false): Plugin.Context =>
  ({
    session: {
      // Recording after a turn of the event loop shows whether the tool waited for the post.
      synthetic: async (message: Posted) => {
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (failing) throw new Error('session closed')
        posted.push(message)
      },
    },
  }) as unknown as Plugin.Context

const toolContext = { sessionID: 'session-1' } as unknown as Tool.ToolContext

const depsAnswering = (respond: (url: string) => Response): Deps => ({
  fetch: async (url) => respond(String(url)),
  cache: emptyCache(),
})

type RunInput = { name: string; input: unknown; respond: (url: string) => Response; posted?: Posted[] }

const run = async ({ name, input, respond, posted = [] }: RunInput): Promise<string> => {
  const tool = createSearchTools(contextPosting(posted), depsAnswering(respond)).find((candidate) => candidate.name === name)
  if (!tool) throw new Error('no tool ' + name)

  const result = await tool.execute(input, toolContext)
  if (!Array.isArray(result.content)) throw new Error('expected content parts')

  const [content] = result.content
  if (content?.type !== 'text') throw new Error('expected text')

  return content.text
}

const failing = (): Response => new Response('', { status: 500, statusText: 'Down' })

describe('createSearchTools', () => {
  // The descriptions and input schemas are what the model reads to pick a tool, so each is held word for word.
  it('describes every tool and its input to the model', { meta: { steps: 0 } }, () => {
    const tools = createSearchTools(contextPosting([]), depsAnswering(failing))

    const query = { type: 'string', description: 'The search query' }
    const limited = (description: string): unknown => ({
      type: 'object',
      properties: { query, limit: { type: 'number', description } },
      required: ['query'],
      additionalProperties: false,
    })
    const queryOnly = { type: 'object', properties: { query }, required: ['query'], additionalProperties: false }
    const twenty = 'Maximum number of results to return (default 20)'

    expect(tools.map(({ name, description, input }) => ({ name, description, input }))).toEqual([
      {
        name: 'brave_search',
        description: [
          'Search the web with Brave when you need current information from the internet.',
          'The most reliable general web search here; prefer it over ddg_search when either would do.',
          'Returns titles, URLs and snippets.',
        ].join(' '),
        input: queryOnly,
      },
      {
        name: 'bsky_search',
        description: [
          'Search Bluesky posts for what people are saying about a topic right now.',
          'Use for public reaction, discussion and opinion, not for documentation or reference material.',
          'Returns author handle, post text, and like, repost and reply counts.',
        ].join(' '),
        input: {
          type: 'object',
          properties: {
            query,
            limit: { type: 'number', description: 'Maximum number of results to return' },
            sort: { type: 'string', description: 'Sort order: top or latest' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'ddg_search',
        description: [
          'Search the web with DuckDuckGo when you need current information from the internet.',
          'Use for general web queries: products, people, events, how-tos, anything not covered by a more specific tool.',
          'Returns titles, URLs and snippets.',
        ].join(' '),
        input: queryOnly,
      },
      {
        name: 'gnews_search',
        description: [
          'Search Google News for recent news coverage of a topic.',
          'News and tech media only — not general web search, and not documentation.',
          'Links are news.google.com redirect URLs that only open in a browser, not publisher URLs.',
        ].join(' '),
        input: limited(twenty),
      },
      {
        name: 'mdn_search',
        description: [
          'Look up web platform documentation on MDN: JavaScript, CSS, HTML, and browser APIs.',
          'Use for how a web API behaves, its syntax, parameters or browser support.',
          'Returns documentation pages with titles, URLs and summaries.',
        ].join(' '),
        input: {
          type: 'object',
          properties: {
            query,
            limit: { type: 'number', description: 'Maximum number of results to return' },
            page: { type: 'number', description: 'Page number for pagination' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'rfc_search',
        description: [
          'Look up an IETF RFC by number or title.',
          "Accepts a number like 9421, RFC9421 or 'rfc 9421' for a direct lookup, or words from the title to search.",
          'Use for internet protocol specifications: HTTP, TCP, TLS, DNS, email, and so on.',
          'Returns the RFC number, title, date, abstract, and a link to the full text.',
        ].join(' '),
        input: {
          type: 'object',
          properties: {
            query: { type: 'string', description: "An RFC number like 9421 or 'RFC9421', or words from the title" },
            limit: { type: 'number', description: twenty },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'w3c_search',
        description: [
          'Look up a W3C specification by words in its title.',
          'Use for web standards W3C publishes: CSS, WCAG accessibility, SVG, WebRTC, and similar.',
          'Matches titles only, so query the spec name rather than a concept inside it.',
          'Returns the specification title and URL.',
        ].join(' '),
        input: limited(twenty),
      },
      {
        name: 'whatwg_search',
        description: [
          'Look up a WHATWG living standard such as HTML, DOM, Fetch, URL or Streams.',
          'Use for the current web platform specs WHATWG maintains, which supersede older W3C versions.',
          'There are only 27 standards, so expect few results.',
          'Returns the standard name, URL and description.',
        ].join(' '),
        input: limited(twenty),
      },
      {
        name: 'wiki_search',
        description: [
          'Look up a subject on Wikipedia for background, definitions and general reference.',
          'Use when the question is about what something IS rather than what is happening with it.',
          'Returns page titles, descriptions and excerpts.',
        ].join(' '),
        input: limited('Maximum number of results to return (1-100)'),
      },
    ])
  })

  it('posts the formatted results to the session and returns them', { meta: { steps: 28 } }, async () => {
    const posted: Posted[] = []
    const html = '<div class="snippet" data-type="web"><a href="https://a.com"><span class="title">A</span></a></div>'

    const text = await run({ name: 'brave_search', input: { query: 'q' }, respond: () => new Response(html), posted })

    expect(text).toBe('Brave results (showing 1-1 of 1, page 1)\n\n1. A\n   https://a.com\n   ')
    expect(posted).toEqual([{ sessionID: 'session-1', text, description: 'Search results' }])
  })

  it('still returns the results when posting to the session fails', { meta: { steps: 13 } }, async () => {
    const deps = depsAnswering(() => Response.json({ workstreams: [] }))
    const tool = createSearchTools(contextPosting([], true), deps).find((candidate) => candidate.name === 'whatwg_search')

    const result = await tool?.execute({ query: 'q' }, toolContext)

    expect(result).toEqual({ content: [{ type: 'text', text: 'WHATWG results (0 results)' }] })
  })

  it('answers a failed search with the provider and reason', { meta: { steps: 98 } }, async () => {
    const posted: Posted[] = []
    const cases = [
      ['brave_search', 'Brave search failed: 500 Down'],
      ['bsky_search', 'Bluesky search failed: Bluesky search error (500): '],
      ['ddg_search', 'DuckDuckGo search failed: 500 Down'],
      ['gnews_search', 'Google News search failed: Google News returned 500 Down'],
      ['mdn_search', 'MDN search failed: MDN search error (500): '],
      ['rfc_search', 'RFC search failed: IETF Datatracker returned 500 Down'],
      ['w3c_search', 'W3C search failed: W3C API returned 500 Down'],
      ['whatwg_search', 'WHATWG search failed: WHATWG index returned 500 Down'],
      ['wiki_search', 'Wikipedia search failed: Wikipedia search error (500): '],
    ]

    const answers = await Promise.all(cases.map(([name]) => run({ name: String(name), input: { query: 'q' }, respond: failing, posted })))

    expect(answers).toEqual(cases.map(([, message]) => message))
    expect(posted).toEqual([])
  })

  it('answers input without a query as a failed search', { meta: { steps: 2 } }, async () => {
    expect(await run({ name: 'rfc_search', input: { limit: 2 }, respond: failing })).toMatch(/^RFC search failed: /)
  })


  it('passes the bluesky limit and sort, paging by the limit', { meta: { steps: 22 } }, async () => {
    const urls: string[] = []
    const post = { author: { handle: 'a.test' }, record: { text: 'hi', createdAt: '' } }
    const respond = (url: string): Response => {
      urls.push(url)
      return Response.json({ posts: [post], hitsTotal: 9 })
    }

    const text = await run({ name: 'bsky_search', input: { query: 'q', limit: 1, sort: 'top' }, respond })

    expect(urls).toEqual(['https://api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=q&sort=top&limit=1'])
    expect(text.split('\n')[0]).toBe('Bluesky results (showing 1-1 of 9, page 1)')
  })

  it('passes the mdn limit and page, reporting the total', { meta: { steps: 21 } }, async () => {
    const urls: string[] = []
    const respond = (url: string): Response => {
      urls.push(url)
      return Response.json({ documents: [{ mdn_url: '/x', title: 'X' }], metadata: { total: { value: 30 } } })
    }

    const text = await run({ name: 'mdn_search', input: { query: 'q', limit: 1, page: 3 }, respond })

    expect(urls).toEqual(['https://developer.mozilla.org/api/v1/search?q=q&locale=en-US&size=1&page=3'])
    expect(text).toBe('MDN Web Docs results (showing 1-1 of 30, page 1)\n\n1. X\n   https://developer.mozilla.org/x\n   ')
  })

  it('formats ddg, gnews, rfc, w3c and whatwg results with their limits', { meta: { steps: 122 } }, async () => {
    const ddg = await run({ name: 'ddg_search', input: { query: 'q' }, respond: () => new Response('<a class="result__a" href="https://d.com">D</a>') })
    const gnews = await run({ name: 'gnews_search', input: { query: 'q', limit: 1 }, respond: () => new Response('<item><title>G</title><link>https://g</link></item>'.repeat(2)) })
    const rfc = await run({ name: 'rfc_search', input: { query: 'q', limit: 1 }, respond: () => Response.json({ objects: [{ name: 'rfc1' }, { name: 'rfc2' }] }) })
    const specifications = [
      { title: 'CSS', href: 'https://c' },
      { title: 'CSS 2', href: 'https://c2' },
    ]
    const w3c = await run({ name: 'w3c_search', input: { query: 'css', limit: 1 }, respond: () => Response.json({ _links: { specifications } }) })
    const whatwg = await run({ name: 'whatwg_search', input: { query: 'dom', limit: 5 }, respond: () => Response.json({ workstreams: [{ standards: [{ name: 'DOM', href: 'https://dom' }] }] }) })

    expect(ddg).toBe('DuckDuckGo results (showing 1-1 of 1, page 1)\n\n1. D\n   https://d.com\n   ')
    expect(gnews).toBe('Google News results (showing 1-1 of 1, page 1)\n\n1. G\n   \n   https://g')
    expect(rfc).toBe('RFC results (showing 1-1 of 1, page 1)\n\n1. RFC1 — \n   https://www.rfc-editor.org/rfc/rfc1.html\n   ')
    expect(w3c).toBe('W3C results (showing 1-1 of 1, page 1)\n\n1. CSS\n   https://c')
    expect(whatwg).toBe('WHATWG results (showing 1-1 of 1, page 1)\n\n1. DOM\n   https://dom\n   ')
  })

  it('formats wikipedia pages, paging by the limit', { meta: { steps: 18 } }, async () => {
    const urls: string[] = []
    const respond = (url: string): Response => {
      urls.push(url)
      return Response.json({ pages: [{ key: 'K', title: 'T', excerpt: 'e' }] })
    }

    const text = await run({ name: 'wiki_search', input: { query: 'q', limit: 2 }, respond })

    expect(urls).toEqual(['https://en.wikipedia.org/w/rest.php/v1/search/page?q=q&limit=2'])
    expect(text).toBe('Wikipedia results (showing 1-1 of 1, page 1)\n\n1. T\n   https://en.wikipedia.org/wiki/K\n   e')
  })
})
