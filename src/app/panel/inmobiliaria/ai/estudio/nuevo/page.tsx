'use client'

/**
 * /ai/estudio/nuevo — "Crear estudio" (visión §4).
 *
 * Formulario de intake rápido para abrir un estudio de inquilino y enviar la
 * solicitud al candidato. UX-only: estado controlado en React, sin backend.
 * La CTA primaria muestra una confirmación inline ("Próximamente…") en vez de
 * enviar a un endpoint inventado.
 *
 * Dos tarjetas:
 *   1) Inmueble  — propiedad, ciudad, canon, administración, valor total
 *      mensual (auto = canon + admin, read-only), fecha tentativa de inicio,
 *      propietario, asesor responsable.
 *   2) Candidato — nombre, documento, celular, correo, ocupación, ¿codeudor?,
 *      origen.
 */

import { useMemo, useState } from 'react'
import {
  Buildings,
  CheckCircle,
  IdentificationCard,
  PaperPlaneTilt,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@leasefy/cadence'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.estudio'

type Ocupacion = 'empleado' | 'independiente' | 'pensionado' | 'empresa' | 'estudiante' | 'otro'
type Origen = 'lead' | 'solicitud' | 'asesor'

interface FormState {
  // Inmueble
  propiedad: string
  ciudad: string
  canon: string
  administracion: string
  fechaInicio: string
  propietario: string
  asesor: string
  // Candidato
  nombre: string
  documento: string
  celular: string
  correo: string
  ocupacion: Ocupacion
  tieneCodeudor: boolean
  origen: Origen
}

const INITIAL_STATE: FormState = {
  propiedad: '',
  ciudad: '',
  canon: '',
  administracion: '',
  fechaInicio: '',
  propietario: '',
  asesor: '',
  nombre: '',
  documento: '',
  celular: '',
  correo: '',
  ocupacion: 'empleado',
  tieneCodeudor: false,
  origen: 'lead',
}


const LABEL_CLASSES = 'block text-sm font-medium text-fg mb-1.5'

function EstudioNuevo() {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [confirmed, setConfirmed] = useState(false)

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  /** Valor total mensual = canon + administración (read-only, auto). */
  const valorTotal = useMemo(() => {
    const canon = Number.parseFloat(form.canon) || 0
    const admin = Number.parseFloat(form.administracion) || 0
    const total = canon + admin
    if (total <= 0) return ''
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(total)
  }, [form.canon, form.administracion])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (confirmed) setConfirmed(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmed(true)
  }

  const ocupacionOptions: { value: Ocupacion; labelKey: string; fallback: string }[] = [
    { value: 'empleado', labelKey: `${NS}.nuevo.ocupacion.empleado`, fallback: 'Empleado' },
    { value: 'independiente', labelKey: `${NS}.nuevo.ocupacion.independiente`, fallback: 'Independiente' },
    { value: 'pensionado', labelKey: `${NS}.nuevo.ocupacion.pensionado`, fallback: 'Pensionado' },
    { value: 'empresa', labelKey: `${NS}.nuevo.ocupacion.empresa`, fallback: 'Empresa' },
    { value: 'estudiante', labelKey: `${NS}.nuevo.ocupacion.estudiante`, fallback: 'Estudiante' },
    { value: 'otro', labelKey: `${NS}.nuevo.ocupacion.otro`, fallback: 'Otro' },
  ]

  const origenOptions: { value: Origen; labelKey: string; fallback: string }[] = [
    { value: 'lead', labelKey: `${NS}.nuevo.origen.lead`, fallback: 'Lead' },
    { value: 'solicitud', labelKey: `${NS}.nuevo.origen.solicitud`, fallback: 'Solicitud' },
    { value: 'asesor', labelKey: `${NS}.nuevo.origen.asesor`, fallback: 'Asesor' },
  ]

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {tf(`${NS}.nuevo.title`, 'Crear estudio')}
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          {tf(
            `${NS}.nuevo.subtitle`,
            'Captura el inmueble y el candidato para abrir un estudio y enviar la solicitud de información.',
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Tarjeta 1 — Inmueble */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
              <Buildings className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg">
                {tf(`${NS}.nuevo.inmueble.title`, 'Inmueble')}
              </h2>
              <p className="text-sm text-fg-muted">
                {tf(`${NS}.nuevo.inmueble.desc`, 'Datos del inmueble que se va a arrendar.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="propiedad" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.propiedad`, 'Propiedad')}
              </label>
              <Input
                id="propiedad"
                type="text"
                value={form.propiedad}
                onChange={(e) => set('propiedad', e.target.value)}
                placeholder={tf(`${NS}.nuevo.inmueble.propiedadPlaceholder`, 'Apto 502, Torre Norte — Calle 100 #15-20')}              />
            </div>

            <div>
              <label htmlFor="ciudad" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.ciudad`, 'Ciudad')}
              </label>
              <Input
                id="ciudad"
                type="text"
                value={form.ciudad}
                onChange={(e) => set('ciudad', e.target.value)}
                placeholder={tf(`${NS}.nuevo.inmueble.ciudadPlaceholder`, 'Bogotá')}              />
            </div>

            <div>
              <label htmlFor="fechaInicio" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.fechaInicio`, 'Fecha tentativa de inicio')}
              </label>
              <Input
                id="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set('fechaInicio', e.target.value)}              />
            </div>

            <div>
              <label htmlFor="canon" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.canon`, 'Canon mensual (COP)')}
              </label>
              <Input
                id="canon"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.canon}
                onChange={(e) => set('canon', e.target.value)}
                placeholder="2.500.000"              />
            </div>

            <div>
              <label htmlFor="administracion" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.administracion`, 'Administración (COP)')}
              </label>
              <Input
                id="administracion"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.administracion}
                onChange={(e) => set('administracion', e.target.value)}
                placeholder="350.000"              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="valorTotal" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.valorTotal`, 'Valor total mensual')}
              </label>
              <Input
                id="valorTotal"
                type="text"
                readOnly
                value={valorTotal}
                placeholder={tf(`${NS}.nuevo.inmueble.valorTotalPlaceholder`, 'Se calcula con canon + administración')}
                aria-describedby="valorTotal-hint"
                className={
                  'w-full rounded-md border border-border ' +
                  'bg-surface-muted px-3 py-2 text-sm font-medium ' +
                  'text-success-700 placeholder:font-normal ' +
                  'placeholder:text-fg-subtle cursor-default'
                }
              />
              <p id="valorTotal-hint" className="mt-1 text-xs text-fg-muted">
                {tf(`${NS}.nuevo.inmueble.valorTotalHint`, 'Se calcula automáticamente: canon + administración.')}
              </p>
            </div>

            <div>
              <label htmlFor="propietario" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.propietario`, 'Propietario')}
              </label>
              <Input
                id="propietario"
                type="text"
                value={form.propietario}
                onChange={(e) => set('propietario', e.target.value)}
                placeholder={tf(`${NS}.nuevo.inmueble.propietarioPlaceholder`, 'Nombre del propietario')}              />
            </div>

            <div>
              <label htmlFor="asesor" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.inmueble.asesor`, 'Asesor responsable')}
              </label>
              <Input
                id="asesor"
                type="text"
                value={form.asesor}
                onChange={(e) => set('asesor', e.target.value)}
                placeholder={tf(`${NS}.nuevo.inmueble.asesorPlaceholder`, 'Nombre del asesor')}              />
            </div>
          </div>
        </section>

        {/* Tarjeta 2 — Candidato */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
              <IdentificationCard className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg">
                {tf(`${NS}.nuevo.candidato.title`, 'Candidato')}
              </h2>
              <p className="text-sm text-fg-muted">
                {tf(`${NS}.nuevo.candidato.desc`, 'Persona a quien se le enviará la solicitud de información.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="nombre" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.nombre`, 'Nombre completo')}
              </label>
              <Input
                id="nombre"
                type="text"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder={tf(`${NS}.nuevo.candidato.nombrePlaceholder`, 'María Fernanda Gómez')}              />
            </div>

            <div>
              <label htmlFor="documento" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.documento`, 'Documento')}
              </label>
              <Input
                id="documento"
                type="text"
                inputMode="numeric"
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
                placeholder={tf(`${NS}.nuevo.candidato.documentoPlaceholder`, 'C.C. 1.020.304.050')}              />
            </div>

            <div>
              <label htmlFor="celular" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.celular`, 'Celular')}
              </label>
              <Input
                id="celular"
                type="tel"
                inputMode="tel"
                value={form.celular}
                onChange={(e) => set('celular', e.target.value)}
                placeholder="300 123 4567"              />
            </div>

            <div>
              <label htmlFor="correo" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.correo`, 'Correo')}
              </label>
              <Input
                id="correo"
                type="email"
                inputMode="email"
                value={form.correo}
                onChange={(e) => set('correo', e.target.value)}
                placeholder="maria@correo.com"              />
            </div>

            <div>
              <label htmlFor="ocupacion" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.ocupacion`, 'Ocupación')}
              </label>
              <Select
                value={form.ocupacion}
                onValueChange={(v) => set('ocupacion', v as Ocupacion)}
              >
                <SelectTrigger id="ocupacion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ocupacionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tf(opt.labelKey, opt.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="origen" className={LABEL_CLASSES}>
                {tf(`${NS}.nuevo.candidato.origen`, 'Origen')}
              </label>
              <Select
                value={form.origen}
                onValueChange={(v) => set('origen', v as Origen)}
              >
                <SelectTrigger id="origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {origenOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tf(opt.labelKey, opt.fallback)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ¿Tiene codeudor? — toggle */}
            <div className="sm:col-span-2 flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-muted/40 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">
                  {tf(`${NS}.nuevo.candidato.codeudor`, '¿Tiene codeudor?')}
                </p>
                <p className="text-xs text-fg-muted">
                  {tf(`${NS}.nuevo.candidato.codeudorHint`, 'Si el candidato aporta un codeudor para respaldar el arriendo.')}
                </p>
              </div>
              <Switch
                checked={form.tieneCodeudor}
                onCheckedChange={(v) => set('tieneCodeudor', v)}
                aria-label={tf(`${NS}.nuevo.candidato.codeudor`, '¿Tiene codeudor?')}
              />
            </div>
          </div>
        </section>

        {/* Confirmación inline (UX-only, sin backend) */}
        {confirmed && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4"
          >
            <CheckCircle className="w-5 h-5 text-success-700 shrink-0 mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-sm text-success-700">
              {tf(
                `${NS}.nuevo.confirmacion`,
                'Próximamente: esto creará el estudio y enviará la solicitud al candidato.',
              )}
            </p>
          </div>
        )}

        {/* CTA primaria */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="submit" hideArrow>
            <PaperPlaneTilt className="w-4 h-4" weight="bold" aria-hidden="true" />
            {tf(`${NS}.nuevo.cta`, 'Crear estudio y enviar solicitud')}
          </Button>
        </div>
      </form>
    </main>
  )
}

export default function EstudioNuevoPage() {
  return (
    <PageGuard module="estudio">
      <EstudioNuevo />
    </PageGuard>
  )
}
