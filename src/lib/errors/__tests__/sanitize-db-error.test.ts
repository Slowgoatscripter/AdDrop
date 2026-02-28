import { sanitizeDbError } from '../sanitize-db-error';

describe('sanitizeDbError', () => {
  test('extracts code and message from a Supabase-like error object', () => {
    const supabaseError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'Key (stripe_subscription_id)=(sub_xxx) already exists.',
      hint: null,
    };
    const result = sanitizeDbError(supabaseError);
    expect(result).toEqual({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    });
    // Must NOT contain details or hint
    expect(result).not.toHaveProperty('details');
    expect(result).not.toHaveProperty('hint');
  });

  test('handles null input', () => {
    expect(sanitizeDbError(null)).toEqual({ code: 'UNKNOWN', message: 'Unknown error' });
  });

  test('handles undefined input', () => {
    expect(sanitizeDbError(undefined)).toEqual({ code: 'UNKNOWN', message: 'Unknown error' });
  });

  test('handles plain string error', () => {
    expect(sanitizeDbError('connection refused')).toEqual({
      code: 'UNKNOWN',
      message: 'connection refused',
    });
  });

  test('handles Error instances', () => {
    expect(sanitizeDbError(new Error('timeout'))).toEqual({
      code: 'UNKNOWN',
      message: 'timeout',
    });
  });

  test('handles object missing code field', () => {
    const err = { message: 'something went wrong' };
    expect(sanitizeDbError(err)).toEqual({
      code: 'UNKNOWN',
      message: 'something went wrong',
    });
  });
});
