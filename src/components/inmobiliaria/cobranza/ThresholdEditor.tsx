'use client'

/**
 * ThresholdEditor — Phase 34 plan 34-08.
 *
 * 6-field form for daily-report thresholds with client-side Zod validation
 * matching the 34-05 DB CHECKs (defense in depth).
 *
 * Server returns 400 + field errors on Zod re-validation; this component
 * shows those alongside the client-side pre-submit failures.
 *
 * Refs:
 *   34-05 SUMMARY (PUT /thresholds Zod schema, .strict())
 *   34-RESEARCH.md §1.6 (DEFAULTS)
 *   mvp:docs/DESIGN.md §4 (cards), §10 (form inputs)
 */

import { useState } from 'react'
import { z } from 'zod'

import type { ThresholdRow, ThresholdUpdateBody } from '@/lib/hooks/cobranza/use-thresholds'
import { useI18n } from '@/lib/i18n'

// Matches 34-05 PUT schema + DB CHECKs (defense in depth)
const ThresholdSchema = z.object({
  top_n_debtors_in_report: z.number().int().min(1).max(50),
  mora_dias_bucket_boundaries: z
    .array(z.number().int().nonnegative())
    .min(1)
    .max(10)
    .refine(
      (arr) => arr.every((v, i) => i === 0 || v > arr[i - 1]),
      { message: 'must_be_monotonically_increasing' },
    ),
  pkr_pct_alert_below: z.number().min(0).max(100),
  indice_morosidad_pct_alert_above: z.number().min(0).max(100),
  compliance_violations_critical_at_least: z.number().int().nonnegative(),
  calls_outside_window_critical_at_least: z.number().int().nonnegative(),
})

export interface ThresholdEditorProps {
  active: ThresholdRow
  onSubmit: (body: ThresholdUpdateBody) => Promise<{ version: number | null }>
  /** Optional success message renderer — page wires the toast. */
  onSuccess?: (version: number | null) => void
}

type FieldErrors = Partial<Record<keyof ThresholdUpdateBody | 'form', string>>

function parseBoundaries(raw: string): number[] | null {
  if (!raw.trim()) return null
  const parts = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isFinite(n))) return null
  return nums.map((n) => Math.trunc(n))
}

export function ThresholdEditor({ active, onSubmit, onSuccess }: ThresholdEditorProps) {
  const { t, locale } = useI18n()
  const [topN, setTopN] = useState<string>(String(active.top_n_debtors_in_report))
  const [boundaries, setBoundaries] = useState<string>(
    (active.mora_dias_bucket_boundaries ?? []).join(','),
  )
  const [pkr, setPkr] = useState<string>(String(active.pkr_pct_alert_below))
  const [morosidad, setMorosidad] = useState<string>(
    String(active.indice_morosidad_pct_alert_above),
  )
  const [violations, setViolations] = useState<string>(
    String(active.compliance_violations_critical_at_least),
  )
  const [outsideHours, setOutsideHours] = useState<string>(
    String(active.calls_outside_window_critical_at_least),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [successVersion, setSuccessVersion] = useState<number | null>(null)

  const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setSuccessVersion(null)

    const boundariesParsed = parseBoundaries(boundaries)
    if (!boundariesParsed) {
      setErrors({ mora_dias_bucket_boundaries: 'invalid_csv_ints' })
      return
    }

    const raw = {
      top_n_debtors_in_report: Number(topN),
      mora_dias_bucket_boundaries: boundariesParsed,
      pkr_pct_alert_below: Number(pkr),
      indice_morosidad_pct_alert_above: Number(morosidad),
      compliance_violations_critical_at_least: Number(violations),
      calls_outside_window_critical_at_least: Number(outsideHours),
    }

    const parsed = ThresholdSchema.safeParse(raw)
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ThresholdUpdateBody
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setIsSaving(true)
    try {
      const row = await onSubmit(parsed.data)
      setSuccessVersion(row.version ?? null)
      onSuccess?.(row.version ?? null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'submit_failed'
      // 400 from server -> show under form-level error; 403 special-cased
      if (msg.startsWith('403')) {
        setErrors({ form: locale.startsWith('es') ? 'Sin permiso' : 'Forbidden' })
      } else {
        setErrors({ form: msg })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const labelClass = 'text-xs font-mono uppercase tracking-wide text-muted-foreground'
  const inputClass =
    'w-full rounded-sm border border-border bg-background px-3 py-2 text-sm font-mono tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
  const errorClass = 'text-xs text-[#C4503B] dark:text-[#E0664D] font-mono mt-1'

  return (
    <form
      onSubmit={(e) => void onFormSubmit(e)}
      className="rounded-xl border border-border bg-card p-4 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.topN')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
            required
          />
          {errors.top_n_debtors_in_report && (
            <p className={errorClass}>{errors.top_n_debtors_in_report}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.moraBoundaries')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="text"
            value={boundaries}
            onChange={(e) => setBoundaries(e.target.value)}
            placeholder="0,8,31,91"
            required
          />
          {errors.mora_dias_bucket_boundaries && (
            <p className={errorClass}>{errors.mora_dias_bucket_boundaries}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.pkrAlertBelow')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={pkr}
            onChange={(e) => setPkr(e.target.value)}
            required
          />
          {errors.pkr_pct_alert_below && (
            <p className={errorClass}>{errors.pkr_pct_alert_below}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.morosidadAlertAbove')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={morosidad}
            onChange={(e) => setMorosidad(e.target.value)}
            required
          />
          {errors.indice_morosidad_pct_alert_above && (
            <p className={errorClass}>{errors.indice_morosidad_pct_alert_above}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.violationsAtLeast')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="number"
            min={0}
            step="1"
            value={violations}
            onChange={(e) => setViolations(e.target.value)}
            required
          />
          {errors.compliance_violations_critical_at_least && (
            <p className={errorClass}>
              {errors.compliance_violations_critical_at_least}
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.callsOutsideAtLeast')}
          </label>
          <input
            className={inputClass + ' mt-1'}
            type="number"
            min={0}
            step="1"
            value={outsideHours}
            onChange={(e) => setOutsideHours(e.target.value)}
            required
          />
          {errors.calls_outside_window_critical_at_least && (
            <p className={errorClass}>
              {errors.calls_outside_window_critical_at_least}
            </p>
          )}
        </div>
      </div>

      {errors.form && (
        <div className="rounded-sm border border-[#C4503B]/30 dark:border-[#C4503B]/40 bg-[#F8EAE7] dark:bg-[#C4503B]/15 p-2 text-xs text-[#C4503B] dark:text-[#E0664D] font-mono">
          {errors.form}
        </div>
      )}

      {successVersion !== null && (
        <div className="rounded-sm border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15 p-2 text-xs text-[#2C7A53] dark:text-[#3EAE70] font-mono">
          {locale.startsWith('es')
            ? `Versión ${successVersion} creada`
            : `Version ${successVersion} created`}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="text-xs px-4 py-2 rounded-sm border border-border bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition font-medium"
        >
          {isSaving
            ? locale.startsWith('es') ? 'Guardando...' : 'Saving...'
            : t('inmobiliaria.ai.cobranza.reporte.thresholds.submit')}
        </button>
      </div>
    </form>
  )
}
