'use client'

import { useState } from 'react'

import {
  planFormSchema,
  PLAN_FORM_DEFAULTS,
  type PlanFormValues,
} from './plan-form-schema'

type FieldErrors = Partial<Record<keyof PlanFormValues, string>>

export interface PlanFormProps {
  mode: 'create' | 'edit'
  initialValues?: PlanFormValues
  /** When true, another active plan is already marked default (UX warning only). */
  otherDefaultExists?: boolean
  isSubmitting?: boolean
  /** Backend/inline error (409 slug dup, 400 config) rendered form-level. */
  submitError?: string | null
  onSubmit: (values: PlanFormValues) => void
  onCancel: () => void
}

// ── Field primitives ──────────────────────────────────────────────────────────

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-fg mb-1.5">
      {children}
      {required && <span className="text-bad"> *</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-bad">{message}</p>
}

function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-fg-subtle">{children}</p>
}

const SENTINEL_HELP = '-1 = ilimitado · 0 = ninguno · N = tope'

// ── Form ────────────────────────────────────────────────────────────────────

export function PlanForm({
  mode,
  initialValues,
  otherDefaultExists = false,
  isSubmitting = false,
  submitError,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  const [values, setValues] = useState<PlanFormValues>(initialValues ?? PLAN_FORM_DEFAULTS)
  const [errors, setErrors] = useState<FieldErrors>({})

  const isEdit = mode === 'edit'
  const usageCanon = values.billingMode === 'USAGE_CANON'

  function set<K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function text(key: keyof PlanFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, e.target.value as PlanFormValues[typeof key])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = planFormSchema.safeParse(values)
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PlanFormValues
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    onSubmit(parsed.data)
  }

  return (
    <form onSubmit={submit} noValidate className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-label">{isEdit ? 'editar plan' : 'nuevo plan'}</div>
        <span className="pill pill-info">AGENCY</span>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-name" required>Nombre</Label>
          <input id="plan-name" className="input" value={values.name} onChange={text('name')} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label htmlFor="plan-slug">Slug</Label>
          <input
            id="plan-slug"
            className="input font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            value={values.slug}
            onChange={text('slug')}
            disabled={isEdit}
            placeholder={isEdit ? undefined : 'se autogenera del nombre'}
          />
          {isEdit ? (
            <Help>El slug es inmutable tras crear.</Help>
          ) : (
            <Help>Opcional. Minúsculas, números y guiones (ej. flex-pro).</Help>
          )}
          <FieldError message={errors.slug} />
        </div>
      </div>

      <div>
        <Label htmlFor="plan-description">Descripción</Label>
        <textarea id="plan-description" className="textarea" rows={2} value={values.description} onChange={text('description')} />
        <FieldError message={errors.description} />
      </div>

      {/* Billing mode governs the pricing inputs below */}
      <div>
        <Label htmlFor="plan-billingMode" required>Modo de cobro</Label>
        <select
          id="plan-billingMode"
          className="input"
          value={values.billingMode}
          onChange={(e) => set('billingMode', e.target.value as PlanFormValues['billingMode'])}
        >
          <option value="FLAT">FLAT — precio fijo mensual/anual</option>
          <option value="USAGE_CANON">USAGE_CANON — % del canon administrado</option>
        </select>
        <Help>
          {usageCanon
            ? 'Se cobra un % del canon; el precio mensual/anual se envía en 0.'
            : 'Se cobra el precio fijo; el % de canon se envía en 0.'}
        </Help>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usageCanon ? (
          <div>
            <Label htmlFor="plan-usageFeePct" required>% de canon</Label>
            <input id="plan-usageFeePct" className="input tabular-nums" inputMode="decimal" value={values.usageFeePct} onChange={text('usageFeePct')} />
            <Help>En porcentaje (ej. 1.5). Se guarda en basis points (×100).</Help>
            <FieldError message={errors.usageFeePct} />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="plan-monthlyPrice" required>Precio mensual (COP)</Label>
              <input id="plan-monthlyPrice" className="input tabular-nums" inputMode="numeric" value={values.monthlyPrice} onChange={text('monthlyPrice')} />
              <FieldError message={errors.monthlyPrice} />
            </div>
            <div>
              <Label htmlFor="plan-annualPrice" required>Precio anual (COP)</Label>
              <input id="plan-annualPrice" className="input tabular-nums" inputMode="numeric" value={values.annualPrice} onChange={text('annualPrice')} />
              <FieldError message={errors.annualPrice} />
            </div>
          </>
        )}
      </div>

      {/* Scoring / evaluation pricing (always relevant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-scoringViewPrice" required>Precio scoring view (COP)</Label>
          <input id="plan-scoringViewPrice" className="input tabular-nums" inputMode="numeric" value={values.scoringViewPrice} onChange={text('scoringViewPrice')} />
          <FieldError message={errors.scoringViewPrice} />
        </div>
        <div>
          <Label htmlFor="plan-evaluationCreditPrice" required>Precio crédito evaluación (COP)</Label>
          <input id="plan-evaluationCreditPrice" className="input tabular-nums" inputMode="numeric" value={values.evaluationCreditPrice} onChange={text('evaluationCreditPrice')} />
          <FieldError message={errors.evaluationCreditPrice} />
        </div>
      </div>

      {/* Limits (sentinels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-maxProperties" required>Máx. propiedades</Label>
          <input id="plan-maxProperties" className="input tabular-nums" inputMode="numeric" value={values.maxProperties} onChange={text('maxProperties')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxProperties} />
        </div>
        <div>
          <Label htmlFor="plan-maxUsers" required>Máx. usuarios</Label>
          <input id="plan-maxUsers" className="input tabular-nums" inputMode="numeric" value={values.maxUsers} onChange={text('maxUsers')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxUsers} />
        </div>
        <div>
          <Label htmlFor="plan-maxScoringViews" required>Máx. scoring views</Label>
          <input id="plan-maxScoringViews" className="input tabular-nums" inputMode="numeric" value={values.maxScoringViews} onChange={text('maxScoringViews')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxScoringViews} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyEvalCap" required>Tope mensual evaluaciones</Label>
          <input id="plan-monthlyEvalCap" className="input tabular-nums" inputMode="numeric" value={values.monthlyEvalCap} onChange={text('monthlyEvalCap')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.monthlyEvalCap} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyCreditGrant" required>Bono mensual de créditos</Label>
          <input id="plan-monthlyCreditGrant" className="input tabular-nums" inputMode="numeric" value={values.monthlyCreditGrant} onChange={text('monthlyCreditGrant')} />
          <Help>Entero {'>'}= 0.</Help>
          <FieldError message={errors.monthlyCreditGrant} />
        </div>
      </div>

      {/* Flags */}
      <fieldset className="space-y-2">
        <div className="section-label">flags</div>
        {([
          ['scoringIncluded', 'Scoring incluido'],
          ['hasPremiumScoring', 'Scoring premium'],
          ['hasApiAccess', 'Acceso API'],
          ['isDefault', 'Plan por defecto'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
            <input
              type="checkbox"
              className="accent-brand"
              checked={values[key]}
              onChange={(e) => set(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
        {values.isDefault && otherDefaultExists && (
          <div className="card p-3 border-l-4 border-l-warn text-xs text-warn">
            Ya existe otro plan marcado como <strong>por defecto</strong>. El backend no fuerza
            unicidad: revisá que a lo sumo uno quede como default.
          </div>
        )}
      </fieldset>

      {submitError && (
        <div className="card p-3 border-l-4 border-l-bad">
          <p className="text-sm text-bad">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
