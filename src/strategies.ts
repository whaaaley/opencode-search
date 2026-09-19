import { safeAsync } from './safe.ts'

export const USER_AGENTS = [
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
]

let uaIndex = 0

// Rotation gives each fallback attempt a fresh identity after a block
export const nextUserAgent = (): string => {
  const agent = USER_AGENTS[uaIndex % USER_AGENTS.length]
  uaIndex += 1

  return agent ?? ''
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
    if (html.includes(marker)) throw new BlockedError(source)
  }
}

export type Strategy<T> = {
  name: string
  run: (userAgent: string) => Promise<T[]>
}

// A strategy fails by throwing or by returning zero results; the next one gets a chance
export const runStrategies = async <T>(strategies: Strategy<T>[]): Promise<T[]> => {
  let lastError: Error = new Error('no strategies provided')

  for (const strategy of strategies) {
    const { data, error } = await safeAsync(() => strategy.run(nextUserAgent()))
    if (error) {
      lastError = error
      continue
    }

    if (data.length > 0) return data

    lastError = new Error(strategy.name + ' returned no results')
  }

  throw lastError
}
