// Shared request strategies, loosely ported from the ddgr and googler CLI
// tools. Both tools survive scraping HTML endpoints with the same handful of
// concepts: realistic desktop user agents, block/CAPTCHA detection, and
// falling back to an alternate endpoint when the primary one refuses.

export const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
]

let uaIndex = 0

// Rotate through the pool so a blocked strategy retries with a fresh identity
export const nextUserAgent = (): string => {
  const agent = USER_AGENTS[uaIndex % USER_AGENTS.length] as string
  uaIndex += 1
  return agent
}

export const baseHeaders = (userAgent: string): Record<string, string> => ({
  'User-Agent': userAgent,
  'Accept': 'text/html',
  'Accept-Encoding': 'gzip',
  'DNT': '1',
})

export class BlockedError extends Error {
  constructor(source: string) {
    super(source + ' blocked the request (CAPTCHA or rate limit)')
    this.name = 'BlockedError'
  }
}

export const detectBlock = (source: string, html: string, markers: string[]): void => {
  for (const marker of markers) {
    if (html.includes(marker)) {
      throw new BlockedError(source)
    }
  }
}

export type Strategy<T> = {
  name: string
  run: (userAgent: string) => Promise<T[]>
}

// Try each strategy in order with a rotated user agent. A strategy "fails"
// by throwing or by returning zero results; the next one gets a chance.
// The last error propagates if nothing succeeds.
export const runStrategies = async <T>(strategies: Strategy<T>[]): Promise<T[]> => {
  let lastError: Error = new Error('no strategies provided')

  for (const strategy of strategies) {
    try {
      const results = await strategy.run(nextUserAgent())
      if (results.length > 0) {
        return results
      }
      lastError = new Error(strategy.name + ' returned no results')
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw lastError
}
