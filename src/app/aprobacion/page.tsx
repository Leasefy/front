'use client'

/**
 * /aprobacion — the free document study (T-0193).
 *
 * "¿Hasta cuánto me arriendan?" is answered with the person's own documents,
 * scored by Leasefy's bureau. No payment, no insurers, no deposit (Ley 820
 * art. 16). Contract: `.orchestration/tasks/T-0193-tenant-canon-estimate-bureau/contract.md`.
 *
 *   1 · autorizar    consent `calificacion-leasefy-v1` (required) → POST /estudio
 *   2 · documentos   cédula + extracto (required), nómina / certificación (optional)
 *                    → POST /estudio/:id/documentos, then POST /estudio/:id/iniciar
 *   3 · procesando   GET /estudio/actual on load, then every 2 min while PROCESSING (T-0195)
 *   ✗ FAILED         says which document failed; retry with the same documents or replace
 *                    that one (POST .../documentos) and POST .../reintentar (T-0195)
 *   ✓ COMPLETED      → /inquilino/aprobacion (the result)
 *
 * The route is public, but the study needs a tenant session: without one the
 * account window opens on top ("pasos primero, cuenta al final").
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowsClockwise,
  CheckCircle,
  HouseLine,
  MapPin,
  UserPlus,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

import { BrandHomeLink } from '@/components/brand/BrandHomeLink'
import { LeasefyLogotype } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { ConfirmarSalidaDelArriendo } from '@/components/aprobacion/ConfirmarSalidaDelArriendo'
import { CasillaDeDocumento } from '@/components/aprobacion/CasillaDeDocumento'
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo'
import { useVentanaDeCuenta } from '@/components/marketplace/CuentaParaPublicar'
import { apiClient } from '@/lib/api/client'
import { EstudioDeCanonError, estudioDeCanonApi } from '@/lib/api/estudio-de-canon.service'
import { hayAlgoQueSubir, type TipoDeDocumento } from '@/lib/api/estudio-de-canon.types'
import { leerArriendoEnCurso, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso'
import { getUserHomeRoute } from '@/lib/auth/role-routes'
import { rutaDeOnboardingConRegreso } from '@/lib/auth/perfil-de-onboarding'
import { useAuth } from '@/lib/auth/use-auth'
import { formatCurrency } from '@/lib/format'
import { useEstudioDeCanon } from '@/lib/hooks/use-estudio-de-canon'
import { vieneDelPaso1 } from './form-logic'

const DOCUMENTOS: ReadonlyArray<{
  tipo: TipoDeDocumento
  titulo: string
  ayuda: string
  obligatorio: boolean
}> = [
  {
    tipo: 'cedula',
    titulo: 'Cédula de ciudadanía',
    ayuda: 'Una foto nítida o un PDF, con las dos caras.',
    obligatorio: true,
  },
  {
    tipo: 'extracto_bancario',
    titulo: 'Extracto bancario',
    ayuda: 'El más reciente de la cuenta donde recibes tus ingresos.',
    obligatorio: true,
  },
  {
    tipo: 'nomina',
    titulo: 'Desprendible de nómina',
    ayuda: 'Ayuda a confirmar tu ingreso si trabajas con contrato.',
    obligatorio: false,
  },
  {
    tipo: 'certificacion_laboral',
    titulo: 'Certificación laboral',
    ayuda: 'Una carta de tu empleador con cargo, salario y antigüedad.',
    obligatorio: false,
  },
]

type Vista = 'sin_cuenta' | 'no_inquilino' | 'cargando' | 'autorizar' | 'documentos' | 'procesando' | 'fallido' | 'redirigiendo'

export default function AprobacionPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authCargando, needsOnboarding, perfilElegido } = useAuth()

  const [consiente, setConsiente] = useState(false)
  const [errorConsentimiento, setErrorConsentimiento] = useState<string | undefined>()
  const [textoLegal, setTextoLegal] = useState<{ title: string; text: string } | null>(null)
  const [verTexto, setVerTexto] = useState(false)
  const [empezando, setEmpezando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [reintentando, setReintentando] = useState(false)
  /** Slots whose file was replaced after the failure (the retry then says "con el archivo nuevo"). */
  const [reemplazados, setReemplazados] = useState<Partial<Record<TipoDeDocumento, boolean>>>({})
  const [subiendo, setSubiendo] = useState<Partial<Record<TipoDeDocumento, boolean>>>({})
  const [errores, setErrores] = useState<Partial<Record<TipoDeDocumento, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  /** The person chose to start over (after a failed study, or "repetir"): the old study is not shown. */
  const [reiniciado, setReiniciado] = useState(false)
  const [repetir, setRepetir] = useState(false)
  const [urlLeida, setUrlLeida] = useState(false)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const [desdeLaFicha, setDesdeLaFicha] = useState(false)
  const [arriendo, setArriendo] = useState<ArriendoEnCurso | null>(null)
  const [destino, setDestino] = useState('/aprobacion')

  const esInquilino = Boolean(user) && user?.role === 'tenant'
  const { estudio, isLoading: estudioCargando, error: errorDeCarga, refetch, setEstudio } = useEstudioDeCanon({
    enabled: esInquilino,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRepetir(params.get('repetir') === '1')
    setDestino('/aprobacion' + window.location.search)
    const delPaso1 = vieneDelPaso1(params)
    setDesdeLaFicha(delPaso1)
    if (delPaso1) setArriendo(leerArriendoEnCurso())
    setUrlLeida(true)
    // With Lenis the App Router could open this screen mid-page.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  // The legal text the checkbox refers to (same endpoint as the bureau consent in the application).
  useEffect(() => {
    if (!esInquilino) return
    let vivo = true
    apiClient
      .get<{ title: string; text: string }>('/legal/consent-text?type=calificacion-leasefy&lang=es')
      .then((t) => vivo && setTextoLegal(t))
      .catch(() => vivo && setTextoLegal(null))
    return () => {
      vivo = false
    }
  }, [esInquilino])

  const faltaElPerfil = !authCargando && Boolean(isAuthenticated) && Boolean(needsOnboarding)
  useEffect(() => {
    if (faltaElPerfil) router.replace(rutaDeOnboardingConRegreso(perfilElegido ?? 'tenant', destino))
  }, [faltaElPerfil, perfilElegido, destino, router])

  const { abrir: pedirLaCuenta, ventana: ventanaDeLaCuenta } = useVentanaDeCuenta({
    destino,
    rol: 'tenant',
    titulo: 'Para estudiar tus documentos necesitas una cuenta',
    detalle:
      'Créala aquí mismo con tu correo, o inicia sesión si ya tienes una. Es gratis y al volver sigues donde ibas.',
    Icono: UserPlus,
    testId: 'aviso-cuenta-para-el-estudio',
  })

  const visible = estudio && !reiniciado ? estudio : null
  let vista: Vista
  if (authCargando || !urlLeida) vista = 'cargando'
  else if (!user) vista = 'sin_cuenta'
  else if (!esInquilino) vista = 'no_inquilino'
  else if (estudioCargando) vista = 'cargando'
  else if (visible?.status === 'PROCESSING') vista = 'procesando'
  else if (visible?.status === 'COMPLETED') vista = repetir ? 'autorizar' : 'redirigiendo'
  else if (visible?.status === 'FAILED') vista = 'fallido'
  else if (visible?.status === 'DRAFT') vista = 'documentos'
  else vista = 'autorizar'

  useEffect(() => {
    if (vista === 'redirigiendo') router.replace('/inquilino/aprobacion')
  }, [vista, router])

  function reiniciar() {
    setReiniciado(true)
    setEstudio(null)
    setConsiente(false)
    setErrores({})
    setErrorGeneral(null)
    setReemplazados({})
  }

  /** The back says the retry budget is spent: the screen offers a new study instead. */
  function sinReintentos() {
    if (!visible?.error) return
    setEstudio({ ...visible, error: { ...visible.error, reintentosRestantes: 0 } })
  }

  function mostrarError(err: unknown, tipo?: TipoDeDocumento) {
    const e = err instanceof EstudioDeCanonError ? err : null
    const mensaje = e?.message ?? 'No pudimos completar esto. Inténtalo de nuevo en unos minutos.'
    if (e?.code === 'ESTUDIO_NO_ENCONTRADO') {
      reiniciar()
      setErrorGeneral(mensaje)
      return
    }
    if (e?.code === 'ESTUDIO_YA_INICIADO' || e?.code === 'ESTUDIO_NO_REINTENTABLE') {
      setErrorGeneral(mensaje)
      refetch()
      return
    }
    if (e?.code === 'ESTUDIO_SIN_REINTENTOS') {
      sinReintentos()
      setErrorGeneral(mensaje)
      return
    }
    if (tipo) setErrores((prev) => ({ ...prev, [tipo]: mensaje }))
    else setErrorGeneral(mensaje)
  }

  async function empezar(ev: React.FormEvent) {
    ev.preventDefault()
    setErrorGeneral(null)
    if (!consiente) {
      setErrorConsentimiento('Marca la autorización para continuar.')
      return
    }
    setEmpezando(true)
    try {
      const nuevo = await estudioDeCanonApi.crear()
      setReiniciado(false)
      setEstudio(nuevo)
    } catch (err) {
      mostrarError(err)
    } finally {
      setEmpezando(false)
    }
  }

  async function subir(tipo: TipoDeDocumento, file: File) {
    if (!visible) return
    setErrorGeneral(null)
    setErrores((prev) => ({ ...prev, [tipo]: undefined }))
    setSubiendo((prev) => ({ ...prev, [tipo]: true }))
    try {
      setEstudio(await estudioDeCanonApi.subirDocumento(visible.id, tipo, file))
      if (visible.status === 'FAILED') setReemplazados((prev) => ({ ...prev, [tipo]: true }))
    } catch (err) {
      mostrarError(err, tipo)
    } finally {
      setSubiendo((prev) => ({ ...prev, [tipo]: false }))
    }
  }

  async function iniciar() {
    if (!visible) return
    setErrorGeneral(null)
    setIniciando(true)
    try {
      setEstudio(await estudioDeCanonApi.iniciar(visible.id))
    } catch (err) {
      if (err instanceof EstudioDeCanonError && err.code === 'DOCUMENTOS_FALTANTES') {
        const faltan = err.faltan ?? visible.faltan
        setErrores((prev) => {
          const siguiente = { ...prev }
          for (const t of faltan) siguiente[t] = 'Este documento es obligatorio.'
          return siguiente
        })
        setErrorGeneral(err.message)
      } else {
        mostrarError(err)
      }
    } finally {
      setIniciando(false)
    }
  }

  async function reintentar() {
    if (!visible) return
    setErrorGeneral(null)
    setReintentando(true)
    try {
      setEstudio(await estudioDeCanonApi.reintentar(visible.id))
      setReemplazados({})
      setErrores({})
    } catch (err) {
      if (err instanceof EstudioDeCanonError && err.code === 'DOCUMENTOS_FALTANTES') {
        setErrorGeneral(err.message)
      } else {
        mostrarError(err)
      }
    } finally {
      setReintentando(false)
    }
  }

  function salirDelFlujo() {
    setConfirmandoSalida(false)
    if (arriendo?.propertyId) {
      router.push(`/propiedades/${arriendo.propertyId}`)
      return
    }
    router.push(user ? getUserHomeRoute(user) : '/propiedades')
  }

  const pasoActual: 1 | 2 | 3 = vista === 'documentos' ? 2 : vista === 'procesando' || vista === 'fallido' ? 3 : 1
  const subiendoAlgo = Object.values(subiendo).some(Boolean)
  const documentoConError = visible?.error?.documentoConError ?? null
  const reintentosRestantes = visible?.error?.reintentosRestantes ?? 1
  const sinMasReintentos = reintentosRestantes <= 0
  const documentoReemplazado = documentoConError !== null && Boolean(reemplazados[documentoConError])
  const puedeIniciar = Boolean(visible) && !hayAlgoQueSubir(visible?.documentos ?? []) && !subiendoAlgo

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <BrandHomeLink aria-label="Leasefy — inicio" className="text-fg">
            <LeasefyLogotype size={24} />
          </BrandHomeLink>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmandoSalida(true)}
            hideArrow
            data-testid="cerrar-aprobacion"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      </header>

      <ConfirmarSalidaDelArriendo
        abierto={confirmandoSalida}
        onAbiertoChange={setConfirmandoSalida}
        tituloDelInmueble={arriendo?.titulo}
        onSalir={salirDelFlujo}
      />

      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
        {desdeLaFicha ? (
          <section data-testid="paso-2-de-3" className="rounded-lg border border-border bg-surface px-5 py-4">
            <PasosDelArriendo actual={2} />
          </section>
        ) : (
          <section data-testid="franja-del-estudio" className="rounded-lg border border-border bg-surface px-5 py-4">
            <PasosDelArriendo variante="estudio" actual={pasoActual} />
          </section>
        )}
        {ventanaDeLaCuenta}

        {(vista === 'cargando' || vista === 'redirigiendo') && (
          <Card>
            <CardContent className="flex items-center gap-3 py-10" role="status">
              <ArrowsClockwise className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-fg-muted">Revisando tu solicitud...</p>
            </CardContent>
          </Card>
        )}

        {errorDeCarga && vista === 'autorizar' && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" data-testid="error-de-carga">
            {errorDeCarga}
          </p>
        )}

        {vista === 'sin_cuenta' && (
          <section className="space-y-4 rounded-lg border border-border bg-surface p-6 md:p-8" data-testid="vista-sin-cuenta">
            <h1 className="font-heading text-2xl font-[420] text-fg text-balance md:text-3xl">
              Conoce hasta cuánto te arriendan
            </h1>
            <p className="max-w-prose text-sm text-fg-muted">
              Es gratis. Subes tu cédula y tu extracto bancario, los revisamos y te decimos el rango de arriendo donde
              tienes mejores posibilidades de que te acepten. Para guardar tu resultado necesitas una cuenta.
            </p>
            <Button type="button" size="lg" onClick={pedirLaCuenta} data-testid="crear-cuenta-para-el-estudio">
              Crear mi cuenta o iniciar sesión
            </Button>
          </section>
        )}

        {vista === 'no_inquilino' && (
          <section className="space-y-3 rounded-lg border border-border bg-surface p-6 md:p-8" data-testid="vista-no-inquilino">
            <h1 className="font-heading text-xl font-[420] text-fg">Este estudio es para inquilinos</h1>
            <p className="text-sm text-fg-muted">Tu cuenta no es de inquilino, así que no tienes un tope de arriendo que calcular.</p>
            <Button asChild variant="secondary">
              <Link href={user ? getUserHomeRoute(user) : '/'}>Volver a mi panel</Link>
            </Button>
          </section>
        )}

        {vista === 'autorizar' && (
          <section aria-labelledby="estudio-titulo" className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex flex-col gap-5 bg-primary-soft px-6 py-8 md:px-10">
              <div className="flex flex-col gap-2">
                <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">
                  {desdeLaFicha ? 'Paso 2 de 3 · estudiamos tus documentos' : 'Paso 1 de 3 · tu autorización'}
                </p>
                <h1
                  id="estudio-titulo"
                  className="font-heading text-2xl font-[420] leading-tight text-fg text-balance md:text-4xl"
                >
                  {desdeLaFicha ? 'Validemos que te lo podamos arrendar' : 'Conoce hasta cuánto te arriendan'}
                </h1>
                <p className="max-w-prose text-sm text-fg-muted">
                  Es gratis y toma unos minutos. Revisamos tu cédula y tu extracto bancario y te decimos el rango de
                  arriendo donde tienes mejores posibilidades de que te acepten. Te sirve para todos los inmuebles que
                  te interesen.
                </p>
              </div>
              {arriendo && <InmuebleDelPaso2 arriendo={arriendo} />}
            </div>

            <form onSubmit={empezar} className="flex flex-col gap-6 p-6 md:p-8" noValidate>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consiente}
                    onCheckedChange={(c) => {
                      setConsiente(c === true)
                      if (c === true) setErrorConsentimiento(undefined)
                    }}
                    aria-invalid={errorConsentimiento ? true : undefined}
                    aria-describedby={errorConsentimiento ? 'consent-error' : undefined}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-body-sm font-normal leading-relaxed text-fg-muted">
                    Autorizo a Leasefy a revisar los documentos que subo, calcular mi Calificación Leasefy y que las
                    inmobiliarias de Leasefy puedan consultarla, conforme a la Ley 1581 de 2012.
                  </Label>
                </div>
                {textoLegal && (
                  <div className="pl-7">
                    <button
                      type="button"
                      className="text-caption text-fg-muted underline hover:no-underline"
                      onClick={() => setVerTexto((v) => !v)}
                      aria-expanded={verTexto}
                    >
                      {verTexto ? 'Ocultar el texto' : 'Leer el texto'}
                    </button>
                    {verTexto && (
                      <div
                        className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-surface p-3 text-caption leading-relaxed text-fg-muted"
                        data-lenis-prevent
                        data-testid="texto-legal"
                      >
                        <p className="mb-1.5 font-medium text-fg">{textoLegal.title}</p>
                        {textoLegal.text}
                      </div>
                    )}
                  </div>
                )}
                <ErrorDelCampo id="consent-error" mensaje={errorConsentimiento} className="mt-0" />
              </div>

              {errorGeneral && <ErrorGeneral mensaje={errorGeneral} />}

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
                  isLoading={empezando}
                  disabled={empezando || !consiente}
                >
                  {empezando ? 'Preparando…' : 'Continuar'}
                </Button>
              </div>
            </form>
          </section>
        )}

        {vista === 'documentos' && visible && (
          <section
            aria-labelledby="documentos-titulo"
            className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 md:p-8"
            data-testid="vista-documentos"
          >
            <div className="flex flex-col gap-2">
              <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">Paso 2 de 3 · tus documentos</p>
              <h1 id="documentos-titulo" className="font-heading text-2xl font-[420] text-fg text-balance md:text-3xl">
                Sube tus documentos
              </h1>
              <p className="max-w-prose text-sm text-fg-muted">
                Necesitamos tu cédula y tu extracto bancario. Si tienes desprendible de nómina o certificación laboral,
                súbelos también: ayudan a confirmar tu ingreso. PDF o imagen, de hasta 10 MB cada uno.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {DOCUMENTOS.map((d) => (
                <CasillaDeDocumento
                  key={d.tipo}
                  tipo={d.tipo}
                  titulo={d.titulo}
                  ayuda={d.ayuda}
                  obligatorio={d.obligatorio}
                  subido={visible.documentos.some((x) => x.tipo === d.tipo)}
                  subiendo={Boolean(subiendo[d.tipo])}
                  error={errores[d.tipo]}
                  disabled={iniciando}
                  onElegir={(file) => void subir(d.tipo, file)}
                />
              ))}
            </div>

            {errorGeneral && <ErrorGeneral mensaje={errorGeneral} />}

            <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-fg-muted">Usamos tus documentos solo para este estudio. No te cobramos nada.</p>
              <Button
                type="button"
                size="lg"
                className="w-full sm:w-auto"
                isLoading={iniciando}
                disabled={!puedeIniciar || iniciando}
                onClick={() => void iniciar()}
                data-testid="iniciar-estudio"
              >
                {iniciando ? 'Iniciando…' : 'Estudiar mis documentos'}
              </Button>
            </div>
          </section>
        )}

        {vista === 'procesando' && (
          <section
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 md:p-8"
            data-testid="vista-procesando"
            aria-live="polite"
          >
            <ArrowsClockwise className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <h1 className="font-heading text-2xl font-[420] text-fg text-balance">Estamos leyendo tus documentos</h1>
            <p className="max-w-prose text-sm text-fg-muted">
              Puede tardar unos minutos. No tienes que quedarte aquí: puedes cerrar esta pantalla y volver más tarde, o
              recargar la página para ver si ya terminó. Revisamos el avance cada dos minutos y tu resultado queda en Mi
              tope.
            </p>
            <div>
              <Button asChild variant="secondary" hideArrow>
                <Link href="/inquilino/aprobacion">Ir a Mi tope</Link>
              </Button>
            </div>
          </section>
        )}

        {vista === 'fallido' && visible && (
          <section
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 md:p-8"
            data-testid="vista-fallido"
          >
            <WarningCircle weight="fill" className="h-6 w-6 text-warning" aria-hidden="true" />
            <h1 className="font-heading text-2xl font-[420] text-fg text-balance">No pudimos terminar tu estudio</h1>
            <p className="max-w-prose text-sm text-fg-muted" role="alert">
              {visible.error?.mensaje || 'No pudimos leer tus documentos.'}
            </p>

            {documentoConError && (
              <div className="flex flex-col gap-2" data-testid="documento-con-error">
                <p className="text-caption text-fg-muted">
                  Este archivo es el que dio el problema. Puedes cambiarlo por uno mejor o reintentar con el mismo.
                </p>
                {DOCUMENTOS.filter((d) => d.tipo === documentoConError).map((d) => (
                  <CasillaDeDocumento
                    key={d.tipo}
                    tipo={d.tipo}
                    titulo={d.titulo}
                    ayuda={d.ayuda}
                    obligatorio={d.obligatorio}
                    subido={visible.documentos.some((x) => x.tipo === d.tipo)}
                    subiendo={Boolean(subiendo[d.tipo])}
                    error={errores[d.tipo]}
                    disabled={reintentando || sinMasReintentos}
                    onElegir={(file) => void subir(d.tipo, file)}
                  />
                ))}
              </div>
            )}

            {errorGeneral && <ErrorGeneral mensaje={errorGeneral} />}

            {sinMasReintentos ? (
              <div className="flex flex-col gap-3" data-testid="sin-reintentos">
                <p className="max-w-prose text-sm text-fg-muted">
                  Ya usaste todos los reintentos de este estudio. Empieza uno nuevo para volver a intentarlo.
                </p>
                <div>
                  <Button type="button" size="lg" onClick={reiniciar} data-testid="empezar-estudio-nuevo">
                    Empezar un estudio nuevo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div>
                  <Button
                    type="button"
                    size="lg"
                    isLoading={reintentando}
                    disabled={reintentando || subiendoAlgo}
                    onClick={() => void reintentar()}
                    data-testid="reintentar-estudio"
                  >
                    {reintentando
                      ? 'Reintentando…'
                      : documentoReemplazado
                        ? 'Reintentar con el archivo nuevo'
                        : 'Reintentar con los mismos documentos'}
                  </Button>
                </div>
                <p className="text-caption text-fg-muted" data-testid="reintentos-restantes">
                  {reintentosRestantes === 1
                    ? 'Te queda 1 reintento.'
                    : `Te quedan ${reintentosRestantes} reintentos.`}
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

function ErrorGeneral({ mensaje }: { mensaje: string }) {
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" data-testid="error-general">
      {mensaje}
    </p>
  )
}

function InmuebleDelPaso2({ arriendo }: { arriendo: ArriendoEnCurso }) {
  return (
    <div data-testid="inmueble-del-paso-2" className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
        {arriendo.foto ? (
          <Image src={arriendo.foto} alt={arriendo.titulo} fill sizes="64px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-muted text-fg-subtle">
            <HouseLine weight="duotone" className="h-7 w-7" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{arriendo.titulo}</p>
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
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-caption font-medium text-success sm:inline-flex">
        <CheckCircle weight="fill" className="h-4 w-4" aria-hidden="true" />
        Te alcanza
      </span>
    </div>
  )
}
