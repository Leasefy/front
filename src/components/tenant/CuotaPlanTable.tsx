'use client';

/**
 * CuotaPlanTable — v7-07-04 (ACUE-01, PITFALLS 9) a PURE presentational component
 * that renders an acuerdo's `installments[]` VERBATIM from the agent record.
 *
 * Each row is `Cuota N · {dueDate es-CO} · {formatCurrency amountCop} · {estado}`,
 * with the money in `font-mono tabular-nums` and a neutral cuota-status chip. A paid
 * cuota also shows its `paidAt` date. Empty `installments` → an honest "Sin cuotas"
 * line.
 *
 * HARD RULE (the phase's legal crux): this component renders values as they come from
 * the record — it NEVER derives a total, a remaining balance, or any accumulated
 * figure. There is no `.reduce`, no `+` accumulation over `amountCop`, no second
 * arithmetic engine. The agent is the sole authority for every peso; if the caller
 * wants the plan total it passes `totalDueCop` from the record separately. Neutral
 * styling only (no red, no countdown). Reused by the list (v7-07-04) + the detail
 * (v7-07-05).
 */

import type { AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface CuotaPlanTableProps {
  /** Cuotas del acuerdo, tal cual vienen del registro del agente (sin recomputar). */
  installments: AcuerdoInstallment[];
  /** Locale para formato de fecha; por defecto el del contexto i18n. */
  locale?: string;
  className?: string;
}

/** Fecha de cuota en formato largo es-CO / en-US (o vacío si la fecha es inválida). */
function formatCuotaDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Etiqueta factual del estado de la cuota (neutral, sin alarma ni copy de urgencia).
 * Un estado desconocido cae al string crudo — nunca se inventa un color de alarma.
 */
function cuotaEstadoLabel(status: string, locale: string): string {
  const es = locale === 'es';
  switch (status) {
    case 'paid':
    case 'pagada':
      return es ? 'Pagada' : 'Paid';
    case 'pending':
    case 'pendiente':
      return es ? 'Pendiente' : 'Pending';
    case 'upcoming':
    case 'proxima':
      return es ? 'Próxima' : 'Upcoming';
    case 'overdue':
    case 'vencida':
      return es ? 'Vencida' : 'Overdue';
    case 'cancelled':
    case 'cancelada':
      return es ? 'Cancelada' : 'Cancelled';
    default:
      return status;
  }
}

export function CuotaPlanTable({ installments, locale, className }: CuotaPlanTableProps) {
  const { formatCurrency, locale: i18nLocale } = useI18n();
  const loc = locale ?? i18nLocale;
  const es = loc === 'es';

  if (installments.length === 0) {
    return (
      <p className={cn('text-sm text-fg-muted dark:text-fg-subtle', className)}>
        {es ? 'Sin cuotas' : 'No installments'}
      </p>
    );
  }

  return (
    <ul className={cn('divide-y divide-border dark:divide-border-strong', className)}>
      {installments.map((cuota) => (
        <li
          key={cuota.number}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg dark:text-white">
              {es ? `Cuota ${cuota.number}` : `Installment ${cuota.number}`}
            </p>
            <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
              {es ? 'Vence el ' : 'Due '}
              {formatCuotaDate(cuota.dueDate, loc)}
              {cuota.paidAt && (
                <>
                  {' · '}
                  {es ? 'pagada el ' : 'paid '}
                  {formatCuotaDate(cuota.paidAt, loc)}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="rounded-full bg-surface-muted dark:bg-[#2a2a2c] px-2 py-0.5 text-[10px] font-medium text-fg-subtle dark:text-fg-muted whitespace-nowrap">
              {cuotaEstadoLabel(cuota.status, loc)}
            </span>
            <span className="text-sm font-mono tabular-nums text-fg dark:text-white whitespace-nowrap">
              {formatCurrency(cuota.amountCop)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
