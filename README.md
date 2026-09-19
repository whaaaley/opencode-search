# opencode-search

An [OpenCode](https://opencode.ai) plugin that gives your agent access to DuckDuckGo, Brave, Google News, Wikipedia, Bluesky, MDN Web Docs, and the IETF, W3C and WHATWG specifications.

<img width="776" height="393" alt="image" src="https://github.com/user-attachments/assets/7b9c0776-94a9-4184-9541-1f3bf8d9bcaa" />

## What this adds over OpenCode's built-in tools

Nine search tools that work without an API key. OpenCode 1 has no web search at all unless you use its own provider, and OpenCode 2's requires a key for Exa, Firecrawl, Parallel or Tavily.

Seven of the tools search sources a general web search does not reach: Bluesky posts through the AT Protocol, Wikipedia and MDN through their own APIs, Google News for what is being published now, and the IETF, W3C and WHATWG specification indexes directly.

**Use at your own risk:** the DuckDuckGo and Brave providers scrape HTML nobody promised would stay parseable, so they can break without warning and may run against a service's terms. Results are unverified input.

Google web search, Mojeek and standard.site were removed — see [REMOVED.md](REMOVED.md) for what was tested and why.

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

### ddg_search

Search the web using DuckDuckGo. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Uses DuckDuckGo's HTML endpoint with POST form parameters to avoid CAPTCHAs.
Results are parsed from the HTML response into structured title/URL/abstract triples.

### brave_search

Search the web using Brave Search. Returns structured results with title, URL, and snippet.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

Brave serves server-rendered HTML, so it is the most reliable general web provider here.

### gnews_search

Search Google News for recent articles. Returns headline, publisher, and publication date.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

**News and tech media only — not general web search, and not documentation.** It queries the Google News RSS feed, which is a different service from Google web search and still answers plain HTTP requests. Links are `news.google.com` redirect URLs rather than publisher URLs; they resolve only in a browser, so they are reported as-is.

### bsky_search

Search Bluesky posts via the AT Protocol. Returns posts with author handle, text, and engagement counts (likes, reposts, replies).

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `query`   | string | yes      |                                |
| `limit`   | number | no       | Number of results to return    |
| `sort`    | string | no       | Sort order: `top` or `latest`  |

### wiki_search

Search Wikipedia articles using the MediaWiki REST API. Returns structured results with title, description, excerpt, and a direct link to the article. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results (1-100)          |

### mdn_search

Search MDN Web Docs. Returns documentation pages for web technologies with title, URL, and summary. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results to return        |
| `page`    | number | no       | Page number for pagination         |

### rfc_search

Search IETF RFCs by title via the [Datatracker API](https://datatracker.ietf.org/api/). Returns RFC number, title, date, and abstract. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results (default 20)     |

Matches on title only, so a query is a phrase from the RFC's name rather than its body.

### w3c_search

Search W3C specifications by title via the [W3C API](https://api.w3.org/). Returns the spec title and URL. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results (default 20)     |

The W3C API accepts a `q` parameter and ignores it — a real query and a nonsense string both return all 1713 specifications. So the full index is fetched, two pages of 1000, and filtered here. Titles only; the API exposes no abstracts.

### whatwg_search

Search WHATWG living standards. Returns the standard name, URL, and description. No API key required.

| Parameter | Type   | Required | Description                        |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | yes      |                                    |
| `limit`   | number | no       | Number of results (default 20)     |

WHATWG publishes its whole index as one small JSON file and offers no search endpoint, so matching happens here across names and descriptions. There are only 27 standards, so expect few results.
