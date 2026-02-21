import { JSDOM, VirtualConsole } from 'jsdom'
import * as cache from './cache.ts'

const SEARCH_URL = 'https://standard-search.octet-stream.net/search'

type StandardDocument = {
  title: string
  url: string
  date: string
  snippet: string
}

export type StandardSearchResult = {
  documents: Array<StandardDocument>
  totalResults: string
}

const parseDocument = (el: Element): StandardDocument | null => {
  const titleEl = el.querySelector('.result-title a')
  const urlEl = el.querySelector('.result-url')
  const snippetEl = el.querySelector('.result-snippet')

  const title = titleEl ? titleEl.textContent : ''
  if (!title) {
    return null
  }

  const href = titleEl ? titleEl.getAttribute('href') : ''
  const urlText = urlEl ? urlEl.textContent : ''
  const snippet = snippetEl ? snippetEl.textContent : ''

  // URL line format: "https://example.com · 17 Feb 2026 · 🦋 Bluesky"
  const parts = urlText ? urlText.split(' \u00B7 ') : []
  const date = parts.length > 1 ? parts[1].trim() : ''

  return {
    title: title.trim(),
    url: href ? href.trim() : '',
    date,
    snippet: snippet ? snippet.trim() : '',
  }
}

export const standardSearch = async (query: string): Promise<StandardSearchResult> => {
  const cacheKey = 'standard:' + query

  const cached = await cache.get(cacheKey)
  if (cached && cached.documents && cached.documents.length > 0) {
    return cached
  }

  const url = SEARCH_URL + '?q=' + encodeURIComponent(query)
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Standard Search error (' + res.status + '): ' + res.statusText)
  }

  const html = await res.text()

  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', () => {})

  const dom = new JSDOM(html, { url, virtualConsole })
  const doc = dom.window.document

  const countEl = doc.querySelector('.result-count')
  const totalResults = countEl ? countEl.textContent || '0' : '0'

  const elements = doc.querySelectorAll('.result')
  const documents: Array<StandardDocument> = []

  for (let i = 0; i < elements.length; i++) {
    const parsed = parseDocument(elements[i])
    if (parsed) {
      documents.push(parsed)
    }
  }

  if (documents.length === 0) {
    throw new Error('Standard Search returned no results for: ' + query)
  }

  const result: StandardSearchResult = {
    documents,
    totalResults: totalResults.trim(),
  }

  await cache.set(cacheKey, result)

  return result
}
