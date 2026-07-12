import { afterEach, describe, expect, it } from 'bun:test'
import {
  configureProxy,
  getProxyCacheScope,
  getProxyStatus,
  isTorProxy,
  proxyConfigFromEnv,
  proxyConfigFromOptions,
  proxyFetch,
} from './proxy.ts'

describe('proxy configuration', () => {
  afterEach(async () => {
    await configureProxy({})
  })

  it('reads only plugin-specific environment variables', () => {
    expect(proxyConfigFromEnv({
      HTTP_PROXY: 'http://unrelated.example:8080',
      HTTPS_PROXY: 'http://unrelated.example:8080',
      NO_PROXY: '*',
      OPENCODE_SEARCH_HTTP_PROXY: 'http://plugin.example:8081',
    })).toEqual({
      httpProxy: 'http://plugin.example:8081',
      httpsProxy: undefined,
      socksProxy: undefined,
      noProxy: undefined,
    })
  })

  it('uses plugin options before environment variables', () => {
    expect(proxyConfigFromOptions({
      proxy: {
        socksProxy: 'socks5://configured.example:9050',
        noProxy: '',
      },
    }, {
      OPENCODE_SEARCH_HTTP_PROXY: 'http://environment.example:8080',
      OPENCODE_SEARCH_SOCKS_PROXY: 'socks5://environment.example:1080',
      OPENCODE_SEARCH_NO_PROXY: 'localhost',
    })).toEqual({
      httpProxy: 'http://environment.example:8080',
      httpsProxy: undefined,
      socksProxy: 'socks5://configured.example:9050',
      noProxy: '',
    })
  })

  it('rejects malformed plugin options', () => {
    expect(() => proxyConfigFromOptions({ proxy: 'http://127.0.0.1:8080' })).toThrow(
      'proxy options must be an object',
    )
  })

  it('configures and resets an HTTP proxy', async () => {
    await configureProxy({ httpProxy: 'http://127.0.0.1:8080' })
    expect(getProxyStatus()).toEqual({ configured: true, proxyType: 'http', dispatcher: true })
    expect(getProxyCacheScope()).toBe('http:')
    expect(await isTorProxy()).toBe(false)

    await configureProxy({})
    expect(getProxyStatus()).toEqual({ configured: false, proxyType: 'none', dispatcher: false })
    expect(getProxyCacheScope()).toBe('none:')
  })

  it('configures a SOCKS5 proxy', async () => {
    await configureProxy({ socksProxy: 'socks5://127.0.0.1:1080' })
    expect(getProxyStatus()).toEqual({ configured: true, proxyType: 'socks', dispatcher: true })
    expect(getProxyCacheScope()).toBe('socks:')
  })

  it('fails closed when the configured SOCKS proxy is unavailable', async () => {
    await configureProxy({ socksProxy: 'socks5://127.0.0.1:1' })

    await expect(proxyFetch('https://example.com')).rejects.toThrow()
  })

  it('rejects unsupported proxy protocols', async () => {
    expect(configureProxy({ httpProxy: 'file:///tmp/socket' })).rejects.toThrow('httpProxy must use')
    expect(configureProxy({ socksProxy: 'http://127.0.0.1:1080' })).rejects.toThrow('socksProxy must use')
  })
})
