import type { ReactNode } from 'react'
import type { Vignette, VignetteFamily } from '@/lib/landing/types'

const FAMILY_MODIFIER: Record<VignetteFamily, string> = {
  sys: 'landing-vg-card__head--sys',
  ag: 'landing-vg-card__head--ag',
  chat: 'landing-vg-card__head--chat',
}

/**
 * The shared `.scard` shell every vignette lives inside. Ports the
 * standalone's `vgCard`/`vgHead` (`landing-standalone/index.html`
 * ~L3682-3688): a header with a color variant by family (sys→black ERP,
 * ag→blue agent, chat→white with a green pulse dot), a body slot for the
 * typed renderer, and an optional corner stamp.
 */
export function VgCard({ vignette, children }: { vignette: Vignette; children: ReactNode }) {
  const { header, stamp } = vignette
  return (
    <div className="landing-vg-card" data-testid="vg-card" data-kind={vignette.kind}>
      <div className={`landing-vg-card__head ${FAMILY_MODIFIER[header.family]}`}>
        <span className="landing-vg-card__dot" aria-hidden="true">
          <span className="landing-vg-card__dot-ping" />
          <span className="landing-vg-card__dot-core" />
        </span>
        <span className="landing-vg-card__label">{header.label}</span>
        {header.meta && <span className="landing-vg-card__meta">{header.meta}</span>}
      </div>
      <div className="landing-vg-card__body">{children}</div>
      {stamp && (
        <span className="landing-vg-card__stamp" data-testid="vg-card-stamp">
          {stamp}
        </span>
      )}
    </div>
  )
}
