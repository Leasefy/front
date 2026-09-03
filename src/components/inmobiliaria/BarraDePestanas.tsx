'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * BarraDePestanas — la barra horizontal de pestañas del panel, pegada debajo
 * del header. La usan dos capas de navegación:
 *
 *   · `ModuloTabs`   — las pantallas (N3) de un módulo: Cobros · Recaudo ·
 *                      Cartera · Cobranza. Va primero, pegada al header.
 *   · `WorkspaceNav` — las funciones internas de un agente: Resumen · Casos ·
 *                      Acuerdos… Va debajo de la anterior cuando las dos
 *                      existen (Cobros → Cobranza → Casos).
 *
 * Cada barra publica su alto en una variable CSS (`cssVar`) para que lo que
 * quiera quedar pegado DEBAJO sepa dónde termina: el header mide 64px
 * (`top-16`), la barra de módulo `--modulo-tabs-h` y la del agente
 * `--workspace-nav-h`.
 *
 * ── Por qué el nodo del scroll va en ESTADO y no en un ref ─────────────────
 * Los efectos de abajo tienen que correr cuando la barra aparece de verdad. Con
 * un ref corrían UNA vez, cuando todavía no estaba en el DOM (los permisos se
 * resuelven después del primer render), encontraban `null` y no volvían a
 * correr: la barra desbordaba y no había forma de llegar a las últimas
 * pestañas. Un `useState` como ref los vuelve a disparar cuando el nodo existe.
 */

export interface PestanaDeBarra {
  href: string;
  label: string;
  icon: Icon;
  /** Resaltada (coincidencia por prefijo: en una ficha seguís «dentro»). */
  active: boolean;
  /** `aria-current="page"` sólo en la coincidencia EXACTA. */
  current: boolean;
  /** Píldora «IA»: la pantalla es (o está asistida por) un agente. */
  ia?: boolean;
  dataTourTarget?: string;
}

export interface BarraDePestanasProps {
  items: PestanaDeBarra[];
  ariaLabel: string;
  /** Variable CSS donde se publica el alto de la barra. */
  cssVar: '--modulo-tabs-h' | '--workspace-nav-h';
  /** Clase `top-*` del sticky (el header mide 4rem). */
  topClass: string;
  /** Capa: la de módulo (arriba) o la del agente (abajo). */
  nivel: 'modulo' | 'agente';
  /** Se re-mide al cambiar (la ruta): las pestañas entran de a poco. */
  pathname: string;
}

export function BarraDePestanas({ items, ariaLabel, cssVar, topClass, nivel, pathname }: BarraDePestanasProps) {
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const syncOverflow = useCallback(() => {
    if (!scrollEl) return;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    setOverflow({
      start: scrollEl.scrollLeft > 1,
      end: scrollEl.scrollLeft < maxScroll - 1,
    });
  }, [scrollEl]);

  // Un mouse común sólo emite deltas verticales: traducimos deltaY → scrollLeft.
  // React registra `wheel` como pasivo, así que se engancha a mano con
  // { passive: false } para poder frenar el scroll de la página debajo.
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= maxScroll && e.deltaY > 0;
      if (atStart || atEnd) return; // en los bordes, que scrollee la página
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', syncOverflow, { passive: true });
    window.addEventListener('resize', syncOverflow);

    // Las pestañas aparecen de a poco (permisos): observar el elemento y sus
    // hijos, no sólo la ventana.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncOverflow);
    ro?.observe(el);
    for (const hijo of Array.from(el.children)) ro?.observe(hijo);

    syncOverflow();
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', syncOverflow);
      window.removeEventListener('resize', syncOverflow);
      ro?.disconnect();
    };
  }, [scrollEl, syncOverflow, pathname]);

  const scrollByStep = (dir: 1 | -1) => {
    if (!scrollEl) return;
    scrollEl.scrollBy({ left: dir * Math.round(scrollEl.clientWidth * 0.7), behavior: 'smooth' });
  };

  // Publica el alto en `cssVar`; al desmontar lo borra para que otra pantalla
  // no reserve un espacio que ya no existe.
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const publicar = () => {
      document.documentElement.style.setProperty(cssVar, `${el.offsetHeight}px`);
    };
    publicar();
    const ro = new ResizeObserver(publicar);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(cssVar);
    };
  }, [cssVar]);

  const esModulo = nivel === 'modulo';

  return (
    <div
      ref={barRef}
      data-nivel={nivel}
      className={cn(
        'sticky border-b border-border backdrop-blur-md',
        topClass,
        // La barra de módulo va por encima de la del agente (ambas sticky).
        esModulo ? 'z-[21] bg-bg/95' : 'z-20 bg-bg/85',
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg to-transparent transition-opacity',
            overflow.start ? 'opacity-100' : 'opacity-0',
          )}
        />
        <button
          type="button"
          aria-label="Desplazar secciones a la izquierda"
          tabIndex={overflow.start ? 0 : -1}
          onClick={() => scrollByStep(-1)}
          className={cn(
            'absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-bg p-1 text-fg-muted shadow-sm transition-opacity hover:text-fg',
            overflow.start ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <CaretLeft className="h-4 w-4" />
        </button>
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity',
            overflow.end ? 'opacity-100' : 'opacity-0',
          )}
        />
        <button
          type="button"
          aria-label="Desplazar secciones a la derecha"
          tabIndex={overflow.end ? 0 : -1}
          onClick={() => scrollByStep(1)}
          className={cn(
            'absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-bg p-1 text-fg-muted shadow-sm transition-opacity hover:text-fg',
            overflow.end ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <CaretRight className="h-4 w-4" />
        </button>
        <nav
          ref={setScrollEl}
          aria-label={ariaLabel}
          // Lenis se come la rueda si no.
          data-lenis-prevent
          className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const IconoDeLaPestana = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                data-tour-target={item.dataTourTarget}
                className={cn(
                  'group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 transition-colors',
                  esModulo ? 'py-3 text-[13.5px]' : 'py-3.5 text-[13px]',
                  item.active ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                <IconoDeLaPestana
                  className={cn('h-4 w-4', item.active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}
                  weight={item.active ? 'fill' : 'regular'}
                />
                {item.label}
                {item.ia && (
                  <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-primary">
                    IA
                  </span>
                )}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary transition-opacity duration-150',
                    item.active ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
