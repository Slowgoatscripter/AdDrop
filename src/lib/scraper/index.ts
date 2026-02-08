import * as cheerio from 'cheerio';
import { ScrapeResult, ListingData } from '@/lib/types';
import { parseJsonLd, parseOpenGraph, parseHtmlMeta, mergeListingData } from './parsers';

export async function scrapeListing(url: string): Promise<ScrapeResult> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { success: false, error: 'Invalid URL protocol. Use http or https.' };
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch listing page: ${response.status} ${response.statusText}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLdData = parseJsonLd($) || {};
    const ogData = parseOpenGraph($);
    const htmlData = parseHtmlMeta($);
    const merged = mergeListingData(jsonLdData, ogData, htmlData);

    const missingFields: string[] = [];
    if (!merged.address?.street) missingFields.push('address');
    if (!merged.price) missingFields.push('price');
    if (!merged.beds) missingFields.push('beds');
    if (!merged.baths) missingFields.push('baths');
    if (!merged.sqft) missingFields.push('sqft');
    if (!merged.description) missingFields.push('description');

    const listing: ListingData = {
      url,
      address: merged.address || { street: '', city: '', state: '', zip: '' },
      price: merged.price || 0,
      beds: merged.beds || 0,
      baths: merged.baths || 0,
      sqft: merged.sqft || 0,
      lotSize: merged.lotSize,
      yearBuilt: merged.yearBuilt,
      propertyType: merged.propertyType || 'Residential',
      features: merged.features || [],
      description: merged.description || '',
      photos: merged.photos || [],
      listingAgent: merged.listingAgent,
      broker: merged.broker,
    };

    return {
      success: true,
      data: listing,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scraping error';
    return { success: false, error: message };
  }
}
