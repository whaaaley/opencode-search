# Removed providers

## ggl-search — Google web search

Google returns no results to a non-browser client. Since 2025 it requires JavaScript for `/search`: a plain HTTP request gets a redirect stub pointing at `/httpservice/retry/enablejs`, with no results and no inline data in the body. A DOM parser or JS runtime does not help, because the results were never in the response. Legacy and text-browser user agents get a different wall, an "Update your browser" page.

Tested 2026-09-19 from a residential IP, first request of a fresh query. None returned results:

- Seven browser TLS fingerprints via [curl_cffi](https://github.com/lexiforest/curl_cffi) — Chrome 131/133a/136, Firefox 135, Safari 18, Edge 101.
- HTTP/2 with a full Chrome header set, including `sec-ch-ua*` and `sec-fetch-*`.
- Session cookie warm-up: `NID`/`AEC` collected from `GET /`, then searching on that session.
- Four regional domains (`.co.uk`, `.de`, `.com.au`, `.co.in`) with `CONSENT`/`SOCS` cookies, plus `encrypted.google.com`.
- `&gbv=1`, `&udm=14`, `&nojs=1`, `/xhtml`, `/m`.

The gate is applied before the page is built, so TLS fingerprinting is not the variable.

[`googler`](https://github.com/jarun/googler) was archived in 2021, [`googlesearch-python`](https://github.com/Nv7-GitHub/googlesearch) has no commits since 2025-02 and an issue titled "google stop Lynx support" (2025-09), and `yagooglesearch` stopped in 2024.

Use `brave-search` or `ddg-search` instead, or `gnews-search` for news — Google News RSS is a separate service and still answers plain HTTP.

## mojeek-search — Mojeek

Mojeek's [robots.txt](https://www.mojeek.com/robots.txt) is `Disallow: /search` for all user agents, and their [terms](https://www.mojeek.com/about/terms.html) prohibit automated access except by "an authorised Mojeek API user", stating that "scraping the Services without Our prior consent is expressly prohibited".

They added an ALTCHA proof-of-work challenge to `/search` on 2026-06-23, citing roughly 100 automated searches per second and 8 million a day on [their forum](https://community.mojeek.com/t/altcha-appears-before-i-can-get-search-results-and-i-cant-pass-it/3036). Continued requests escalate to a network-level `403 Forbidden` reading "your network appears to be sending automated queries".

Their [Web Search API](https://www.mojeek.com/services/search/web-search-api/) is the supported route.

The challenge page returns HTTP 200, so a status-code check reports the provider as healthy while the parser returns zero results. The remaining scraped providers check the body for challenge markers and raise, rather than returning an empty list.
