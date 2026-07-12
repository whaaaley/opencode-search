// The alias avoids Bun's incomplete built-in `undici` compatibility shim.
import { connect as connectTls } from 'node:tls'
import { SocksClient } from 'socks'
import * as undici from 'undici-package'
import type { Dispatcher, RequestInit as UndiciRequestInit } from 'undici-package'

const { Agent, EnvHttpProxyAgent, fetch: undiciFetch } = undici

export type ProxyConfig = {
  httpProxy?: string
  httpsProxy?: string
  socksProxy?: string
  noProxy?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

let httpProxyDispatcher: Dispatcher | undefined
let socksProxyDispatcher: Dispatcher | undefined
let torProxyCheck: Promise<boolean> | undefined
let torProxyKey: string | undefined
let proxyStatus = {
  configured: false,
  proxyType: 'none' as 'none' | 'http' | 'socks',
}

const normalizeProxyUrl = (
  value: unknown,
  name: string,
  allowedProtocols: readonly string[],
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new TypeError(`${name} must be a URL string`)

  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new TypeError(`${name} must be a valid URL`)
  }

  if (!url.hostname || !allowedProtocols.includes(url.protocol)) {
    throw new TypeError(`${name} must use ${allowedProtocols.join(' or ')}`)
  }

  return url.toString()
}

export const proxyConfigFromEnv = (env: NodeJS.ProcessEnv = process.env): ProxyConfig => ({
  httpProxy: env.OPENCODE_SEARCH_HTTP_PROXY,
  httpsProxy: env.OPENCODE_SEARCH_HTTPS_PROXY,
  socksProxy: env.OPENCODE_SEARCH_SOCKS_PROXY,
  noProxy: env.OPENCODE_SEARCH_NO_PROXY,
})

export const proxyConfigFromOptions = (options: unknown, env: NodeJS.ProcessEnv = process.env): ProxyConfig => {
  const fallback = proxyConfigFromEnv(env)
  if (options === undefined) return fallback
  if (!isRecord(options)) throw new TypeError('plugin options must be an object')

  const proxy = options.proxy
  if (proxy === undefined) return fallback
  if (!isRecord(proxy)) throw new TypeError('proxy options must be an object')

  const value = (key: keyof ProxyConfig) => Object.hasOwn(proxy, key) ? proxy[key] : fallback[key]
  return {
    httpProxy: value('httpProxy') as string | undefined,
    httpsProxy: value('httpsProxy') as string | undefined,
    socksProxy: value('socksProxy') as string | undefined,
    noProxy: value('noProxy') as string | undefined,
  }
}

export const configureProxy = async (config: ProxyConfig = proxyConfigFromEnv()): Promise<void> => {
  const httpProxy = normalizeProxyUrl(config.httpProxy, 'httpProxy', ['http:', 'https:'])
  const httpsProxy = normalizeProxyUrl(config.httpsProxy, 'httpsProxy', ['http:', 'https:'])
  const socksProxy = normalizeProxyUrl(config.socksProxy, 'socksProxy', ['socks:', 'socks5:'])
  const noProxy = typeof config.noProxy === 'string' ? config.noProxy.trim() : ''

  const sharedHttpProxy = httpProxy ?? httpsProxy
  const sharedHttpsProxy = httpsProxy ?? httpProxy
  const nextSocksDispatcher = socksProxy ? createSocksDispatcher(new URL(socksProxy)) : undefined
  const nextHttpDispatcher = !socksProxy && (sharedHttpProxy || sharedHttpsProxy)
    ? new EnvHttpProxyAgent({
      // Supplying every value prevents EnvHttpProxyAgent from falling back to
      // process-wide HTTP_PROXY, HTTPS_PROXY, or NO_PROXY variables.
      httpProxy: sharedHttpProxy ?? '',
      httpsProxy: sharedHttpsProxy ?? '',
      noProxy,
    })
    : undefined

  const previousHttpDispatcher = httpProxyDispatcher
  const previousSocksDispatcher = socksProxyDispatcher
  httpProxyDispatcher = nextHttpDispatcher
  socksProxyDispatcher = nextSocksDispatcher
  if (torProxyKey !== socksProxy) {
    torProxyKey = socksProxy
    torProxyCheck = undefined
  }
  proxyStatus = {
    configured: Boolean(nextSocksDispatcher || nextHttpDispatcher),
    proxyType: nextSocksDispatcher ? 'socks' : nextHttpDispatcher ? 'http' : 'none',
  }

  if (previousHttpDispatcher && previousHttpDispatcher !== nextHttpDispatcher) {
    await previousHttpDispatcher.close()
  }
  if (previousSocksDispatcher && previousSocksDispatcher !== nextSocksDispatcher) {
    await previousSocksDispatcher.close()
  }

  if (nextSocksDispatcher) {
    await isTorProxy()
  }
}

export const getProxyStatus = () => ({
  ...proxyStatus,
  dispatcher: Boolean(httpProxyDispatcher || socksProxyDispatcher),
})

// Keep results fetched through different transports separate. In particular,
// a direct result must never satisfy a search while proxying is enabled.
export const getProxyCacheScope = (): string => `${proxyStatus.proxyType}:`

export const isTorProxy = async (): Promise<boolean> => {
  if (!socksProxyDispatcher) return false

  torProxyCheck ??= undiciFetch('https://check.torproject.org/api/ip', {
    dispatcher: socksProxyDispatcher,
    signal: AbortSignal.timeout(10_000),
  }).then(async (response) => {
    if (!response.ok) return false
    const data = await response.json() as { IsTor?: unknown }
    return data.IsTor === true
  }).catch(() => false)

  return torProxyCheck
}

export const proxyFetch = async (input: string | URL, init?: globalThis.RequestInit): Promise<Response> => {
  const requestInit = {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(20_000),
  }
  const dispatcher = socksProxyDispatcher ?? httpProxyDispatcher
  if (!dispatcher) {
    return fetch(input, requestInit)
  }

  return undiciFetch(input, {
    ...requestInit,
    dispatcher,
  } as UndiciRequestInit) as unknown as Promise<Response>
}

const createSocksDispatcher = (proxy: URL): Dispatcher => {
  const proxyPort = Number(proxy.port || 1080)
  const username = proxy.username ? decodeURIComponent(proxy.username) : undefined
  const password = proxy.password ? decodeURIComponent(proxy.password) : undefined

  return new Agent({
    connect: async (options, callback) => {
      try {
        const { socket } = await SocksClient.createConnection({
          command: 'connect',
          proxy: {
            host: proxy.hostname,
            port: proxyPort,
            type: 5,
            userId: username,
            password,
          },
          destination: {
            host: options.hostname,
            port: Number(options.port || (options.protocol === 'https:' ? 443 : 80)),
          },
        })

        if (options.protocol !== 'https:') {
          callback(null, socket)
          return
        }

        const secureSocket = connectTls({
          socket,
          servername: options.servername || options.hostname,
          ALPNProtocols: ['http/1.1'],
        })
        secureSocket.once('secureConnect', () => callback(null, secureSocket))
        secureSocket.once('error', callback)
      } catch (error) {
        callback(error as Error, null)
      }
    },
  })
}
