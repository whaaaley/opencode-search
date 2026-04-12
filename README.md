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
