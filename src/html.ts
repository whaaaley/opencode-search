import { JSDOM, VirtualConsole } from 'jsdom'
import { baseHeaders, BlockedError } from './strategies.ts'

export type SearchResult = {
  title: string
  url: string
  abstract: string
}

// A console with no listener keeps jsdom's parse errors out of the output.
export const makeDom = (html: string, url: string): Document => {
  return new JSDOM(html, { url, virtualConsole: new VirtualConsole() }).window.document
}

// Matches the status heading block pages repeat before the useful sentence.
export const statusHeadingPattern = /\b\d{3}\s*-?\s*(Forbidden|Too Many Requests)\b/gi

const blockedStatuses: ReadonlySet<number> = new Set([403, 429])

type FetchHtmlInput = {
  fetch: typeof fetch
  url: string
  userAgent: string
}

export const fetchHtml = async ({ fetch, url, userAgent }: FetchHtmlInput): Promise<string> => {
  const res = await fetch(url, { headers: baseHeaders(userAgent) })

  // A bare status code reads as a transient fault and invites a retry.
  if (blockedStatuses.has(res.status)) {
    const body = await res.text().catch(() => '')
    const reason = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(statusHeadingPattern, '')
      .trim()
      .slice(0, 140)

    throw new BlockedError(new URL(url).hostname + (reason ? ' — ' + reason : ''))
  }

  if (!res.ok) throw new Error(res.status + ' ' + res.statusText)

  return res.text()
}
