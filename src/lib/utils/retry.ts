/**
 * Retry wrapper with exponential backoff for OpenAI rate-limit errors (429).
 *
 * Reads the `retry-after-ms` or `retry-after` response header when available
 * and falls back to a minimum 5 s wait otherwise.
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit =
        error?.status === 429 || error?.code === 'rate_limit_exceeded';
      if (!isRateLimit || attempt === maxRetries) throw error;

      const retryAfterMs =
        error?.headers?.get?.('retry-after-ms') ??
        (parseInt(error?.headers?.get?.('retry-after') ?? '5', 10) * 1000);
      const waitMs = Math.max(Number(retryAfterMs) || 5000, 1000);

      console.warn(
        `Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw new Error('Max retries exceeded'); // unreachable but satisfies TS
}
