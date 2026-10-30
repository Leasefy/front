'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * El duotono que florece (Nico, 29-10-2026, el home; 30-10: las fotos en estrías «parecen un bug»): la foto llega en
 * medianoche, voltaje y papel y, al llegar a la franja del centro de la pantalla o al pasarle el mouse, toma su color
 * real. Es la capa de tinta que va ENCIMA de la foto (la foto de abajo no cambia); el mismo filtro y los mismos tiempos
 * de `public/landing/js/09-campos.js` y `#duotono` del home. Se vuelve a teñir sólo si la foto sale por abajo (al
 * subir). Con «reducir movimiento» no se tiñe: se ve la foto tal cual. El contenedor lleva `group` y `relative`.
 */
export function TintaDelDuotono({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const filtro = `duotono-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [ver, setVer] = useState(false);
  const quieto = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== 'function') {
      setVer(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        const x = es[0];
        if (!x) return;
        if (x.isIntersecting) setVer(true);
        else if (x.boundingClientRect.top > 0) setVer(false);
      },
      { rootMargin: '-18% 0px -18% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [quieto]);

  if (quieto) return null;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-testid="tinta-del-duotono"
      data-florecio={ver ? '' : undefined}
      className={cn(
        'pointer-events-none absolute inset-0 transition-opacity delay-[350ms] duration-[1300ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:opacity-0 group-focus-visible:opacity-0',
        ver && 'opacity-0',
        className,
      )}
    >
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <filter id={filtro} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.039 0.102 0.984" />
            <feFuncG type="table" tableValues="0.059 0.251 0.980" />
            <feFuncB type="table" tableValues="0.173 1 0.973" />
          </feComponentTransfer>
        </filter>
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" style={{ filter: `url(#${filtro})` }} />
    </span>
  );
}
