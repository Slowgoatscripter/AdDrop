import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AdDrop — AI Real Estate Ad Generator';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 24 }}>
          <span style={{ fontSize: 72, fontWeight: 700, color: '#f5f0e8' }}>Ad</span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#E6A817',
            }}
          >
            Drop
          </span>
        </div>
        <div
          style={{
            fontSize: 40,
            color: '#f5f0e8',
            fontWeight: 600,
            lineHeight: 1.2,
            maxWidth: 700,
            marginBottom: 24,
          }}
        >
          AI Real Estate Ad Generator
        </div>
        <div style={{ fontSize: 24, color: '#9a8f7a', maxWidth: 600 }}>
          12+ platforms. Instagram, Facebook, Google, print. Minutes, not hours.
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 80,
            background: '#E6A817',
            color: '#0a0a0a',
            padding: '12px 24px',
            borderRadius: 4,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          addrop.app
        </div>
      </div>
    ),
    size,
  );
}
