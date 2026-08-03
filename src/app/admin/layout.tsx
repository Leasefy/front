import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './admin.css'

/**
 * /admin root layout. Wraps every admin route (incl. login/callback/forbidden)
 * in `.admin-scope` so the nest-brandbook theme applies ONLY here and never
 * leaks into the customer app. Loads Inter (self-hosted by next/font) for the
 * admin body font without touching the customer app's Schibsted/JetBrains.
 *
 * This is an internal, cross-tenant PII tool — keep it out of search indexes.
 */
const inter = Inter({
  variable: '--font-admin-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Leasefy Admin',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`admin-scope ${inter.variable}`}>{children}</div>
  )
}
