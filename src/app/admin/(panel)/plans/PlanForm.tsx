'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import {
  planFormSchema,
  PLAN_FORM_DEFAULTS,
  type PlanFormValues,
} from './plan-form-schema'
import { Alert, Eyebrow } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type FieldErrors = Partial<Record<keyof PlanFormValues, string>>

export interface PlanFormProps {
  mode: 'create' | 'edit'
  initialValues?: PlanFormValues
  /** When true, another active plan is already marked default (UX warning only). */
  otherDefaultExists?: boolean
  isSubmitting?: boolean
  /** Backend/inline error (409 slug dup, 400 config) rendered form-level. */
  submitError?: string | null
  /**
   * Los errores que el back mandó por campo (`campos[]`), ya en los nombres
   * del formulario: van debajo de SU campo y el primero recibe el foco.
   */
  serverFieldErrors?: FieldErrors
  onSubmit: (values: PlanFormValues) => void
  onCancel: () => void
}

// ── Field primitives ──────────────────────────────────────────────────────────

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-body-sm font-medium text-fg mb-1.5">
      {children}
      {required && <span className="text-danger"> *</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-caption text-danger">{message}</p>
}

function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] text-fg-subtle">{children}</p>
}

const SENTINEL_HELP = '-1 = sin tope · 0 = ninguno · otro número = el tope'

// ── Form ────────────────────────────────────────────────────────────────────

export function PlanForm({
  mode,
  initialValues,
  otherDefaultExists = false,
  isSubmitting = false,
  submitError,
  serverFieldErrors,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  const [values, setValues] = useState<PlanFormValues>(initialValues ?? PLAN_FORM_DEFAULTS)
  const [errors, setErrors] = useState<FieldErrors>({})

  // Lo que el back rechazó por campo, debajo de su campo, con el foco en el primero.
  useEffect(() => {
    if (!serverFieldErrors) return
    const campos = Object.keys(serverFieldErrors) as (keyof PlanFormValues)[]
    if (campos.length === 0) return
    setErrors((prev) => ({ ...prev, ...serverFieldErrors }))
    document.getElementById(`plan-${campos[0]}`)?.focus()
  }, [serverFieldErrors])

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
    // Glow up 22-10: vive en un cajón (el título lo pone el cajón); antes era una tarjeta encima de la tabla.
    <form onSubmit={submit} noValidate className="space-y-6">

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-name" required>Nombre</Label>
          <Input id="plan-name" aria-required="true" className="" value={values.name} onChange={text('name')} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label htmlFor="plan-slug">Código del plan</Label>
          <Input
            id="plan-slug"
            className="font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            value={values.slug}
            onChange={text('slug')}
            disabled={isEdit}
            placeholder={isEdit ? undefined : 'Sale del nombre si lo dejas vacío'}
          />
          {isEdit ? (
            <Help>El código no cambia después de crear el plan.</Help>
          ) : (
            <Help>Opcional. Minúsculas, números y guiones (ej. flex-pro). No se puede cambiar después.</Help>
          )}
          <FieldError message={errors.slug} />
        </div>
      </div>

      <div>
        <Label htmlFor="plan-description">Descripción</Label>
        <Textarea id="plan-description" className="" rows={2} value={values.description} onChange={text('description')} />
        <FieldError message={errors.description} />
      </div>

      {/* Billing mode governs the pricing inputs below */}
      <div>
        <Label htmlFor="plan-billingMode" required>Modo de cobro</Label>
        <Select value={values.billingMode} onValueChange={(v) => set('billingMode', v as PlanFormValues['billingMode'])}>
          <SelectTrigger id="plan-billingMode" aria-required="true">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FLAT">Mensualidad fija (mensual o anual)</SelectItem>
            <SelectItem value="USAGE_CANON">Porcentaje del canon administrado</SelectItem>
          </SelectContent>
        </Select>
        <Help>
          {usageCanon
            ? 'Se cobra un porcentaje del canon que administra; la mensualidad queda en 0.'
            : 'Se cobra la mensualidad; el porcentaje del canon queda en 0.'}
        </Help>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usageCanon ? (
          <div>
            <Label htmlFor="plan-usageFeePct" required>Porcentaje del canon</Label>
            <Input id="plan-usageFeePct" aria-required="true" className="tabular-nums" inputMode="decimal" value={values.usageFeePct} onChange={text('usageFeePct')} />
            <Help>Por ejemplo 1,5 para el 1,5 % del canon.</Help>
            <FieldError message={errors.usageFeePct} />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="plan-monthlyPrice" required>Precio mensual (COP)</Label>
              <Input id="plan-monthlyPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.monthlyPrice} onChange={text('monthlyPrice')} />
              <FieldError message={errors.monthlyPrice} />
            </div>
            <div>
              <Label htmlFor="plan-annualPrice" required>Precio anual (COP)</Label>
              <Input id="plan-annualPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.annualPrice} onChange={text('annualPrice')} />
              <FieldError message={errors.annualPrice} />
            </div>
          </>
        )}
      </div>

      {/* Scoring / evaluation pricing (always relevant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-scoringViewPrice" required>Precio de ver una calificación (COP)</Label>
          <Input id="plan-scoringViewPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.scoringViewPrice} onChange={text('scoringViewPrice')} />
          <FieldError message={errors.scoringViewPrice} />
        </div>
        <div>
          <Label htmlFor="plan-evaluationCreditPrice" required>Precio del crédito de evaluación (COP)</Label>
          <Input id="plan-evaluationCreditPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.evaluationCreditPrice} onChange={text('evaluationCreditPrice')} />
          <FieldError message={errors.evaluationCreditPrice} />
        </div>
      </div>

      {/* Limits (sentinels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-maxProperties" required>Tope de inmuebles</Label>
          <Input id="plan-maxProperties" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxProperties} onChange={text('maxProperties')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxProperties} />
        </div>
        <div>
          <Label htmlFor="plan-maxUsers" required>Tope de usuarios</Label>
          <Input id="plan-maxUsers" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxUsers} onChange={text('maxUsers')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxUsers} />
        </div>
        <div>
          <Label htmlFor="plan-maxScoringViews" required>Tope de calificaciones vistas</Label>
          <Input id="plan-maxScoringViews" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxScoringViews} onChange={text('maxScoringViews')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxScoringViews} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyEvalCap" required>Tope de evaluaciones al mes</Label>
          <Input id="plan-monthlyEvalCap" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.monthlyEvalCap} onChange={text('monthlyEvalCap')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.monthlyEvalCap} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyCreditGrant" required>Bono mensual de créditos</Label>
          <Input id="plan-monthlyCreditGrant" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.monthlyCreditGrant} onChange={text('monthlyCreditGrant')} />
          <Help>Número entero, sin negativos.</Help>
          <FieldError message={errors.monthlyCreditGrant} />
        </div>
      </div>

      {/* Flags */}
      <fieldset className="space-y-2">
        <Eyebrow>Opciones</Eyebrow>
        {([
          ['scoringIncluded', 'Incluye la calificación del inquilino'],
          ['hasPremiumScoring', 'Calificación premium'],
          ['hasApiAccess', 'Acceso por API'],
          ['isDefault', 'Plan por defecto'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg">
            <Switch checked={values[key]} onCheckedChange={(v) => set(key, v)} aria-label={label} />
            {label}
          </label>
        ))}
        {values.isDefault && otherDefaultExists && (
          <Alert variant="warning">
            Ya hay otro plan <strong>por defecto</strong>. Leasefy no lo impide: deja sólo uno marcado.
          </Alert>
        )}
      </fieldset>

      {submitError && (
        <Alert variant="danger">{submitError}</Alert>
      )}

      <div className="flex items-center gap-3">
        <Button hideArrow type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </Button>
        <Button variant="outline" hideArrow type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
