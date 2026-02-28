import { validateUrl } from '../url-validator'

// Mock dns/promises
jest.mock('dns/promises', () => ({
  lookup: jest.fn(),
}))

import { lookup } from 'dns/promises'

const mockLookup = lookup as jest.MockedFunction<typeof lookup>

describe('validateUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- Protocol checks ---

  test('rejects non-http/https protocols', async () => {
    const result = await validateUrl('ftp://example.com/file')
    expect(result).toEqual({ safe: false, error: 'Invalid URL protocol. Use http or https.' })
  })

  test('rejects malformed URLs', async () => {
    const result = await validateUrl('not-a-url')
    expect(result.safe).toBe(false)
  })

  // --- Direct IP checks ---

  test('rejects private IPv4 addresses (127.x)', async () => {
    const result = await validateUrl('http://127.0.0.1/admin')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('rejects private IPv4 addresses (10.x)', async () => {
    const result = await validateUrl('http://10.0.0.1/internal')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('rejects private IPv4 addresses (192.168.x)', async () => {
    const result = await validateUrl('http://192.168.1.1/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('rejects private IPv4 addresses (172.16-31.x)', async () => {
    const result = await validateUrl('http://172.16.0.1/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('allows public IPv4 addresses', async () => {
    const result = await validateUrl('http://8.8.8.8/')
    expect(result).toEqual({ safe: true })
  })

  // --- IPv6 literal checks ---

  test('rejects IPv6 loopback', async () => {
    const result = await validateUrl('http://[::1]/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  // --- DNS resolution: single public IP ---

  test('allows hostname resolving to single public IP', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
    ] as any)

    const result = await validateUrl('https://example.com/')
    expect(result).toEqual({ safe: true })
    expect(mockLookup).toHaveBeenCalledWith('example.com', { all: true })
  })

  // --- DNS resolution: single private IP ---

  test('rejects hostname resolving to single private IP', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '10.0.0.1', family: 4 },
    ] as any)

    const result = await validateUrl('https://evil.com/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  // --- DNS resolution: mixed IPs (the SSRF fast-flux attack vector) ---

  test('rejects hostname when ANY resolved IP is private (public first, private second)', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ] as any)

    const result = await validateUrl('https://fast-flux.attacker.com/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('rejects hostname when ANY resolved IP is private (private is IPv6 mapped)', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
      { address: '::ffff:127.0.0.1', family: 6 },
    ] as any)

    const result = await validateUrl('https://sneaky.attacker.com/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('allows hostname when ALL resolved IPs are public', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
      { address: '93.184.216.35', family: 4 },
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
    ] as any)

    const result = await validateUrl('https://cdn.example.com/')
    expect(result).toEqual({ safe: true })
  })

  // --- DNS lookup failure ---

  test('returns error when DNS lookup fails', async () => {
    mockLookup.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND nxdomain.invalid'))

    const result = await validateUrl('https://nxdomain.invalid/')
    expect(result).toEqual({ safe: false, error: 'getaddrinfo ENOTFOUND nxdomain.invalid' })
  })

  // --- Cloud metadata endpoint ---

  test('rejects cloud metadata IP (169.254.169.254)', async () => {
    const result = await validateUrl('http://169.254.169.254/latest/meta-data/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })

  test('rejects hostname resolving to cloud metadata IP', async () => {
    mockLookup.mockResolvedValueOnce([
      { address: '169.254.169.254', family: 4 },
    ] as any)

    const result = await validateUrl('https://metadata.attacker.com/')
    expect(result).toEqual({ safe: false, error: 'URL resolves to a private/reserved IP address' })
  })
})
