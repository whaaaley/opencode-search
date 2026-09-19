# opencode-search

An [OpenCode](https://opencode.ai) plugin that gives your agent access to DuckDuckGo, Brave, Google News, Wikipedia, Bluesky, [standard.site](https://standard.site), and MDN Web Docs.

<img width="786" height="377" alt="image" src="https://github.com/user-attachments/assets/9ad19ade-402a-4cc1-9882-a33d2a8e4d42" />

## What this adds over OpenCode's built-in tools

Seven search tools that work without an API key. OpenCode 1 has no web search at all unless you use its own provider, and OpenCode 2's requires a key for Exa, Firecrawl, Parallel or Tavily.

Five of the tools search sources a general web search does not reach: Bluesky posts and standard.site records through the AT Protocol, Wikipedia and MDN through their own APIs, and Google News for what is being published now.

**Use at your own risk:** the DuckDuckGo and Brave providers scrape HTML nobody promised would stay parseable, so they can break without warning and may run against a service's terms. Results are unverified input.

## Quick Start

### OpenCode 2

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-search"]
}
```

Restart OpenCode. The plugin will be installed automatically.

### OpenCode 1

```json
{
  "plugin": ["opencode-search@0.0.9"]
}
```

**0.0.9 is the last release for OpenCode 1 and will not be updated.** New providers and fixes land on 1.x, which requires OpenCode 2. Pin the version rather than tracking latest.

## Tools

### ddg-search

Search the web using DuckDuckGo. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Uses DuckDuckGo's HTML endpoint with POST form parameters to avoid CAPTCHAs.
Results are parsed from the HTML response into structured title/URL/abstract triples.

### brave-search

Search the web using Brave Search. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Brave serves server-rendered HTML, so it is the most reliable general web provider here.

### gnews-search

Search Google News for recent articles. Returns headline, publisher, and publication date.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

**News and tech media only — not general web search, and not documentation.** It queries the Google News RSS feed, which is a different service from Google web search and still answers plain HTTP requests. Links are `news.google.com` redirect URLs rather than publisher URLs; they resolve only in a browser, so they are reported as-is.

### ~~ggl-search~~ — removed

**Google web search cannot be scraped without a browser, so the tool was removed rather than left to fail.** Since 2025 Google mandates JavaScript for `/search`: a plain HTTP client gets a redirect stub pointing at `/httpservice/retry/enablejs`, with **no results in the page at all** — not hidden behind JS execution, simply never sent. A legacy or text-browser user agent gets a different wall, an "Update your browser" page, so there is no gap between the two.

Verified dead on 2026-09-19 from a residential IP, first request, no rate pressure: seven genuine browser TLS fingerprints via [curl_cffi](https://github.com/lexiforest/curl_cffi) (Chrome 131/133a/136, Firefox 135, Safari 18, Edge 101) all returned the same wall, as did HTTP/2 with a full Chrome header set, session-cookie warm-up, four regional domains, `encrypted.google.com`, `&gbv=1` and `&udm=14`. A correct JA3/JA4 fingerprint buys nothing, because the gate is applied before the page is built.

The ecosystem agrees: [`googler`](https://github.com/jarun/googler) is archived (2021), [`googlesearch-python`](https://github.com/Nv7-GitHub/googlesearch) has issues titled "google stop Lynx support" (2025-09) and no commits since 2025-02, and `yagooglesearch` stopped in 2024.

Use `brave-search` or `ddg-search` for general web search, and `gnews-search` when you specifically want news.

### ~~mojeek-search~~ — removed

**Mojeek asks not to be scraped, so this one is a licensing decision rather than a technical one.** Their [robots.txt](https://www.mojeek.com/robots.txt) is `Disallow: /search` for every user agent, and their [terms](https://www.mojeek.com/about/terms.html) prohibit "use or access Our Services by any automated means (unless you are an authorised Mojeek API user)".

They added an ALTCHA proof-of-work challenge to `/search` on 2026-06-23 after, in their own words on [their forum](https://community.mojeek.com/t/altcha-appears-before-i-can-get-search-results-and-i-cant-pass-it/3036), roughly 100 automated searches per second and 8 million a day. The challenge is cheap to solve without a browser, which is exactly why it is worth saying plainly that solving it is not the point: a small independent crawler put up a gate and explained why. Their [Web Search API](https://www.mojeek.com/services/search/web-search-api/) is the supported route.

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

**Currently unavailable.** The appview this tool queries, `standard-search.octet-stream.net`, refuses connections, and no replacement endpoint is published on standard.site or in its docs. The provider is left in place unchanged; its live test soft-skips while the host is unreachable, so the suite stays green without masking parser regressions.

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
