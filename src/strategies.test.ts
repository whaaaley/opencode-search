import { describe, expect, it } from 'vite-plus/test'
import { BlockedError, baseHeaders, detectBlock, nextUserAgent, runStrategies, type Strategy, USER_AGENTS } from './strategies.ts'

describe('nextUserAgent', () => {
  it('rotates through the pool', { meta: { steps: 2 } }, () => {
    const first = nextUserAgent()
    const second = nextUserAgent()

    expect(USER_AGENTS.includes(first)).toEqual(true)
    expect(USER_AGENTS.includes(second)).toEqual(true)
    expect(first === second).toEqual(false)
  })

  it('hands out every agent in the pool before repeating one', { meta: { steps: 4 } }, () => {
    const agents = USER_AGENTS.map(() => nextUserAgent())

    expect(agents.toSorted()).toEqual(USER_AGENTS.toSorted())
  })
})

describe('baseHeaders', () => {
  it('includes the user agent', { meta: { steps: 0 } }, () => {
    const headers = baseHeaders('test-agent')

    expect(headers).toEqual({ 'User-Agent': 'test-agent', Accept: 'text/html', 'Accept-Encoding': 'gzip', DNT: '1' })
  })
})

describe('BlockedError', () => {
  it('names the source that blocked', { meta: { steps: 0 } }, () => {
    const error = new BlockedError('Test')

    expect(error.name).toEqual('BlockedError')
    expect(error.message).toEqual('Test blocked the request (CAPTCHA or rate limit)')
  })
})

describe('detectBlock', () => {
  it('throws BlockedError when a marker is present', { meta: { steps: 2 } }, () => {
    expect(() => detectBlock('Test', '<div class="anomaly-modal">', ['anomaly-modal'])).toThrow(BlockedError)
  })

  it('checks every marker', { meta: { steps: 3 } }, () => {
    expect(() => detectBlock('Test', '<form id="challenge">', ['anomaly-modal', 'challenge'])).toThrow(BlockedError)
  })

  it('does nothing when no marker is present', { meta: { steps: 2 } }, () => {
    expect(() => detectBlock('Test', '<div>results</div>', ['anomaly-modal'])).not.toThrow()
  })
})

describe('runStrategies', () => {
  it('returns the first non-empty result', { meta: { steps: 7 } }, async () => {
    const strategies: Strategy<string>[] = [
      { name: 'a', run: async () => [] },
      { name: 'b', run: async () => ['result'] },
    ]

    expect(await runStrategies(strategies)).toEqual(['result'])
  })

  it('falls through when a strategy throws', { meta: { steps: 7 } }, async () => {
    const strategies: Strategy<string>[] = [
      {
        name: 'a',
        run: async () => {
          throw new Error('boom')
        },
      },
      {
        name: 'b',
        run: async () => ['result'],
      },
    ]

    expect(await runStrategies(strategies)).toEqual(['result'])
  })

  it('names every failure when everything fails', { meta: { steps: 7 } }, async () => {
    const strategies: Strategy<string>[] = [
      { name: 'a', run: async () => [] },
      {
        name: 'b',
        run: async () => {
          throw new Error('final failure')
        },
      },
    ]

    await expect(runStrategies(strategies)).rejects.toThrow(new Error('a: no results; b: final failure'))
  })

  it('hands each strategy a different user agent', { meta: { steps: 7 } }, async () => {
    const seen: string[] = []
    const strategies: Strategy<string>[] = [
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
    ]

    await runStrategies(strategies)

    expect(seen.length).toEqual(2)
    expect(seen[0] === seen[1]).toEqual(false)
  })
})
