import { Reveal } from '@/components/landing/motion/Reveal'
import { LandingImage } from '@/components/landing/media/LandingImage'
import { LANDING_PHOTOS } from '@/lib/landing/assets'

/**
 * Home's case-study beat, ported from the standalone's `#testimonios`
 * section: the Portofino founders' story (quote + portrait + closing
 * note card). No scroll-scrubbing here — content reveals via `Reveal`
 * (`whileInView`), matching the standalone's `data-reveal` staggering
 * but without the geometry-based `ppMark()` system (design §4/§7).
 */
export function CaseRail() {
  return (
    <section className="landing-case-rail" data-testid="case-rail">
      <div className="landing-case-rail__grid">
        <Reveal className="landing-case-rail__left">
          <h2>Portofino dejó de operar a mano</h2>
          <p className="landing-case-rail__meta">Portofino · Inmobiliaria · Medellín</p>
          <blockquote className="quote">
            <p>
              Pasamos de perseguir pagos por WhatsApp y Excel a que la cobranza se haga sola. El
              cierre de mes dejó de ser una pelea.
            </p>
            <div className="who">— Juan López · Cofundador de Portofino</div>
          </blockquote>
        </Reveal>

        <Reveal className="landing-case-rail__photo" delay={0.14}>
          <div className="landing-case-rail__frame" data-testid="case-rail-frame">
            <LandingImage
              src={LANDING_PHOTOS.foundersPortofino.src}
              width={LANDING_PHOTOS.foundersPortofino.width}
              height={LANDING_PHOTOS.foundersPortofino.height}
              alt="Foto de Juan y Alexander, fundadores de Portofino"
              data-testid="case-rail-portrait"
            />
            <span className="landing-case-rail__frame-label">Juan &amp; Alexander</span>
          </div>

          <div className="landing-case-rail__note" data-testid="case-rail-note">
            <div className="landing-case-rail__note-row">
              <span>Una nota para Portofino</span>
              <span>Nº 001</span>
            </div>
            <h3>Operación en calma. Portafolio que perdura.</h3>
            <div className="landing-case-rail__note-row landing-case-rail__note-row--bottom">
              <span>LF / OPS — Gracias, Juan y Alexander</span>
              <span>leasefy.com</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
