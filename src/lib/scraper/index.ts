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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          error: 'This site blocked automated access (403 Forbidden). Try a different listing source like Realtor.com, Redfin, or your local MLS site.',
        };
      }
      return {
        success: false,
        error: `Failed to fetch listing page: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const jsonLdData = parseJsonLd($ as cheerio.CheerioAPI) || {};
    const ogData = parseOpenGraph($ as cheerio.CheerioAPI);
    const htmlData = parseHtmlMeta($ as cheerio.CheerioAPI);
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
