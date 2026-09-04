'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * BarraDePestanas — la franja de navegación pegada debajo del header. Son DOS
 * capas, y cada una tiene SU cara para que nunca se confundan:
 *
 *   · `nivel="secciones"` — las SECCIONES de un módulo (N3): Inmuebles ·
 *     Avalúos; Cobros · Recaudo · Cartera · Cobranza. Cards chicas dentro de
 *     un rectángulo —el lenguaje del `SegmentedControl` de cadence—: se ve
 *     que son hermanas y que se pasa de una a otra. La franja se queda quieta
 *     mientras estés en cualquiera de ellas, también adentro de un agente
 *     (`SeccionesDelModulo`).
 *   · `nivel="pestanas"` — la PROFUNDIDAD de la sección activa: las funciones
 *     internas de un agente (Resumen · Casos · Acuerdos…). Pestañas
 *     subrayadas, más chicas, sobre una banda hundida: cuelgan de la card
 *     marcada arriba (`WorkspaceNav`).
 *
 * Antes las dos capas eran pestañas subrayadas idénticas y se turnaban el
 * mismo sitio: al entrar en Avalúos, «Inmuebles · Avalúos» desaparecía y en su
 * lugar aparecía «Resumen · Mis solicitudes · Configuración». Dos niveles con
 * la misma cara (Nico, 2026-09-03). Ahora conviven, una encima de la otra.
 *
 * Cada barra publica su alto en una variable CSS (`cssVar`) para que lo que
 * quiera quedar pegado DEBAJO sepa dónde termina: el header mide 64px
 * (`top-16`), las secciones `--secciones-h` y las pestañas `--workspace-nav-h`.
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
  cssVar: '--secciones-h' | '--workspace-nav-h';
  /** Clase `top-*` del sticky (el header mide 4rem). */
  topClass: string;
  /** Capa: las secciones del módulo (cards, arriba) o la profundidad de la sección (pestañas, abajo). */
  nivel: 'secciones' | 'pestanas';
  /** Se re-mide al cambiar (la ruta): las pestañas entran de a poco. */
  pathname: string;
}

const PILDORA_IA = (
  <span className="rounded-full bg-primary-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-primary">
    IA
  </span>
);

/** Una sección del módulo: card chica dentro del rectángulo. */
function CardDeSeccion({ item }: { item: PestanaDeBarra }) {
  const IconoDeLaSeccion = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.current ? 'page' : undefined}
      data-activa={item.active ? 'true' : undefined}
      data-tour-target={item.dataTourTarget}
      className={cn(
        'group relative flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-[13px] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted',
        item.active ? 'bg-surface font-medium text-fg shadow-sm' : 'text-fg-muted hover:bg-surface/60 hover:text-fg',
      )}
    >
      <IconoDeLaSeccion
        className={cn('h-4 w-4', item.active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}
        weight={item.active ? 'fill' : 'regular'}
      />
      {item.label}
      {item.ia && PILDORA_IA}
    </Link>
  );
}

/** Una función dentro de la sección: pestaña subrayada. */
function PestanaDeProfundidad({ item }: { item: PestanaDeBarra }) {
  const IconoDeLaPestana = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.current ? 'page' : undefined}
      data-activa={item.active ? 'true' : undefined}
      data-tour-target={item.dataTourTarget}
      className={cn(
        'group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3 text-[13px] transition-colors',
        item.active ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      <IconoDeLaPestana
        className={cn('h-4 w-4', item.active ? 'text-primary' : 'text-fg-subtle group-hover:text-fg')}
        weight={item.active ? 'fill' : 'regular'}
      />
      {item.label}
      {item.ia && PILDORA_IA}
      <span
        className={cn(
          'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary transition-opacity duration-150',
          item.active ? 'opacity-100' : 'opacity-0',
        )}
      />
    </Link>
  );
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

  // La sección/pestaña activa tiene que VERSE: en un celular «Cobranza» quedaba
  // cortada al borde derecho del riel, con la flecha encima. Al montar y en
  // cada cambio de ruta se trae a la vista (sólo en horizontal: nada de
  // `scrollIntoView`, que también mueve la página en vertical).
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const traerActivaALaVista = () => {
      const activa = el.querySelector<HTMLElement>('a[data-activa="true"]');
      if (!activa) return;
      const margen = 48; // deja ver que hay algo al lado + la flecha
      const riel = el.getBoundingClientRect();
      const caja = activa.getBoundingClientRect();
      if (caja.right > riel.right - margen) {
        el.scrollBy({ left: caja.right - riel.right + margen });
      } else if (caja.left < riel.left + margen) {
        el.scrollBy({ left: caja.left - riel.left - margen });
      }
    };
    traerActivaALaVista();
    // Girar el teléfono o achicar la ventana también puede taparla.
    window.addEventListener('resize', traerActivaALaVista);
    return () => window.removeEventListener('resize', traerActivaALaVista);
  }, [scrollEl, pathname]);

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

  const esSecciones = nivel === 'secciones';

  return (
    <div
      ref={barRef}
      data-nivel={nivel}
      className={cn(
        // `print:hidden`: la navegación no va en un PDF (cuenta de cobro, ficha de un caso).
        'sticky border-b border-border backdrop-blur-md print:hidden',
        topClass,
        // Las secciones van por encima de las pestañas (ambas sticky); la banda
        // de las pestañas es hundida para leerse como «dentro de» la card activa.
        esSecciones ? 'z-[21] bg-bg/95' : 'z-20 bg-surface-muted/40',
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
          className={cn(
            'flex overflow-x-auto px-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden',
            esSecciones ? 'py-2' : 'gap-1',
          )}
        >
          {esSecciones ? (
            // El rectángulo: un riel hundido con las cards adentro.
            <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[12px] bg-surface-muted p-1">
              {items.map((item) => (
                <CardDeSeccion key={item.href} item={item} />
              ))}
            </div>
          ) : (
            items.map((item) => <PestanaDeProfundidad key={item.href} item={item} />)
          )}
        </nav>
      </div>
    </div>
  );
}
