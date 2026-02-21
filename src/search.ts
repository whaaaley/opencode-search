import type { PluginInput, ToolContext } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import type { BskySearchResult } from './utils/bsky-search.ts'
import { bskySearch } from './utils/bsky-search.ts'
import { ddgSearch } from './utils/ddg-search.ts'
import { sendResult } from './utils/notify.ts'
import type { StandardSearchResult } from './utils/standard-search.ts'
import { standardSearch } from './utils/standard-search.ts'
import type { WikiSearchResult } from './utils/wiki-search.ts'
import { wikiSearch } from './utils/wiki-search.ts'

type Client = PluginInput['client']

type PaginationOptions = {
  total: number
  count: number
  limit?: number
  offset?: number
}

const formatHeader = (label: string, options: PaginationOptions): string => {
  const { total, count, limit, offset } = options
  const start = (offset ?? 0) + 1
  const end = (offset ?? 0) + count
  const pageSize = limit ?? count
  const page = pageSize > 0 ? Math.floor((offset ?? 0) / pageSize) + 1 : 1
  return label + ' (showing ' + start + '-' + end + ' of ' + total + ', page ' + page + ')'
}

const formatDate = (raw: string): string => {
  const d = new Date(raw)
  if (isNaN(d.getTime())) {
    return raw
  }
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  const m = String(minutes).padStart(2, '0')
  return month + ' ' + day + ', ' + year + ' ' + h + ':' + m + ' ' + ampm
}

const formatDateOnly = (raw: string): string => {
  const d = new Date(raw)
  if (isNaN(d.getTime())) {
    return raw
  }
  const month = d.toLocaleString('en-US', { month: 'short' })
  return month + ' ' + d.getDate() + ', ' + d.getFullYear()
}

const formatDdgResults = (textContent: string): string => {
  const lines = [
    'DuckDuckGo results (showing 1 of 1, page 1)',
    '',
    textContent,
  ]
  return lines.join('\n')
}

type FormatBskyOptions = {
  results: BskySearchResult
  limit?: number
}

const formatBskyResults = (options: FormatBskyOptions): string => {
  const { results, limit } = options
  const header = formatHeader('Bluesky results', {
    total: results.hitsTotal,
    count: results.posts.length,
    limit,
    offset: 0,
  })

  const lines: string[] = [header, '']
  for (let i = 0; i < results.posts.length; i++) {
    const post = results.posts[i]
    if (!post) {
      continue
    }
    lines.push(String(i + 1) + '. @' + post.author.handle + ' (' + formatDate(post.record.createdAt) + ')')
    lines.push('   ' + post.record.text.replace(/\n/g, ' '))
    lines.push('   Likes: ' + post.likeCount + '  Reposts: ' + post.repostCount + '  Replies: ' + post.replyCount)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

type FormatStandardOptions = {
  results: StandardSearchResult
  limit?: number
  offset?: number
}

const formatStandardResults = (options: FormatStandardOptions): string => {
  const { results, limit, offset } = options
  const total = Number(results.totalResults) || results.documents.length
  const header = formatHeader('Standard.site results', {
    total,
    count: results.documents.length,
    limit,
    offset,
  })

  const lines: string[] = [header, '']
  for (let i = 0; i < results.documents.length; i++) {
    const doc = results.documents[i]
    if (!doc) {
      continue
    }
    const titleLine = doc.date
      ? String(i + 1) + '. ' + doc.title + ' (' + formatDateOnly(doc.date) + ')'
      : String(i + 1) + '. ' + doc.title
    lines.push(titleLine)
    lines.push('   ' + doc.url)
    lines.push('   ' + doc.snippet)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

type FormatWikiOptions = {
  results: WikiSearchResult
  limit?: number
}

const formatWikiResults = (options: FormatWikiOptions): string => {
  const { results, limit } = options
  const header = formatHeader('Wikipedia results', {
    total: results.pages.length,
    count: results.pages.length,
    limit,
    offset: 0,
  })

  const lines: string[] = [header, '']
  for (let i = 0; i < results.pages.length; i++) {
    const page = results.pages[i]
    if (!page) {
      continue
    }
    const url = 'https://en.wikipedia.org/wiki/' + page.key
    lines.push(String(i + 1) + '. ' + page.title)
    lines.push('   ' + url)
    if (page.description) {
      lines.push('   ' + page.description)
    }
    lines.push('   ' + page.excerpt)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

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
      limit: tool.schema.number().optional().describe('Maximum number of results to return'),
    },
    async execute(args, ctx) {
      const results = await bskySearch({
        query: args.query,
        limit: args.limit,
      })
      const formatted = formatBskyResults({
        results,
        limit: args.limit,
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
      const formatted = formatStandardResults({
        results,
        limit: args.limit,
        offset: args.offset,
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
      const formatted = formatWikiResults({
        results,
        limit: args.limit,
      })
      postResult(client, ctx, formatted)
      return formatted
    },
  })
}
