import type { PluginInput, ToolContext } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { formatResults } from './format.ts'
import { sendResult } from './opencode/notify.ts'
import { bskySearch } from './providers/bsky-search.ts'
import { ddgSearch } from './providers/ddg-search.ts'
import { mdnSearch } from './providers/mdn-search.ts'
import { standardSearch } from './providers/standard-search.ts'
import { wikiSearch } from './providers/wiki-search.ts'
import { renderBskyPost, renderDdgText, renderMdnDoc, renderStandardDoc, renderWikiPage } from './renderers.ts'
import { safeAsync } from './utils/safe.ts'

type Client = PluginInput['client']

const postResult = (client: Client, ctx: ToolContext, text: string): void => {
  safeAsync(() => (
    sendResult({
      client,
      sessionID: ctx.sessionID,
      text,
    })
  ))
}

export const createDdgSearchTool = (client: Client) => {
  return tool({
    description: 'Search DuckDuckGo and return results as extracted text content',
    args: {
      query: tool.schema.string().describe('The search query'),
    },
    async execute(args, ctx) {
      const result = await safeAsync(() => ddgSearch(args.query))
      if (result.error) {
        return 'DuckDuckGo search failed: ' + result.error.message
      }

      const formatted = formatResults({
        label: 'DuckDuckGo results',
        items: [result.data],
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
    description: [
      'Search Bluesky posts via the AT Protocol.',
      'Returns posts with author, text, and engagement counts.',
    ].join(''),
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
    },
    async execute(args, ctx) {
      const result = await safeAsync(() => (
        bskySearch({
          query: args.query,
          limit: args.limit,
        })
      ))

      if (result.error) {
        return 'Bluesky search failed: ' + result.error.message
      }

      const formatted = formatResults({
        label: 'Bluesky results',
        items: result.data.posts,
        total: result.data.hitsTotal,
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
    description: [
      'Search site.standard.document records on the AT Protocol.',
      'Returns blog posts and articles from the ATmosphere.',
    ].join(' '),
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
      offset: tool.schema.number().optional().describe('Number of results to skip'),
    },
    async execute(args, ctx) {
      const result = await safeAsync(() => (
        standardSearch({
          query: args.query,
          limit: args.limit,
          offset: args.offset,
        })
      ))

      if (result.error) {
        return 'Standard.site search failed: ' + result.error.message
      }

      const total = Number(result.data.totalResults) || result.data.documents.length
      const formatted = formatResults({
        label: 'Standard.site results',
        items: result.data.documents,
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
      const result = await safeAsync(() => (
        wikiSearch({
          query: args.query,
          limit: args.limit,
        })
      ))

      if (result.error) {
        return 'Wikipedia search failed: ' + result.error.message
      }

      const formatted = formatResults({
        label: 'Wikipedia results',
        items: result.data.pages,
        total: result.data.pages.length,
        limit: args.limit,
        offset: 0,
        renderItem: renderWikiPage,
      })

      postResult(client, ctx, formatted)

      return formatted
    },
  })
}

export const createMdnSearchTool = (client: Client) => {
  return tool({
    description: 'Search MDN Web Docs. Returns documentation pages for web technologies.',
    args: {
      query: tool.schema.string().describe('The search query'),
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
      page: tool.schema.number().optional().describe('Page number for pagination'),
    },
    async execute(args, ctx) {
      const result = await safeAsync(() => (
        mdnSearch({
          query: args.query,
          limit: args.limit,
          page: args.page,
        })
      ))

      if (result.error) {
        return 'MDN search failed: ' + result.error.message
      }

      const formatted = formatResults({
        label: 'MDN Web Docs results',
        items: result.data.documents,
        total: result.data.total,
        limit: args.limit,
        renderItem: renderMdnDoc,
      })

      postResult(client, ctx, formatted)

      return formatted
    },
  })
}
