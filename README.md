# opencode-search

An [OpenCode](https://opencode.ai) plugin that gives your agent access to DuckDuckGo, Wikipedia, Bluesky, [standard.site](https://standard.site), and MDN Web Docs.

## Quick Start

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-search"]
}
```

Restart OpenCode. The plugin will be installed automatically.

## Tools

### ddg-search

Search the web using DuckDuckGo. Returns a text summary of search results.

| Parameter | Type   | Required |
| --------- | ------ | -------- |
| `query`   | string | yes      |

DuckDuckGo does not provide a structured API. Results are extracted from their HTML endpoint, which means coverage is limited compared to traditional search engines. It works best for factual queries, definitions, and well-known topics. Complex or niche queries may return empty results.

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

## Why not Google?

Google Custom Search JSON API has been deprecated for API key authentication. The Programmable Search Engine is being wound down in favor of a new product limited to 50 domains. Existing engines continue to work until January 1, 2027, but new API keys can no longer be created for this use case. We removed Google search support entirely rather than ship a tool that will break.

## License

MIT
