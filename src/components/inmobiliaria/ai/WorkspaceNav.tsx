'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContext } from '@/lib/context/PermissionsContext';
import {
  findAgentWorkspace,
  type WorkspaceNavItem,
} from '@/lib/nav/agentWorkspaceNav';

/**
 * WorkspaceNav — the AI agent's INTERNAL navigation, rendered as a horizontal
 * scrollable tab bar at the top of every agent workspace.
 *
 * Mounted once in `app/panel/inmobiliaria/ai/layout.tsx`. It self-hides on the
 * AI hub and anywhere outside a known agent (findAgentWorkspace → null). The
 * agent's functions used to live as `children:[]` on the global sidebar; they
 * now live here so the sidebar shows each agent as a single, calm item.
 *
 * Permission/role gating mirrors the sidebar (PermissionsContext) so a user
 * never sees a tab they can't open. Sticks below the 64px PlanHeader.
 */
export function WorkspaceNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { canAccess, isAdmin, agencyRole } = usePermissionsContext();

  /**
   * El nodo va en ESTADO, no en un `useRef`.
   *
   * Con un ref, los efectos de abajo corrían UNA vez, cuando la barra todavía
   * no estaba en el DOM: los permisos del agente se resuelven después, así que
   * en el primer render `items.length < 2` y el componente devuelve `null`.
   * El efecto encontraba `scrollRef.current === null`, se iba, y NUNCA volvía a
   * correr — sus dependencias no cambiaban al montarse la barra.
   *
   * Consecuencia en pantalla: la barra desbordaba 143px y no había forma de
   * llegar a las últimas pestañas. Ni la rueda (el listener nunca se enganchó)
   * ni las flechas (`syncOverflow` nunca corrió, así que `overflow.end` se
   * quedó en false y quedaron invisibles).
   *
   * Un `useState` como ref hace que el efecto se vuelva a ejecutar el día que
   * el nodo aparece de verdad.
   */
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  // Reflect scroll position → which edge fades/arrows are actionable.
  const syncOverflow = useCallback(() => {
    if (!scrollEl) return;
    const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
    setOverflow({
      start: scrollEl.scrollLeft > 1,
      end: scrollEl.scrollLeft < maxScroll - 1,
    });
  }, [scrollEl]);

  // A plain mouse only emits vertical wheel deltas, so the horizontal bar can
  // never scroll. Translate deltaY → scrollLeft. React attaches `wheel` as a
  // passive listener, so we wire it manually with { passive: false } to allow
  // preventDefault and keep the page from scrolling underneath.
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft >= maxScroll && e.deltaY > 0;
      if (atStart || atEnd) return; // let the page scroll at the edges
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', syncOverflow, { passive: true });
    window.addEventListener('resize', syncOverflow);

    // Las pestañas aparecen de a poco: los permisos del agente se resuelven
    // después del primer render, y con cada una que entra cambia `scrollWidth`
    // sin que la ventana cambie de tamaño. Sin observar el elemento, las
    // flechas se quedaban con la medida del momento en que había menos.
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncOverflow);
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
    scrollEl.scrollBy({
      left: dir * Math.round(scrollEl.clientWidth * 0.7),
      behavior: 'smooth',
    });
  };

  /**
   * Publica la altura de la barra en `--workspace-nav-h`.
   *
   * Cualquier cosa que quiera quedar pegada DEBAJO de estas pestañas necesita
   * saber dónde terminan, y ese número no estaba en ningún lado: el reproductor
   * de Llamadas usaba un `top-20` a ojo y se montaba encima de las pestañas.
   * Medirlo evita ir repartiendo números mágicos que se desincronizan solos
   * cuando cambia el alto de la barra.
   *
   * Se usa así:  top-[calc(4rem+var(--workspace-nav-h,3rem))]
   *                        └ los 64px del PlanHeader, que es el `top-16` de acá
   */
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const publicar = () => {
      document.documentElement.style.setProperty(
        '--workspace-nav-h',
        `${el.offsetHeight}px`
      );
    };
    publicar();
    const ro = new ResizeObserver(publicar);
    ro.observe(el);
    return () => {
      ro.disconnect();
      // La barra se desmonta fuera de los workspaces: dejar el valor viejo
      // haría que otra pantalla reserve un espacio que ya no existe.
      document.documentElement.style.removeProperty('--workspace-nav-h');
    };
  }, []);

  const workspace = findAgentWorkspace(pathname ?? '');
  if (!workspace) return null;

  const items = workspace.items.filter((item) => {
    if (item.module && !canAccess(item.module, 'view')) return false;
    if (item.roles && item.roles.length > 0) {
      const roleAllowed =
        isAdmin || (agencyRole !== null && (item.roles as string[]).includes(agencyRole));
      if (!roleAllowed) return false;
    }
    return true;
  });

  // Nothing to navigate between → don't render a one-tab bar.
  if (items.length < 2) return null;

  const isActive = (item: WorkspaceNavItem) =>
    pathname === item.href || (!item.exact && (pathname ?? '').startsWith(`${item.href}/`));

  return (
    <div
      ref={barRef}
      className="sticky top-16 z-20 border-b border-border bg-bg/85 backdrop-blur-md"
    >
      <div className="relative">
        {/* left edge fade + arrow — only actionable once scrolled */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg to-transparent transition-opacity',
            overflow.start ? 'opacity-100' : 'opacity-0'
          )}
        />
        <button
          type="button"
          aria-label="Desplazar secciones a la izquierda"
          tabIndex={overflow.start ? 0 : -1}
          onClick={() => scrollByStep(-1)}
          className={cn(
            'absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-bg p-1 text-fg-muted shadow-sm transition-opacity hover:text-fg',
            overflow.start ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <CaretLeft className="h-4 w-4" />
        </button>
        {/* right edge fade + arrow — hints there's more to scroll */}
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity',
            overflow.end ? 'opacity-100' : 'opacity-0'
          )}
        />
        <button
          type="button"
          aria-label="Desplazar secciones a la derecha"
          tabIndex={overflow.end ? 0 : -1}
          onClick={() => scrollByStep(1)}
          className={cn(
            'absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-bg p-1 text-fg-muted shadow-sm transition-opacity hover:text-fg',
            overflow.end ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <CaretRight className="h-4 w-4" />
        </button>
        <nav
          ref={setScrollEl}
          aria-label={`Secciones de ${t(workspace.labelKey)}`}
          // Lenis otherwise hijacks the wheel and the bar never scrolls.
          data-lenis-prevent
          className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                data-tour-target={item.dataTourTarget}
                className={cn(
                  'group relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3.5 text-[13px] transition-colors',
                  active
                    ? 'font-medium text-fg'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    active
                      ? 'text-primary'
                      : 'text-fg-subtle group-hover:text-fg'
                  )}
                  weight={active ? 'fill' : 'regular'}
                />
                {t(item.labelKey)}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary transition-opacity duration-150',
                    active ? 'opacity-100' : 'opacity-0'
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
