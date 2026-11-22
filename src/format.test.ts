import { describe, expect, it } from 'vite-plus/test'
import { formatDate, formatDateTime, formatHeader, formatResults } from './format.ts'

describe('formatHeader', () => {
  it('formats basic header with defaults', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 10,
      count: 5,
    })
    expect(result).toBe('Test results (showing 1-5 of 10, page 1)')
  })

  it('includes offset in range', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 50,
      count: 10,
      limit: 10,
      offset: 20,
    })
    expect(result).toBe('Test results (showing 21-30 of 50, page 3)')
  })

  it('calculates page 1 when limit matches count', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 25,
      count: 25,
      limit: 25,
      offset: 0,
    })
    expect(result).toBe('Test results (showing 1-25 of 25, page 1)')
  })

  it('pages by count when no limit is given', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 30,
      count: 10,
      offset: 10,
    })
    expect(result).toBe('Test results (showing 11-20 of 30, page 2)')
  })

  it('pages by a limit of one', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 5,
      count: 1,
      limit: 1,
      offset: 2,
    })
    expect(result).toBe('Test results (showing 3-3 of 5, page 3)')
  })

  it('calls a zero limit page 1', { meta: { steps: 4 } }, () => {
    const result = formatHeader('Test results', {
      total: 5,
      count: 1,
      limit: 0,
      offset: 2,
    })
    expect(result).toBe('Test results (showing 3-3 of 5, page 1)')
  })

  it('handles zero count', { meta: { steps: 2 } }, () => {
    const result = formatHeader('Empty', {
      total: 0,
      count: 0,
    })
    expect(result).toBe('Empty (0 results)')
  })
})

describe('formatDate', () => {
  it('formats a valid ISO date string without time', { meta: { steps: 2 } }, () => {
    const result = formatDate('2025-06-15T14:30:00.000Z')
    expect(result).toContain('Jun')
    expect(result).toContain('2025')
    expect(result).not.toContain(':')
  })

  it('returns raw string for invalid date', { meta: { steps: 2 } }, () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDateTime', () => {
  it('includes time', { meta: { steps: 2 } }, () => {
    const result = formatDateTime('2025-01-01T03:05:00.000Z')
    expect(result).toMatch(/AM|PM/)
    expect(result).toMatch(/:05/)
  })

  it('returns raw string for invalid date', { meta: { steps: 2 } }, () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })
})

describe('formatResults', () => {
  it('renders header and items using renderItem callback', { meta: { steps: 5 } }, () => {
    const result = formatResults({
      label: 'Test',
      items: ['a', 'b'],
      total: 2,
      renderItem: (item, i) => `${i + 1}. ${item}`,
    })
    expect(result).toBe(['Test (showing 1-2 of 2, page 1)', '', '1. a', '', '2. b'].join('\n'))
  })

  it('supports multi-line renderItem output', { meta: { steps: 5 } }, () => {
    const result = formatResults({
      label: 'Multi',
      items: [{ title: 'Foo', url: 'https://foo.com' }],
      total: 1,
      renderItem: (item) => `${item.title}\n   ${item.url}`,
    })
    expect(result).toBe(['Multi (showing 1-1 of 1, page 1)', '', 'Foo', '   https://foo.com'].join('\n'))
  })

  it('passes limit and offset to header', { meta: { steps: 5 } }, () => {
    const result = formatResults({
      label: 'Paged',
      items: ['x'],
      total: 30,
      limit: 10,
      offset: 10,
      renderItem: (item) => item,
    })
    expect(result).toContain('showing 11-11 of 30, page 2')
  })

  it('handles empty items array', { meta: { steps: 3 } }, () => {
    const result = formatResults({
      label: 'Empty',
      items: [],
      total: 0,
      renderItem: () => 'should not appear',
    })
    expect(result).toBe('Empty (0 results)')
  })
})
