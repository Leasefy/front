import { Reveal } from '@/components/landing/motion/Reveal'
import { LandingImage, ClosingImage } from '@/components/landing/media/LandingImage'
import { LANDING_CLOSING } from '@/lib/landing/assets'

/**
 * Home's final beat, ported from the standalone's closing banner: a
 * Ken-Burns backdrop photo, the 234-frame animated WebP centerpiece
 * (`ClosingImage`, S2 — consumed as-is: lazy, unoptimized, blur
 * placeholder, never `priority`, since it sits at the end of a long scroll
 * narrative and is not the initial-viewport LCP element), a dark veil for
 * text contrast, and the honest `mailto:` CTA (ADR-4 — no backend contact
 * endpoint). The deferred mp4+poster-jpg swap (tracked separately) will
 * replace `ClosingImage` here without touching the surrounding structure.
 */
export function ClosingBanner() {
  return (
    <section className="landing-closing" data-testid="closing-banner">
      <div className="landing-closing__backdrop" aria-hidden="true">
        <LandingImage
          src={LANDING_CLOSING.bannerBackdrop.src}
          width={LANDING_CLOSING.bannerBackdrop.width}
          height={LANDING_CLOSING.bannerBackdrop.height}
          alt=""
        />
      </div>

      <ClosingImage className="landing-closing__animated" />

      <div className="landing-closing__veil" aria-hidden="true" />

      <Reveal className="landing-closing__content">
        <h2>Pon tu operación en piloto automático y dedícate a traer clientes.</h2>
        <div className="landing-closing__cta">
          <a href="mailto:hola@leasefy.com" className="btn inverse lg" data-testid="closing-banner-cta">
            Hablemos
          </a>
        </div>
      </Reveal>
    </section>
  )
}
