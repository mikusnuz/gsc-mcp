# gsc-mcp

[![npm version](https://img.shields.io/npm/v/@mikusnuz%2Fgsc-mcp)](https://www.npmjs.com/package/@mikusnuz/gsc-mcp)

[English](README.md) | [한국어](README.ko.md)

[![MCP Badge](https://lobehub.com/badge/mcp/mikusnuz-gsc-mcp)](https://lobehub.com/mcp/mikusnuz-gsc-mcp)

[![gsc-mcp MCP server](https://glama.ai/mcp/servers/mikusnuz/gsc-mcp/badges/card.svg)](https://glama.ai/mcp/servers/mikusnuz/gsc-mcp)

MCP server for **Google Search Console API** and **Google Indexing API** — full API coverage.

## When to Use

| Task | Tool |
|------|------|
| "Check which queries my site ranks for" | `search_analytics_query` |
| "Submit a URL for indexing" | `indexing_publish` |
| "Find pages with indexing errors" | `url_inspection_inspect` |
| "Get search performance data for the last 30 days" | `search_analytics_query` |
| "Compare click-through rates between mobile and desktop" | `search_analytics_query` (group by `device`) |
| "Submit my sitemap to Google" | `sitemaps_submit` |
| "Batch submit URLs for indexing" | `indexing_batch_publish` |

> **For AI agents:** See [`llms.txt`](llms.txt) for a machine-readable summary. Copy [`templates/CLAUDE.md`](templates/CLAUDE.md) or [`templates/AGENTS.md`](templates/AGENTS.md) into your project to teach your agent about this MCP.

Unlike other GSC MCP servers that only wrap `searchAnalytics.query`, this server exposes **every endpoint** available in the Google Search Console and Indexing APIs.

## Tools (13)

### Sites
| Tool | Description |
|------|-------------|
| `sites_list` | List all sites (properties) in your Search Console |
| `sites_get` | Get details of a specific site |
| `sites_add` | Add a new site (property) |
| `sites_delete` | Remove a site |

### Sitemaps
| Tool | Description |
|------|-------------|
| `sitemaps_list` | List all submitted sitemaps for a site |
| `sitemaps_get` | Get details of a specific sitemap |
| `sitemaps_submit` | Submit a sitemap |
| `sitemaps_delete` | Delete a sitemap |

### Search Analytics
| Tool | Description |
|------|-------------|
| `search_analytics_query` | Query search performance data (clicks, impressions, CTR, position) with filtering and grouping. Supports hourly data with the `hour` dimension. |

### URL Inspection
| Tool | Description |
|------|-------------|
| `url_inspection_inspect` | Inspect a URL's index status, crawl info, rich results, AMP, and mobile usability |

### Indexing API
| Tool | Description |
|------|-------------|
| `indexing_publish` | Notify Google about URL updates or removals |
| `indexing_get_metadata` | Get latest notification status for a URL |
| `indexing_batch_publish` | Batch notify Google about up to 100 URL updates/removals in a single request |

## Authentication

Two authentication methods are supported:

### Option 1: OAuth2 Refresh Token

```json
{
  "mcpServers": {
    "gsc-mcp": {
      "command": "npx",
      "args": ["-y", "@mikusnuz/gsc-mcp"],
      "env": {
        "GSC_CLIENT_ID": "your-client-id",
        "GSC_CLIENT_SECRET": "your-client-secret",
        "GSC_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

Required OAuth2 scopes:
- `https://www.googleapis.com/auth/webmasters`
- `https://www.googleapis.com/auth/indexing`

### Option 2: Service Account

```json
{
  "mcpServers": {
    "gsc-mcp": {
      "command": "npx",
      "args": ["-y", "@mikusnuz/gsc-mcp"],
      "env": {
        "GSC_SERVICE_ACCOUNT_KEY_PATH": "/path/to/service-account-key.json"
      }
    }
  }
}
```

The service account must be added as an owner or user in Google Search Console for each site.

## Setup Guide

### OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Enable **Search Console API** and **Indexing API**
4. Create OAuth 2.0 credentials (Desktop app type)
5. Use the [OAuth Playground](https://developers.google.com/oauthplayground/) to generate a refresh token with scopes:
   - `https://www.googleapis.com/auth/webmasters`
   - `https://www.googleapis.com/auth/indexing`

### Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a service account
3. Download the JSON key file
4. Enable **Search Console API** and **Indexing API**
5. In Search Console, add the service account email as an owner for your sites

## License

MIT