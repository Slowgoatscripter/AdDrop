import { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface BrowserFrameProps {
  searchQuery: string;
  children: ReactNode;
}

/**
 * Minimal browser chrome wrapper for Google Ads SERP mockup.
 * Tab bar hidden on mobile (`hidden md:block`), search bar always visible.
 * Children render below as "search results".
 */
export function BrowserFrame({ searchQuery, children }: BrowserFrameProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-slate-200"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      {/* Tab bar — hidden on mobile */}
      <div aria-hidden="true" className="hidden md:flex items-end bg-slate-100 pt-2 px-2 border-b border-slate-200">
        {/* Active tab */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-t-lg border border-b-0 border-slate-200 -mb-px max-w-[200px]">
          {/* Google favicon */}
          <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
            <path d="M5.3 14.7l7.4 5.4C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00"/>
            <path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.9-5.5C29.1 37 26.7 38 24 38c-6 0-10.7-3.9-12.4-9.4l-7.4 5.7C7.7 41 15.3 46 24 46z" fill="#4CAF50"/>
            <path d="M46 24c0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.9 2.9-2.7 5.3-5 7l6.9 5.5C42.2 37.3 46 31.2 46 24z" fill="#1976D2"/>
          </svg>
          <span className="text-xs text-slate-700 truncate">Google</span>
          <span className="text-slate-400 ml-auto text-xs cursor-pointer hover:text-slate-600">&times;</span>
        </div>
        {/* New tab button */}
        <div className="px-3 py-2 text-slate-400 text-sm">+</div>
      </div>

      {/* Search bar — always visible (decorative mockup) */}
      <div aria-hidden="true" className="px-3 md:px-4 py-3 bg-white">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-slate-200 bg-white"
          style={{
            boxShadow: '0 1px 6px rgba(32,33,36,.28)',
          }}
        >
          {/* Google logo (small, inline) — hidden on mobile */}
          <svg width="20" height="20" viewBox="0 0 48 48" className="flex-shrink-0 hidden md:block">
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
            <path d="M5.3 14.7l7.4 5.4C14.5 16.2 18.9 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 15.4 2 8.1 7.3 5.3 14.7z" fill="#FF3D00"/>
            <path d="M24 46c5.4 0 10.3-1.8 14.1-5l-6.9-5.5C29.1 37 26.7 38 24 38c-6 0-10.7-3.9-12.4-9.4l-7.4 5.7C7.7 41 15.3 46 24 46z" fill="#4CAF50"/>
            <path d="M46 24c0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.9 2.9-2.7 5.3-5 7l6.9 5.5C42.2 37.3 46 31.2 46 24z" fill="#1976D2"/>
          </svg>
          <span className="text-[15px] text-[#202124] flex-1 truncate">{searchQuery}</span>
          <Search className="h-5 w-5 text-[#4285F4] flex-shrink-0" />
        </div>
      </div>

      {/* Search results area — children */}
      <div className="border-t border-slate-100">
        {children}
      </div>
    </div>
  );
}
