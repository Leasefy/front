'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MonoLabel } from '@leasefy/cadence'

import { Pill } from '@/components/admin/Pill'
import { useHidratado } from '@/lib/hooks/use-hidratado'
import {
  carrierFormSchema,
  CARRIER_FORM_DEFAULTS,
  CARRIER_MODES,
  CARRIER_PRODUCT_TYPES,
  type CarrierFormValues,
} from './carrier-form-schema'
import { Card } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  return <p className="mt-1 text-caption text-fg-subtle">{children}</p>
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
  const hidratado = useHidratado()
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
    // `method="post"` y el botón apagado hasta hidratar: el formulario lleva la
    // contraseña de la aseguradora. Sus campos no tienen `name`, pero un envío
    // nativo nunca debe poder armar una URL con credenciales (ver
    // `formularios-con-contrasena.test.ts`).
    // Ronda 26 (decisión de Nico, 23-10): el formulario vive en un CAJÓN; el título lo pone el cajón.
    <form method="post" onSubmit={submit} noValidate className="space-y-6">

      {/* Identity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="carrier-name" required>
            Nombre (slug)
          </Label>
          <Input
            id="carrier-name"
            aria-required="true"
            className="font-mono disabled:opacity-50 disabled:cursor-not-allowed"
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
          <Input id="carrier-route" aria-required="true" className="" value={values.route} onChange={text('route')} />
          <Help>Ej. &quot;direct&quot; para integración directa.</Help>
          <FieldError message={errors.route} />
        </div>
      </div>

      <div>
        <Label htmlFor="carrier-display_name">Nombre visible</Label>
        <Input
          id="carrier-display_name"
          className=""
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
          <Select value={values.product_type} onValueChange={(v) => set('product_type', v as CarrierFormValues['product_type'])}>
            <SelectTrigger id="carrier-product_type" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_PRODUCT_TYPES.map((x) => (
                <SelectItem key={x} value={x}>
                  {PRODUCT_TYPE_LABEL[x]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.product_type} />
        </div>
        <div>
          <Label htmlFor="carrier-mode" required>
            Modo
          </Label>
          <Select value={values.mode} onValueChange={(v) => set('mode', v as CarrierFormValues['mode'])}>
            <SelectTrigger id="carrier-mode" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_MODES.map((x) => (
                <SelectItem key={x} value={x}>
                  {MODE_LABEL[x]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.mode} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="carrier-priority">Prioridad</Label>
          <Input
            id="carrier-priority"
            className="tabular-nums"
            inputMode="numeric"
            value={values.priority}
            onChange={text('priority')}
          />
          <Help>Opcional. Entero {'>'}= 0; menor = mayor prioridad.</Help>
          <FieldError message={errors.priority} />
        </div>
        <div>
          <Label htmlFor="carrier-max_canon_cop">Canon máx. (COP)</Label>
          <Input
            id="carrier-max_canon_cop"
            className="tabular-nums"
            inputMode="numeric"
            value={values.max_canon_cop}
            onChange={text('max_canon_cop')}
          />
          <Help>Opcional. Tope de canon en pesos para esta aseguradora.</Help>
          <FieldError message={errors.max_canon_cop} />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-body-sm text-fg">
        <Switch checked={values.enabled} onCheckedChange={(v) => set('enabled', v)} aria-label="Habilitado" />
        Habilitado
      </label>

      {/* Credenciales — write-only: nunca se leen del backend, solo se envían si se escriben. */}
      <fieldset className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <MonoLabel>Credenciales</MonoLabel>
          {isEdit && hasConfig && <Pill tone="ok" dot>Configuradas</Pill>}
        </div>
        <p className="text-caption text-fg-subtle">
          {isEdit
            ? 'Por seguridad las credenciales no se muestran. Deja estos campos vacíos para conservar las guardadas; complétalos solo para reemplazarlas.'
            : 'Se guardan encriptadas. Hacen falta para que la aseguradora cotice en modo real.'}
        </p>
        <Help>
          Las credenciales se guardan juntas: si cambias una, reingresa las tres. Dejarlas vacías
          conserva las guardadas.
        </Help>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="carrier-config_base_url">Base URL</Label>
            <Input
              id="carrier-config_base_url"
              className="font-mono"
              value={values.config_base_url}
              onChange={text('config_base_url')}
              placeholder={isEdit && hasConfig ? 'https://…' : ''}
            />
            <FieldError message={errors.config_base_url} />
          </div>
          <div>
            <Label htmlFor="carrier-config_username">Usuario</Label>
            <Input
              id="carrier-config_username"
              className=""
              value={values.config_username}
              onChange={text('config_username')}
              placeholder={isEdit && hasConfig ? '••••••••' : ''}
            />
            <FieldError message={errors.config_username} />
          </div>
        </div>
        <div>
          <Label htmlFor="carrier-config_password">Contraseña</Label>
          <Input
            id="carrier-config_password"
            type="password"
            className=""
            value={values.config_password}
            onChange={text('config_password')}
            placeholder={isEdit && hasConfig ? '••••••••' : ''}
            autoComplete="new-password"
          />
          <FieldError message={errors.config_password} />
        </div>
      </fieldset>

      {submitError && (
        <Card className="p-3 ">
          <p className="text-body-sm text-danger">{submitError}</p>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" hideArrow type="submit" disabled={isSubmitting || !hidratado}>
          {isSubmitting ? 'Guardando…' : isEdit ? 'Guardar los cambios' : 'Crear la aseguradora'}
        </Button>
        <Button variant="ghost" size="sm" hideArrow type="button" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
