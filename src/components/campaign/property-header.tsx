import { ListingData } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageCarousel } from '@/components/ui/image-carousel';

interface PropertyHeaderProps {
  listing: ListingData;
}

export function PropertyHeader({ listing }: PropertyHeaderProps) {
  const addr = listing.address;
  const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

  const overlayContent = (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-white drop-shadow-md">
        {addr.street || 'Property'}
      </h2>
      <p className="text-white/80 text-sm drop-shadow-md">
        {[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}
      </p>
      <p className="text-3xl font-bold text-white drop-shadow-md">
        ${listing.price.toLocaleString()}
      </p>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <ImageCarousel
        images={listing.photos}
        alt={fullAddress}
        overlay={overlayContent}
      />

      <div className="p-6 space-y-3">
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
    </Card>
  );
}
