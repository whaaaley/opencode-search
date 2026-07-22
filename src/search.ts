import type { Plugin } from '@opencode-ai/plugin/v2'
import type * as Tool from '@opencode-ai/plugin/v2/tool'
import { formatResults } from './format.ts'
import { sendResult } from './opencode/notify.ts'
import { bskySearch } from './providers/bsky-search.ts'
import { ddgSearch } from './providers/ddg-search.ts'
import { googleSearch } from './providers/ggl-search.ts'
import { mdnSearch } from './providers/mdn-search.ts'
import { standardSearch } from './providers/standard-search.ts'
import { wikiSearch } from './providers/wiki-search.ts'
import { renderBskyPost, renderDdgResult, renderGoogleResult, renderMdnDoc, renderStandardDoc, renderWikiPage } from './renderers.ts'
import { safeAsync } from './safe.ts'

const postResult = async (context: Plugin.Context, ctx: Tool.Context, text: string) => {
  await safeAsync(() => sendResult({ context, sessionID: ctx.sessionID, text }))
}

const textOutput = (structured: Record<string, unknown>, text: string): Tool.DynamicOutput => ({
  structured,
  content: [{ type: 'text', text }],
})

const queryArg = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'The search query' },
  },
  required: ['query'],
  additionalProperties: false,
} as const

export const createDdgSearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'ddg-search',
  description: 'Search DuckDuckGo and return results as extracted text content',
  jsonSchema: queryArg,
  async execute(input, ctx) {
    const args = input as { query: string }
    const { data, error } = await safeAsync(() => ddgSearch(args.query))
    if (error) {
      return textOutput({ error: error.message }, 'DuckDuckGo search failed: ' + error.message)
    }

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

export const createGoogleSearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'ggl-search',
  description: [
    'Search the web via Google, returning titles, URLs, and snippets.',
    'Falls back to Brave or Mojeek when Google blocks non-JavaScript clients.',
  ].join(' '),
  jsonSchema: queryArg,
  async execute(input, ctx) {
    const args = input as { query: string }
    const { data, error } = await safeAsync(() => googleSearch(args.query))
    if (error) {
      return textOutput({ error: error.message }, 'Google search failed: ' + error.message)
    }

    const formatted = formatResults({
      label: 'Google results',
      items: data,
      total: data.length,
      renderItem: renderGoogleResult,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data, total: data.length }, 'Search results displayed in chat.')
  },
})

export const createBskySearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'bsky-search',
  description: [
    'Search Bluesky posts via the AT Protocol.',
    'Returns posts with author, text, and engagement counts.',
  ].join(' '),
  jsonSchema: {
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
    const args = input as { query: string; limit?: number; sort?: string }
    const { data, error } = await safeAsync(() => (
      bskySearch({ query: args.query, limit: args.limit, sort: args.sort })
    ))

    if (error) {
      return textOutput({ error: error.message }, 'Bluesky search failed: ' + error.message)
    }

    const formatted = formatResults({
      label: 'Bluesky results',
      items: data.posts,
      total: data.hitsTotal,
      limit: args.limit,
      offset: 0,
      renderItem: renderBskyPost,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.posts, total: data.hitsTotal }, 'Search results displayed in chat.')
  },
})

export const createStandardSearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'standard-search',
  description: [
    'Search site.standard.document records on the AT Protocol.',
    'Returns blog posts and articles from the ATmosphere.',
  ].join(' '),
  jsonSchema: {
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
    const args = input as { query: string; limit?: number; offset?: number }
    const { data, error } = await safeAsync(() => (
      standardSearch({ query: args.query, limit: args.limit, offset: args.offset })
    ))

    if (error) {
      return textOutput({ error: error.message }, 'Standard.site search failed: ' + error.message)
    }

    const total = Number(data.totalResults) || data.documents.length
    const formatted = formatResults({
      label: 'Standard.site results',
      items: data.documents,
      total,
      limit: args.limit,
      offset: args.offset,
      renderItem: renderStandardDoc,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.documents, total }, 'Search results displayed in chat.')
  },
})

export const createWikiSearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'wiki-search',
  description: 'Search Wikipedia articles. Returns page titles, descriptions, and excerpts.',
  jsonSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Maximum number of results to return (1-100)' },
    },
    required: ['query'],
    additionalProperties: false,
  },
  async execute(input, ctx) {
    const args = input as { query: string; limit?: number }
    const { data, error } = await safeAsync(() => (
      wikiSearch({ query: args.query, limit: args.limit })
    ))

    if (error) {
      return textOutput({ error: error.message }, 'Wikipedia search failed: ' + error.message)
    }

    const formatted = formatResults({
      label: 'Wikipedia results',
      items: data.pages,
      total: data.pages.length,
      limit: args.limit,
      offset: 0,
      renderItem: renderWikiPage,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.pages, total: data.pages.length }, 'Search results displayed in chat.')
  },
})

export const createMdnSearchTool = (context: Plugin.Context): Tool.DynamicDefinition => ({
  name: 'mdn-search',
  description: 'Search MDN Web Docs. Returns documentation pages for web technologies.',
  jsonSchema: {
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
    const args = input as { query: string; limit?: number; page?: number }
    const { data, error } = await safeAsync(() => (
      mdnSearch({ query: args.query, limit: args.limit, page: args.page })
    ))

    if (error) {
      return textOutput({ error: error.message }, 'MDN search failed: ' + error.message)
    }

    const formatted = formatResults({
      label: 'MDN Web Docs results',
      items: data.documents,
      total: data.total,
      limit: args.limit,
      renderItem: renderMdnDoc,
    })

    await postResult(context, ctx, formatted)

    return textOutput({ results: data.documents, total: data.total }, 'Search results displayed in chat.')
  },
})

export const createSearchTools = (context: Plugin.Context): Tool.DynamicDefinition[] => [
  createBskySearchTool(context),
  createDdgSearchTool(context),
  createGoogleSearchTool(context),
  createMdnSearchTool(context),
  createStandardSearchTool(context),
  createWikiSearchTool(context),
]
