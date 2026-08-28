import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("advertises sitemaps as an MCP resource template", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({ name: "gsc-mcp-test", version: "1.0.0" });

  try {
    await client.connect(transport);
    const templates = await client.listResourceTemplates();
    assert.ok(
      templates.resourceTemplates.some(
        ({ uriTemplate }) => uriTemplate === "gsc://sitemaps/{siteUrl}",
      ),
    );
    const resources = await client.listResources();
    assert.equal(
      resources.resources.some(
        ({ uri }) => uri === "gsc://sitemaps/{siteUrl}",
      ),
      false,
    );
  } finally {
    await client.close();
  }
});
