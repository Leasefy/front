'use client';

import { useState, type ReactNode } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { CrossFade } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { FotoQueSeRevela } from './FotoQueSeRevela';
import { ANCHO, Ceja, ESQUINA, Seccion } from './piezas';

export interface TestimonioDePara {
  quote: string;
  author: string;
  role: string;
  image: string;
}

/**
 * Los testimonios como el de Portofino en la landing: la foto en estrías de
 * voltaje (se revela a color), la cita grande y liviana, y quién la dice en
 * DM Mono. Uno a la vez; los puntos dicen cuál es y cuántos hay.
 */
export function TestimoniosDePara({
  testimonios,
  ceja,
  titulo,
  avatar,
}: {
  testimonios: TestimonioDePara[];
  ceja: ReactNode;
  titulo: ReactNode;
  /** Algo junto al nombre (p. ej. la foto pequeña de la inmobiliaria). */
  avatar?: (testimonial: TestimonioDePara) => ReactNode;
}) {
  const [i, setI] = useState(0);
  const [direccion, setDireccion] = useState<'forward' | 'backward'>('forward');
  const n = testimonios.length;
  const t = testimonios[i];

  const ir = (a: number) => {
    setDireccion(a > i ? 'forward' : 'backward');
    setI(a);
  };
  const siguiente = () => {
    setDireccion('forward');
    setI((p) => (p + 1) % n);
  };
  const anterior = () => {
    setDireccion('backward');
    setI((p) => (p - 1 + n) % n);
  };

  const flecha = cn(
    'inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#121110] ring-1 ring-[#E7E3DC] transition-colors duration-fast hover:bg-[#E7E3DC]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1A40FF]',
    ESQUINA,
  );

  return (
    <Seccion fondo="arena">
      <div className={ANCHO}>
        <Ceja>{ceja}</Ceja>
        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-[860px] font-heading text-[clamp(34px,4.4vw,64px)] font-[360] leading-[1.03] tracking-[-0.04em] text-[#121110]">
            {titulo}
          </h2>
          <div className="flex flex-none items-center gap-3">
            <button type="button" onClick={anterior} className={flecha} aria-label="Anterior testimonio">
              <CaretLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={siguiente} className={flecha} aria-label="Siguiente testimonio">
              <CaretRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <CrossFade swapKey={i} direction={direccion} className="mt-[clamp(40px,5vw,72px)]">
          <div className="grid items-start gap-[clamp(28px,5vw,80px)] md:grid-cols-[.8fr_1.2fr]">
            <FotoQueSeRevela src={t.image} alt={t.author} proporcion={1} paso={7} rotulo={t.author} />
            <blockquote className="m-0 flex h-full flex-col">
              <p className="font-heading text-[clamp(24px,2.7vw,40px)] font-[340] leading-[1.24] tracking-[-0.03em] text-[#121110]">
                «{t.quote}»
              </p>
              <footer className="mt-8 flex items-center gap-3">
                {avatar ? avatar(t) : null}
                <span className="font-mono text-caption uppercase tracking-[0.06em] text-[#706B64]">
                  <span className="text-[#121110]">{t.author}</span> · {t.role}
                </span>
              </footer>
            </blockquote>
          </div>
        </CrossFade>

        <div className="mt-10 flex items-center gap-4" role="group" aria-label="Testimonios">
          <span className="font-mono text-caption tabular-nums text-[#706B64]">
            {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1.5">
            {testimonios.map((x, k) => (
              <button
                key={x.author}
                type="button"
                onClick={() => ir(k)}
                aria-label={`Testimonio ${k + 1}: ${x.author}`}
                aria-current={k === i ? 'true' : undefined}
                className="grid h-6 w-6 place-items-center"
              >
                <i
                  aria-hidden="true"
                  className={cn(
                    'block h-2 w-2 rounded-[2px] transition-colors duration-base',
                    k === i ? 'bg-[#1A40FF]' : 'bg-[#D6D1C8]',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Seccion>
  );
}
