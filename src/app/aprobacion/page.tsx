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
  requestPreApproval,
  PreApprovalRequestError,
  type PreApprovalResult,
} from '@/lib/api/funnel.service'
import { guardarAprobacionLocal, borrarAprobacionLocal } from '@/lib/api/aprobacion-local'
import { ResultadoAprobacion } from '@/components/tenant/ResultadoAprobacion'
import { CrearCuentaDesdeAprobacion } from '@/components/tenant/CrearCuentaDesdeAprobacion'
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

export default function AprobacionPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [fields, setFields] = useState<PreApprovalFormFields>(EMPTY)
  const [errors, setErrors] = useState<ReturnType<typeof validatePreApprovalForm>['errors']>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<PreApprovalResult | null>(null)
  /**
   * El canon con el que se consultó, congelado al momento del envío. No se lee
   * del formulario al pintar el resultado: si la persona toca el campo después,
   * la cifra del resultado cambiaría sola y estaría mostrando algo que nunca se
   * consultó.
   */
  const [canonConsultado, setCanonConsultado] = useState<number | null>(null)
  /**
   * Tercer paso, solo para quien no tiene cuenta: crearla y entrar. Antes el
   * recorrido terminaba en el resultado y escupía a la persona al catálogo
   * público, donde su aprobación no valía nada.
   */
  const [creandoCuenta, setCreandoCuenta] = useState(false)

  function set<K extends keyof PreApprovalFormFields>(key: K, value: PreApprovalFormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const v = validatePreApprovalForm(fields)
    setErrors(v.errors)
    // El canon ya NO bloquea: se puede estudiar sin tener una propiedad en mente.
    if (!v.valid || v.phoneE164 === null) return

    setSubmitting(true)
    try {
      const res = await requestPreApproval({
        documentNumber: fields.cedula.trim(),
        phoneE164: v.phoneE164,
        // Solo va si la persona lo escribió; omitirlo es parte del contrato.
        ...(v.canonCop !== null ? { canonCop: v.canonCop } : {}),
        ciudad: fields.ciudad,
        tipoInmueble: fields.tipoInmueble as 'apartamento' | 'casa' | 'local',
        consent: fields.consent,
      })
      setResult(res)
      setCanonConsultado(v.canonCop)
      // El puente: sin esto el resultado muere al navegar y el catálogo nunca
      // se entera. Un resultado de demo no se guarda — lo decide la función.
      guardarAprobacionLocal(res, { canonConsultadoCop: v.canonCop })
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

  /**
   * Consultar a otra persona. Se borra el respaldo local además del estado:
   * a esta pantalla llega la inmobiliaria a consultar candidatos uno tras otro,
   * y dejar guardada la aprobación del anterior haría que el catálogo se
   * personalizara con los datos de alguien más.
   */
  function reset() {
    setFields(EMPTY)
    setErrors({})
    setSubmitError(null)
    setResult(null)
    setCanonConsultado(null)
    setCreandoCuenta(false)
    borrarAprobacionLocal()
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
        {result && creandoCuenta ? (
          <CrearCuentaDesdeAprobacion
            datos={{
              telefono: fields.phone,
              cedula: fields.cedula.trim(),
              ciudad: fields.ciudad,
            }}
            onCancelar={() => setCreandoCuenta(false)}
          />
        ) : result ? (
          <ResultadoAprobacion
            result={result}
            canonConsultadoCop={canonConsultado}
            conSesion={Boolean(user)}
            esAgencia={user?.role === 'agency'}
            onNuevaConsulta={reset}
            onEntrar={() => setCreandoCuenta(true)}
          />
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

                <Field id="canon" label="Canon mensual (opcional)" error={errors.canon}>
                  <Input
                    id="canon"
                    inputMode="numeric"
                    placeholder="Ej: 2.000.000"
                    value={fields.canon}
                    onChange={(e) => set('canon', e.target.value)}
                  />
                  <p className="mt-1.5 text-xs text-fg-muted">
                    Solo si ya tienes una propiedad en mente. Si no, lo dejas vacío y te decimos
                    hasta cuánto te podemos arrendar.
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
