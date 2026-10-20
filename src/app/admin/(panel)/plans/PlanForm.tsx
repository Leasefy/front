'use client'

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import {
  planFormSchema,
  PLAN_FORM_DEFAULTS,
  type PlanFormValues,
} from './plan-form-schema'
import { Card, Eyebrow } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Pill } from '@/components/admin/Pill'

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

const SENTINEL_HELP = '-1 = ilimitado · 0 = ninguno · N = tope'

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
    <form onSubmit={submit} noValidate className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Eyebrow>{isEdit ? 'Editar plan' : 'Nuevo plan'}</Eyebrow>
        <Pill tone="info">AGENCY</Pill>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-name" required>Nombre</Label>
          <Input id="plan-name" aria-required="true" className="" value={values.name} onChange={text('name')} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label htmlFor="plan-slug">Slug</Label>
          <Input
            id="plan-slug"
            className="font-mono disabled:opacity-50 disabled:cursor-not-allowed"
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
            <SelectItem value="FLAT">Precio fijo (mensual o anual)</SelectItem>
            <SelectItem value="USAGE_CANON">Porcentaje del canon administrado</SelectItem>
          </SelectContent>
        </Select>
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
            <Input id="plan-usageFeePct" aria-required="true" className="tabular-nums" inputMode="decimal" value={values.usageFeePct} onChange={text('usageFeePct')} />
            <Help>En porcentaje (ej. 1.5). Se guarda en basis points (×100).</Help>
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
          <Label htmlFor="plan-scoringViewPrice" required>Precio scoring view (COP)</Label>
          <Input id="plan-scoringViewPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.scoringViewPrice} onChange={text('scoringViewPrice')} />
          <FieldError message={errors.scoringViewPrice} />
        </div>
        <div>
          <Label htmlFor="plan-evaluationCreditPrice" required>Precio crédito evaluación (COP)</Label>
          <Input id="plan-evaluationCreditPrice" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.evaluationCreditPrice} onChange={text('evaluationCreditPrice')} />
          <FieldError message={errors.evaluationCreditPrice} />
        </div>
      </div>

      {/* Limits (sentinels) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="plan-maxProperties" required>Máx. propiedades</Label>
          <Input id="plan-maxProperties" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxProperties} onChange={text('maxProperties')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxProperties} />
        </div>
        <div>
          <Label htmlFor="plan-maxUsers" required>Máx. usuarios</Label>
          <Input id="plan-maxUsers" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxUsers} onChange={text('maxUsers')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxUsers} />
        </div>
        <div>
          <Label htmlFor="plan-maxScoringViews" required>Máx. scoring views</Label>
          <Input id="plan-maxScoringViews" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.maxScoringViews} onChange={text('maxScoringViews')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.maxScoringViews} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyEvalCap" required>Tope mensual evaluaciones</Label>
          <Input id="plan-monthlyEvalCap" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.monthlyEvalCap} onChange={text('monthlyEvalCap')} />
          <Help>{SENTINEL_HELP}</Help>
          <FieldError message={errors.monthlyEvalCap} />
        </div>
        <div>
          <Label htmlFor="plan-monthlyCreditGrant" required>Bono mensual de créditos</Label>
          <Input id="plan-monthlyCreditGrant" aria-required="true" className="tabular-nums" inputMode="numeric" value={values.monthlyCreditGrant} onChange={text('monthlyCreditGrant')} />
          <Help>Entero {'>'}= 0.</Help>
          <FieldError message={errors.monthlyCreditGrant} />
        </div>
      </div>

      {/* Flags */}
      <fieldset className="space-y-2">
        <Eyebrow>Opciones</Eyebrow>
        {([
          ['scoringIncluded', 'Scoring incluido'],
          ['hasPremiumScoring', 'Scoring premium'],
          ['hasApiAccess', 'Acceso API'],
          ['isDefault', 'Plan por defecto'],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg">
            <Switch checked={values[key]} onCheckedChange={(v) => set(key, v)} aria-label={label} />
            {label}
          </label>
        ))}
        {values.isDefault && otherDefaultExists && (
          <Card className="p-3  text-caption text-warning">
            Ya existe otro plan marcado como <strong>por defecto</strong>. El backend no fuerza
            unicidad: revisa que a lo sumo uno quede como default.
          </Card>
        )}
      </fieldset>

      {submitError && (
        <Card className="p-3 ">
          <p className="text-body-sm text-danger">{submitError}</p>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button hideArrow type="submit"  disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear plan'}
        </Button>
        <Button variant="ghost" hideArrow type="button"  onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
