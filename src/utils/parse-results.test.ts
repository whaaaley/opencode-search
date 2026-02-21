import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { JSDOM } from 'jsdom'
import { parseResults } from './parse-results.ts'

const makeDoc = (html: string): Document => {
  const dom = new JSDOM(html)
  return dom.window.document
}

describe('parseResults', () => {
  it('extracts titles, links, and snippets', () => {
    const html = [
      '<div class="result">',
      '  <a class="result__a" href="https://example.com">Example Title</a>',
      '  <span class="result__snippet">Example snippet text</span>',
      '</div>',
      '<div class="result">',
      '  <a class="result__a" href="https://other.com">Other Title</a>',
      '  <span class="result__snippet">Other snippet text</span>',
      '</div>',
    ].join('\n')

    const result = parseResults(makeDoc(html))
    const expected = [
      'Example Title',
      'https://example.com',
      'Example snippet text',
      '',
      'Other Title',
      'https://other.com',
      'Other snippet text',
    ].join('\n')

    assertEquals(result, expected)
  })

  it('skips results with no title', () => {
    const html = [
      '<div class="result">',
      '  <a class="result__a" href="https://empty.com"></a>',
      '  <span class="result__snippet">Should be skipped</span>',
      '</div>',
      '<div class="result">',
      '  <a class="result__a" href="https://valid.com">Valid</a>',
      '  <span class="result__snippet">Kept</span>',
      '</div>',
    ].join('\n')

    const result = parseResults(makeDoc(html))
    const expected = [
      'Valid',
      'https://valid.com',
      'Kept',
    ].join('\n')

    assertEquals(result, expected)
  })

  it('handles missing snippets', () => {
    const html = '<a class="result__a" href="https://example.com">Title Only</a>'

    const result = parseResults(makeDoc(html))
    const expected = [
      'Title Only',
      'https://example.com',
    ].join('\n')

    assertEquals(result, expected)
  })

  it('returns empty string for no results', () => {
    const result = parseResults(makeDoc('<div>no results here</div>'))
    assertEquals(result, '')
  })
})
