'use client';

/**
 * «Giros a propietarios»: UNA tarea en cuatro pasos (Nico, 22-10-2026: unir
 * Dispersiones y Liquidaciones). Antes eran dos pantallas hermanas en el menú y
 * nada decía en qué orden se usaban ni que «Lotes al banco» era la mitad del
 * trabajo. Ahora cada una es un paso de la misma tarea, con el mismo encabezado
 * y este riel arriba:
 *
 *   1 Liquidar → 2 Revisar y aprobar → 3 Archivo del banco → 4 Marcar pagado
 *
 * Las rutas de siempre no cambian (hay enlaces a ellas en toda la plataforma):
 * el riel las ordena y dice dónde estás. Ninguna regla de negocio cambia.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';

export type PasoDeLosGiros = 'liquidar' | 'revisar' | 'banco' | 'pagado';

const RAIZ = '/panel/inmobiliaria/pagos';

export const PASOS_DE_LOS_GIROS: readonly {
  id: PasoDeLosGiros;
  titulo: string;
  descripcion: string;
  href: string;
}[] = [
  {
    id: 'liquidar',
    titulo: 'Liquidar',
    descripcion: 'Lo que le toca a cada propietario en el mes: su parte del canon, menos la comisión y los descuentos.',
    href: `${RAIZ}/liquidaciones`,
  },
  {
    id: 'revisar',
    titulo: 'Revisar y aprobar',
    descripcion: 'La dispersión del mes, giro por giro: revísala y apruébala antes de armar el lote.',
    href: `${RAIZ}/dispersiones`,
  },
  {
    id: 'banco',
    titulo: 'Archivo del banco',
    descripcion: 'Arma el lote del mes y descarga el archivo plano para subirlo al portal del banco.',
    href: `${RAIZ}/dispersiones/lotes`,
  },
  {
    id: 'pagado',
    titulo: 'Marcar pagado',
    descripcion: 'Cuando el banco ya pagó, marca el lote pagado: así cada propietario queda al día.',
    href: `${RAIZ}/dispersiones/lotes?paso=pagado`,
  },
];

/** Lo que dice el encabezado de la pantalla en ese paso. */
export function descripcionDelPaso(paso: PasoDeLosGiros): string {
  return PASOS_DE_LOS_GIROS.find((p) => p.id === paso)?.descripcion ?? '';
}

export const TITULO_DE_LOS_GIROS = 'Giros a propietarios';
export const SECCION_DE_LOS_GIROS = 'Pagar a propietarios';

export function PasosDeLosGiros({ paso, className }: { paso: PasoDeLosGiros; className?: string }) {
  const tr = useTr();
  const indiceActual = PASOS_DE_LOS_GIROS.findIndex((p) => p.id === paso);
  /* A 390 el riel no cabe: se desliza solo hasta el paso actual, para que siempre se vea dónde estás. */
  const riel = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = riel.current;
    const actual = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!ol || !actual || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollLeft = Math.max(0, actual.offsetLeft - (ol.clientWidth - actual.offsetWidth) / 2);
  }, [paso]);
  return (
    <nav aria-label={tr('Pasos del giro a propietarios')} className={cn('min-w-0', className)} data-testid="pasos-de-los-giros">
      <ol
        ref={riel}
        className="relative -mx-1 flex min-w-0 items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PASOS_DE_LOS_GIROS.map((p, i) => {
          const actual = p.id === paso;
          const hecho = indiceActual > i;
          return (
            <li key={p.id} className="flex shrink-0 items-center gap-1">
              {i > 0 ? <span className="h-px w-3 bg-border sm:w-5" aria-hidden="true" /> : null}
              <Link
                href={p.href}
                aria-current={actual ? 'step' : undefined}
                data-testid={`paso-de-los-giros-${p.id}`}
                className={cn(
                  // `relative`: el «(paso actual)» oculto no se escapa del riel (estiraba la página a 390).
                  'relative inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 text-body-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--menu-activa-tinta)]',
                  actual
                    ? 'bg-[color:var(--menu-activa)] font-medium text-[color:var(--menu-activa-tinta)]'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-caption tabular-nums',
                    actual ? '' : hecho ? 'text-fg-muted' : 'text-fg-subtle',
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                {tr(p.titulo)}
                {actual ? <span className="sr-only">{tr('(paso actual)')}</span> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
