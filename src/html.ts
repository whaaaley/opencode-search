import { JSDOM, VirtualConsole } from 'jsdom'
import { baseHeaders, BlockedError } from './strategies.ts'

// Shared by every HTML-scraping provider. Each engine has its own module and its own tool, so these
// two are the only things they have in common.
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

  // 403 and 429 are how an engine says it has decided this client is a bot, and the body usually says
  // so in a sentence worth passing on — Mojeek returns 'your network appears to be sending automated
  // queries'. A bare status code reads like a transient server fault and invites a pointless retry.
  if (res.status === 403 || res.status === 429) {
    const body = await res.text().catch(() => '')
    // Drop the status heading, which these pages repeat in <title> and <h1> before saying anything
    // useful, and keep what follows.
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
