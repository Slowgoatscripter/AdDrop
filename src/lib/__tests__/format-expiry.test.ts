/**
 * @jest-environment node
 */

import { formatExpiry } from '@/lib/format-expiry';

describe('formatExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Fix "now" to 2026-03-01T12:00:00Z
    jest.setSystemTime(new Date('2026-03-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('shows "in 7 days" for a freshly created 7-day token', () => {
    // Expires 2026-03-08T12:00:00Z → 7 full days from now
    const result = formatExpiry('2026-03-08T12:00:00.000Z');
    expect(result).toBe('in 7 days (March 8, 2026)');
  });

  test('shows "in 2 days" for a reused token with ~2.5 days left', () => {
    // Expires 2026-03-03T22:00:00Z → 2.4 days → floor to 2
    const result = formatExpiry('2026-03-03T22:00:00.000Z');
    expect(result).toBe('in 2 days (March 3, 2026)');
  });

  test('shows "in 1 day" for singular day', () => {
    // Expires 2026-03-02T18:00:00Z → 1.25 days → floor to 1
    const result = formatExpiry('2026-03-02T18:00:00.000Z');
    expect(result).toBe('in 1 day (March 2, 2026)');
  });

  test('shows "in less than a day" for < 24 hours remaining', () => {
    // Expires 2026-03-02T06:00:00Z → 0.75 days → floor to 0
    const result = formatExpiry('2026-03-02T06:00:00.000Z');
    expect(result).toBe('in less than a day (March 2, 2026)');
  });

  test('shows "in less than a day" for already-expired token (edge case)', () => {
    // Expired 1 hour ago — clamped to 0 days
    const result = formatExpiry('2026-03-01T11:00:00.000Z');
    expect(result).toBe('in less than a day (March 1, 2026)');
  });

  test('shows "in 30 days" for 30-day token', () => {
    const result = formatExpiry('2026-03-31T12:00:00.000Z');
    expect(result).toBe('in 30 days (March 31, 2026)');
  });
});
