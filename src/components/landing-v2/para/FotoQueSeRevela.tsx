'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FotoEnEstrias, type TonoDeEstrias } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { ESQUINA } from './piezas';

/**
 * El lienzo de las estrías sólo puede leer fotos del mismo origen. Una foto de
 * afuera (Unsplash, Pexels) pasa por el optimizador de Next, que la sirve desde
 * este mismo sitio; las de `public/` van tal cual.
 */
export function fotoDelMismoOrigen(src: string, ancho = 1080): string {
  return src.startsWith('/') ? src : `/_next/image?url=${encodeURIComponent(src)}&w=${ancho}&q=75`;
}

export interface FotoQueSeRevelaProps {
  src: string;
  /** Qué muestra la foto. */
  alt: string;
  tono?: TonoDeEstrias;
  /** Distancia entre líneas, en px. */
  paso?: number;
  /** Ancho / alto de la caja. */
  proporcion?: number;
  /** El rótulo blanco de la esquina (DM Mono). */
  rotulo?: ReactNode;
  /**
   * La foto se revela a color al pasar el puntero (o, en el celular, cuando la
   * caja llega al centro de la pantalla). Con `false` se queda en estrías.
   */
  revelar?: boolean;
  className?: string;
  /** Carga la foto de color de una (para el héroe). */
  prioridad?: boolean;
}

/**
 * Una foto en estrías de voltaje —la de Portofino en la landing— que se revela
 * a color. La foto de color va debajo; encima, `FotoEnEstrias` se desvanece.
 */
export function FotoQueSeRevela({
  src,
  alt,
  tono = 'voltaje-sobre-papel',
  paso = 7,
  proporcion = 4 / 3,
  rotulo,
  revelar = true,
  className,
  prioridad = false,
}: FotoQueSeRevelaProps) {
  const caja = useRef<HTMLElement>(null);
  const [ver, setVer] = useState(false);
  const url = fotoDelMismoOrigen(src);

  useEffect(() => {
    const el = caja.current;
    if (!revelar || !el || typeof window === 'undefined') return;
    const sinPuntero = window.matchMedia?.('(hover: none)').matches;
    if (!sinPuntero || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVer(e.isIntersecting), {
      rootMargin: '-35% 0px -35% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [revelar]);

  return (
    <figure
      ref={caja}
      data-revelada={ver ? 'si' : undefined}
      className={cn('group/foto relative m-0 overflow-hidden rounded-[28px] bg-[#E7E3DC]', ESQUINA, className)}
    >
      {revelar ? (
        // eslint-disable-next-line @next/next/no-img-element -- va debajo del lienzo, del mismo origen que él
        <img
          src={url}
          alt=""
          aria-hidden="true"
          loading={prioridad ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <FotoEnEstrias
        src={url}
        alt={alt}
        tono={tono}
        paso={paso}
        proporcion={proporcion}
        className={cn(
          'relative transition-opacity duration-700 ease-standard motion-reduce:transition-none',
          revelar && 'group-hover/foto:opacity-0',
          ver && 'opacity-0 delay-200',
        )}
      />
      {rotulo ? (
        <figcaption
          className={cn(
            'absolute bottom-3.5 left-3.5 z-[2] inline-flex h-[30px] max-w-[calc(100%-28px)] items-center overflow-hidden whitespace-nowrap rounded-[10px] bg-white px-3 font-mono text-caption tracking-[0.06em] text-[#121110]',
            ESQUINA,
          )}
        >
          {rotulo}
        </figcaption>
      ) : null}
    </figure>
  );
}
