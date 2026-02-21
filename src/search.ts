import type { PluginInput, ToolContext } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { formatResults } from './format.ts'
import { sendResult } from './opencode/notify.ts'
import { bskySearch } from './providers/bsky-search.ts'
import { ddgSearch } from './providers/ddg-search.ts'
import { standardSearch } from './providers/standard-search.ts'
import { wikiSearch } from './providers/wiki-search.ts'
import { renderBskyPost, renderDdgText, renderStandardDoc, renderWikiPage } from './renderers.ts'

type Client = PluginInput['client']

const postResult = (client: Client, ctx: ToolContext, text: string): void => {
  sendResult({
    client,
    sessionID: ctx.sessionID,
    text,
  }).catch(() => {})
}

export const createDdgSearchTool = (client: Client) => {
  return tool({
    description: 'Search DuckDuckGo and return results as extracted text content',
    args: {
      query: tool.schema.string().describe('The search query'),
    },
    async execute(args, ctx) {
      const textContent = await ddgSearch(args.query)
      const formatted = formatResults({
        label: 'DuckDuckGo results',
        items: [textContent],
        total: 1,
        renderItem: renderDdgText,
      })
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}

export const createBskySearchTool = (client: Client) => {
  return tool({
    description: 'Search Bluesky posts via the AT Protocol. Returns posts with author, text, and engagement counts.',
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
    },
    async execute(args, ctx) {
      const results = await bskySearch({
        query: args.query,
        limit: args.limit,
      })
      const formatted = formatResults({
        label: 'Bluesky results',
        items: results.posts,
        total: results.hitsTotal,
        limit: args.limit,
        offset: 0,
        renderItem: renderBskyPost,
      })
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}

export const createStandardSearchTool = (client: Client) => {
  return tool({
    description:
      'Search site.standard.document records on the AT Protocol. Returns blog posts and articles from the ATmosphere.',
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
      offset: tool.schema.number().optional().describe('Number of results to skip'),
    },
    async execute(args, ctx) {
      const results = await standardSearch({
        query: args.query,
        limit: args.limit,
        offset: args.offset,
      })
      const total = Number(results.totalResults) || results.documents.length
      const formatted = formatResults({
        label: 'Standard.site results',
        items: results.documents,
        total,
        limit: args.limit,
        offset: args.offset,
        renderItem: renderStandardDoc,
      })
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}

export const createWikiSearchTool = (client: Client) => {
  return tool({
    description: 'Search Wikipedia articles. Returns page titles, descriptions, and excerpts.',
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return (1-100)'),
    },
    async execute(args, ctx) {
      const results = await wikiSearch({
        query: args.query,
        limit: args.limit,
      })
      const formatted = formatResults({
        label: 'Wikipedia results',
        items: results.pages,
        total: results.pages.length,
        limit: args.limit,
        offset: 0,
        renderItem: renderWikiPage,
      })
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}
