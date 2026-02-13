import * as cheerio from 'cheerio';
import { ListingData, ListingAddress } from '@/lib/types';

/**
 * Try to parse JSON-LD structured data from the page.
 */
export function parseJsonLd($: cheerio.CheerioAPI): Partial<ListingData> | null {
  const scripts = $('script[type="application/ld+json"]');
  let best: Partial<ListingData> | null = null;

  scripts.each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const json = JSON.parse(raw);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        const type = item['@type'];
        if (
          type === 'RealEstateListing' ||
          type === 'SingleFamilyResidence' ||
          type === 'Residence' ||
          type === 'Product' ||
          type === 'Place'
        ) {
          best = extractFromSchema(item);
          return false;
        }
        if (item['@graph']) {
          for (const node of item['@graph']) {
            if (['RealEstateListing', 'SingleFamilyResidence', 'Residence'].includes(node['@type'])) {
              best = extractFromSchema(node);
              return false;
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  });

  return best;
}

function extractFromSchema(item: Record<string, unknown>): Partial<ListingData> {
  const address = item.address as Record<string, string> | undefined;
  const result: Partial<ListingData> = {};

  if (address) {
    result.address = {
      street: address.streetAddress || '',
      city: address.addressLocality || '',
      state: address.addressRegion || '',
      zip: address.postalCode || '',
    };
  }

  if (item.name && typeof item.name === 'string') {
    if (!result.address?.street) {
      result.address = parseAddressFromString(item.name);
    }
  }

  const price = (item as Record<string, unknown>).price ?? ((item as Record<string, unknown>).offers as Record<string, unknown>)?.price;
  if (price) result.price = Number(String(price).replace(/[^0-9.]/g, ''));

  if (item.numberOfRooms) result.beds = Number(item.numberOfRooms);
  if (item.numberOfBathroomsTotal) result.baths = Number(item.numberOfBathroomsTotal);
  if (item.floorSize) {
    const size = item.floorSize as Record<string, unknown>;
    result.sqft = Number(size.value || size);
  }

  if (item.description && typeof item.description === 'string') {
    result.description = item.description;
  }

  if (item.photo || item.image) {
    const photos = item.photo || item.image;
    if (Array.isArray(photos)) {
      result.photos = photos.map((p: unknown) =>
        typeof p === 'string' ? p : (p as Record<string, string>).contentUrl || (p as Record<string, string>).url || ''
      ).filter(Boolean);
    } else if (typeof photos === 'string') {
      result.photos = [photos];
    }
  }

  if (item.yearBuilt) result.yearBuilt = Number(item.yearBuilt);

  return result;
}

function parseAddressFromString(str: string): ListingAddress {
  const parts = str.split(',').map((s: string) => s.trim());
  const stateZip = (parts[2] || '').split(/\s+/);
  return {
    street: parts[0] || str,
    city: parts[1] || '',
    state: stateZip[0] || '',
    zip: stateZip[1] || '',
  };
}

/**
 * Parse Open Graph meta tags.
 */
export function parseOpenGraph($: cheerio.CheerioAPI): Partial<ListingData> {
  const result: Partial<ListingData> = {};
  const title = $('meta[property="og:title"]').attr('content');
  const desc = $('meta[property="og:description"]').attr('content');
  const price = $('meta[property="product:price:amount"]').attr('content');

  if (title) result.address = parseAddressFromString(title);
  if (desc) result.description = desc;

  const ogImages: string[] = [];
  $('meta[property="og:image"], meta[property="og:image:url"]').each((_, el) => {
    const content = $(el).attr('content');
    if (content) ogImages.push(content);
  });
  if (ogImages.length > 0) result.photos = ogImages;

  if (price) result.price = Number(price.replace(/[^0-9.]/g, ''));

  return result;
}

/**
 * Parse basic HTML meta tags and common CSS selectors.
 */
export function parseHtmlMeta($: cheerio.CheerioAPI): Partial<ListingData> {
  const result: Partial<ListingData> = {};
  const title = $('title').text();
  const desc = $('meta[name="description"]').attr('content') || '';

  if (title) result.address = parseAddressFromString(title);
  if (desc) result.description = desc;

  const priceText = $('[data-testid="price"]').text() || $('.price').first().text() || $('[class*="price"]').first().text() || '';
  if (priceText) {
    const num = priceText.replace(/[^0-9.]/g, '');
    if (num) result.price = Number(num);
  }

  const statsText = $('[data-testid="bed-bath-sqft"]').text() || $('.bed-bath').text() || $('[class*="stats"]').first().text() || '';
  const bedsMatch = statsText.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  const bathsMatch = statsText.match(/(\d+\.?\d*)\s*(?:bath|ba|bathroom)/i);
  const sqftMatch = statsText.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);

  if (bedsMatch) result.beds = Number(bedsMatch[1]);
  if (bathsMatch) result.baths = Number(bathsMatch[1]);
  if (sqftMatch) result.sqft = Number(sqftMatch[1].replace(/,/g, ''));

  const photos: string[] = [];
  // Tighter selectors targeting property/listing images
  $('[class*="listing"] img, [class*="property"] img, [class*="gallery"] img, [class*="carousel"] img, [class*="slider"] img, [class*="hero"] img, [data-testid*="photo"] img, [data-testid*="image"] img, [id*="gallery"] img, [id*="carousel"] img, [id*="photo"] img, [class*="widenPhoto"] img, img.widenPhoto').each((_, el) => {
    // Skip images with non-property alt text
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const excludeAlt = ['logo', 'agent', 'headshot', 'avatar', 'icon', 'profile', 'advertisement', 'banner', 'badge'];
    if (excludeAlt.some(term => alt.includes(term))) return;

    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || $(el).attr('data-original') || $(el).attr('data-lazy-src');
    if (src && src.startsWith('http')) photos.push(src);
  });
  if (photos.length > 0) result.photos = photos.slice(0, 25);

  return result;
}

/**
 * Extract images from a fully-rendered DOM (browser fallback).
 * Uses broad selectors since JavaScript content is now present in the HTML.
 * Applies the same URL filtering used by the main scraper to exclude
 * non-property images (logos, icons, small images, etc.).
 */
export function parseHtmlImages($: cheerio.CheerioAPI): string[] {
  const photos: string[] = [];

  // Broad selectors for rendered pages — JS content is now present
  $(
    [
      'img[src*="photo"]',
      'img[src*="cdn"]',
      'img[data-src]',
      '[class*="gallery"] img',
      '[class*="carousel"] img',
      '[class*="listing"] img',
      '[class*="property"] img',
      '[class*="slider"] img',
      '[class*="hero"] img',
      '[data-testid*="photo"] img',
      '[data-testid*="image"] img',
      '[id*="gallery"] img',
      '[id*="carousel"] img',
      '[id*="photo"] img',
      'picture source[srcset]',
    ].join(', ')
  ).each((_, el) => {
    const tagName = ('tagName' in el ? (el as { tagName: string }).tagName : '').toLowerCase();

    // For <source> elements, use srcset
    if (tagName === 'source') {
      const srcset = $(el).attr('srcset');
      if (srcset) {
        // Take the first URL from the srcset
        const firstUrl = srcset.split(',')[0]?.trim().split(/\s+/)[0];
        if (firstUrl && firstUrl.startsWith('http')) {
          photos.push(firstUrl);
        }
      }
      return;
    }

    // Skip images with non-property alt text
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const excludeAlt = [
      'logo', 'agent', 'headshot', 'avatar', 'icon',
      'profile', 'advertisement', 'banner', 'badge',
    ];
    if (excludeAlt.some((term) => alt.includes(term))) return;

    const src =
      $(el).attr('src') ||
      $(el).attr('data-src') ||
      $(el).attr('data-lazy') ||
      $(el).attr('data-original') ||
      $(el).attr('data-lazy-src');

    if (src && src.startsWith('http')) {
      photos.push(src);
    }
  });

  // Deduplicate
  const unique = Array.from(new Set(photos));

  // Apply the same URL filtering as the main scraper
  return unique
    .filter((url) => {
      const lower = url.toLowerCase();

      const excludePatterns = [
        '/logo', '/agent', '/headshot', '/avatar', '/icon', '/brand',
        '/badge', '/banner', '/sprite', '/social', '/profile',
        '/favicon', '/widget', '/btn', '/button', '/arrow',
        '/placeholder', '/default', '/generic', '/watermark',
        'gravatar.com', 'facebook.com/tr', 'doubleclick.net',
        'google-analytics', 'googleadservices', 'linkedin.com/media',
        '.svg', '.gif', '.ico',
      ];
      if (excludePatterns.some((p) => lower.includes(p))) return false;

      // Exclude tiny images based on URL dimension hints
      const dimensionMatch = lower.match(/[\/_-](\d+)x(\d+)/);
      if (dimensionMatch) {
        const w = parseInt(dimensionMatch[1]);
        const h = parseInt(dimensionMatch[2]);
        if (w < 200 || h < 150) return false;
      }

      return true;
    })
    .slice(0, 25);
}

/**
 * Deep merge partial listing data. Later sources fill in gaps only.
 */
export function mergeListingData(...sources: Partial<ListingData>[]): Partial<ListingData> {
  const result: Partial<ListingData> = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null || value === '') continue;
      if (key === 'address') {
        result.address = result.address || { street: '', city: '', state: '', zip: '' };
        const addr = value as Partial<ListingAddress>;
        if (addr.street && !result.address.street) result.address.street = addr.street;
        if (addr.city && !result.address.city) result.address.city = addr.city;
        if (addr.state && !result.address.state) result.address.state = addr.state;
        if (addr.zip && !result.address.zip) result.address.zip = addr.zip;
        if (addr.neighborhood) result.address.neighborhood = addr.neighborhood;
      } else if (key === 'photos') {
        const incoming = value as string[];
        if (!result.photos || result.photos.length === 0) {
          result.photos = incoming;
        } else if (incoming && incoming.length > 0) {
          const combined = [...result.photos, ...incoming];
          result.photos = Array.from(new Set(combined));
        }
      } else if (key === 'features') {
        result.features = result.features?.length ? result.features : (value as string[]);
      } else if (!(key in result) || (result as Record<string, unknown>)[key] === undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}
