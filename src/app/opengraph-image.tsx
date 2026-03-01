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
          background: 'linear-gradient(135deg, #0d1117 0%, #111827 50%, #0d1117 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Teal ripple rings */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            border: '1px solid rgba(45, 135, 140, 0.08)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 450,
            height: 450,
            borderRadius: '50%',
            border: '1px solid rgba(45, 135, 140, 0.12)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1px solid rgba(45, 135, 140, 0.18)',
            display: 'flex',
          }}
        />

        {/* Golden droplet */}
        <svg
          width="80"
          height="105"
          viewBox="0 0 32 42"
          style={{ marginBottom: 24 }}
        >
          <defs>
            <linearGradient id="g" x1="16" y1="0" x2="16" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f5d470" />
              <stop offset="100%" stopColor="#d4a017" />
            </linearGradient>
          </defs>
          <path
            d="M16 0C16 0 0 19.2 0 27.2C0 36 7.16 42 16 42C24.84 42 32 36 32 27.2C32 19.2 16 0 16 0Z"
            fill="url(#g)"
          />
          <ellipse cx="11" cy="24" rx="4" ry="5.5" fill="#f5d470" opacity="0.3" />
        </svg>

        {/* Brand name */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
          <span style={{ fontSize: 72, fontWeight: 700, color: '#f5f0e8' }}>Ad</span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#E8B230',
            }}
          >
            Drop
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#f5f0e8',
            fontWeight: 500,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          One drop. Every platform.
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 20, color: 'rgba(45, 135, 140, 0.8)' }}>
          AI-powered real estate ad campaigns in minutes
        </div>

        {/* Bottom URL badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            background: '#E8B230',
            color: '#0d1117',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 18,
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
