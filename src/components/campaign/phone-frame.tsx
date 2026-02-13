'use client';

import { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * Phone-shaped frame wrapper for social media ad mockups
 * (Instagram, Facebook). Provides a dark bezel with notch and rounded corners.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="mx-auto max-w-[400px]">
      <div className="rounded-[2rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] overflow-hidden shadow-xl">
        {/* Notch */}
        <div className="flex justify-center py-1.5 bg-[#1a1a1a]">
          <div className="w-20 h-5 bg-[#1a1a1a] rounded-b-2xl relative">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-3 bg-black rounded-full" />
          </div>
        </div>
        {/* Screen content */}
        <div className="overflow-hidden">
          {children}
        </div>
        {/* Bottom bar */}
        <div className="flex justify-center py-2 bg-[#1a1a1a]">
          <div className="w-28 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
