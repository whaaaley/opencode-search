import { JSDOM, VirtualConsole } from 'jsdom'
import { baseHeaders, BlockedError } from './strategies.ts'

export type SearchResult = {
  title: string
  url: string
  abstract: string
}

export const makeDom = (html: string, url: string): Document => {
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {
    // Silently ignore JSDOM errors
  })

  return new JSDOM(html, { url, virtualConsole }).window.document
}

export const fetchHtml = async (url: string, userAgent: string): Promise<string> => {
  const res = await fetch(url, { headers: baseHeaders(userAgent) })

  // A bare status code reads as a transient fault and invites a retry.
  if (res.status === 403 || res.status === 429) {
    const body = await res.text().catch(() => '')
    // Matches the status heading these pages repeat before the useful sentence.
    const reason = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\d{3}\s*-?\s*(Forbidden|Too Many Requests)\b/gi, '')
      .trim()
      .slice(0, 140)

    throw new BlockedError(new URL(url).hostname + (reason ? ' — ' + reason : ''))
  }

  if (!res.ok) throw new Error(res.status + ' ' + res.statusText)

  return res.text()
}
