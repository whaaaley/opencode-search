import { describe, expect, it } from 'bun:test'
import {
  formatDate,
  formatHeader,
  formatResults,
} from './format.ts'

describe('formatHeader', () => {
  it('formats basic header with defaults', () => {
    const result = formatHeader('Test results', {
      total: 10,
      count: 5,
    })
    expect(result).toBe('Test results (showing 1-5 of 10, page 1)')
  })

  it('includes offset in range', () => {
    const result = formatHeader('Test results', {
      total: 50,
      count: 10,
      limit: 10,
      offset: 20,
    })
    expect(result).toBe('Test results (showing 21-30 of 50, page 3)')
  })

  it('calculates page 1 when limit matches count', () => {
    const result = formatHeader('Test results', {
      total: 25,
      count: 25,
      limit: 25,
      offset: 0,
    })
    expect(result).toBe('Test results (showing 1-25 of 25, page 1)')
  })

  it('handles zero count', () => {
    const result = formatHeader('Empty', {
      total: 0,
      count: 0,
    })
    expect(result).toBe('Empty (showing 1-0 of 0, page 1)')
  })
})

describe('formatDate', () => {
  it('formats a valid ISO date string without time', () => {
    const result = formatDate('2025-06-15T14:30:00.000Z')
    expect(result).toContain('Jun')
    expect(result).toContain('2025')
    expect(result).not.toContain(':')
  })

  it('returns raw string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })

  it('includes time when time flag is true', () => {
    const result = formatDate('2025-01-01T03:05:00.000Z', true)
    expect(result).toMatch(/AM|PM/)
    expect(result).toMatch(/:05/)
  })

  it('excludes time when time flag is false', () => {
    const result = formatDate('2025-01-01T12:05:00.000Z', false)
    expect(result).not.toContain(':')
  })
})

describe('formatResults', () => {
  it('renders header and items using renderItem callback', () => {
    const result = formatResults({
      label: 'Test',
      items: ['a', 'b'],
      total: 2,
      renderItem: (item, i) => `${i + 1}. ${item}`,
    })
    expect(result).toBe([
      'Test (showing 1-2 of 2, page 1)',
      '',
      '1. a',
      '',
      '2. b',
    ].join('\n'))
  })

  it('supports multi-line renderItem output', () => {
    const result = formatResults({
      label: 'Multi',
      items: [{ title: 'Foo', url: 'https://foo.com' }],
      total: 1,
      renderItem: (item) => `${item.title}\n   ${item.url}`,
    })
    expect(result).toBe([
      'Multi (showing 1-1 of 1, page 1)',
      '',
      'Foo',
      '   https://foo.com',
    ].join('\n'))
  })

  it('passes limit and offset to header', () => {
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

  it('handles empty items array', () => {
    const result = formatResults({
      label: 'Empty',
      items: [],
      total: 0,
      renderItem: () => 'should not appear',
    })
    expect(result).toBe('Empty (showing 1-0 of 0, page 1)')
  })
})

