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
  if (!titleEl || !titleEl.textContent) {
    return null
  }

  const title = titleEl.textContent.trim()
  const href = titleEl.getAttribute('href')

  const urlEl = el.querySelector('.result-url')
  const urlText = urlEl && urlEl.textContent ? urlEl.textContent : ''

  const snippetEl = el.querySelector('.result-snippet')
  const snippet = snippetEl && snippetEl.textContent ? snippetEl.textContent : ''

  const parts = urlText.split(' \u00B7 ')
  const datePart = parts.length > 1 ? parts[1] : ''

  return {
    title,
    url: href ? href.trim() : '',
    date: datePart ? datePart.trim() : '',
    snippet: snippet.trim(),
  }
}

export const standardSearch = async (query: string): Promise<StandardSearchResult> => {
  const cacheKey = 'standard:' + query

  const cached = await cache.get<StandardSearchResult>(cacheKey)
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
  const countText = countEl ? countEl.textContent : ''
  const totalResults = countText ? countText.trim() : '0'

  const elements = doc.querySelectorAll('.result')
  const documents: Array<StandardDocument> = []

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (!el) {
      continue
    }

    const parsed = parseDocument(el)
    if (parsed) {
      documents.push(parsed)
    }
  }

  if (documents.length === 0) {
    throw new Error('Standard Search returned no results for: ' + query)
  }

  const result: StandardSearchResult = {
    documents,
    totalResults,
  }

  await cache.set(cacheKey, result)

  return result
}
