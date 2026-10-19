import type { Metadata } from 'next'

// Per-submission status page: never indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AvaluoEstadoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
