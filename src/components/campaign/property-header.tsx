import { ListingData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PropertyHeaderProps {
  listing: ListingData;
}

export function PropertyHeader({ listing }: PropertyHeaderProps) {
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  return (
    <Card>
      <CardContent className="flex flex-col md:flex-row gap-6 p-6">
        {listing.photos[0] && (
          <div className="w-full md:w-64 h-48 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.photos[0]} alt={fullAddress} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{addr.street || 'Property'}</h2>
            <p className="text-slate-500">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
          </div>

          <p className="text-3xl font-bold text-slate-900">${listing.price.toLocaleString()}</p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{listing.beds} Beds</Badge>
            <Badge variant="secondary">{listing.baths} Baths</Badge>
            <Badge variant="secondary">{listing.sqft.toLocaleString()} Sq Ft</Badge>
            <Badge variant="secondary">{listing.propertyType}</Badge>
            {listing.yearBuilt && <Badge variant="secondary">Built {listing.yearBuilt}</Badge>}
          </div>

          {listing.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {listing.features.slice(0, 6).map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
              ))}
              {listing.features.length > 6 && (
                <Badge variant="outline" className="text-xs">+{listing.features.length - 6} more</Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
