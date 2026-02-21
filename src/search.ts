import type { PluginInput, ToolContext } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import type { BskySearchResult } from './utils/bsky-search.ts'
import { bskySearch } from './utils/bsky-search.ts'
import { ddgSearch } from './utils/ddg-search.ts'
import type { SearchResult } from './utils/google-search.ts'
import { googleSearch } from './utils/google-search.ts'
import { sendResult } from './utils/notify.ts'
import type { StandardSearchResult } from './utils/standard-search.ts'
import { standardSearch } from './utils/standard-search.ts'

type Client = PluginInput['client']

const formatGoogleResults = (results: SearchResult): string => {
  const request = results.queries.request
  const totalResults = request && request[0] ? request[0].totalResults : '0'

  const items = results.items.map((item) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }))

  return JSON.stringify(
    {
      source: 'google',
      totalResults,
      items,
    },
    null,
    2,
  )
}

const formatDdgResults = (textContent: string): string => {
  return JSON.stringify(
    {
      source: 'duckduckgo',
      textContent,
    },
    null,
    2,
  )
}

const formatBskyResults = (results: BskySearchResult): string => {
  const posts = results.posts.map((post) => ({
    author: post.author.handle,
    text: post.record.text,
    createdAt: post.record.createdAt,
    likes: post.likeCount,
    reposts: post.repostCount,
    replies: post.replyCount,
    uri: post.uri,
  }))

  return JSON.stringify(
    {
      source: 'bluesky',
      hitsTotal: results.hitsTotal,
      posts,
    },
    null,
    2,
  )
}

const formatStandardResults = (results: StandardSearchResult): string => {
  return JSON.stringify(
    {
      source: 'standard.site',
      totalResults: results.totalResults,
      documents: results.documents,
    },
    null,
    2,
  )
}

const postResult = (client: Client, ctx: ToolContext, text: string): void => {
  sendResult({
    client,
    sessionID: ctx.sessionID,
    text,
  }).catch(() => {})
}

export const createWebSearchTool = (client: Client) => {
  return tool({
    description:
      'Search the web using Google (primary) with DuckDuckGo fallback. Returns a list of results with titles, links, and snippets.',
    args: {
      query: tool.schema.string().describe('The search query'),
    },
    async execute(args, ctx) {
      const errors: string[] = []

      try {
        const results = await googleSearch(args.query)
        const formatted = formatGoogleResults(results)
        postResult(client, ctx, formatted)
        return formatted
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push('Google: ' + msg)
      }

      try {
        const textContent = await ddgSearch(args.query)
        const formatted = formatDdgResults(textContent)
        postResult(client, ctx, formatted)
        return formatted
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push('DuckDuckGo: ' + msg)
      }

      throw new Error('All search backends failed.\n' + errors.join('\n'))
    },
  })
}

export const createGoogleSearchTool = (client: Client) => {
  return tool({
    description: 'Search Google Custom Search Engine and return results with titles, links, and snippets',
    args: {
      query: tool.schema.string().describe('The search query'),
    },
    async execute(args, ctx) {
      const results = await googleSearch(args.query)
      const formatted = formatGoogleResults(results)
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}

export const createDdgSearchTool = (client: Client) => {
  return tool({
    description: 'Search DuckDuckGo and return results as extracted text content',
    args: {
      query: tool.schema.string().describe('The search query'),
    },
    async execute(args, ctx) {
      const textContent = await ddgSearch(args.query)
      const formatted = formatDdgResults(textContent)
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
    },
    async execute(args, ctx) {
      const results = await bskySearch({ query: args.query })
      const formatted = formatBskyResults(results)
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
    },
    async execute(args, ctx) {
      const results = await standardSearch(args.query)
      const formatted = formatStandardResults(results)
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}
