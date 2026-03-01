/**
 * Extracts only safe, loggable fields from a Supabase / Postgrest error.
 * Never log the full error object — it may contain schema details, column
 * names, or constraint information that should not appear in logs.
 */
export function sanitizeDbError(
  error: unknown,
): { code: string; message: string } {
  if (error === null || error === undefined) {
    return { code: 'UNKNOWN', message: 'Unknown error' };
  }

  if (typeof error === 'string') {
    return { code: 'UNKNOWN', message: error };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }

  const err = error as Record<string, unknown>;
  return {
    code: typeof err.code === 'string' ? err.code : 'UNKNOWN',
    message: typeof err.message === 'string' ? err.message : 'Unknown error',
  };
}
