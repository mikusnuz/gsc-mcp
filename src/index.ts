#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GoogleAuth } from "google-auth-library";

// ── Config ──

const CLIENT_ID = process.env.GSC_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET || "";
const REFRESH_TOKEN = process.env.GSC_REFRESH_TOKEN || "";
const SERVICE_ACCOUNT_KEY_PATH = process.env.GSC_SERVICE_ACCOUNT_KEY_PATH || "";

const WEBMASTERS_BASE = "https://www.googleapis.com/webmasters/v3";
const INSPECTION_BASE = "https://searchconsole.googleapis.com/v1";
const INDEXING_BASE = "https://indexing.googleapis.com/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const SCOPES = [
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/indexing",
];

// ── Auth ──

let cachedOAuthToken: { access_token: string; expires_at: number } | null =
  null;
let googleAuth: GoogleAuth | null = null;

async function getAccessToken(): Promise<string> {
  // Service Account auth (preferred if key path is set)
  if (SERVICE_ACCOUNT_KEY_PATH) {
    if (!googleAuth) {
      googleAuth = new GoogleAuth({
        keyFile: SERVICE_ACCOUNT_KEY_PATH,
        scopes: SCOPES,
      });
    }
    const client = await googleAuth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("Failed to get service account token");
    return token.token;
  }

  // OAuth2 refresh token auth
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      "Missing credentials. Set GSC_SERVICE_ACCOUNT_KEY_PATH for service account auth, " +
        "or GSC_CLIENT_ID + GSC_CLIENT_SECRET + GSC_REFRESH_TOKEN for OAuth2.",
    );
  }

  if (cachedOAuthToken && Date.now() < cachedOAuthToken.expires_at - 60_000) {
    return cachedOAuthToken.access_token;
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedOAuthToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedOAuthToken.access_token;
}

// ── Helpers ──

function encodeSiteUrl(siteUrl: string): string {
  return encodeURIComponent(siteUrl);
}

async function apiCall(
  url: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function toolResult(result: { ok: boolean; body: string }) {
  return {
    content: [{ type: "text" as const, text: result.body }],
    isError: !result.ok,
  };
}

function errorResult(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

// ── MCP Server ──

const server = new McpServer({
  name: "gsc-mcp",
  version: "1.3.0",
});

// ════════════════════════════════════════════
// SITES
// ════════════════════════════════════════════

// ── sites_list ──
server.tool(
  "sites_list",
  "List all sites (properties) you have access to in Google Search Console.",
  {},
  async () => {
    try {
      const result = await apiCall(`${WEBMASTERS_BASE}/sites`, {
        method: "GET",
      });
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sites_get ──
server.tool(
  "sites_get",
  "Retrieve information about a specific site (property) in Google Search Console.",
  {
    siteUrl: z
      .string()
      .describe(
        "The site URL (e.g. 'https://example.com/' or 'sc-domain:example.com')",
      ),
  },
  async ({ siteUrl }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}`,
        { method: "GET" },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sites_add ──
server.tool(
  "sites_add",
  "Add a site (property) to Google Search Console. Verification may still be required.",
  {
    siteUrl: z
      .string()
      .describe(
        "The site URL to add (e.g. 'https://example.com/' or 'sc-domain:example.com')",
      ),
  },
  async ({ siteUrl }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}`,
        { method: "PUT" },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.ok
              ? `Site "${siteUrl}" added successfully.`
              : result.body,
          },
        ],
        isError: !result.ok,
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sites_delete ──
server.tool(
  "sites_delete",
  "Remove a site (property) from Google Search Console.",
  {
    siteUrl: z.string().describe("The site URL to remove"),
  },
  async ({ siteUrl }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}`,
        { method: "DELETE" },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.ok
              ? `Site "${siteUrl}" removed successfully.`
              : result.body,
          },
        ],
        isError: !result.ok,
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ════════════════════════════════════════════
// SITEMAPS
// ════════════════════════════════════════════

// ── sitemaps_list ──
server.tool(
  "sitemaps_list",
  "List all sitemaps submitted for a site in Google Search Console.",
  {
    siteUrl: z.string().describe("The site URL"),
    sitemapIndex: z
      .string()
      .optional()
      .describe(
        "Optional: URL of a sitemap index to list only sitemaps in that index",
      ),
  },
  async ({ siteUrl, sitemapIndex }) => {
    try {
      let url = `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps`;
      if (sitemapIndex) {
        url += `?sitemapIndex=${encodeURIComponent(sitemapIndex)}`;
      }
      const result = await apiCall(url, { method: "GET" });
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sitemaps_get ──
server.tool(
  "sitemaps_get",
  "Retrieve information about a specific sitemap.",
  {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z
      .string()
      .describe("The URL of the sitemap (e.g. 'https://example.com/sitemap.xml')"),
  },
  async ({ siteUrl, feedpath }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
        { method: "GET" },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sitemaps_submit ──
server.tool(
  "sitemaps_submit",
  "Submit a sitemap for a site to Google Search Console.",
  {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z
      .string()
      .describe(
        "The URL of the sitemap to submit (e.g. 'https://example.com/sitemap.xml')",
      ),
  },
  async ({ siteUrl, feedpath }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
        { method: "PUT" },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.ok
              ? `Sitemap "${feedpath}" submitted successfully.`
              : result.body,
          },
        ],
        isError: !result.ok,
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── sitemaps_delete ──
server.tool(
  "sitemaps_delete",
  "Delete a sitemap from Google Search Console.",
  {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z.string().describe("The URL of the sitemap to delete"),
  },
  async ({ siteUrl, feedpath }) => {
    try {
      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`,
        { method: "DELETE" },
      );
      return {
        content: [
          {
            type: "text" as const,
            text: result.ok
              ? `Sitemap "${feedpath}" deleted successfully.`
              : result.body,
          },
        ],
        isError: !result.ok,
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ════════════════════════════════════════════
// SEARCH ANALYTICS
// ════════════════════════════════════════════

const dimensionEnum = z.enum([
  "country",
  "device",
  "page",
  "query",
  "searchAppearance",
  "date",
  "hour",
]);

const filterOperatorEnum = z.enum([
  "contains",
  "equals",
  "notContains",
  "notEquals",
  "includingRegex",
  "excludingRegex",
]);

const searchTypeEnum = z.enum(["web", "image", "video", "news", "discover", "googleNews"]);

const dataStateEnum = z.enum(["all", "final", "hourly_all"]);

const dimensionFilterGroupSchema = z.object({
  groupType: z.enum(["and"]).optional().describe("How filters are combined (only 'and' is supported)"),
  filters: z.array(
    z.object({
      dimension: dimensionEnum.describe("The dimension to filter on"),
      operator: filterOperatorEnum
        .optional()
        .describe("Filter operator (default: 'equals')"),
      expression: z
        .string()
        .describe("The value to filter by"),
    }),
  ),
});

// ── search_analytics_query ──
server.tool(
  "search_analytics_query",
  "Query search traffic data from Google Search Console. Returns clicks, impressions, CTR, and position data with flexible filtering and grouping.",
  {
    siteUrl: z.string().describe("The site URL"),
    startDate: z
      .string()
      .describe("Start date in YYYY-MM-DD format"),
    endDate: z
      .string()
      .describe("End date in YYYY-MM-DD format"),
    dimensions: z
      .array(dimensionEnum)
      .optional()
      .describe(
        "Dimensions to group by: country, device, page, query, searchAppearance, date, hour (hour requires dataState='hourly_all')",
      ),
    type: searchTypeEnum
      .optional()
      .describe(
        "Search type filter: web, image, video, news, discover, googleNews (default: web)",
      ),
    dimensionFilterGroups: z
      .array(dimensionFilterGroupSchema)
      .optional()
      .describe("Filter groups to apply to the query"),
    aggregationType: z
      .enum(["auto", "byPage", "byProperty", "byNewsShowcasePanel"])
      .optional()
      .describe("How data is aggregated (default: auto)"),
    rowLimit: z
      .number()
      .min(1)
      .max(25000)
      .optional()
      .describe("Maximum number of rows to return (1-25000, default: 1000)"),
    startRow: z
      .number()
      .min(0)
      .optional()
      .describe("Zero-based row offset for pagination"),
    dataState: dataStateEnum
      .optional()
      .describe(
        "'all' includes fresh (possibly incomplete) data, 'final' only finalized data, 'hourly_all' required when using 'hour' dimension",
      ),
  },
  async ({
    siteUrl,
    startDate,
    endDate,
    dimensions,
    type,
    dimensionFilterGroups,
    aggregationType,
    rowLimit,
    startRow,
    dataState,
  }) => {
    try {
      const body: Record<string, unknown> = { startDate, endDate };
      if (dimensions) body.dimensions = dimensions;
      if (type) body.type = type;
      if (dimensionFilterGroups)
        body.dimensionFilterGroups = dimensionFilterGroups;
      if (aggregationType) body.aggregationType = aggregationType;
      if (rowLimit !== undefined) body.rowLimit = rowLimit;
      if (startRow !== undefined) body.startRow = startRow;
      if (dataState) body.dataState = dataState;

      const result = await apiCall(
        `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ════════════════════════════════════════════
// URL INSPECTION
// ════════════════════════════════════════════

// ── url_inspection_inspect ──
server.tool(
  "url_inspection_inspect",
  "Inspect a URL in Google's index. Returns indexing status, crawl info, rich results, AMP status, and mobile usability for a specific URL.",
  {
    inspectionUrl: z
      .string()
      .describe("The fully-qualified URL to inspect (must be under the site)"),
    siteUrl: z
      .string()
      .describe(
        "The site URL (property) the inspected URL belongs to",
      ),
    languageCode: z
      .string()
      .optional()
      .describe(
        "Optional BCP-47 language code for localized results (e.g. 'en-US', 'ko')",
      ),
  },
  async ({ inspectionUrl, siteUrl, languageCode }) => {
    try {
      const body: Record<string, string> = { inspectionUrl, siteUrl };
      if (languageCode) body.languageCode = languageCode;

      const result = await apiCall(
        `${INSPECTION_BASE}/urlInspection/index:inspect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ════════════════════════════════════════════
// INDEXING API
// ════════════════════════════════════════════

// ── indexing_publish ──
server.tool(
  "indexing_publish",
  "Notify Google about a URL update or removal via the Indexing API. Use URL_UPDATED when a page is created or updated, URL_DELETED when a page is removed.",
  {
    url: z.string().describe("The fully-qualified URL to notify about"),
    type: z
      .enum(["URL_UPDATED", "URL_DELETED"])
      .describe("Notification type: URL_UPDATED or URL_DELETED"),
  },
  async ({ url, type }) => {
    try {
      const result = await apiCall(
        `${INDEXING_BASE}/urlNotifications:publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, type }),
        },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── indexing_get_metadata ──
server.tool(
  "indexing_get_metadata",
  "Get the latest indexing notification metadata for a URL. Returns the latest URL_UPDATED and URL_DELETED notification timestamps.",
  {
    url: z
      .string()
      .describe("The fully-qualified URL to check notification status for"),
  },
  async ({ url }) => {
    try {
      const result = await apiCall(
        `${INDEXING_BASE}/urlNotifications/metadata?url=${encodeURIComponent(url)}`,
        { method: "GET" },
      );
      return toolResult(result);
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── indexing_batch_publish ──
server.tool(
  "indexing_batch_publish",
  "Batch notify Google about multiple URL updates or removals via the Indexing API. Combines up to 100 notifications into a single HTTP request for efficiency.",
  {
    notifications: z
      .array(
        z.object({
          url: z.string().describe("The fully-qualified URL"),
          type: z
            .enum(["URL_UPDATED", "URL_DELETED"])
            .describe("Notification type: URL_UPDATED or URL_DELETED"),
        }),
      )
      .min(1)
      .max(100)
      .describe(
        "Array of URL notifications (1-100 items). Each item has a url and type.",
      ),
  },
  async ({ notifications }) => {
    try {
      const token = await getAccessToken();
      const boundary = `batch_gsc_mcp_${Date.now()}`;

      const parts = notifications.map((n, i) => {
        const body = JSON.stringify({ url: n.url, type: n.type });
        return [
          `--${boundary}`,
          "Content-Type: application/http",
          "Content-Transfer-Encoding: binary",
          `Content-ID: <item-${i + 1}>`,
          "",
          "POST /v3/urlNotifications:publish HTTP/1.1",
          "Content-Type: application/json",
          "accept: application/json",
          `content-length: ${Buffer.byteLength(body)}`,
          "",
          body,
        ].join("\r\n");
      });

      const batchBody = parts.join("\r\n") + `\r\n--${boundary}--`;

      const res = await fetch("https://indexing.googleapis.com/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/mixed; boundary=${boundary}`,
        },
        body: batchBody,
      });

      const responseText = await res.text();
      return {
        content: [
          {
            type: "text" as const,
            text: res.ok
              ? `Batch published ${notifications.length} URL(s) successfully.\n\n${responseText}`
              : `Batch request failed (${res.status}):\n${responseText}`,
          },
        ],
        isError: !res.ok,
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ════════════════════════════════════════════
// PROMPTS
// ════════════════════════════════════════════

server.prompt(
  "seo_audit",
  "Run an SEO audit for a site — checks indexing status, sitemap health, and recent search performance.",
  {
    siteUrl: z
      .string()
      .describe(
        "The site URL (e.g. 'https://example.com/' or 'sc-domain:example.com')",
      ),
  },
  ({ siteUrl }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `Perform a comprehensive SEO audit for ${siteUrl}. Follow these steps:`,
            "",
            "1. Use sites_get to check the site's verification status",
            "2. Use sitemaps_list to check submitted sitemaps",
            "3. Use search_analytics_query with dimensions=['date'] for the last 28 days to get traffic trends",
            "4. Use search_analytics_query with dimensions=['page'] and rowLimit=10 to find top pages",
            "5. Use search_analytics_query with dimensions=['query'] and rowLimit=10 to find top queries",
            "",
            "Summarize findings including:",
            "- Site verification status",
            "- Sitemap health (count, errors, last submitted)",
            "- Traffic overview (total clicks, impressions, avg CTR, avg position)",
            "- Traffic trend (up/down over 28 days)",
            "- Top performing pages and queries",
            "- Recommendations for improvement",
          ].join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "index_url",
  "Submit a URL to Google for indexing and verify its current index status.",
  {
    url: z.string().describe("The fully-qualified URL to index"),
    siteUrl: z
      .string()
      .describe("The site URL this page belongs to"),
  },
  ({ url, siteUrl }) => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: [
            `Index the URL ${url} (site: ${siteUrl}). Follow these steps:`,
            "",
            "1. Use url_inspection_inspect to check the current index status",
            "2. Use indexing_publish with type URL_UPDATED to request indexing",
            "3. Use indexing_get_metadata to confirm the notification was received",
            "",
            "Report the results including current index status and notification confirmation.",
          ].join("\n"),
        },
      },
    ],
  }),
);

// ════════════════════════════════════════════
// RESOURCES
// ════════════════════════════════════════════

server.resource(
  "sites",
  "gsc://sites",
  {
    description:
      "List of all verified sites (properties) in Google Search Console",
    mimeType: "application/json",
  },
  async () => {
    const result = await apiCall(`${WEBMASTERS_BASE}/sites`, {
      method: "GET",
    });
    return {
      contents: [
        {
          uri: "gsc://sites",
          mimeType: "application/json",
          text: result.body,
        },
      ],
    };
  },
);

server.resource(
  "sitemaps",
  "gsc://sitemaps/{siteUrl}",
  {
    description: "List of all sitemaps for a specific site",
    mimeType: "application/json",
  },
  async (uri) => {
    const siteUrl = decodeURIComponent(
      uri.pathname.replace(/^\/\/sitemaps\//, ""),
    );
    const result = await apiCall(
      `${WEBMASTERS_BASE}/sites/${encodeSiteUrl(siteUrl)}/sitemaps`,
      { method: "GET" },
    );
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: result.body,
        },
      ],
    };
  },
);

// ── Start ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});

// ── Smithery Sandbox ──

export function createSandboxServer() {
  const sandbox = new McpServer({
    name: "gsc-mcp",
    version: "1.3.0",
  });

  // Re-register all tools with the same schemas (they will fail at runtime without real credentials, which is fine for scanning)

  sandbox.tool("sites_list", "List all sites (properties) you have access to in Google Search Console.", {}, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sites_get", "Retrieve information about a specific site (property) in Google Search Console.", {
    siteUrl: z.string().describe("The site URL (e.g. 'https://example.com/' or 'sc-domain:example.com')"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sites_add", "Add a site (property) to Google Search Console. Verification may still be required.", {
    siteUrl: z.string().describe("The site URL to add (e.g. 'https://example.com/' or 'sc-domain:example.com')"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sites_delete", "Remove a site (property) from Google Search Console.", {
    siteUrl: z.string().describe("The site URL to remove"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sitemaps_list", "List all sitemaps submitted for a site in Google Search Console.", {
    siteUrl: z.string().describe("The site URL"),
    sitemapIndex: z.string().optional().describe("Optional: URL of a sitemap index to list only sitemaps in that index"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sitemaps_get", "Retrieve information about a specific sitemap.", {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z.string().describe("The URL of the sitemap (e.g. 'https://example.com/sitemap.xml')"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sitemaps_submit", "Submit a sitemap for a site to Google Search Console.", {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z.string().describe("The URL of the sitemap to submit (e.g. 'https://example.com/sitemap.xml')"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("sitemaps_delete", "Delete a sitemap from Google Search Console.", {
    siteUrl: z.string().describe("The site URL"),
    feedpath: z.string().describe("The URL of the sitemap to delete"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("search_analytics_query", "Query search traffic data from Google Search Console. Returns clicks, impressions, CTR, and position data with flexible filtering and grouping.", {
    siteUrl: z.string().describe("The site URL"),
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    dimensions: z.array(dimensionEnum).optional().describe("Dimensions to group by"),
    type: searchTypeEnum.optional().describe("Search type filter"),
    dimensionFilterGroups: z.array(dimensionFilterGroupSchema).optional().describe("Filter groups to apply to the query"),
    aggregationType: z.enum(["auto", "byPage", "byProperty", "byNewsShowcasePanel"]).optional().describe("How data is aggregated"),
    rowLimit: z.number().min(1).max(25000).optional().describe("Maximum number of rows to return (1-25000)"),
    startRow: z.number().min(0).optional().describe("Zero-based row offset for pagination"),
    dataState: dataStateEnum.optional().describe("Data state filter"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("url_inspection_inspect", "Inspect a URL in Google's index.", {
    inspectionUrl: z.string().describe("The fully-qualified URL to inspect"),
    siteUrl: z.string().describe("The site URL (property) the inspected URL belongs to"),
    languageCode: z.string().optional().describe("Optional BCP-47 language code"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("indexing_publish", "Notify Google about a URL update or removal via the Indexing API.", {
    url: z.string().describe("The fully-qualified URL to notify about"),
    type: z.enum(["URL_UPDATED", "URL_DELETED"]).describe("Notification type"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("indexing_get_metadata", "Get the latest indexing notification metadata for a URL.", {
    url: z.string().describe("The fully-qualified URL to check notification status for"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  sandbox.tool("indexing_batch_publish", "Batch notify Google about multiple URL updates or removals via the Indexing API.", {
    notifications: z.array(z.object({
      url: z.string().describe("The fully-qualified URL"),
      type: z.enum(["URL_UPDATED", "URL_DELETED"]).describe("Notification type"),
    })).min(1).max(100).describe("Array of URL notifications (1-100 items)"),
  }, async () => {
    return { content: [{ type: "text" as const, text: "sandbox" }] };
  });

  return sandbox;
}
