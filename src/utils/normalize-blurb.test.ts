import { describe, expect, it } from 'bun:test'
import { normalizeBlurb } from './normalize-blurb.ts'

describe('normalizeBlurb', () => {
  it('strips HTML tags', () => {
    expect(normalizeBlurb('<b>bold</b> and <em>italic</em>')).toBe('bold and italic')
  })

  it('strips self-closing tags', () => {
    expect(normalizeBlurb('line one<br/>line two')).toBe('line one line two')
  })

  it('strips tags with attributes', () => {
    expect(normalizeBlurb('<a href="https://example.com">link</a>')).toBe('link')
  })

  it('decodes named HTML entities', () => {
    expect(normalizeBlurb('rock &amp; roll')).toBe('rock & roll')
    expect(normalizeBlurb('1 &lt; 2 &gt; 0')).toBe('1 < 2 > 0')
    expect(normalizeBlurb('&quot;hello&quot;')).toBe('"hello"')
    expect(normalizeBlurb('it&apos;s fine')).toBe("it's fine")
    expect(normalizeBlurb('non&nbsp;breaking')).toBe('non breaking')
  })

  it('decodes numeric character references', () => {
    expect(normalizeBlurb('&#39;quoted&#39;')).toBe("'quoted'")
    expect(normalizeBlurb('&#169; 2026')).toBe('© 2026')
  })

  it('decodes hex character references', () => {
    expect(normalizeBlurb('&#x27;hey&#x27;')).toBe("'hey'")
    expect(normalizeBlurb('&#xA9; 2026')).toBe('© 2026')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeBlurb('too   many    spaces')).toBe('too many spaces')
  })

  it('collapses newlines and tabs', () => {
    expect(normalizeBlurb("line one\nline two\ttab")).toBe('line one line two tab')
  })

  it('collapses carriage returns', () => {
    expect(normalizeBlurb("hello\r\nworld")).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeBlurb('  padded  ')).toBe('padded')
  })

  it('handles combined mess', () => {
    const input = '  <span class="highlight">Rock &amp; Roll</span>\n\n  is &#x27;great&#x27;  '
    expect(normalizeBlurb(input)).toBe("Rock & Roll is 'great'")
  })

  it('returns empty string for empty input', () => {
    expect(normalizeBlurb('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeBlurb('   \n\t  ')).toBe('')
  })

  it('passes through clean text unchanged', () => {
    expect(normalizeBlurb('nothing to normalize')).toBe('nothing to normalize')
  })
})
