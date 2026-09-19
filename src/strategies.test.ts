import { describe, expect, it } from 'bun:test'
import { BlockedError, baseHeaders, detectBlock, nextUserAgent, runStrategies, USER_AGENTS } from './strategies.ts'

describe('nextUserAgent', () => {
  it('rotates through the pool', () => {
    const first = nextUserAgent()
    const second = nextUserAgent()

    expect(USER_AGENTS.includes(first)).toEqual(true)
    expect(USER_AGENTS.includes(second)).toEqual(true)
    expect(first === second).toEqual(false)
  })
})

describe('baseHeaders', () => {
  it('includes the user agent', () => {
    const headers = baseHeaders('test-agent')

    expect(headers['User-Agent']).toEqual('test-agent')
    expect(typeof headers['Accept']).toEqual('string')
  })
})

describe('detectBlock', () => {
  it('throws BlockedError when a marker is present', () => {
    expect(() => detectBlock('Test', '<div class="anomaly-modal">', ['anomaly-modal'])).toThrow(BlockedError)
  })

  it('does nothing when no marker is present', () => {
    expect(() => detectBlock('Test', '<div>results</div>', ['anomaly-modal'])).not.toThrow()
  })
})

describe('runStrategies', () => {
  it('returns the first non-empty result', async () => {
    const results = await runStrategies([
      { name: 'a', run: async () => [] },
      { name: 'b', run: async () => ['result'] },
    ])

    expect(results).toEqual(['result'])
  })

  it('falls through when a strategy throws', async () => {
    const results = await runStrategies<string>([
      {
        name: 'a',
        run: async () => {
          throw new Error('boom')
        },
      },
      { name: 'b', run: async () => ['result'] },
    ])

    expect(results).toEqual(['result'])
  })

  it('throws the last error when everything fails', async () => {
    const attempt = runStrategies([
      { name: 'a', run: async () => [] },
      {
        name: 'b',
        run: async () => {
          throw new Error('final failure')
        },
      },
    ])

    await expect(attempt).rejects.toThrow('final failure')
  })

  it('hands each strategy a different user agent', async () => {
    const seen: string[] = []

    await runStrategies([
      {
        name: 'a',
        run: async (userAgent) => {
          seen.push(userAgent)
          return []
        },
      },
      {
        name: 'b',
        run: async (userAgent) => {
          seen.push(userAgent)
          return ['done']
        },
      },
    ])

    expect(seen.length).toEqual(2)
    expect(seen[0] === seen[1]).toEqual(false)
  })
})
