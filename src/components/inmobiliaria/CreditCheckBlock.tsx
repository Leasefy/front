'use client';

/**
 * CreditCheckBlock — shared component that renders the credit bureau check
 * result inside both AIAgentCard (tenant-scoring flow) and CandidateDrawer
 * (landlord evaluation view).
 *
 * Rules enforced here (see contract in docs/AI_AGENTS_ARCHITECTURE.md):
 *  - credit_check.status RULES over score/level for the credit verdict.
 *  - blocked_admin is NOT a rejection → neutral "Estudio en revisión" (grey/neutral).
 *  - not_evaluated / absent credit_check → render nothing.
 *  - awaiting_authorization → progress bar fed by progressPercentage.
 *  - rejected_income → CTA to add co-signer.
 */

import {
  CheckCircle,
  Warning,
  Info,
  HourglassMedium,
  UserPlus,
} from '@phosphor-icons/react';
import type { CreditCheck } from '@/lib/api/applications.types';

interface CreditCheckBlockProps {
  creditCheck: CreditCheck;
  /** Locale for bilingual labels. Defaults to 'es'. */
  locale?: 'es' | 'en';
  /** Currency formatter — accepts number | null | undefined, returns string. */
  formatCurrency: (amount: number | null | undefined) => string;
}

const REASON_LABELS: Record<string, { es: string; en: string }> = {
  credit_history_rejection: {
    es: 'Historial crediticio con observaciones negativas',
    en: 'Negative credit history',
  },
  declared_income_insufficient: {
    es: 'Ingresos declarados insuficientes para el canon',
    en: 'Declared income insufficient for the rent',
  },
  study_payment_pending: {
    es: 'Pago del estudio pendiente',
    en: 'Study payment pending',
  },
  unknown_rejection: {
    es: 'Rechazo sin causa específica',
    en: 'Rejection without specific reason',
  },
  awaiting_habeas_data: {
    es: 'Esperando autorización del candidato (Habeas Data)',
    en: 'Waiting for candidate authorization (Habeas Data)',
  },
  study_error: {
    es: 'Error durante el estudio crediticio',
    en: 'Error during credit study',
  },
};

export function CreditCheckBlock({
  creditCheck,
  locale = 'es',
  formatCurrency,
}: CreditCheckBlockProps) {
  const { status, bureauScore, monthlyCapacity, reasonCode, progressPercentage } = creditCheck;

  // not_evaluated → render nothing (same as absent credit_check)
  if (status === 'not_evaluated') return null;

  const reasonLabel = reasonCode ? REASON_LABELS[reasonCode] : null;
  const t = (es: string, en: string) => (locale === 'es' ? es : en);

  if (status === 'approved') {
    return (
      <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle weight="fill" className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t('Crédito aprobado', 'Credit approved')}
          </span>
        </div>
        {(bureauScore !== null || monthlyCapacity !== null) && (
          <div className="flex flex-wrap gap-3 pl-6">
            {bureauScore !== null && (
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  {t('Score bureau', 'Bureau score')}
                </p>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {bureauScore}
                </p>
              </div>
            )}
            {monthlyCapacity !== null && (
              <div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  {t('Capacidad mensual', 'Monthly capacity')}
                </p>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {formatCurrency(monthlyCapacity)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === 'rejected_credit') {
    return (
      <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Warning weight="fill" className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            {t('No aprobado por historial crediticio', 'Not approved — credit history')}
          </span>
        </div>
        {reasonLabel && (
          <p className="text-xs text-rose-600 dark:text-rose-300 pl-6">
            {locale === 'es' ? reasonLabel.es : reasonLabel.en}
          </p>
        )}
      </div>
    );
  }

  if (status === 'rejected_income') {
    return (
      <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Warning weight="fill" className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            {t('Ingresos insuficientes para el canon', 'Income insufficient for the rent')}
          </span>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300 pl-6">
          {t(
            'Los ingresos declarados no cubren el canon. Considerá agregar un codeudor.',
            'Declared income does not cover the rent. Consider adding a co-signer.',
          )}
        </p>
        <div className="pl-6">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Sugerir codeudor al candidato', 'Suggest co-signer to candidate')}
          </span>
        </div>
      </div>
    );
  }

  if (status === 'blocked_admin') {
    // NOT a rejection — neutral internal ops alert
    return (
      <div className="mt-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 p-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            {t('Estudio en revisión', 'Study under review')}
          </span>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 pl-6">
          {t(
            'El equipo de operaciones está revisando este estudio.',
            'The operations team is reviewing this study.',
          )}
        </p>
      </div>
    );
  }

  if (status === 'awaiting_authorization') {
    const pct = progressPercentage ?? 0;
    return (
      <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <HourglassMedium className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {t('Esperando autorización del candidato', 'Waiting for candidate authorization')}
          </span>
        </div>
        {reasonLabel && (
          <p className="text-xs text-amber-600 dark:text-amber-300 pl-6">
            {locale === 'es' ? reasonLabel.es : reasonLabel.en}
          </p>
        )}
        <div className="pl-6 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              {t('Progreso del estudio', 'Study progress')}
            </span>
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-900/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mt-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3">
        <div className="flex items-center gap-2">
          <Warning weight="fill" className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
            {t('Error en el estudio crediticio', 'Credit study error')}
          </span>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 pl-6">
          {t(
            'Ocurrió un error al consultar el buró. Reintenta la evaluación.',
            'An error occurred querying the bureau. Retry the evaluation.',
          )}
        </p>
      </div>
    );
  }

  // Fallback — unknown status; render nothing
  return null;
}
