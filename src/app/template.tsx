'use client';

import { PageTransition } from '@/components/providers/PageTransition';

/**
 * Template component - wraps each page with transitions
 * Unlike layout.tsx, this re-renders on navigation for animations
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
