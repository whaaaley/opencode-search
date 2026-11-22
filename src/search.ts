import type { Plugin } from '@opencode/plugin'
import type * as Tool from '@opencode/plugin/promise/tool'
import { z } from 'zod'
import type { Deps } from './deps.ts'
import { formatResults } from './format.ts'
import { sendResult } from './opencode/notify.ts'
import { awsDocsSearch } from './providers/aws-docs-search.ts'
import { bskySearch } from './providers/bsky-search.ts'
import { firecrawlSearch } from './providers/firecrawl-search.ts'
import { gnewsSearch } from './providers/gnews-search.ts'
import { mdnSearch } from './providers/mdn-search.ts'
import { rfcSearch } from './providers/rfc-search.ts'
import { standardSearch } from './providers/standard-search.ts'
import { w3cSearch } from './providers/w3c-search.ts'
import { whatwgSearch } from './providers/whatwg-search.ts'
import { wikiSearch } from './providers/wiki-search.ts'
import { renderBskyPost, renderGnewsItem, renderMdnDoc, renderRfc, renderStandardDoc, renderW3c, renderWebResult, renderWhatwg, renderWikiPage } from './renderers.ts'
import { safeAsync } from './safe.ts'

// No `output` field: declaring one without a matching output schema in the tool definition makes
// OpenCode reject the result.
const textOutput = (text: string): Tool.Result => ({
  content: [{ type: 'text', text }],
})

// A limit or page below 1 has no meaning, and `slice(0, -n)` would turn a negative limit into nearly every result.
const count = z.number().int().positive()

const limitInput = z.object({ query: z.string(), limit: count.optional() })
const bskyInput = z.object({ query: z.string(), limit: count.optional(), sort: z.string().optional() })
const mdnInput = z.object({ query: z.string(), limit: count.optional(), page: count.optional() })
const standardInput = z.object({ query: z.string(), limit: count.optional(), offset: z.number().int().nonnegative().optional() })

const limitArg = (description: string) =>
  ({
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description },
    },
    required: ['query'],
    additionalProperties: false,
  }) as const

type SearchToolInput = {
  context: Plugin.Context
  name: string
  description: string[]
  input: Tool.Info['input']
  failure: string
  // Formats the answer to one call, which `execute` reports and posts to the session.
  search: (input: unknown) => Promise<string>
}

// A failed search becomes the tool's answer, so the model reads why instead of the call erroring out.
const searchTool = ({ context, name, description, input, failure, search }: SearchToolInput): Tool.Info => ({
  name,
  description: description.join(' '),
  input,
  async execute(raw, ctx) {
    const { data: formatted, error } = await safeAsync(() => search(raw))
    if (error) return textOutput(failure + ' failed: ' + error.message)

    await safeAsync(() => sendResult({ context, sessionID: ctx.sessionID, text: formatted }))

    return textOutput(formatted)
  },
})

export const createSearchTools = (context: Plugin.Context, deps: Deps): Tool.Info[] => [
  searchTool({
    context,
    name: 'aws_docs_search',
    description: ['Search the AWS documentation on docs.aws.amazon.com.', 'Use for how an AWS service, API, CLI command or configuration option works.', 'Returns page titles, URLs and summaries.'],
    input: limitArg('Maximum number of results to return (default 10)'),
    failure: 'AWS docs search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await awsDocsSearch(deps, query, limit)
      return formatResults({ label: 'AWS documentation results', items, total: items.length, renderItem: renderWebResult })
    },
  }),
  searchTool({
    context,
    name: 'bsky_search',
    description: [
      'Search Bluesky posts for what people are saying about a topic right now.',
      'Use for public reaction, discussion and opinion, not for documentation or reference material.',
      'Returns author handle, post text, and like, repost and reply counts.',
    ],
    input: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: { type: 'number', description: 'Maximum number of results to return' },
        sort: { type: 'string', description: 'Sort order: top or latest' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    failure: 'Bluesky search',
    search: async (raw) => {
      const options = bskyInput.parse(raw)
      const { posts, hitsTotal } = await bskySearch(deps, options)
      return formatResults({ label: 'Bluesky results', items: posts, total: hitsTotal, limit: options.limit, offset: 0, renderItem: renderBskyPost })
    },
  }),
  searchTool({
    context,
    name: 'firecrawl_search',
    description: [
      'Search the web with Firecrawl when you need current information from the internet.',
      'Use for general web queries: products, people, events, how-tos, anything not covered by a more specific tool.',
      'Returns titles, URLs and snippets. Works without an API key up to a daily limit per IP address.',
    ],
    input: limitArg('Maximum number of results to return (default 10)'),
    failure: 'Firecrawl search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await firecrawlSearch(deps, query, limit)
      return formatResults({ label: 'Firecrawl results', items, total: items.length, renderItem: renderWebResult })
    },
  }),
  searchTool({
    context,
    name: 'gnews_search',
    description: [
      'Search Google News for recent news coverage of a topic.',
      'News and tech media only — not general web search, and not documentation.',
      'Links are news.google.com redirect URLs that only open in a browser, not publisher URLs.',
    ],
    input: limitArg('Maximum number of results to return (default 20)'),
    failure: 'Google News search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await gnewsSearch(deps, query, limit)
      return formatResults({ label: 'Google News results', items, total: items.length, renderItem: renderGnewsItem })
    },
  }),
  searchTool({
    context,
    name: 'mdn_search',
    description: [
      'Look up web platform documentation on MDN: JavaScript, CSS, HTML, and browser APIs.',
      'Use for how a web API behaves, its syntax, parameters or browser support.',
      'Returns documentation pages with titles, URLs and summaries.',
    ],
    input: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: { type: 'number', description: 'Maximum number of results to return' },
        page: { type: 'number', description: 'Page number for pagination' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    failure: 'MDN search',
    search: async (raw) => {
      const options = mdnInput.parse(raw)
      const { documents, total } = await mdnSearch(deps, options)
      return formatResults({ label: 'MDN Web Docs results', items: documents, total, limit: options.limit, renderItem: renderMdnDoc })
    },
  }),
  searchTool({
    context,
    name: 'rfc_search',
    description: [
      'Look up an IETF RFC by number or title.',
      "Accepts a number like 9421, RFC9421 or 'rfc 9421' for a direct lookup, or words from the title to search.",
      'Use for internet protocol specifications: HTTP, TCP, TLS, DNS, email, and so on.',
      'Returns the RFC number, title, date, abstract, and a link to the full text.',
    ],
    input: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "An RFC number like 9421 or 'RFC9421', or words from the title" },
        limit: { type: 'number', description: 'Maximum number of results to return (default 20)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    failure: 'RFC search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await rfcSearch(deps, query, limit)
      return formatResults({ label: 'RFC results', items, total: items.length, renderItem: renderRfc })
    },
  }),
  searchTool({
    context,
    name: 'standard_search',
    description: [
      'Search long-form posts published on the AT Protocol: standard.site documents and blogs on Leaflet, pckt, WhiteWind and similar platforms.',
      'Use for essays, articles and blog posts from the ATmosphere, not short Bluesky posts.',
      'Returns titles, URLs, dates and snippets.',
    ],
    input: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        limit: { type: 'number', description: 'Maximum number of results to return (default 20, at most 40)' },
        offset: { type: 'number', description: 'Number of results to skip' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    failure: 'Standard.site search',
    search: async (raw) => {
      const options = standardInput.parse(raw)
      const items = await standardSearch(deps, options)
      return formatResults({ label: 'Standard.site results', items, total: items.length, renderItem: renderStandardDoc })
    },
  }),
  searchTool({
    context,
    name: 'w3c_search',
    description: [
      'Look up a W3C specification by words in its title.',
      'Use for web standards W3C publishes: CSS, WCAG accessibility, SVG, WebRTC, and similar.',
      'Matches titles only, so query the spec name rather than a concept inside it.',
      'Returns the specification title and URL.',
    ],
    input: limitArg('Maximum number of results to return (default 20)'),
    failure: 'W3C search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await w3cSearch(deps, query, limit)
      return formatResults({ label: 'W3C results', items, total: items.length, renderItem: renderW3c })
    },
  }),
  searchTool({
    context,
    name: 'whatwg_search',
    description: [
      'Look up a WHATWG living standard such as HTML, DOM, Fetch, URL or Streams.',
      'Use for the current web platform specs WHATWG maintains, which supersede older W3C versions.',
      'There are only 27 standards, so expect few results.',
      'Returns the standard name, URL and description.',
    ],
    input: limitArg('Maximum number of results to return (default 20)'),
    failure: 'WHATWG search',
    search: async (raw) => {
      const { query, limit } = limitInput.parse(raw)
      const items = await whatwgSearch(deps, query, limit)
      return formatResults({ label: 'WHATWG results', items, total: items.length, renderItem: renderWhatwg })
    },
  }),
  searchTool({
    context,
    name: 'wiki_search',
    description: [
      'Look up a subject on Wikipedia for background, definitions and general reference.',
      'Use when the question is about what something IS rather than what is happening with it.',
      'Returns page titles, descriptions and excerpts.',
    ],
    input: limitArg('Maximum number of results to return (1-100)'),
    failure: 'Wikipedia search',
    search: async (raw) => {
      const options = limitInput.parse(raw)
      const { pages } = await wikiSearch(deps, options)
      return formatResults({ label: 'Wikipedia results', items: pages, total: pages.length, limit: options.limit, offset: 0, renderItem: renderWikiPage })
    },
  }),
]
