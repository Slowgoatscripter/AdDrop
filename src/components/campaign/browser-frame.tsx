'use client';

import { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface BrowserFrameProps {
  searchQuery?: string;
  children: ReactNode;
}

/**
 * Browser chrome wrapper for Google Ads mockups.
 * Shows a search bar with the query and renders the SERP content inside.
 */
export function BrowserFrame({ searchQuery, children }: BrowserFrameProps) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* Browser toolbar */}
      <div className="bg-[#F1F3F4] px-3 py-2 border-b border-slate-200">
        {/* Tab bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ED6A5E]" />
            <div className="w-3 h-3 rounded-full bg-[#F5BF4F]" />
            <div className="w-3 h-3 rounded-full bg-[#61C554]" />
          </div>
          <div className="flex-1 ml-2 bg-white rounded-full px-4 py-1.5 text-sm text-[#5F6368] flex items-center gap-2 border border-slate-200">
            <Search className="w-4 h-4 text-[#9AA0A6]" />
            <span className="truncate">{searchQuery || 'Search Google'}</span>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
