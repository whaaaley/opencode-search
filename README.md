# opencode-search

An OpenCode plugin that provides web search tools with Google and DuckDuckGo.

## Quick Start

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-search"]
}
```

Restart OpenCode. The plugin will be installed automatically.

## Tools

- **web-search** - Search the web using Google (primary) with DuckDuckGo fallback
- **google-search** - Search Google Custom Search Engine directly
- **ddg-search** - Search DuckDuckGo directly

## Environment Variables

Google search requires:

- `GOOGLE_SEARCH_API_KEY` - Google Custom Search API key
- `GOOGLE_SEARCH_ENGINE_ID` - Google Custom Search Engine ID

## License

MIT
