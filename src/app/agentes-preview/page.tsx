import { notFound } from 'next/navigation'

import { VistaDeLosOrbes } from './VistaDeLosOrbes'

export const metadata = {
  title: 'Orbes de los agentes — vista previa',
  robots: { index: false, follow: false },
}

/**
 * Vitrina de diseño de los orbes (02-10-2026): los tres looks del MISMO motor
 * de Cadence v1.2.0 —Seda, Bruma, Nebulosa— vivos en sus contextos reales, en
 * oscuro y en claro, para que Nico elija. Nadie la enlaza. 404 en producción.
 * (El showcase A/B/C de la landing que vivía acá pasó a /agentes-preview/showcase.)
 */
export default function AgentesPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }
  return <VistaDeLosOrbes />
}
