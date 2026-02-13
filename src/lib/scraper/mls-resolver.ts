export interface MlsResolveResult {
  success: boolean;
  url?: string;
  source?: string;
  error?: string;
}

function sanitizeMlsNumber(mlsNumber: string): string {
  return mlsNumber.replace(/[^a-zA-Z0-9]/g, '');
}

const SOURCES = [
  {
    name: 'realtor.com',
    buildUrl: (mls: string) =>
      `https://www.realtor.com/realestateandhomes-detail/M${mls}`,
  },
  {
    name: 'redfin',
    buildUrl: (mls: string) =>
      `https://www.redfin.com/stingray/do/query-location?location=MLS%23${mls}&v=2`,
  },
  {
    name: 'zillow',
    buildUrl: (mls: string) =>
      `https://www.zillow.com/homes/${mls}_rb/`,
  },
];

export async function resolveMlsNumber(
  mlsNumber: string
): Promise<MlsResolveResult> {
  const sanitized = sanitizeMlsNumber(mlsNumber);

  for (const source of SOURCES) {
    try {
      const url = source.buildUrl(sanitized);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return {
          success: true,
          url: response.url,
          source: source.name,
        };
      }
    } catch {
      // Source failed, try next
      continue;
    }
  }

  return {
    success: false,
    error: 'Listing not found on any source. You can enter details manually.',
  };
}
