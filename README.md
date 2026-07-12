# opencode-search

An [OpenCode](https://opencode.ai) plugin that gives your agent access to DuckDuckGo, Google, Wikipedia, Bluesky, [standard.site](https://standard.site), and MDN Web Docs.

<img width="786" height="377" alt="image" src="https://github.com/user-attachments/assets/9ad19ade-402a-4cc1-9882-a33d2a8e4d42" />

## Quick Start

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-search"]
}
```

Restart OpenCode. The plugin will be installed automatically.

## Proxy Configuration

You can configure outbound proxying in the plugin entry. The proxy is used only by this plugin's search requests; it does not affect OpenCode or the configured model provider. Use an absolute path for a local checkout because OpenCode does not expand `~` in plugin paths.

```json
{
  "plugin": [
    [
      "/absolute/path/to/opencode-search",
      {
        "proxy": {
          "socksProxy": "socks5://127.0.0.1:9050",
          "noProxy": "localhost,127.0.0.1"
        }
      }
    ]
  ]
}
```

Use `httpProxy` and `httpsProxy` for standard HTTP or HTTPS proxies. If only one is set, it is used for both HTTP and HTTPS requests. `noProxy` contains an optional comma-separated bypass list. Use `socksProxy` for a SOCKS5 proxy; it takes precedence over the HTTP proxy settings.

As an alternative, set `OPENCODE_SEARCH_HTTP_PROXY`, `OPENCODE_SEARCH_HTTPS_PROXY`, `OPENCODE_SEARCH_SOCKS_PROXY`, or `OPENCODE_SEARCH_NO_PROXY` before starting OpenCode. Values in `opencode.json` take precedence. Generic variables such as `HTTP_PROXY` are deliberately ignored so this plugin cannot accidentally inherit OpenCode's proxy configuration.

When a SOCKS proxy is configured, the plugin checks Tor's official IP endpoint once at startup and caches the result. Over Tor:

- DuckDuckGo automatically uses its official onion `/html` endpoint.
- Wikipedia, MDN, and Bluesky use their normal APIs and have been verified to work.
- Google fails immediately with a clear error because it requires a JavaScript challenge over Tor.
- Standard.site may return an upstream 502; this has also occurred without Tor.

All proxied requests have a 20-second timeout and fail closed; they never retry over a direct connection.

For a local checkout, build the package and reference its directory in `opencode.json`. Remove any automatic `.opencode/plugins/` symlink for this plugin so it is not loaded twice:

```bash
cd /absolute/path/to/opencode-search
npm install
npm run build
```

## Tools

### ddg-search

Search the web using DuckDuckGo. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Uses DuckDuckGo's HTML endpoint with POST form parameters to avoid CAPTCHAs.
Results are parsed from the HTML response into structured title/URL/abstract triples.

### ggl-search

Search the web using Google. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Uses Google's HTML search with cookie replay to avoid blocks, derived from [googler](https://github.com/jarun/googler).
Google aggressively blocks non-JS clients, so this tool may return empty results depending on your network environment.

### bsky-search

Search Bluesky posts via the AT Protocol. Returns posts with author handle, text, and engagement counts (likes, reposts, replies).

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `query`   | string | yes      |                                |
| `limit`   | number | no       | Number of results to return    |
| `sort`    | string | no       | Sort order: `top` or `latest`  |

### standard-search

Search [standard.site](https://standard.site) document records on the AT Protocol. Returns blog posts and articles published to the ATmosphere with title, URL, date, and snippet.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results to return        |
| `offset`  | number | no       | Number of results to skip          |

standard.site is a publishing platform built on the AT Protocol where content is stored in a user's personal data repository. Unlike traditional websites that require crawlers and indexing pipelines to be discoverable, content published on standard.site is structured, portable, and directly queryable through the AT Protocol.

### wiki-search

Search Wikipedia articles using the MediaWiki REST API. Returns structured results with title, description, excerpt, and a direct link to the article. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results (1-100)          |

### mdn-search

Search MDN Web Docs. Returns documentation pages for web technologies with title, URL, and summary. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results to return        |
| `page`    | number | no       | Page number for pagination         |

## License

MIT
