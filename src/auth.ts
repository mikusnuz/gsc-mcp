export async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 30_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

interface TokenClient {
  getAccessToken(): Promise<{ token?: string | null }>;
}

/** Retry only the known transient socket failure, once; never replay an API mutation. */
export async function getServiceAccountToken(
  client: TokenClient,
  { timeoutMs = 30_000, retryDelayMs = 300 } = {},
): Promise<string> {
  let result;
  try {
    result = await withTimeout(client.getAccessToken(), "Service account token request", timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/premature close/i.test(message)) throw error;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    result = await withTimeout(client.getAccessToken(), "Service account token retry", timeoutMs);
  }
  if (!result.token) throw new Error("Failed to get service account token");
  return result.token;
}
