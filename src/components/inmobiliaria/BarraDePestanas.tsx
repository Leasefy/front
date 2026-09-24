'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Icon } from '@phosphor-icons/react';
import { CaretDown, CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
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
 * ── Las CARAS (`caras`), sólo en el nivel «secciones» ───────────────────────
 *
 * Un módulo puede tener dos caras del mismo asunto —hoy sólo Pagos: la plata
 * que ENTRA de los inquilinos y la que SALE hacia los propietarios—. Eso NO es
 * una sección más: es de qué lado del contrato estás parado, y decide QUÉ
 * secciones tiene sentido mostrar.
 *
 * Estuvo un tiempo resuelto como dos rótulos en versalitas metidos entre las
 * cards del mismo riel. Nico (2026-09-16): «eso de arriba de inquilinos y
 * propietarios no se entiende, esa separación de las tabs de arriba». Eran dos
 * niveles distintos peleando por el mismo renglón, con la misma cara.
 *
 * Ahora la cara es un selector EXPLÍCITO en su propio renglón, arriba, y
 * debajo van sólo las secciones de la cara elegida. Cada cara es un ENLACE a
 * su primera sección visible —no un estado local—: así la cara viaja en la
 * URL, se puede compartir y volver, y al entrar en Dispersiones la cara ya
 * queda en «Propietarios» sin que nadie la toque. Mismo criterio que
 * `PestanasDeCartera`.
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
  /** Resaltada (coincidencia por prefijo: en una ficha sigues «dentro»). */
  active: boolean;
  /** `aria-current="page"` sólo en la coincidencia EXACTA. */
  current: boolean;
  /** Píldora «IA»: la pantalla es (o está asistida por) un agente. */
  ia?: boolean;
  /**
   * La pantalla NO es de la cara elegida: mira todas (hoy sólo el tablero
   * financiero). Va primero y con una línea que la separa del resto — si se
   * mezclara, se leería como una sección más de este lado de la plata.
   */
  sinCara?: boolean;
  dataTourTarget?: string;
}

/**
 * Una cara del módulo: de qué lado del contrato se está mirando la plata.
 *
 * `href` es la primera sección VISIBLE de esa cara (la decide quien arma los
 * items, con los gates ya aplicados): una cara sin ninguna sección visible no
 * se pasa, y por lo tanto no se anuncia.
 */
export interface CaraDeLaBarra {
  clave: string;
  label: string;
  /** El matiz que la explica sin abrir nada: «lo que entra» / «lo que sale». */
  detalle: string;
  href: string;
  icon: Icon;
  activa: boolean;
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
  /**
   * Las caras del módulo, si tiene más de una. Se dibujan ARRIBA del riel y
   * sólo en `nivel="secciones"`. Con menos de dos no se dibuja nada: no se
   * anuncia una separación que no existe.
   */
  caras?: readonly CaraDeLaBarra[];
  /** Cómo se llama el conjunto de caras para un lector de pantalla. */
  carasAriaLabel?: string;
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

/**
 * El selector de cara: de qué lado del contrato se mira la plata.
 *
 * ── 🔴 Por qué dejó de ser una fila de píldoras (Nico, 18-09 de noche) ──────
 *
 * «Esta navegación no se entiende un culo.» Eran DOS renglones, uno encima del
 * otro: arriba las caras como píldoras, abajo las secciones como cards en un
 * rectángulo hundido. Cada renglón, por separado, estaba bien. Juntos no,
 * porque **los dos se leían como pestañas del mismo nivel** y nada decía que
 * el de abajo colgaba del de arriba: eran dos filas de cosas horizontales,
 * clicables y parecidas, una sobre la otra.
 *
 * Lo que arregla el defecto no es pintar mejor las píldoras: es que las dos
 * capas dejen de tener la misma FORMA y pasen a leerse de izquierda a derecha,
 * que es como se lee una jerarquía en una barra:
 *
 *     [ ↓ Cobrar a inquilinos ⌄ ] │ [Tablero] ┆ [Deuda del mes] [Recaudo] …
 *       ↑ un selector                ↑ lo que hay dentro de esa cara
 *
 * Un botón con su cursor de menú y su caret no se confunde con una pestaña ni
 * un segundo; y el renglón único hace que no haya dos filas compitiendo. De
 * paso entra la TERCERA cara (tesorería) sin ensanchar nada: con píldoras, tres
 * caras con su matiz ocupaban media pantalla antes de la primera sección.
 *
 * ── Sigue siendo un ENLACE, no un estado local ──────────────────────────────
 *
 * Cada opción del menú es un `<Link>` a la primera sección visible de esa cara:
 * la cara viaja en la URL, se puede compartir y se puede volver, y al entrar en
 * Dispersiones queda en «Propietarios» sin que nadie la toque.
 *
 * ── Y por qué el menú se escribe a mano y no con Radix ──────────────────────
 *
 * Tres enlaces en una caja que se cierra con Escape, con un clic afuera o al
 * navegar. Un menú porteado traería foco atrapado, `pointer-events` sintéticos
 * y un portal que los tests de esta barra no pueden abrir sin simular gestos
 * del navegador — para tres enlaces. Esto es todo lo que hace falta.
 */
function SelectorDeCaras({
  caras,
  ariaLabel,
  pathname,
}: {
  caras: readonly CaraDeLaBarra[];
  ariaLabel: string;
  pathname: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const elegida = caras.find((c) => c.activa) ?? caras[0]!;
  const IconoElegido = elegida.icon;

  // Navegar cierra el menú: sin esto queda abierto encima de la pantalla nueva.
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: MouseEvent) => {
      if (!cajaRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', afuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', afuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierto]);

  return (
    <div ref={cajaRef} className="relative shrink-0" data-testid="selector-de-caras">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={ariaLabel}
        data-testid="abrir-caras"
        data-cara-elegida={elegida.clave}
        onClick={() => setAbierto((v) => !v)}
        className={cn(
          'flex max-w-[15rem] items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pl-2.5 pr-2 text-left transition-colors hover:bg-surface-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        )}
      >
        <IconoElegido className="h-4 w-4 shrink-0 text-primary" weight="bold" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-tight text-fg">
            {elegida.label}
          </span>
          {/* El matiz es lo que hace que la separación se entienda sin abrir
              nada. En un teléfono no cabe y el rótulo ya lleva verbo. */}
          <span className="hidden truncate text-[11px] leading-tight text-fg-subtle sm:block">
            {elegida.detalle}
          </span>
        </span>
        <CaretDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform',
            abierto && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label={ariaLabel}
          data-lenis-prevent
          className="absolute left-0 top-[calc(100%+4px)] z-30 w-[19rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {caras.map((cara) => {
            const IconoDeLaCara = cara.icon;
            return (
              <Link
                key={cara.clave}
                role="menuitem"
                href={cara.href}
                data-cara={cara.clave}
                data-activa={cara.activa ? 'true' : undefined}
                aria-current={cara.activa ? 'true' : undefined}
                onClick={() => setAbierto(false)}
                className={cn(
                  'flex items-start gap-2.5 rounded-sm px-2.5 py-2 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  cara.activa ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                )}
              >
                <IconoDeLaCara
                  className={cn('mt-0.5 h-4 w-4 shrink-0', cara.activa ? 'text-primary' : 'text-fg-subtle')}
                  weight={cara.activa ? 'bold' : 'regular'}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-fg">{cara.label}</span>
                  <span className="block text-[11px] text-fg-subtle">{cara.detalle}</span>
                </span>
                {cara.activa && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" weight="bold" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BarraDePestanas({
  items,
  ariaLabel,
  cssVar,
  topClass,
  nivel,
  pathname,
  caras,
  carasAriaLabel,
}: BarraDePestanasProps) {
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
  // Con menos de dos caras no se dibuja el selector: no se anuncia una
  // separación que, para esa persona, no existe.
  const conCaras = esSecciones && !!caras && caras.length > 1;

  const riel = (
      <div className={cn('relative', conCaras && 'min-w-0 flex-1')}>
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
            'flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            // Con selector, el padding izquierdo lo pone el renglón: si no, el
            // riel arrancaría a 24 px del control del que cuelga.
            conCaras ? 'pl-2 pr-4 md:pr-6' : 'px-4 md:px-6',
            esSecciones && !conCaras ? 'py-2' : '',
            esSecciones ? '' : 'gap-1',
          )}
        >
          {esSecciones ? (
            // El rectángulo: UN riel hundido con las cards adentro. Con dos
            // caras, acá abajo van SÓLO las de la cara elegida — la elección
            // vive en el renglón de arriba, que es otro nivel.
            <div className="inline-flex shrink-0 items-center gap-0.5 rounded-[12px] bg-surface-muted p-1">
              {items.map((item, i) => (
                <Fragment key={item.href}>
                  {/* La línea que separa lo que mira TODAS las caras (el
                      tablero financiero) de las secciones de ESTA cara. Sin
                      ella, el tablero se leería como una sección más de este
                      lado de la plata. */}
                  {item.sinCara === false && items[i - 1]?.sinCara === true && (
                    <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
                  )}
                  <CardDeSeccion item={item} />
                </Fragment>
              ))}
            </div>
          ) : (
            items.map((item) => <PestanaDeProfundidad key={item.href} item={item} />)
          )}
        </nav>
      </div>
  );

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
      {/* 🔴 UN SOLO RENGLÓN (Nico, 18-09: «esta navegación no se entiende un
          culo»). La cara a la izquierda, una línea, y a la derecha lo que hay
          DENTRO de esa cara. Dos filas de cosas horizontales y clicables, una
          encima de la otra, se leen como dos juegos de pestañas del mismo
          nivel por bien pintada que esté cada una. */}
      {conCaras ? (
        <div className="flex items-center gap-2 py-2 pl-4 md:pl-6">
          <SelectorDeCaras
            caras={caras!}
            ariaLabel={carasAriaLabel ?? 'Caras del módulo'}
            pathname={pathname}
          />
          <span aria-hidden="true" className="h-8 w-px shrink-0 bg-border" />
          {riel}
        </div>
      ) : (
        riel
      )}
    </div>
  );
}
