'use client';

import { ReactNode } from 'react';

interface CardLayoutWrapperProps {
  editPanel: ReactNode;
  previewPanel: ReactNode;
}

export function CardLayoutWrapper({ editPanel, previewPanel }: CardLayoutWrapperProps) {
  return (
    <div className="w-full">
      {/* Desktop: side-by-side */}
      <div className="hidden lg:flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {editPanel}
        </div>
        <div className="w-[375px] flex-shrink-0 sticky top-4">
          {previewPanel}
        </div>
      </div>
      {/* Mobile: mockup only with editing inside */}
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-md">
          {previewPanel}
        </div>
      </div>
    </div>
  );
}
