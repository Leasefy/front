import type { Metadata } from 'next'
import { ContactForm } from '@/components/landing/contact/ContactForm'
import { landingRobots } from '@/lib/landing/landing-stage'

// Thin route shell (landing-react-port SLICE 7, T7.1). New path — no
// conflict with the live site — ships at its final URL from day one,
// gated `noindex` via `landingRobots()` until the SLICE 9 flip. Design
// §3 (ADR-4): no backend contact endpoint — the form composes a
// `mailto:` URL, no network call, no PII stored.
export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Cuéntanos cómo opera tu inmobiliaria hoy y te mostramos, con tus propios casos, cómo se ve en piloto automático.',
  robots: landingRobots(),
}

export default function ContactPage() {
  return <ContactForm />
}
