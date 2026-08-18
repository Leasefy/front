'use client'

import { useState } from 'react'

import { Pill } from '@/components/admin/Pill'
import {
  carrierFormSchema,
  CARRIER_FORM_DEFAULTS,
  CARRIER_MODES,
  CARRIER_PRODUCT_TYPES,
  type CarrierFormValues,
} from './carrier-form-schema'

type FieldErrors = Partial<Record<keyof CarrierFormValues, string>>

export interface CarrierFormProps {
  mode: 'create' | 'edit'
  initialValues?: CarrierFormValues
  /** true cuando el carrier editado ya tiene credenciales guardadas (edit only). */
  hasConfig?: boolean
  isSubmitting?: boolean
  /** Backend/inline error (ej. body.error del micro) renderizado a nivel form. */
  submitError?: string | null
  onSubmit: (values: CarrierFormValues) => void
  onCancel: () => void
}

// ── Field primitives (mismos que plan-form) ────────────────────────────────

function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
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

const MODE_LABEL: Record<CarrierFormValues['mode'], string> = {
  stub: 'stub — simulado, sin llamada real',
  rest: 'rest — API REST del carrier',
  'form-rpa': 'form-rpa — automatización de formulario web',
  'email-broker': 'email-broker — cotización por correo',
  'open-finance': 'open-finance — integración open finance',
}

const PRODUCT_TYPE_LABEL: Record<CarrierFormValues['product_type'], string> = {
  seguro: 'seguro',
  fianza: 'fianza',
}

// ── Form ────────────────────────────────────────────────────────────────────

export function CarrierForm({
  mode,
  initialValues,
  hasConfig = false,
  isSubmitting = false,
  submitError,
  onSubmit,
  onCancel,
}: CarrierFormProps) {
  const [values, setValues] = useState<CarrierFormValues>(initialValues ?? CARRIER_FORM_DEFAULTS)
  const [errors, setErrors] = useState<FieldErrors>({})

  const isEdit = mode === 'edit'

  function set<K extends keyof CarrierFormValues>(key: K, value: CarrierFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function text(key: keyof CarrierFormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      set(key, e.target.value as CarrierFormValues[typeof key])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = carrierFormSchema.safeParse(values)
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CarrierFormValues
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
        <div className="section-label">{isEdit ? 'editar carrier' : 'nuevo carrier'}</div>
        <span className="pill pill-info">COTIZADOR</span>
      </div>

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="carrier-name" required>
            Nombre (slug)
          </Label>
          <input
            id="carrier-name"
            className="input font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            value={values.name}
            onChange={text('name')}
            disabled={isEdit}
          />
          {isEdit ? (
            <Help>El nombre es el slug inmutable tras crear.</Help>
          ) : (
            <Help>Minúsculas, ej. fianly.</Help>
          )}
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label htmlFor="carrier-route" required>
            Ruta
          </Label>
          <input id="carrier-route" className="input" value={values.route} onChange={text('route')} />
          <Help>Ej. &quot;direct&quot; para integración directa.</Help>
          <FieldError message={errors.route} />
        </div>
      </div>

      <div>
        <Label htmlFor="carrier-display_name">Nombre visible</Label>
        <input
          id="carrier-display_name"
          className="input"
          value={values.display_name}
          onChange={text('display_name')}
        />
        <FieldError message={errors.display_name} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="carrier-product_type" required>
            Tipo de producto
          </Label>
          <select
            id="carrier-product_type"
            className="input"
            value={values.product_type}
            onChange={(e) => set('product_type', e.target.value as CarrierFormValues['product_type'])}
          >
            {CARRIER_PRODUCT_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {PRODUCT_TYPE_LABEL[pt]}
              </option>
            ))}
          </select>
          <FieldError message={errors.product_type} />
        </div>
        <div>
          <Label htmlFor="carrier-mode" required>
            Modo
          </Label>
          <select
            id="carrier-mode"
            className="input"
            value={values.mode}
            onChange={(e) => set('mode', e.target.value as CarrierFormValues['mode'])}
          >
            {CARRIER_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
          <FieldError message={errors.mode} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="carrier-priority">Prioridad</Label>
          <input
            id="carrier-priority"
            className="input tabular-nums"
            inputMode="numeric"
            value={values.priority}
            onChange={text('priority')}
          />
          <Help>Opcional. Entero {'>'}= 0; menor = mayor prioridad.</Help>
          <FieldError message={errors.priority} />
        </div>
        <div>
          <Label htmlFor="carrier-max_canon_cop">Canon máx. (COP)</Label>
          <input
            id="carrier-max_canon_cop"
            className="input tabular-nums"
            inputMode="numeric"
            value={values.max_canon_cop}
            onChange={text('max_canon_cop')}
          />
          <Help>Opcional. Tope de canon en pesos para este carrier.</Help>
          <FieldError message={errors.max_canon_cop} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          className="accent-brand"
          checked={values.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        Habilitado
      </label>

      {/* Credenciales — write-only: nunca se leen del backend, solo se envían si se escriben. */}
      <fieldset className="space-y-4 border-t border-bg-border pt-4">
        <div className="flex items-center justify-between">
          <div className="section-label">credenciales</div>
          {isEdit && hasConfig && <Pill tone="ok">configurado ✓</Pill>}
        </div>
        <p className="text-[11px] text-fg-subtle">
          {isEdit
            ? 'Por seguridad las credenciales no se muestran. Dejá estos campos vacíos para conservar las guardadas; completalos solo para reemplazarlas.'
            : 'Se guardan encriptadas. Requeridas para que el carrier pueda cotizar en modo real.'}
        </p>
        <Help>
          Las credenciales se guardan juntas: si cambiás una, reingresá las tres. Dejarlas vacías
          conserva las guardadas.
        </Help>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="carrier-config_base_url">Base URL</Label>
            <input
              id="carrier-config_base_url"
              className="input font-mono"
              value={values.config_base_url}
              onChange={text('config_base_url')}
              placeholder={isEdit && hasConfig ? 'https://…' : ''}
            />
            <FieldError message={errors.config_base_url} />
          </div>
          <div>
            <Label htmlFor="carrier-config_username">Usuario</Label>
            <input
              id="carrier-config_username"
              className="input"
              value={values.config_username}
              onChange={text('config_username')}
              placeholder={isEdit && hasConfig ? '••••••••' : ''}
            />
            <FieldError message={errors.config_username} />
          </div>
        </div>
        <div>
          <Label htmlFor="carrier-config_password">Contraseña</Label>
          <input
            id="carrier-config_password"
            type="password"
            className="input"
            value={values.config_password}
            onChange={text('config_password')}
            placeholder={isEdit && hasConfig ? '••••••••' : ''}
            autoComplete="new-password"
          />
          <FieldError message={errors.config_password} />
        </div>
      </fieldset>

      {submitError && (
        <div className="card p-3 border-l-4 border-l-bad">
          <p className="text-sm text-bad">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear carrier'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
