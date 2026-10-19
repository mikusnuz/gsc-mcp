import assert from "node:assert/strict";
import test from "node:test";
import { getServiceAccountToken, withTimeout } from "../dist/auth.js";

const options = { timeoutMs: 20, retryDelayMs: 0 };

test("service account auth retries premature-close once, case-insensitively", async () => {
  let calls = 0;
  const client = {
    async getAccessToken() {
      if (++calls === 1) throw new Error("PREMATURE CLOSE");
      return { token: "test-token" };
    },
  };
  assert.equal(await getServiceAccountToken(client, options), "test-token");
  assert.equal(calls, 2);
});

test("persistent premature-close failure stops after the second attempt", async () => {
  let calls = 0;
  const error = new Error("Premature close");
  const client = { async getAccessToken() { calls++; throw error; } };
  await assert.rejects(getServiceAccountToken(client, options), (actual) => actual === error);
  assert.equal(calls, 2);
});

test("authorization failures and absent tokens are not retried", async () => {
  for (const failure of [new Error("invalid_grant"), null, undefined, ""]) {
    let calls = 0;
    const client = { async getAccessToken() {
      calls++;
      if (failure instanceof Error) throw failure;
      return { token: failure };
    } };
    await assert.rejects(getServiceAccountToken(client, options), /invalid_grant|Failed to get service account token/);
    assert.equal(calls, 1);
  }
});

test("both initial and retry token requests have bounded waits", async () => {
  for (const retry of [false, true]) {
    let calls = 0;
    const client = { getAccessToken() {
      calls++;
      if (retry && calls === 1) return Promise.reject(new Error("Premature close"));
      return new Promise(() => {});
    } };
    await assert.rejects(getServiceAccountToken(client, options), new RegExp(`token ${retry ? "retry" : "request"} timed out after 20ms`));
    assert.equal(calls, retry ? 2 : 1);
  }
});

test("timeout helper clears timers on success, rejection and expiration", async (t) => {
  const clears = t.mock.method(globalThis, "clearTimeout");
  assert.equal(await withTimeout(Promise.resolve("ok"), "ready", 20), "ok");
  assert.equal(clears.mock.callCount(), 1);
  await assert.rejects(withTimeout(Promise.reject(new Error("failure")), "rejected", 20), /failure/);
  assert.equal(clears.mock.callCount(), 2);
  await assert.rejects(withTimeout(new Promise(() => {}), "pending", 20), /pending timed out/);
  assert.equal(clears.mock.callCount(), 3);
});
