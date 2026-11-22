import { z } from 'zod'
import type { Deps } from '../deps.ts'
import type { WebResult } from '../web-result.ts'

// The search AWS's own documentation site and its documentation MCP server call, which needs no key.
const AWS_DOCS_SEARCH_URL = 'https://proxy.search.docs.aws.com/search'
const DEFAULT_LIMIT = 10

// https://github.com/awslabs/mcp/blob/main/src/aws-documentation-mcp-server/awslabs/aws_documentation_mcp_server/server_aws.py
const excerptSchema = z.object({
  title: z.string().default(''),
  link: z.string().default(''),
  summary: z.string().default(''),
  suggestionBody: z.string().default(''),
})

const suggestionSchema = z.object({
  textExcerptSuggestion: excerptSchema.optional(),
})

const responseSchema = z.object({
  suggestions: z.array(suggestionSchema).default([]),
})

export const awsDocsSearch = async ({ fetch, cache }: Deps, query: string, limit = DEFAULT_LIMIT): Promise<WebResult[]> => {
  const cacheKey = 'aws-docs:' + query

  const cached = await cache.get<WebResult[]>(cacheKey)
  if (cached) return cached.slice(0, limit)

  const body = JSON.stringify({
    textQuery: { input: query },
    contextAttributes: [{ key: 'domain', value: 'docs.aws.amazon.com' }],
    acceptSuggestionBody: 'RawText',
    locales: ['en_us'],
  })
  const res = await fetch(AWS_DOCS_SEARCH_URL + '?session=' + crypto.randomUUID(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

  if (!res.ok) throw new Error('AWS docs search returned ' + res.status + ' ' + res.statusText)

  const { suggestions } = responseSchema.parse(await res.json())
  const found = suggestions.flatMap(({ textExcerptSuggestion: excerpt }) => {
    if (!excerpt?.title || !excerpt.link) return []

    return [{ title: excerpt.title, url: excerpt.link, abstract: excerpt.summary || excerpt.suggestionBody }]
  })

  void cache.set(cacheKey, found)

  return found.slice(0, limit)
}
