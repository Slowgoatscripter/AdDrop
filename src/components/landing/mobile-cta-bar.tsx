'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function MobileCTABar() {
  const [visible, setVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth check on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profile?.role === 'admin') setIsAdmin(true);
      }
    });
  }, []);

  // Determine link targets based on auth state
  const leftHref = isAuthenticated
    ? isAdmin
      ? '/admin'
      : '/dashboard'
    : '/login';
  const leftLabel = isAuthenticated
    ? isAdmin
      ? 'Admin Panel'
      : 'Dashboard'
    : 'Log In';
  const rightHref = isAuthenticated ? '/create' : '/signup?next=/create';
  const rightLabel = isAuthenticated ? 'Create Campaign' : 'Sign Up Free';

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-background/98 backdrop-blur-md border-t border-gold/20 px-4 py-3 flex items-center gap-3">
        <Link
          href={leftHref}
          className="text-sm text-cream/60 hover:text-gold min-h-[44px] flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {leftLabel}
        </Link>
        <Link
          href={rightHref}
          className="flex items-center justify-center gap-2 flex-1 border-2 border-gold bg-transparent text-gold uppercase tracking-wider text-xs font-bold py-3 rounded-lg hover:bg-gold hover:text-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {rightLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
