import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The page is a client component, so the metadata lives in this layout. The URL
// carries a verification token: keep it out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ArcoVerifyLayout({ children }: { children: ReactNode }) {
  return children;
}
