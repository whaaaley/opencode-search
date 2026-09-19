import type { Plugin } from '@opencode/plugin'
import type * as Tool from '@opencode/plugin/promise/tool'
import { formatResults } from './format.ts'
import { sendResult } from './opencode/notify.ts'
import { braveSearch } from './providers/brave-search.ts'
import { bskySearch } from './providers/bsky-search.ts'
import { ddgSearch } from './providers/ddg-search.ts'
import { gnewsSearch } from './providers/gnews-search.ts'
import { mdnSearch } from './providers/mdn-search.ts'
import { standardSearch } from './providers/standard-search.ts'
import { wikiSearch } from './providers/wiki-search.ts'
import {
  renderBskyPost,
  renderDdgResult,
  renderGnewsItem,
  renderMdnDoc,
  renderStandardDoc,
  renderWebResult,
  renderWikiPage,
} from './renderers.ts'
import { safeAsync } from './safe.ts'

const postResult = async (context: Plugin.Context, ctx: Tool.ToolContext, text: string) => {
  await safeAsync(() => sendResult({ context, sessionID: ctx.sessionID, text }))
}

const textOutput = (output: Record<string, unknown>, text: string): Tool.Result => ({
  output,
  content: [{ type: 'text', text }],
})

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const stringField = (input: unknown, key: string): string => {
  if (!isRecord(input)) return ''

  const value = input[key]
  return typeof value === 'string' ? value : ''
}

const numberField = (input: unknown, key: string): number | undefined => {
  if (!isRecord(input)) return undefined

  const value = input[key]
  return typeof value === 'number' ? value : undefined
}

const queryArg = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'The search query' },
  },
  required: ['query'],
  additionalProperties: false,
} as const

export const createDdgSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'ddg_search',
  description: 'Search DuckDuckGo and return results as extracted text content',
  input: queryArg,
  async execute(input, ctx) {
    const query = stringField(input, 'query')

    const { data, error } = await safeAsync(() => ddgSearch(query))
    if (error) return textOutput({ error: error.message }, 'DuckDuckGo search failed: ' + error.message)

    const formatted = formatResults({
      label: 'DuckDuckGo results',
      items: data,
      total: data.length,
      renderItem: renderDdgResult,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data, total: data.length }, 'Search results displayed in chat.')
  },
})

export const createBraveSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'brave_search',
  description: 'Search the web via Brave Search, returning titles, URLs, and snippets.',
  input: queryArg,
  async execute(input, ctx) {
    const query = stringField(input, 'query')

    const { data, error } = await safeAsync(() => braveSearch(query))
    if (error) return textOutput({ error: error.message }, 'Brave search failed: ' + error.message)

    const formatted = formatResults({
      label: 'Brave results',
      items: data,
      total: data.length,
      renderItem: renderWebResult,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data, total: data.length }, 'Search results displayed in chat.')
  },
})

export const createBskySearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'bsky_search',
  description: [
    'Search Bluesky posts via the AT Protocol.',
    'Returns posts with author, text, and engagement counts.',
  ].join(' '),
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
  async execute(input, ctx) {
    const query = stringField(input, 'query')
    const limit = numberField(input, 'limit')
    const sort = stringField(input, 'sort') || undefined

    const { data, error } = await safeAsync(() => (
      bskySearch({ query, limit, sort })
    ))

    if (error) return textOutput({ error: error.message }, 'Bluesky search failed: ' + error.message)

    const formatted = formatResults({
      label: 'Bluesky results',
      items: data.posts,
      total: data.hitsTotal,
      limit,
      offset: 0,
      renderItem: renderBskyPost,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.posts, total: data.hitsTotal }, 'Search results displayed in chat.')
  },
})

export const createStandardSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'standard_search',
  description: [
    'Search site.standard.document records on the AT Protocol.',
    'Returns blog posts and articles from the ATmosphere.',
  ].join(' '),
  input: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Maximum number of results to return' },
      offset: { type: 'number', description: 'Number of results to skip' },
    },
    required: ['query'],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const query = stringField(input, 'query')
    const limit = numberField(input, 'limit')
    const offset = numberField(input, 'offset')

    const { data, error } = await safeAsync(() => (
      standardSearch({ query, limit, offset })
    ))

    if (error) return textOutput({ error: error.message }, 'Standard.site search failed: ' + error.message)

    const total = Number(data.totalResults) || data.documents.length
    const formatted = formatResults({
      label: 'Standard.site results',
      items: data.documents,
      total,
      limit,
      offset,
      renderItem: renderStandardDoc,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.documents, total }, 'Search results displayed in chat.')
  },
})

export const createWikiSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'wiki_search',
  description: 'Search Wikipedia articles. Returns page titles, descriptions, and excerpts.',
  input: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Maximum number of results to return (1-100)' },
    },
    required: ['query'],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const query = stringField(input, 'query')
    const limit = numberField(input, 'limit')

    const { data, error } = await safeAsync(() => (
      wikiSearch({ query, limit })
    ))

    if (error) return textOutput({ error: error.message }, 'Wikipedia search failed: ' + error.message)

    const formatted = formatResults({
      label: 'Wikipedia results',
      items: data.pages,
      total: data.pages.length,
      limit,
      offset: 0,
      renderItem: renderWikiPage,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.pages, total: data.pages.length }, 'Search results displayed in chat.')
  },
})

export const createGnewsSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'gnews_search',
  description: [
    'Search Google News for recent articles, returning headlines, publishers, and dates.',
    'News and tech media only — not general web search, and not documentation.',
    'Links are news.google.com redirect URLs, not publisher URLs.',
  ].join(' '),
  input: queryArg,
  async execute(input, ctx) {
    const query = stringField(input, 'query')

    const { data, error } = await safeAsync(() => gnewsSearch(query))
    if (error) return textOutput({ error: error.message }, 'Google News search failed: ' + error.message)

    const formatted = formatResults({
      label: 'Google News results',
      items: data,
      total: data.length,
      renderItem: renderGnewsItem,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data, total: data.length }, 'Search results displayed in chat.')
  },
})

export const createMdnSearchTool = (context: Plugin.Context): Tool.Info => ({
  name: 'mdn_search',
  description: 'Search MDN Web Docs. Returns documentation pages for web technologies.',
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
  async execute(input, ctx) {
    const query = stringField(input, 'query')
    const limit = numberField(input, 'limit')
    const page = numberField(input, 'page')

    const { data, error } = await safeAsync(() => (
      mdnSearch({ query, limit, page })
    ))

    if (error) return textOutput({ error: error.message }, 'MDN search failed: ' + error.message)

    const formatted = formatResults({
      label: 'MDN Web Docs results',
      items: data.documents,
      total: data.total,
      limit,
      renderItem: renderMdnDoc,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.documents, total: data.total }, 'Search results displayed in chat.')
  },
})

export const createSearchTools = (context: Plugin.Context): Tool.Info[] => [
  createBraveSearchTool(context),
  createBskySearchTool(context),
  createDdgSearchTool(context),
  createGnewsSearchTool(context),
  createMdnSearchTool(context),
  createStandardSearchTool(context),
  createWikiSearchTool(context),
]
