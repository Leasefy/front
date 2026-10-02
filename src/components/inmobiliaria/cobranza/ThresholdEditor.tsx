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
import { MonoLabel } from '@leasefy/cadence'

import type { ThresholdRow, ThresholdUpdateBody } from '@/lib/hooks/cobranza/use-thresholds'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { leerFallo } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import {
  erroresDeLosUmbrales,
  type CampoDeLosUmbrales,
} from '@/lib/hooks/cobranza/limites-de-cobranza'

/**
 * Cada campo y el `id` de su control (su error vive en `${id}-error`), en el
 * orden de la pantalla. Los topes y las frases (en español) son el espejo del
 * PUT del micro (`limites-de-cobranza.ts`); antes se pintaba el mensaje de zod
 * en inglés («Number must be less than or equal to 50»).
 */
const ID_DEL_CAMPO: Record<CampoDeLosUmbrales, string> = {
  top_n_debtors_in_report: 'umbral-top-n',
  mora_dias_bucket_boundaries: 'umbral-cortes-de-mora',
  pkr_pct_alert_below: 'umbral-pkr',
  indice_morosidad_pct_alert_above: 'umbral-morosidad',
  compliance_violations_critical_at_least: 'umbral-violaciones',
  calls_outside_window_critical_at_least: 'umbral-fuera-de-horario',
}
const CAMPOS = Object.keys(ID_DEL_CAMPO) as CampoDeLosUmbrales[]

export interface ThresholdEditorProps {
  active: ThresholdRow
  onSubmit: (body: ThresholdUpdateBody) => Promise<{ version: number | null }>
  /** Optional success message renderer — page wires the toast. */
  onSuccess?: (version: number | null) => void
}

type FieldErrors = Partial<Record<CampoDeLosUmbrales | 'form', string>>

function enfocarElPrimero(errores: FieldErrors) {
  const primero = CAMPOS.find((c) => errores[c])
  if (primero) document.getElementById(ID_DEL_CAMPO[primero])?.focus()
}

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
    const raw = {
      top_n_debtors_in_report: Number(topN),
      mora_dias_bucket_boundaries: boundariesParsed,
      pkr_pct_alert_below: Number(pkr),
      indice_morosidad_pct_alert_above: Number(morosidad),
      compliance_violations_critical_at_least: Number(violations),
      calls_outside_window_critical_at_least: Number(outsideHours),
    }

    // Lo que el micro rechazaría se ataja acá, debajo de su campo.
    const delCliente = erroresDeLosUmbrales(raw)
    if (Object.keys(delCliente).length > 0 || !boundariesParsed) {
      setErrors(delCliente)
      enfocarElPrimero(delCliente)
      return
    }

    setIsSaving(true)
    try {
      const row = await onSubmit({ ...raw, mora_dias_bucket_boundaries: boundariesParsed })
      setSuccessVersion(row.version ?? null)
      onSuccess?.(row.version ?? null)
    } catch (err) {
      // El 403 del micro no trae un `message` para la persona: se dice acá
      // (por el status, nunca por el texto). Un 400 con `campos` va a su campo;
      // lo demás (un 5xx con la referencia, la red) abajo.
      if (leerFallo(err).status === 403) {
        setErrors({ form: 'No tienes permiso para cambiar los umbrales. Pídeselo a un administrador.' })
      } else {
        const reparto = repartirErroresDelServidor<CampoDeLosUmbrales>(err, {
          campos: CAMPOS,
          porDefecto: 'No pudimos guardar los umbrales.',
          accion: 'guardar los umbrales',
        })
        const siguientes: FieldErrors = { ...reparto.porCampo }
        if (reparto.sueltos.length > 0) siguientes.form = reparto.sueltos.join(' · ')
        setErrors(siguientes)
        enfocarElPrimero(siguientes)
      }
    } finally {
      setIsSaving(false)
    }
  }

  /** Lo que lleva cada control para leer su error. */
  const aria = (campo: CampoDeLosUmbrales) => ({
    id: ID_DEL_CAMPO[campo],
    'aria-invalid': errors[campo] ? true : undefined,
    'aria-describedby': errors[campo] ? `${ID_DEL_CAMPO[campo]}-error` : undefined,
  })

  return (
    <form
      onSubmit={(e) => void onFormSubmit(e)}
      className="rounded-lg border border-border bg-card p-4 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.topN')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(e.target.value)}
            {...aria('top_n_debtors_in_report')}
            required
          />
          <ErrorDelCampo id="umbral-top-n-error" mensaje={errors.top_n_debtors_in_report} />
        </div>

        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.moraBoundaries')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="text"
            value={boundaries}
            onChange={(e) => setBoundaries(e.target.value)}
            {...aria('mora_dias_bucket_boundaries')}
            placeholder="0,8,31,91"
            required
          />
          <ErrorDelCampo
            id="umbral-cortes-de-mora-error"
            mensaje={errors.mora_dias_bucket_boundaries}
          />
        </div>

        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.pkrAlertBelow')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={pkr}
            onChange={(e) => setPkr(e.target.value)}
            {...aria('pkr_pct_alert_below')}
            required
          />
          <ErrorDelCampo id="umbral-pkr-error" mensaje={errors.pkr_pct_alert_below} />
        </div>

        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.morosidadAlertAbove')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={morosidad}
            onChange={(e) => setMorosidad(e.target.value)}
            {...aria('indice_morosidad_pct_alert_above')}
            required
          />
          <ErrorDelCampo
            id="umbral-morosidad-error"
            mensaje={errors.indice_morosidad_pct_alert_above}
          />
        </div>

        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.violationsAtLeast')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="number"
            min={0}
            step="1"
            value={violations}
            onChange={(e) => setViolations(e.target.value)}
            {...aria('compliance_violations_critical_at_least')}
            required
          />
          <ErrorDelCampo
            id="umbral-violaciones-error"
            mensaje={errors.compliance_violations_critical_at_least}
          />
        </div>

        <div>
          <MonoLabel className="block text-muted-foreground tracking-wide">
            {t('inmobiliaria.ai.cobranza.reporte.thresholds.fields.callsOutsideAtLeast')}
          </MonoLabel>
          <Input
            className="mt-1 w-full font-mono tabular-nums"
            type="number"
            min={0}
            step="1"
            value={outsideHours}
            onChange={(e) => setOutsideHours(e.target.value)}
            {...aria('calls_outside_window_critical_at_least')}
            required
          />
          <ErrorDelCampo
            id="umbral-fuera-de-horario-error"
            mensaje={errors.calls_outside_window_critical_at_least}
          />
        </div>
      </div>

      {errors.form && (
        <div
          role="alert"
          data-testid="umbrales-error"
          className="rounded-sm border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {errors.form}
        </div>
      )}

      {successVersion !== null && (
        <div className="rounded-sm border border-success/30 bg-success-soft text-success font-mono">
          {locale.startsWith('es')
            ? `Versión ${successVersion} creada`
            : `Version ${successVersion} created`}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          hideArrow
          isLoading={isSaving}
          disabled={isSaving}
        >
          {t('inmobiliaria.ai.cobranza.reporte.thresholds.submit')}
        </Button>
      </div>
    </form>
  )
}
