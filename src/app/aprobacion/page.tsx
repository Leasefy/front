'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { LeasefyLogotype } from '@/components/brand'
import { useAuth } from '@/lib/auth/use-auth'
import { getUserHomeRoute } from '@/lib/auth/role-routes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PhoneField } from '@/components/ui/phone-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  crearOrdenPreScoring,
  PreScoringError,
} from '@/lib/api/estudio-solicitud.service'
import { EstadoPagoAprobacion } from '@/components/aprobacion/EstadoPagoAprobacion'
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
  nombres: '',
  apellidos: '',
  email: '',
  cedula: '',
  phone: '',
  ciudad: '',
  canon: '',
  tipoInmueble: '',
  consent: false,
}

export default function AprobacionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [fields, setFields] = useState<PreApprovalFormFields>(EMPTY)
  const [errors, setErrors] = useState<ReturnType<typeof validatePreApprovalForm>['errors']>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Modo "pagando": el pago se abrió en otra pestaña y esta pantalla se
  // queda poleando el back en vez de navegar. `paymentUrl`/`popupBlocked` se
  // le pasan a `<EstadoPagoAprobacion>` para el link manual.
  const [pagando, setPagando] = useState(false)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [popupBlocked, setPopupBlocked] = useState(false)

  function set<K extends keyof PreApprovalFormFields>(key: K, value: PreApprovalFormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  /**
   * El submit YA NO navega la pantalla a Wompi: abre el link de pago
   * hosteado en OTRA pestaña y esta página se queda, mostrando
   * `<EstadoPagoAprobacion>` (que polea el back) hasta que el pago se
   * confirma — mismo patrón que el checkout de planes de agencia
   * (`useAgencyCheckout.pay` + `AgencyCheckoutOverlay`).
   *
   * La pestaña se pre-abre SINCRÓNICAMENTE, dentro del gesto de click y
   * antes de cualquier `await`: los navegadores bloquean un `window.open`
   * emitido después de una espera async porque deja de contar como gesto de
   * usuario. Por eso la validación y el chequeo de sesión van primero (son
   * síncronos, no rompen el gesto) y recién después se abre la pestaña.
   *
   * El front NO arma la infraestructura de pago (ni calcula hash de
   * integridad, ni construye la URL de Wompi): el back devuelve `paymentUrl`
   * ya lista, igual que el checkout de planes de agencia
   * (`useAgencyCheckout` → `chargePaymentLink`).
   *
   * Alcance actual: la persona YA TIENE que estar logueada. `POST
   * /pre-scoring` usa su sesión (JWT vía `apiClient`); sin sesión no hay a
   * quién asociarle la orden, así que se manda a `/auth` con `returnUrl` a
   * `/aprobacion` en vez de intentar crearla. El flujo de signup para
   * quien no tiene cuenta todavía lo construye otro dev.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const v = validatePreApprovalForm(fields)
    setErrors(v.errors)
    // El canon ahora es obligatorio: sin él, `v.valid` ya viene en false.
    // El segundo chequeo de `canonCop` es solo para que TS lo vea como
    // `number` más abajo — lógicamente ya lo garantiza `v.valid`.
    if (!v.valid || v.phoneE164 === null || v.canonCop === null) return

    if (!user) {
      router.push('/auth?returnUrl=' + encodeURIComponent('/aprobacion'))
      return
    }

    // Pre-abrir la pestaña ANTES del `await`: ver docstring de esta función.
    const payTab = window.open('about:blank', '_blank')

    setSubmitting(true)
    try {
      const orden = await crearOrdenPreScoring({
        documentNumber: fields.cedula.trim(),
        phoneE164: v.phoneE164,
        candidate: {
          names: fields.nombres.trim(),
          surnames: fields.apellidos.trim(),
          email: fields.email.trim(),
        },
        ciudad: fields.ciudad,
        canonCop: v.canonCop,
        tipoInmueble: fields.tipoInmueble as 'apartamento' | 'casa' | 'local',
        consent: fields.consent,
      })

      if (orden.reused) {
        // Ya hay un estudio para esta persona: no se cobra de nuevo. Se
        // cierra la pestaña que se había pre-abierto y se ve el
        // estado/resultado en su panel (Slice 2).
        payTab?.close()
        router.push('/inquilino/aprobacion')
        return
      }

      setPaymentUrl(orden.paymentUrl)
      if (payTab && !payTab.closed) {
        payTab.location.href = orden.paymentUrl
        setPopupBlocked(false)
      } else {
        // El pre-open falló (bloqueado por el navegador): se muestra el
        // link manual en `<EstadoPagoAprobacion>`.
        setPopupBlocked(true)
      }
      setPagando(true)
    } catch (err) {
      payTab?.close()
      setSubmitError(
        err instanceof PreScoringError
          ? err.message
          : 'No pudimos procesar tu solicitud. Intenta de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Sale del flujo. Vuelve de donde vino; y si llegó por un link directo
   * (WhatsApp del asesor, correo) no hay historia dentro del sitio, así que se
   * lo manda a donde pertenece: su panel si tiene sesión, el catálogo si no.
   */
  function cerrar() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(user ? getUserHomeRoute(user) : '/propiedades')
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Antes esta pantalla no tenía salida: ni volver, ni logo clickeable, ni
          nada después del resultado. Quien entraba quedaba encerrado.

          Fijo al hacer scroll (`sticky top-0`, z de la escala `sticky`=20):
          el resultado es largo, y la salida no puede quedarse arriba fuera de
          alcance. Patrón canónico de `WizardShell` / `PublishShell`. Lenis usa
          scroll nativo, así que `sticky` funciona sin trucos. */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4">
          {/* El logo real, el mismo del sidebar: monocromo por currentColor. */}
          <BrandHomeLink aria-label="Leasefy — inicio" className="text-fg">
            <LeasefyLogotype size={24} />
          </BrandHomeLink>
          <Button variant="outline" size="sm" onClick={cerrar} hideArrow>
            <X className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {pagando ? (
          // Reemplaza el form: el pago se abrió en otra pestaña, esta se
          // queda poleando el back en vez de navegar.
          <Card>
            <CardContent className="pt-6">
              <EstadoPagoAprobacion
                paymentUrl={paymentUrl}
                popupBlocked={popupBlocked}
                onReintentar={() => setPagando(false)}
              />
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Conoce hasta cuánto te arrendamos</CardTitle>
            <CardDescription>
              {/* Decía «Es gratis y sin compromiso» y se cobra. No se
                  inventa el monto: el precio lo manda el backend y hoy no
                  lo manda (ver lib/api/estudio-pago.service.ts). */}
              Consultamos varias aseguradoras a la vez y te decimos hasta cuánto te
              respaldan. Se paga una sola vez y te sirve para todas las propiedades
              que te interesen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field id="nombres" label="Nombres" error={errors.nombres}>
                <Input
                  id="nombres"
                  autoComplete="given-name"
                  placeholder="Ej: María"
                  value={fields.nombres}
                  onChange={(e) => set('nombres', e.target.value)}
                />
              </Field>

              <Field id="apellidos" label="Apellidos" error={errors.apellidos}>
                <Input
                  id="apellidos"
                  autoComplete="family-name"
                  placeholder="Ej: Restrepo"
                  value={fields.apellidos}
                  onChange={(e) => set('apellidos', e.target.value)}
                />
              </Field>

              <Field id="cedula" label="Cédula" error={errors.cedula}>
                <Input
                  id="cedula"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Ej: 1098765432"
                  value={fields.cedula}
                  onChange={(e) => set('cedula', e.target.value)}
                />
              </Field>

              <Field id="phone" label="Celular" error={errors.phone}>
                <PhoneField
                  id="phone"
                  value={fields.phone}
                  onChange={(v) => set('phone', v)}
                  invalid={Boolean(errors.phone)}
                />
              </Field>

              <Field id="email" label="Correo electrónico" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Ej: maria@correo.com"
                  value={fields.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>

              {/* Ya no es "del inmueble": puede no haber inmueble todavía. */}
              <Field id="ciudad" label="Ciudad donde quieres vivir" error={errors.ciudad}>
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

              <Field id="canon" label="Canon mensual" error={errors.canon}>
                <Input
                  id="canon"
                  inputMode="numeric"
                  placeholder="Ej: 2.000.000"
                  value={fields.canon}
                  onChange={(e) => set('canon', e.target.value)}
                />
                <p className="mt-1.5 text-xs text-fg-muted">
                  El canon mensual de la propiedad que quieres arrendar. Lo usamos para el estudio.
                </p>
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
                <Label htmlFor="consent" className="text-xs font-normal leading-relaxed text-fg-muted">
                  {/* Al inquilino no se le dice "asegurabilidad" — docs/VOCABULARIO.md */}
                  Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 para
                  consultar mi aprobación con las aseguradoras y ser contactado por un asesor de Leasefy.
                </Label>
              </div>
              {errors.consent && <p className="text-xs text-danger">{errors.consent}</p>}

              {submitError && (
                <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{submitError}</p>
              )}

              <Button type="submit" className="w-full" isLoading={submitting} disabled={submitting}>
                Consultar mi aprobación
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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
