import assert from "node:assert/strict";
import test from "node:test";
import { parseIndexingBatchResponse } from "../dist/indexing-batch.js";

const notifications = [
  { url: "https://example.com/job/1", type: "URL_UPDATED", contentType: "JobPosting" },
  { url: "https://example.com/job/2", type: "URL_DELETED", contentType: "JobPosting" },
];

test("parses every embedded Indexing API batch response", () => {
  const boundary = "batch_response_123";
  const body = [
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-ID: <response-item-1>",
    "",
    "HTTP/1.1 200 OK",
    "Content-Type: application/json",
    "",
    '{"urlNotificationMetadata":{"url":"https://example.com/job/1"}}',
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-ID: <response-item-2>",
    "",
    "HTTP/1.1 403 Forbidden",
    "Content-Type: application/json",
    "",
    '{"error":{"code":403,"message":"Permission denied"}}',
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const results = parseIndexingBatchResponse(
    body,
    `multipart/mixed; boundary="${boundary}"`,
    notifications,
  );

  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map(({ status, ok }) => ({ status, ok })),
    [
      { status: 200, ok: true },
      { status: 403, ok: false },
    ],
  );
  assert.deepEqual(results[1].body, {
    error: { code: 403, message: "Permission denied" },
  });
});

test("marks an omitted subresponse as failed", () => {
  const boundary = "batch_response_missing";
  const body = [
    `--${boundary}`,
    "Content-Type: application/http",
    "Content-ID: <response-item-1>",
    "",
    "HTTP/1.1 200 OK",
    "",
    "{}",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const results = parseIndexingBatchResponse(
    body,
    `multipart/mixed; boundary=${boundary}`,
    notifications,
  );

  assert.equal(results[1].ok, false);
  assert.equal(results[1].status, 0);
});

test("rejects a non-multipart response", () => {
  assert.throws(
    () => parseIndexingBatchResponse("{}", "application/json", notifications),
    /multipart boundary/,
  );
});
