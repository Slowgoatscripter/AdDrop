import { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * Minimal phone chrome wrapper for Instagram/Facebook cards.
 * Purely presentational — zero business logic, no state, no data fetching.
 * CSS-only responsive: chrome hidden on mobile via `hidden md:block`,
 * children always render regardless of breakpoint.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Phone body — visible on md+ only, but children always render */}
      <div
        className="relative w-full md:bg-white md:rounded-[2rem] md:p-2 md:pt-0"
        style={{
          boxShadow: undefined, // shadow applied via md: class below
        }}
      >
        {/* Shadow wrapper — only on md+ */}
        <div className="hidden md:block absolute inset-0 rounded-[2rem]" style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15)',
        }} />

        {/* Status bar — hidden on mobile */}
        <div className="hidden md:flex items-center justify-between px-6 py-2 relative z-10">
          <span className="text-xs font-semibold text-black/80">9:41</span>
          <div className="flex items-center gap-1.5">
            {/* Signal dots */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="none" className="text-black/80">
              <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="currentColor" />
              <rect x="9" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor" />
            </svg>
            {/* Wi-Fi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="text-black/80">
              <path d="M8 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="currentColor" />
              <path d="M4.93 8.47a4.5 4.5 0 016.14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2.1 5.64a8 8 0 0111.8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {/* Battery */}
            <svg width="27" height="12" viewBox="0 0 27 12" fill="none" className="text-black/80">
              <rect x="0.5" y="0.5" width="23" height="11" rx="2" stroke="currentColor" strokeOpacity="0.35" />
              <rect x="2" y="2" width="20" height="8" rx="1" fill="currentColor" />
              <path d="M25 4v4a2 2 0 000-4z" fill="currentColor" fillOpacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Screen area — children always render */}
        <div className="relative z-10 md:rounded-[1.5rem] md:overflow-hidden">
          {children}
        </div>

        {/* Home indicator bar — hidden on mobile */}
        <div className="hidden md:flex justify-center py-2 relative z-10">
          <div className="w-32 h-1 rounded-full bg-black/20" />
        </div>
      </div>
    </div>
  );
}
