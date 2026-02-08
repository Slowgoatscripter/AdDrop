import { resolveMlsNumber } from '../mls-resolver';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('resolveMlsNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns Realtor.com URL when listing found', async () => {
    // Realtor.com returns 200 (listing exists)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      source: 'realtor.com',
    });
  });

  test('falls back to Redfin when Realtor.com fails', async () => {
    // Realtor.com returns 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    // Redfin search returns a redirect to a listing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.redfin.com/MT/Missoula/123-Main-St/home/12345',
      source: 'redfin',
    });
  });

  test('falls back to Zillow when Realtor.com and Redfin fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      status: 200,
    });

    const result = await resolveMlsNumber('30025432');
    expect(result).toEqual({
      success: true,
      url: 'https://www.zillow.com/homedetails/123-Main-St/12345_zpid/',
      source: 'zillow',
    });
  });

  test('returns failure when all sources fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await resolveMlsNumber('INVALID123');
    expect(result).toEqual({
      success: false,
      error: 'Listing not found on any source. You can enter details manually.',
    });
  });

  test('strips non-alphanumeric characters from MLS number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      url: 'https://www.realtor.com/realestateandhomes-detail/M30025432',
      status: 200,
    });

    await resolveMlsNumber('MLS# 300-254-32');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('30025432'),
      expect.any(Object)
    );
  });
});
