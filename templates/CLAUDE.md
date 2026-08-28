# Google Search Console MCP

This project uses the `gsc-mcp` MCP server for Google Search Console, URL Inspection, and Indexing API operations.

## Available Tools

Use these MCP tools instead of calling Google APIs directly:

### Search Performance
- `mcp__gsc-mcp__search_analytics_query` — Query clicks, impressions, CTR, position data. Supports filtering by query, page, country, device, searchAppearance. Supports grouping by date, query, page, country, device. Supports `hour` dimension for hourly data.

### URL Inspection & Indexing
- `mcp__gsc-mcp__url_inspection_inspect` — Check if a URL is indexed and get current inspection fields; deprecated mobile usability may be absent.
- `mcp__gsc-mcp__indexing_publish` — Notify Google about an eligible JobPosting or BroadcastEvent URL update/removal; pass `contentType`.
- `mcp__gsc-mcp__indexing_get_metadata` — Get latest notification metadata for an eligible URL; pass `contentType` (this is not actual index status).

### Sitemaps
- `mcp__gsc-mcp__sitemaps_list` — List all submitted sitemaps.
- `mcp__gsc-mcp__sitemaps_get` — Get details of a specific sitemap.
- `mcp__gsc-mcp__sitemaps_submit` — Submit a sitemap to Google.
- `mcp__gsc-mcp__sitemaps_delete` — Delete a submitted sitemap.

### Sites
- `mcp__gsc-mcp__sites_list` — List all Search Console properties.
- `mcp__gsc-mcp__sites_get` — Get details of a specific site.
- `mcp__gsc-mcp__sites_add` — Add a new site property.
- `mcp__gsc-mcp__sites_delete` — Remove a site property.

## When to Use

- Checking which queries a site ranks for → `search_analytics_query`
- Notifying an eligible JobPosting/livestream URL → `indexing_publish`
- Finding pages with indexing errors → `url_inspection_inspect`
- Getting search performance data for a date range → `search_analytics_query`
- Comparing CTR between mobile and desktop → `search_analytics_query` with device dimension
- Submitting a sitemap → `sitemaps_submit`
- Batch notifying eligible URLs → `indexing_batch_publish` (up to 100, with per-item status)

## Notes

- Always specify `siteUrl` in the format Google expects (e.g., `https://example.com/` or `sc-domain:example.com`).
- Date ranges in `search_analytics_query` use `YYYY-MM-DD` format.
- The Indexing API supports only JobPosting pages and livestream pages with BroadcastEvent embedded in VideoObject. Acceptance does not guarantee indexing.
- The indexing API has a daily quota — use batch operations when notifying multiple eligible URLs.
