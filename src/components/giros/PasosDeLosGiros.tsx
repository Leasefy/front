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
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';
import { buttonVariants } from '@/components/ui/button';
import type { EstadoDeLosPasos, PasoDelGiro } from '@/lib/giros/estado-de-los-pasos';
import { conElMes } from '@/lib/giros/meses-de-los-giros';

export type PasoDeLosGiros = PasoDelGiro;

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
    // Ronda 26 (revisora r25, #2): una línea; el desglose (canon, comisión, ajustes, neto) ya son las
    // columnas de la tabla.
    descripcion: 'Lo que le toca a cada propietario en el mes.',
    href: `${RAIZ}/liquidaciones`,
  },
  {
    id: 'revisar',
    titulo: 'Revisar y aprobar',
    descripcion: 'Los giros del mes, uno por uno: revísalos y apruébalos antes de armar el lote.',
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

export function PasosDeLosGiros({
  paso,
  estados,
  mes,
  className,
}: {
  paso: PasoDeLosGiros;
  /** En qué va cada paso en el mes (de los lotes del mes). Sin dato, el paso no dice nada. */
  estados?: EstadoDeLosPasos;
  /** El mes que se mira: viaja en el enlace de cada paso. */
  mes?: string;
  className?: string;
}) {
  const tr = useTr();
  const indiceActual = PASOS_DE_LOS_GIROS.findIndex((p) => p.id === paso);
  /* A 390 el riel no cabe: se desliza solo hasta el paso actual, para que siempre se vea dónde estás. */
  const riel = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = riel.current;
    const actual = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!ol || !actual || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollLeft = Math.max(0, actual.offsetLeft - (ol.clientWidth - actual.offsetWidth) / 2);
    // Ronda 21: también cuando llega lo hecho en el mes: el chulo ensancha los pasos y el actual quedaba cortado.
  }, [paso, estados]);
  return (
    <nav aria-label={tr('Pasos del giro a propietarios')} className={cn('min-w-0', className)} data-testid="pasos-de-los-giros">
      <ol
        ref={riel}
        className="relative -mx-1 flex min-w-0 items-stretch gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PASOS_DE_LOS_GIROS.map((p, i) => {
          const actual = p.id === paso;
          const antes = indiceActual > i;
          const estado = estados?.[p.id];
          return (
            <li key={p.id} className="flex shrink-0 items-center gap-1">
              {i > 0 ? <span className="h-px w-3 bg-border sm:w-5" aria-hidden="true" /> : null}
              <Link
                href={conElMes(p.href, mes)}
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
                {/* Ronda 19: el paso hecho en el mes lleva el chulo en vez del número; el que va en curso, un punto. */}
                {estado === 'hecho' ? (
                  <Check
                    className={cn('h-3.5 w-3.5', actual ? '' : 'text-success')}
                    weight="bold"
                    aria-hidden="true"
                    data-testid={`paso-hecho-${p.id}`}
                  />
                ) : (
                  <span
                    className={cn(
                      'font-mono text-caption tabular-nums',
                      actual ? '' : antes ? 'text-fg-muted' : 'text-fg-subtle',
                    )}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                )}
                {tr(p.titulo)}
                {estado === 'en_curso' ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-warning-500"
                    aria-hidden="true"
                    data-testid={`paso-en-curso-${p.id}`}
                  />
                ) : null}
                {estado ? <span className="sr-only">{estado === 'hecho' ? tr('(hecho este mes)') : tr('(en curso)')}</span> : null}
                {actual ? <span className="sr-only">{tr('(paso actual)')}</span> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Al pie de cada paso: lo que sigue, con su botón (ronda 19 de la revisora:
 * «ni ofrece el siguiente»). En el último paso no hay nada que seguir.
 */
export function SiguientePasoDeLosGiros({
  paso,
  mes,
  estados,
  className,
}: {
  paso: PasoDeLosGiros;
  /** El mes que se mira: el siguiente paso abre en ese mes. */
  mes?: string;
  /** Lo hecho en el mes: con todo girado, en vez del siguiente paso dice que el mes está listo. */
  estados?: EstadoDeLosPasos;
  className?: string;
}) {
  const tr = useTr();
  const i = PASOS_DE_LOS_GIROS.findIndex((p) => p.id === paso);
  // Ronda 21: con el mes ya girado entero no se manda a «Arma el lote»: se dice que está listo.
  if (estados?.pagado === 'hecho') {
    return (
      <div
        className={cn('flex items-center gap-2 border-t border-border pt-4 text-body-sm text-fg-muted', className)}
        data-testid="giros-del-mes-listos"
      >
        <Check className="h-4 w-4 shrink-0 text-success" weight="bold" aria-hidden="true" />
        {tr('Este mes ya está girado: los cuatro pasos están hechos.')}
      </div>
    );
  }
  const siguiente = PASOS_DE_LOS_GIROS[i + 1];
  if (!siguiente) return null;
  return (
    <div
      className={cn('flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between', className)}
      data-testid="siguiente-paso-de-los-giros"
    >
      <p className="min-w-0 text-body-sm text-fg-muted">
        <span className="font-mono text-caption uppercase tracking-wide text-fg-subtle">
          {tr('Siguiente')} · {tr('Paso')} {i + 2}
        </span>
        <span className="block text-fg">{tr(siguiente.descripcion)}</span>
      </p>
      <Link
        href={conElMes(siguiente.href, mes)}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
        data-testid={`ir-al-paso-${siguiente.id}`}
      >
        {tr('Ir a')} {tr(siguiente.titulo)}
      </Link>
    </div>
  );
}
