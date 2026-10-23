'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Stagger, StaggerItem, Avatar } from '@leasefy/cadence';
import {
  Trophy,
  Medal,
  Calendar,
  CalendarBlank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SegmentedControl } from '@leasefy/cadence';
import type { Agente } from '@/lib/types/inmobiliaria';
import { textoDeTasa } from '@/lib/tasas';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';

/**
 * 🔴 17-09: el ranking tenía una columna de COMISIONES por asesor, y con ella
 * todo un aparato para explicar que esos «$0» eran un vacío de datos (ningún
 * inmueble tenía asesor). La comisión de los asesores se paga por fuera de
 * Leasefy: el ranking ordena por arriendos cerrados y muestra los inmuebles a
 * cargo. Quién captó y quién arrendó, con detalle, está en «Captaciones y
 * arriendos».
 */
interface AgenteLeaderboardProps {
  agentes: Agente[];
  className?: string;
}

type TimeRange = 'month' | 'year';


/**
 * La columna «Trend» no tenía con qué compararse.
 *
 * `getMockTrend()` prometía una tendencia —flecha verde para arriba, roja para
 * abajo— y su propio comentario admitía que en producción «esto compararía
 * contra el período anterior». No comparaba nada: era un umbral sobre
 * `conversionRate`, el MISMO número que la columna de al lado ya muestra en
 * porcentaje. O sea, la fila decía dos veces lo mismo, y la segunda vez lo
 * decía como si fuera un movimiento en el tiempo. Una flecha roja al lado del
 * nombre de un agente, en la pantalla del equipo, es una cosa seria.
 *
 * `AgenteMetrics` no trae ningún dato del período anterior —`closedThisMonth`,
 * `commissionsThisMonth`, `conversionRate` son todos del período actual—, así
 * que la tendencia no se puede calcular ni cableando. La columna se queda,
 * vacía y explicada: el día que el back mande el período anterior, el dato
 * entra acá.
 */
const SIN_COMPARACION =
  'Todavía no hay tendencia: falta el dato del período anterior con el que compararse.';

/**
 * AgenteLeaderboard - Ranked table of agentes by performance
 * Shows top performers with medals and trend indicators
 */
export function AgenteLeaderboard({ agentes, className }: AgenteLeaderboardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Filter to active agentes and sort by performance
  const rankedAgentes = useMemo(() => {
    const active = agentes.filter((a) => a.status === 'active');

    // Sort by closedThisMonth or closedThisYear
    const sorted = [...active].sort((a, b) => {
      const metricA = timeRange === 'month' ? a.metrics.closedThisMonth : a.metrics.closedThisYear;
      const metricB = timeRange === 'month' ? b.metrics.closedThisMonth : b.metrics.closedThisYear;

      // Primary: closings
      if (metricB !== metricA) return metricB - metricA;

      // Secundario: los del año, y después los inmuebles a cargo.
      if (b.metrics.closedThisYear !== a.metrics.closedThisYear) {
        return b.metrics.closedThisYear - a.metrics.closedThisYear;
      }
      if (b.metrics.assignedProperties !== a.metrics.assignedProperties) {
        return b.metrics.assignedProperties - a.metrics.assignedProperties;
      }

      // Tertiary: conversion rate
      return b.metrics.conversionRate - a.metrics.conversionRate;
    });

    return sorted;
  }, [agentes, timeRange]);
  const paginaDelRanking = useTablePagination(rankedAgentes, { resetKey: timeRange });


  const handleRowClick = (agenteId: string) => {
    router.push(`/panel/inmobiliaria/configuracion/equipo/${agenteId}`);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Ronda 30: el título sin el trofeo en una caja de color (Cadence 2) y la línea sin
          «comisiones», que esta tabla ya no muestra desde el 17-09. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-h3 text-fg">Quién va adelante</h2>
          <p className="text-sm text-fg-muted">Los asesores con más arriendos cerrados en el período.</p>
        </div>

        {/* Time Range Toggle */}
        <SegmentedControl<TimeRange>
          aria-label={t('inmobiliaria.agente.thisMonth')}
          value={timeRange}
          onChange={setTimeRange}
          size="sm"
          options={[
            {
              value: 'month',
              ariaLabel: t('inmobiliaria.agente.thisMonth'),
              label: (
                <span className="inline-flex items-center gap-2">
                  <CalendarBlank className="w-4 h-4" />
                  {t('inmobiliaria.agente.thisMonth')}
                </span>
              ),
            },
            {
              value: 'year',
              ariaLabel: t('inmobiliaria.agente.thisYear'),
              label: (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('inmobiliaria.agente.thisYear')}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Leaderboard Table — Ronda 30: cabeceras en rótulo mono y en español (antes «Trend» y «Conv.»),
          el puesto en número (antes medallas en emoji), sin la columna de tendencia (siempre «—»:
          el back no manda el período anterior), sin la primera fila teñida, cifras en mono y paginada. */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-surface-muted border-b border-border font-mono text-label uppercase text-fg-muted">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Asesor</div>
          <div className="col-span-2 text-right">{t('inmobiliaria.agente.closings')}</div>
          <div className="col-span-2 text-right">
            <span className="hidden sm:inline">Inmuebles</span>
            <span className="sm:hidden" aria-label="Inmuebles">Inm.</span>
          </div>
          <div className="col-span-2 text-right">
            <span className="hidden sm:inline">Conversión</span>
            <span className="sm:hidden" aria-label="Conversión">%</span>
          </div>
        </div>

        {rankedAgentes.length > 0 ? (
          <Stagger>
            {paginaDelRanking.pageItems.map((agente, index) => {
              const rank = (paginaDelRanking.page - 1) * paginaDelRanking.pageSize + index + 1;

              const closings = timeRange === 'month'
                ? agente.metrics.closedThisMonth
                : agente.metrics.closedThisYear;

              return (
                <StaggerItem
                  key={agente.id}
                  onClick={() => handleRowClick(agente.id)}
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir la ficha de ${agente.name}`}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleRowClick(agente.id);
                  }}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border-faint cursor-pointer transition-colors duration-base hover:bg-surface-muted focus-visible:bg-surface-muted"
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="font-mono text-sm tabular-nums text-fg-muted">{rank}</span>
                  </div>

                  <div className="col-span-5 flex min-w-0 items-center gap-3">
                    <Avatar name={agente.name} src={agente.avatar || undefined} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{agente.name}</p>
                      <p className="text-caption text-fg-muted truncate">
                        {agente.zone || t('inmobiliaria.agente.noZone')}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <span className={cn('font-mono text-sm tabular-nums', closings > 0 ? 'text-fg' : 'text-fg-subtle')}>
                      {closings}
                    </span>
                  </div>

                  {/* Inmuebles a cargo — sin plata: la comisión del asesor va
                      por fuera de Leasefy (17-09). */}
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="font-mono text-sm tabular-nums text-fg" data-testid="agente-inmuebles">
                      {agente.metrics.assignedProperties}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end">
                    <span
                      className={cn(
                        'font-mono text-sm tabular-nums',
                        // `conversionRate` ya es un porcentaje (0–100).
                        agente.metrics.conversionRate >= 60
                          ? 'text-success'
                          : agente.metrics.conversionRate >= 40
                            ? 'text-warning'
                            : 'text-fg-muted',
                      )}
                    >
                      {textoDeTasa(agente.metrics.conversionRate, 0)}
                    </span>
                    {/* La tendencia no se pinta (siempre era «—»: el back no manda el período
                        anterior); queda dicha para el lector de pantalla. */}
                    <span className="sr-only" data-testid="agente-tendencia">
                      <span aria-label={SIN_COMPARACION}>—</span>
                    </span>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <div className="px-4 py-12 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-3 text-fg-subtle" weight="light" />
            <p className="text-sm text-fg-muted">
              Cuando invites asesores y cierren arriendos, aquí se ordenan por cierres.
            </p>
          </div>
        )}
        {rankedAgentes.length > 0 ? (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={paginaDelRanking.total}
              page={paginaDelRanking.page}
              pageSize={paginaDelRanking.pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={paginaDelRanking.setPage}
              onPageSizeChange={paginaDelRanking.setPageSize}
            />
          </div>
        ) : null}
      </div>

      {/* Summary Stats */}
      {rankedAgentes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-caption text-fg-muted mb-1">
              {t('inmobiliaria.agente.totalClosings')} {timeRange === 'month' ? t('inmobiliaria.agente.monthLabel') : t('inmobiliaria.agente.yearLabel')}
            </p>
            <p className="font-mono text-2xl tabular-nums text-fg">
              {rankedAgentes.reduce(
                (sum, a) =>
                  sum + (timeRange === 'month' ? a.metrics.closedThisMonth : a.metrics.closedThisYear),
                0
              )}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-caption text-fg-muted mb-1">
              {t('inmobiliaria.agente.assignedProperties')}
            </p>
            <p className="font-mono text-2xl tabular-nums text-fg">
              {rankedAgentes.reduce((sum, a) => sum + a.metrics.assignedProperties, 0)}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border bg-surface">
            <p className="text-caption text-fg-muted mb-1">
              {t('inmobiliaria.agente.avgConversion')}
            </p>
            <p className="font-mono text-2xl tabular-nums text-fg">
              {textoDeTasa(
                rankedAgentes.reduce((sum, a) => sum + a.metrics.conversionRate, 0) /
                  rankedAgentes.length,
                0,
              )}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default AgenteLeaderboard;
