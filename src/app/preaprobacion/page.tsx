'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  aseguradoraDisplayName,
  requestPreApproval,
  PreApprovalRequestError,
  type PreApprovalResult,
} from '@/lib/api/funnel.service'
import {
  validatePreApprovalForm,
  type PreApprovalFormFields,
} from './form-logic'

const CIUDADES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Cúcuta',
  'Ibagué',
  'Santa Marta',
  'Manizales',
  'Villavicencio',
]

const EMPTY: PreApprovalFormFields = {
  cedula: '',
  phone: '',
  ciudad: '',
  canon: '',
  tipoInmueble: '',
  consent: false,
}

export default function PreaprobacionPage() {
  const [fields, setFields] = useState<PreApprovalFormFields>(EMPTY)
  const [errors, setErrors] = useState<ReturnType<typeof validatePreApprovalForm>['errors']>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<PreApprovalResult | null>(null)

  function set<K extends keyof PreApprovalFormFields>(key: K, value: PreApprovalFormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const v = validatePreApprovalForm(fields)
    setErrors(v.errors)
    if (!v.valid || v.phoneE164 === null || v.canonCop === null) return

    setSubmitting(true)
    try {
      const res = await requestPreApproval({
        documentNumber: fields.cedula.trim(),
        phoneE164: v.phoneE164,
        ciudad: fields.ciudad,
        canonCop: v.canonCop,
        tipoInmueble: fields.tipoInmueble as 'apartamento' | 'casa' | 'local',
        consent: fields.consent,
      })
      setResult(res)
    } catch (err) {
      setSubmitError(
        err instanceof PreApprovalRequestError
          ? err.message
          : 'No pudimos procesar tu solicitud. Intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setFields(EMPTY)
    setErrors({})
    setSubmitError(null)
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4">
          <span className="text-lg font-medium tracking-tight text-foreground">Leasefy</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {result ? (
          <ResultView result={result} onReset={reset} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pre-aprobación instantánea</CardTitle>
              <CardDescription>
                Consulta en segundos qué aseguradora te afianza para tu próximo arriendo. Es gratis y sin compromiso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <Field id="cedula" label="Cédula" error={errors.cedula}>
                  <Input
                    id="cedula"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1098765432"
                    value={fields.cedula}
                    onChange={(e) => set('cedula', e.target.value)}
                  />
                </Field>

                <Field id="phone" label="Celular" error={errors.phone}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">+57</span>
                    <Input
                      id="phone"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="3001112233"
                      value={fields.phone}
                      onChange={(e) => set('phone', e.target.value)}
                    />
                  </div>
                </Field>

                <Field id="ciudad" label="Ciudad del inmueble" error={errors.ciudad}>
                  <Select value={fields.ciudad} onValueChange={(v) => set('ciudad', v)}>
                    <SelectTrigger id="ciudad">
                      <SelectValue placeholder="Selecciona una ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      {CIUDADES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field id="canon" label="Canon mensual (COP)" error={errors.canon}>
                  <Input
                    id="canon"
                    inputMode="numeric"
                    placeholder="2.000.000"
                    value={fields.canon}
                    onChange={(e) => set('canon', e.target.value)}
                  />
                </Field>

                <Field id="tipoInmueble" label="Tipo de inmueble" error={errors.tipoInmueble}>
                  <Select value={fields.tipoInmueble} onValueChange={(v) => set('tipoInmueble', v)}>
                    <SelectTrigger id="tipoInmueble">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent"
                    checked={fields.consent}
                    onCheckedChange={(checked) => set('consent', checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
                    Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 para evaluar mi
                    asegurabilidad y ser contactado por un asesor de Leasefy.
                  </Label>
                </div>
                {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

                {submitError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
                )}

                <Button type="submit" className="w-full" isLoading={submitting} disabled={submitting}>
                  Consultar mi pre-aprobación
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ResultView({ result, onReset }: { result: PreApprovalResult; onReset: () => void }) {
  const approved = result.asegurabilidad === 'yes' || result.asegurabilidad === 'partial'
  return (
    <Card>
      <CardHeader>
        <CardTitle>{approved ? '¡Buenas noticias!' : 'Estamos revisando tu caso'}</CardTitle>
        <CardDescription>
          {approved
            ? result.asegurabilidad === 'yes'
              ? 'Tienes pre-aprobación para afianzar tu arriendo.'
              : 'Podrías afianzar tu arriendo con condiciones. Un asesor confirma los detalles.'
            : 'Por ahora no encontramos una aseguradora que te afiance automáticamente, pero un asesor revisará tu caso.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {result.aseguradoras.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Aseguradoras que te afianzan</p>
            <div className="flex flex-wrap gap-2">
              {result.aseguradoras.map((a) => (
                <span
                  key={a.aseguradora}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground"
                >
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                  {aseguradoraDisplayName(a.aseguradora)}
                  {a.status === 'conditional' && (
                    <span className="text-xs text-muted-foreground">(con condiciones)</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-md bg-primary/5 px-4 py-3 text-sm text-foreground">{result.message}</div>

        <Button variant="outline" className="w-full" onClick={onReset}>
          Hacer otra consulta
        </Button>
      </CardContent>
    </Card>
  )
}
