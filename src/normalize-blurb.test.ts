import { describe, expect, it } from 'vite-plus/test'
import { normalizeBlurb } from './normalize-blurb.ts'

describe('normalizeBlurb', () => {
  it('strips HTML tags', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('<b>bold</b> and <em>italic</em>')).toBe('bold and italic')
  })

  it('strips self-closing tags', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('line one<br/>line two')).toBe('line one line two')
  })

  it('strips tags with attributes', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('<a href="https://example.com">link</a>')).toBe('link')
  })

  it('decodes named HTML entities', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('rock &amp; roll')).toBe('rock & roll')
    expect(normalizeBlurb('1 &lt; 2 &gt; 0')).toBe('1 < 2 > 0')
    expect(normalizeBlurb('&quot;hello&quot;')).toBe('"hello"')
    expect(normalizeBlurb('it&apos;s fine')).toBe("it's fine")
    expect(normalizeBlurb('non&nbsp;breaking')).toBe('non breaking')
  })

  it('decodes an escaped entity name once', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;')
  })

  it('decodes numeric character references', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('&#39;quoted&#39;')).toBe("'quoted'")
    expect(normalizeBlurb('&#169; 2026')).toBe('© 2026')
  })

  it('decodes hex character references', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('&#x27;hey&#x27;')).toBe("'hey'")
    expect(normalizeBlurb('&#xA9; 2026')).toBe('© 2026')
  })

  it('collapses multiple spaces', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('too   many    spaces')).toBe('too many spaces')
  })

  it('collapses newlines and tabs', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('line one\nline two\ttab')).toBe('line one line two tab')
  })

  it('collapses carriage returns', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('hello\r\nworld')).toBe('hello world')
  })

  it('trims leading and trailing whitespace', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('  padded  ')).toBe('padded')
  })

  it('handles combined mess', { meta: { steps: 0 } }, () => {
    const input = '  <span class="highlight">Rock &amp; Roll</span>\n\n  is &#x27;great&#x27;  '
    expect(normalizeBlurb(input)).toBe("Rock & Roll is 'great'")
  })

  it('returns empty string for empty input', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('')).toBe('')
  })

  it('returns empty string for whitespace-only input', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('   \n\t  ')).toBe('')
  })

  it('passes through clean text unchanged', { meta: { steps: 0 } }, () => {
    expect(normalizeBlurb('nothing to normalize')).toBe('nothing to normalize')
  })
})
