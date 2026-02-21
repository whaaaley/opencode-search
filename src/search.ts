import { tool } from '@opencode-ai/plugin'
import { bskySearch } from './utils/bsky-search.ts'
import { ddgSearch } from './utils/ddg-search.ts'
import { googleSearch } from './utils/google-search.ts'
import { standardSearch } from './utils/standard-search.ts'

const formatGoogleResults = (results: any): string => {
  const request = results.queries && results.queries.request
  const totalResults = request && request[0] && request[0].totalResults

  const items = results.items
    ? results.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
    }))
    : []

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

const formatDdgResults = (textContent: string) => {
  return JSON.stringify(
    {
      source: 'duckduckgo',
      textContent,
    },
    null,
    2,
  )
}

export const webSearchTool = tool({
  description:
    'Search the web using Google (primary) with DuckDuckGo fallback. Returns a list of results with titles, links, and snippets.',
  args: {
    query: tool.schema.string().describe('The search query'),
  },
  async execute(args) {
    const errors: string[] = []

    // Try Google first
    try {
      const results = await googleSearch(args.query)
      return formatGoogleResults(results)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push('Google: ' + msg)
    }

    // Fall back to DDG
    try {
      const textContent = await ddgSearch(args.query)
      return formatDdgResults(textContent)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push('DuckDuckGo: ' + msg)
    }

    throw new Error('All search backends failed.\n' + errors.join('\n'))
  },
})

export const googleSearchTool = tool({
  description: 'Search Google Custom Search Engine and return results with titles, links, and snippets',
  args: {
    query: tool.schema.string().describe('The search query'),
  },
  async execute(args) {
    const results = await googleSearch(args.query)
    return formatGoogleResults(results)
  },
})

export const ddgSearchTool = tool({
  description: 'Search DuckDuckGo and return results as extracted text content',
  args: {
    query: tool.schema.string().describe('The search query'),
  },
  async execute(args) {
    const textContent = await ddgSearch(args.query)
    return formatDdgResults(textContent)
  },
})

const formatBskyResults = (results: any): string => {
  const posts = results.posts
    ? results.posts.map((post: any) => ({
      author: post.author.handle,
      text: post.record.text,
      createdAt: post.record.createdAt,
      likes: post.likeCount,
      reposts: post.repostCount,
      replies: post.replyCount,
      uri: post.uri,
    }))
    : []

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

const formatStandardResults = (results: any): string => {
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

export const bskySearchTool = tool({
  description: 'Search Bluesky posts via the AT Protocol. Returns posts with author, text, and engagement counts.',
  args: {
    query: tool.schema.string().describe('The search query'),
  },
  async execute(args) {
    const results = await bskySearch({ query: args.query })
    return formatBskyResults(results)
  },
})

export const standardSearchTool = tool({
  description:
    'Search site.standard.document records on the AT Protocol. Returns blog posts and articles from the ATmosphere.',
  args: {
    query: tool.schema.string().describe('The search query'),
  },
  async execute(args) {
    const results = await standardSearch(args.query)
    return formatStandardResults(results)
  },
})
