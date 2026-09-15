'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowsClockwise, CheckCircle, HouseLine, MapPin, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { LeasefyLogotype } from '@/components/brand'
import { useAuth } from '@/lib/auth/use-auth'
import { getUserHomeRoute } from '@/lib/auth/role-routes'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MoneyInput } from '@/components/ui/money-input'
import { formatCurrency } from '@/lib/format'
import { leerArriendoEnCurso, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso'
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
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo'
import { usePreScoringCurrent } from '@/lib/hooks/use-prescoring-current'
import { tieneEstudioVigente } from '@/lib/api/prescoring.types'
import {
  prellenadoDesdeUrl,
  vieneDelPaso1,
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

  // Desde la ficha de un inmueble («¿Te podemos arrendar este inmueble?») el
  // estudio llega con el canon, la ciudad y el tipo ya puestos. Se lee en el
  // cliente y una sola vez: lo que la persona cambie después manda.
  // 🔴 Los menús de ciudad y tipo mandan un `onValueChange('')` justo después
  // de recibir un valor por código, y vaciaban lo prellenado (medido en el
  // navegador el 14-09). Por eso sus `onValueChange` ignoran el vacío: en esos
  // menús no hay opción vacía que la persona pueda elegir.
  // Llegó de «Verificar» en la ficha con un ingreso que alcanza: esto es el paso 2.
  const [desdeLaFicha, setDesdeLaFicha] = useState(false)
  // El inmueble que eligió en el paso 1 (foto, título, canon), para no hablar en abstracto.
  const [arriendo, setArriendo] = useState<ArriendoEnCurso | null>(null)
  // La ciudad del inmueble entra a las opciones aunque no esté entre las fijas
  // (Nico probó con uno en Bello y el campo quedaba vacío). El back acepta
  // cualquier texto; el micro la resuelve contra la lista de Fianly y avisa si
  // no hay cobertura.
  const [ciudades, setCiudades] = useState<readonly string[]>(CIUDADES)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ciudadDeLaFicha = params.get('ciudad')?.trim()
    const conLaDeLaFicha =
      ciudadDeLaFicha &&
      !CIUDADES.some((c) => c.localeCompare(ciudadDeLaFicha, 'es', { sensitivity: 'base' }) === 0)
        ? [...CIUDADES, ciudadDeLaFicha]
        : CIUDADES
    setCiudades(conLaDeLaFicha)
    const prellenado = prellenadoDesdeUrl(params, conLaDeLaFicha)
    if (Object.keys(prellenado).length > 0) setFields((f) => ({ ...f, ...prellenado }))
    const delPaso1 = vieneDelPaso1(params)
    setDesdeLaFicha(delPaso1)
    if (delPaso1) setArriendo(leerArriendoEnCurso())
    // «Continuar al paso 2» está al pie del paso 1: con Lenis, el App Router
    // abría esta pantalla a esa altura y no desde el comienzo.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  /**
   * Guarda de reingreso: quien YA tiene un estudio no puede ver este
   * formulario.
   *
   * El caso que lo obliga es el cierre de sesión por tiempo. `terminarSesion`
   * guarda la ruta actual como `returnUrl` (`session-terminal.ts`), así que
   * quien se quedó en esta pantalla esperando el pago vuelve exactamente acá
   * después de volver a entrar. Sin esta guarda se encontraba el formulario
   * vacío —como si nunca hubiera pagado— y el único camino visible era pagar
   * de nuevo algo que ya tiene. El submit lo terminaba salvando (el back
   * responde `reused:true` y no cobra), pero recién DESPUÉS de llenar todo el
   * formulario otra vez: la pantalla mentía hasta el último paso.
   *
   * Vale para cualquier forma de llegar acá con un estudio encima —marcador,
   * botón "atrás", link viejo del asesor—, no solo para el regreso post-login.
   *
   * `enabled: Boolean(user)` porque esta ruta es PÚBLICA: sin sesión no hay
   * estudio que consultar y el GET sería un 401 en cada visita anónima.
   * `!pagando` deja tranquilo el flujo de pago recién creado en esta misma
   * carga, que ya tiene su propia pantalla.
   */
  const { estado: estadoEstudio, isLoading: estudioCargando } = usePreScoringCurrent({
    enabled: Boolean(user),
  })
  const redirigiendoAEstudio = tieneEstudioVigente(estadoEstudio) && !pagando
  const resolviendoEstudio = Boolean(user) && (estudioCargando || redirigiendoAEstudio)

  useEffect(() => {
    if (redirigiendoAEstudio) router.replace('/inquilino/aprobacion')
  }, [redirigiendoAEstudio, router])

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
      router.push('/auth?returnUrl=' + encodeURIComponent('/aprobacion' + window.location.search))
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
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
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

      {/* Nico, 14-09: el paso 2 se arma como el paso 1 (`/arrendar/[id]`) — los
          pasos en su propia franja, FUERA del formulario, y debajo una sola
          tarjeta con cabecera y el formulario en grupos de dos columnas. */}
      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
        {resolviendoEstudio ? (
          // Nunca el formulario mientras no se sepa si esta persona ya tiene
          // estudio: mostrarlo y sacarlo un instante después es peor que
          // esperar.
          <Card>
            <CardContent className="flex items-center gap-3 py-10">
              <ArrowsClockwise className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-fg-muted">Revisando tu solicitud...</p>
            </CardContent>
          </Card>
        ) : pagando ? (
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
          <>
            {desdeLaFicha && (
              <section data-testid="paso-2-de-3" className="rounded-2xl border border-border bg-surface px-5 py-4">
                <PasosDelArriendo actual={2} />
              </section>
            )}

            <section
              aria-labelledby="estudio-titulo"
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="flex flex-col gap-5 bg-primary-soft px-6 py-8 md:px-10">
                <div className="flex flex-col gap-2">
                  {desdeLaFicha && (
                    <p className="text-caption font-medium uppercase tracking-wide text-primary">
                      Paso 2 de 3 · validamos tus datos
                    </p>
                  )}
                  <h1
                    id="estudio-titulo"
                    className="font-heading text-2xl font-semibold leading-tight text-fg text-balance md:text-4xl"
                  >
                    {desdeLaFicha ? 'Validemos que te lo podamos arrendar' : 'Conoce hasta cuánto te arrendamos'}
                  </h1>
                  <p className="max-w-prose text-sm text-fg-muted">
                    {/* Decía «Es gratis y sin compromiso» y se cobra. No se
                        inventa el monto: el precio lo manda el backend y hoy no
                        lo manda (ver lib/api/estudio-pago.service.ts). */}
                    Consultamos varias aseguradoras a la vez y te decimos hasta cuánto te
                    respaldan. Se paga una sola vez y te sirve para todas las propiedades
                    que te interesen.
                  </p>
                </div>

                {arriendo && (
                  <div
                    data-testid="inmueble-del-paso-2"
                    className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                      {arriendo.foto ? (
                        <Image src={arriendo.foto} alt={arriendo.titulo} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-soft to-surface-muted text-primary">
                          <HouseLine weight="duotone" className="h-7 w-7" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{arriendo.titulo}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-fg-muted">
                        {arriendo.ciudad && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {arriendo.ciudad}
                          </span>
                        )}
                        <span className="whitespace-nowrap">
                          <span className="font-mono tabular-nums text-fg">{formatCurrency(arriendo.canon)}</span> /mes
                        </span>
                      </p>
                      {/* En celular va debajo: a la derecha apretaba el título a dos palabras por línea. */}
                      <SelloTeAlcanza className="mt-2 sm:hidden" />
                    </div>
                    <SelloTeAlcanza className="hidden shrink-0 sm:inline-flex" />
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-8 p-6 md:p-8" noValidate>
                <Grupo
                  id="grupo-tus-datos"
                  titulo="Tus datos"
                  ayuda="Como aparecen en tu cédula. Con ellos consultamos a las aseguradoras."
                >
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

                  <Field id="email" label="Correo electrónico" error={errors.email} className="md:col-span-2">
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Ej: maria@correo.com"
                      value={fields.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                  </Field>
                </Grupo>

                <Grupo
                  id="grupo-el-inmueble"
                  titulo="El inmueble"
                  ayuda={
                    desdeLaFicha
                      ? 'Ya viene del inmueble que elegiste. Puedes cambiarlo si buscas otro.'
                      : 'Lo que quieres arrendar. Lo usamos para el estudio.'
                  }
                >
                  {/* Ya no es "del inmueble": puede no haber inmueble todavía. */}
                  <Field id="ciudad" label="Ciudad donde quieres vivir" error={errors.ciudad}>
                    <Select value={fields.ciudad} onValueChange={(v) => v && set('ciudad', v)}>
                      <SelectTrigger id="ciudad">
                        <SelectValue placeholder="Selecciona una ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        {ciudades.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field id="tipoInmueble" label="Tipo de inmueble" error={errors.tipoInmueble}>
                    <Select value={fields.tipoInmueble} onValueChange={(v) => v && set('tipoInmueble', v)}>
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

                  {/* Con puntos de miles mientras se escribe (Nico, 14-09: «1100000»
                      no se lee). Hacia el formulario siguen siendo dígitos pelados. */}
                  <Field id="canon" label="Canon mensual" error={errors.canon} className="md:col-span-2">
                    <MoneyInput
                      id="canon"
                      placeholder="2.000.000"
                      value={fields.canon}
                      onChange={(v) => set('canon', v)}
                    />
                  </Field>
                </Grupo>

                <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-muted p-4">
                  <div className="flex items-start gap-3">
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
                </div>

                {submitError && (
                  <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{submitError}</p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                  {arriendo ? (
                    <Button asChild variant="ghost" hideArrow>
                      <Link href={`/arrendar/${arriendo.propertyId}`}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Volver al paso 1
                      </Link>
                    </Button>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    isLoading={submitting}
                    disabled={submitting}
                  >
                    Consultar mi aprobación
                  </Button>
                </div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function SelloTeAlcanza({ className }: { className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-caption font-medium text-success ${className}`}
    >
      <CheckCircle weight="fill" className="h-4 w-4" aria-hidden="true" />
      Te alcanza
    </span>
  )
}

/** Un grupo del formulario: título, para qué es, y sus campos en dos columnas. */
function Grupo({
  id,
  titulo,
  ayuda,
  children,
}: {
  id: string
  titulo: string
  ayuda: string
  children: React.ReactNode
}) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="font-heading text-lg font-semibold text-fg">
          {titulo}
        </h2>
        <p className="mt-0.5 text-caption text-fg-muted">{ayuda}</p>
      </div>
      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">{children}</div>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
