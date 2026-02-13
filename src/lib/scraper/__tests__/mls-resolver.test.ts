import { resolveMlsNumber } from '../mls-resolver';

// Mock url-validator to avoid DNS lookups in tests
jest.mock('../url-validator', () => ({
  validateUrl: jest.fn().mockResolvedValue({ safe: true }),
  followRedirectsSafely: jest.fn(),
}));

import { followRedirectsSafely } from '../url-validator';

const mockFollowRedirects = followRedirectsSafely as jest.MockedFunction<typeof followRedirectsSafely>;

describe('resolveMlsNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns Realtor.com URL when listing found', async () => {
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      response: { ok: true, status: 200 } as Response,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
  });

  test('falls back to Redfin when Realtor.com fails', async () => {
    // Realtor.com returns non-ok
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      response: { ok: false, status: 404 } as Response,
    });
    // Redfin returns ok with redirected URL
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      response: { ok: true, status: 200 } as Response,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      source: 'redfin',
    });
  });

  test('falls back to Zillow when Realtor.com and Redfin fail', async () => {
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      response: { ok: false, status: 404 } as Response,
    });
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.redfin.com/stingray/do/query-location?location=MLS%2330025432&v=2',
      response: { ok: false, status: 404 } as Response,
    });
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      response: { ok: true, status: 200 } as Response,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      source: 'zillow',
    });
  });

  test('returns failure when all sources fail', async () => {
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.realtor.com/realestateandhomes-detail/MINVALID123',
      response: { ok: false, status: 404 } as Response,
    });
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.redfin.com/stingray/do/query-location?location=MLS%23INVALID123&v=2',
      response: { ok: false, status: 404 } as Response,
    });
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.zillow.com/homes/INVALID123_rb/',
      response: { ok: false, status: 404 } as Response,
    });

    const result = await resolveMlsNumber('INVALID123');
    expect(result).toEqual({
      success: false,
      error: 'Listing not found on any source. You can enter details manually.',
    });
  });

  test('strips non-alphanumeric characters from MLS number', async () => {
    mockFollowRedirects.mockResolvedValueOnce({
      finalUrl: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      response: { ok: true, status: 200 } as Response,
    });

    await resolveMlsNumber('MLS# 300-254-32');
    expect(mockFollowRedirects).toHaveBeenCalledWith(
      expect.stringContaining('30025432'),
      expect.any(Number),
      expect.any(Object)
    );
  });
});
