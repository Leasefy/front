'use client';

import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { Appear } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { Acento, ANCHO, BotonDePara, Ceja, CifrasConPunto, Punto } from './piezas';

/**
 * El cierre de las páginas por público, con la identidad nueva: papel, el
 * título liviano enorme, UN botón azul y la corriente de píxeles abajo (como el
 * contacto de la landing). Mismos textos, cifras y destinos que tenía
 * `CTASection` (la foto negra con velos y tarjetas de vidrio), que sigue en
 * /pricing.
 */
export function CierreDePara({ semilla = 11 }: { semilla?: number }) {
  return (
    <section
      data-testid="cierre-de-para"
      className="relative overflow-hidden bg-[#FBFAF8] pb-[clamp(200px,22vw,320px)] pt-[clamp(110px,13vw,190px)] text-center text-[#121110]"
    >
      <CorrienteDeVoltaje
        fondo="papel"
        forma="horizonte"
        semilla={semilla}
        fuerza={0.72}
        className="absolute inset-x-0 bottom-0 z-0 h-[clamp(230px,26vw,370px)] w-full [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.85)_25%,rgba(0,0,0,.3)_60%,transparent_90%)]"
      />
      <div className={cn(ANCHO, 'relative z-[1]')}>
        <Appear inView direction="none" duration="slow">
          <Ceja>+200 inmobiliarias ya confían en nosotros</Ceja>
        </Appear>
        <Appear inView distance="md" duration="slow" delay={0.08}>
          <h2 className="mx-auto mt-6 max-w-[1100px] font-heading text-[clamp(44px,6.6vw,100px)] font-[340] leading-[0.98] tracking-[-0.045em]">
            Administra más <Acento>con menos esfuerzo</Acento>
          </h2>
        </Appear>
        <Appear inView as="p" distance="md" duration="slow" delay={0.16}
          className="mx-auto mt-6 max-w-[620px] text-[clamp(17px,1.35vw,20px)] leading-[1.55] text-[#5B5751]"
        >
          Sube tu portafolio, activa los agentes AI, y deja que la plataforma haga el trabajo pesado por ti.
        </Appear>
        <Appear inView distance="md" duration="slow" delay={0.22}
          className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <BotonDePara href="/auth?mode=register&role=agency" grande className="w-full sm:w-auto">
            Empezar gratis
          </BotonDePara>
          <BotonDePara href="/pricing" variante="arena" grande className="w-full sm:w-auto">
            Ver precios
          </BotonDePara>
        </Appear>
        <Appear inView distance="md" duration="slow" delay={0.28}>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-3 text-[15px] text-[#5B5751]">
            {['Sin compromiso', 'Activo en 5 min', 'Plan gratis disponible'].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Punto className="h-1.5 w-1.5" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-mono text-caption tracking-[0.04em] text-[#706B64]">
            <span className="text-[#121110]">4.9</span> de 5 · 850+ reseñas
          </p>
        </Appear>

        <Appear inView distance="md" duration="slow" delay={0.32} className="mx-auto mt-[clamp(48px,6vw,80px)] max-w-[1080px] text-left">
          <CifrasConPunto
            cifras={[
              { valor: '+340', rotulo: 'Arriendos este mes' },
              { valor: '98%', rotulo: 'Satisfacción' },
              { valor: '48 horas', rotulo: 'De aplicación a aprobación' },
              { valor: '2,847', rotulo: 'Propiedades activas' },
            ]}
          />
        </Appear>
      </div>
    </section>
  );
}
