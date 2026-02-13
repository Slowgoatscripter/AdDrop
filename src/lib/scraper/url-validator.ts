import { lookup } from 'dns/promises'

const PRIVATE_IP_RANGES = [
  // IPv4 private/reserved
  { prefix: '10.', mask: null },
  { prefix: '172.', mask: (ip: string) => { const second = parseInt(ip.split('.')[1]); return second >= 16 && second <= 31; } },
  { prefix: '192.168.', mask: null },
  { prefix: '127.', mask: null },
  { prefix: '169.254.', mask: null },
  { prefix: '0.', mask: null },
]

function isPrivateIpV4(ip: string): boolean {
  for (const range of PRIVATE_IP_RANGES) {
    if (ip.startsWith(range.prefix)) {
      if (range.mask === null) return true
      if (range.mask(ip)) return true
    }
  }
  // Cloud metadata endpoint
  if (ip === '169.254.169.254') return true
  return false
}

function isPrivateIpV6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '')

  // Loopback
  if (normalized === '::1' || normalized === '::') return true

  // Unique local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true

  // Link-local (fe80::/10)
  if (normalized.startsWith('fe80')) return true

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4MappedMatch) {
    return isPrivateIpV4(v4MappedMatch[1])
  }

  return false
}

function isPrivateIp(ip: string): boolean {
  return isPrivateIpV4(ip) || isPrivateIpV6(ip)
}

export async function validateUrl(url: string): Promise<{ safe: boolean; error?: string }> {
  try {
    const parsed = new URL(url)

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { safe: false, error: 'Invalid URL protocol. Use http or https.' }
    }

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '')

    // Check if hostname is already an IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      if (isPrivateIp(hostname)) {
        return { safe: false, error: 'URL resolves to a private/reserved IP address' }
      }
      return { safe: true }
    }

    if (hostname.includes(':')) {
      // IPv6 literal
      if (isPrivateIpV6(hostname)) {
        return { safe: false, error: 'URL resolves to a private/reserved IP address' }
      }
      return { safe: true }
    }

    // Resolve hostname to IP
    const { address } = await lookup(hostname)
    if (isPrivateIp(address)) {
      return { safe: false, error: 'URL resolves to a private/reserved IP address' }
    }

    return { safe: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'URL validation failed'
    return { safe: false, error: message }
  }
}

export async function followRedirectsSafely(
  url: string,
  maxHops: number = 5,
  fetchOptions: RequestInit = {}
): Promise<{ finalUrl: string; response: Response }> {
  let currentUrl = url

  for (let hop = 0; hop < maxHops; hop++) {
    const validation = await validateUrl(currentUrl)
    if (!validation.safe) {
      throw new Error(validation.error || 'Unsafe redirect target')
    }

    const response = await fetch(currentUrl, {
      ...fetchOptions,
      redirect: 'manual',
    })

    // Not a redirect - return the final response
    if (response.status < 300 || response.status >= 400) {
      return { finalUrl: currentUrl, response }
    }

    const location = response.headers.get('location')
    if (!location) {
      return { finalUrl: currentUrl, response }
    }

    // Resolve relative redirects
    const nextUrl = new URL(location, currentUrl).toString()

    // Block protocol downgrade (https -> http)
    const currentParsed = new URL(currentUrl)
    const nextParsed = new URL(nextUrl)
    if (currentParsed.protocol === 'https:' && nextParsed.protocol === 'http:') {
      throw new Error('Blocked https to http protocol downgrade during redirect')
    }

    currentUrl = nextUrl
  }

  throw new Error(`Too many redirects (max ${maxHops})`)
}
