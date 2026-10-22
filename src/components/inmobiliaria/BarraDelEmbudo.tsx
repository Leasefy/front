'use client';

/**
 * El embudo en una barra (Nico, 22-10-2026: «barra del embudo» en vez de las
 * 4 cifras de Prospección; plan de la ronda 18 de la revisora).
 *
 * Antes: «Interesados 4 · En proceso 4 · Cerrados este mes 0 · Tasa —», cuatro
 * cifras del mismo peso, dos repetidas, que no decían DÓNDE está la gente.
 * Ahora:
 *   · una línea con lo que pesa: en proceso y cerrados este mes; la conversión
 *     va en gris y sólo cuando hay casos resueltos (sin ellos no existe);
 *   · la barra: un tramo por etapa con gente, del ancho de su gente, de gris
 *     (lo que recién entra) a azul (lo avanzado) y verde (cerrado);
 *   · debajo, cada etapa con gente y su número; tocarla deja la lista sólo
 *     con esa etapa (otro toque la suelta).
 * Los números van con `KpiValor`: mientras carga, un hueco; si falló, «—».
 * Nunca un 0 que nadie midió.
 */
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
import { KpiValor } from '@/components/estado/KpiValor';
import { textoDeTasa } from '@/lib/tasas';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { PIPELINE_STAGES, getPipelineStageInfo } from '@/lib/types/inmobiliaria';

/** De qué color va el tramo de cada etapa: lo que recién entra en gris, lo avanzado en azul, lo cerrado en verde. */
const TONO_DEL_TRAMO: Partial<Record<PipelineStage, string>> = {
  lead: 'bg-fg-subtle/35',
  visit_scheduled: 'bg-fg-subtle/55',
  visit_done: 'bg-fg-subtle/75',
  application: 'bg-primary/45',
  evaluation: 'bg-primary/65',
  approved: 'bg-primary/80',
  contract: 'bg-primary',
  handover: 'bg-primary',
  completed: 'bg-success-500',
};

export interface CifrasDelEmbudo {
  inProcess: number;
  completedThisMonth: number;
  conversionRate: number | null;
}

export function BarraDelEmbudo({
  items,
  cifras,
  cargando,
  fallo,
  etapa,
  onEtapa,
  className,
}: {
  items: readonly PipelineItem[];
  cifras: CifrasDelEmbudo;
  cargando: boolean;
  fallo?: unknown;
  /** La etapa que filtra la lista, o `null`. */
  etapa: PipelineStage | null;
  onEtapa: (etapa: PipelineStage | null) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const tr = useTr();
  const etapas = PIPELINE_STAGES.filter((s) => s.stage !== 'lost').map((s) => s.stage);
  const cuantos = (st: PipelineStage) => items.filter((i) => i.stage === st).length;
  const conGente = etapas.filter((st) => cuantos(st) > 0);
  const enLaBarra = conGente.reduce((n, st) => n + cuantos(st), 0);
  const sinGente = etapas.length - conGente.length;
  const nombre = (st: PipelineStage) => tr(getPipelineStageInfo(st)?.labelEs || st);
  const hayDatos = !cargando && !fallo;

  return (
    <section className={cn('space-y-3 rounded-lg border border-border bg-surface p-4', className)} data-testid="barra-del-embudo">
      {/* Lo que pesa, en una línea. */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-body-sm">
        <div className="flex items-baseline gap-1.5">
          <div className="text-fg-muted">{t('inmobiliaria.pipeline.stats.inProcess')}</div>
          <div className="font-mono tabular-nums text-fg">
            <KpiValor cargando={cargando} fallo={fallo}>
              {cifras.inProcess}
            </KpiValor>
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <div className="text-fg-muted">{t('inmobiliaria.pipeline.stats.closedThisMonth')}</div>
          <div className="font-mono tabular-nums text-fg">
            <KpiValor cargando={cargando} fallo={fallo}>
              {cifras.completedThisMonth}
            </KpiValor>
          </div>
        </div>
        {hayDatos && cifras.conversionRate !== null ? (
          <div className="flex items-baseline gap-1.5 text-fg-subtle" data-testid="conversion-del-embudo">
            <div>{t('inmobiliaria.pipeline.stats.conversionRate')}</div>
            <div className="font-mono tabular-nums">{textoDeTasa(cifras.conversionRate, 0)}</div>
          </div>
        ) : null}
      </div>

      {/* La barra: un tramo por etapa con gente. */}
      {hayDatos && enLaBarra > 0 ? (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            {conGente.map((st) => (
              <div
                key={st}
                className={cn(
                  'h-full transition-opacity',
                  TONO_DEL_TRAMO[st] ?? 'bg-fg-subtle/50',
                  etapa && etapa !== st ? 'opacity-30' : '',
                )}
                style={{ width: `${(cuantos(st) / enLaBarra) * 100}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap items-center gap-1.5" aria-label={tr('Etapas con interesados')}>
            {conGente.map((st) => {
              const activa = etapa === st;
              return (
                <li key={st}>
                  <button
                    type="button"
                    aria-pressed={activa}
                    onClick={() => onEtapa(activa ? null : st)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-body-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--menu-activa-tinta)]',
                      activa
                        ? 'bg-[color:var(--menu-activa)] font-medium text-[color:var(--menu-activa-tinta)]'
                        : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                    )}
                    data-testid={`etapa-del-embudo-${st}`}
                  >
                    <span className={cn('h-2 w-2 rounded-full', TONO_DEL_TRAMO[st] ?? 'bg-fg-subtle/50')} aria-hidden="true" />
                    {nombre(st)}
                    <span className={cn('font-mono text-caption tabular-nums', activa ? '' : 'text-fg-subtle')}>{cuantos(st)}</span>
                  </button>
                </li>
              );
            })}
            {sinGente > 0 ? (
              <li className="px-1 text-caption text-fg-subtle">
                {tr(sinGente === 1 ? '+ 1 etapa sin interesados' : '+ {n} etapas sin interesados', { n: sinGente })}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
