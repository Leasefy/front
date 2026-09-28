'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { FormField, FormLabel, FormControl, FormError, FormHint } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { LeasefyLogotype } from '@/components/brand'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { formatearNitAlEscribir, revisarNit, LARGO_MAXIMO_AL_ESCRIBIR } from '@/lib/onboarding/nit'
import {
  revisarNombreCompleto,
  revisarRazonSocial,
  partirNombre,
} from '@/lib/onboarding/campos-de-registro'
import type { ProvisioningInput } from '@/lib/hooks/use-onboarding-provisioning'

export interface OwnerNameStepFormProps {
  onSubmit: (input: ProvisioningInput) => void
  /** Disables submit while `POST /users/me/onboarding` is in flight. */
  isSubmitting: boolean
  /** Prefill al retomar: la persona ya escribió esto en una visita anterior. */
  valoresIniciales?: {
    nombreCompleto?: string
    razonSocial?: string
    nit?: string
    representanteLegal?: string
    documentoRepresentante?: string
  }
}

type Campo = 'nombre' | 'razonSocial' | 'nit' | 'representante'

/**
 * Paso previo al aprovisionamiento (`useOnboardingProvisioning` responde
 * `needs-info`). Junta todo lo que necesita `POST /users/me/onboarding` para
 * crear la agencia: el nombre del dueño (el back rechaza un firstName o
 * lastName vacío) más la razón social y el NIT (sin NIT el back marca la
 * agencia FAILED, y FAILED no se reintenta).
 *
 * Los errores se pintan en el helper del campo, con el componente de campo del
 * DS: un error de un campo no es un toast ni un banner arriba — es una línea
 * bajo el input que lo causó. Cada campo se revisa al salir de él y, una vez
 * que está en rojo, en cada tecla, para que el rojo se vaya solo apenas se
 * arregla en vez de esperar al siguiente envío.
 *
 * El NIT se revisa de verdad: longitud, y el dígito de verificación calculado
 * con el algoritmo de la DIAN (ver `lib/onboarding/nit.ts`). Si escribieron uno
 * que no corresponde, el mensaje dice cuál es — el dígito se deduce del resto
 * del número, así que decirlo ahorra ir a buscar el RUT.
 */
export function OwnerNameStepForm({
  onSubmit,
  isSubmitting,
  valoresIniciales,
}: OwnerNameStepFormProps) {
  const [displayName, setDisplayName] = useState(valoresIniciales?.nombreCompleto ?? '')
  const [agencyName, setAgencyName] = useState(valoresIniciales?.razonSocial ?? '')
  const [nit, setNit] = useState(valoresIniciales?.nit ?? '')
  // Quien crea la cuenta no siempre es el dueño: puede ser el contador o un
  // asesor registrando a la inmobiliaria de otra persona. Por defecto se asume
  // el caso común —el dueño se registra a sí mismo— y el tilde copia el nombre
  // de arriba, así nadie escribe lo mismo dos veces.
  const [esElRepresentante, setEsElRepresentante] = useState(
    valoresIniciales?.representanteLegal ? valoresIniciales.representanteLegal === valoresIniciales.nombreCompleto : true,
  )
  const [representante, setRepresentante] = useState(valoresIniciales?.representanteLegal ?? '')
  const [documentoRepresentante, setDocumentoRepresentante] = useState(
    valoresIniciales?.documentoRepresentante ?? '',
  )

  /** Lo que se guarda como representante legal de la agencia. */
  const representanteEfectivo = esElRepresentante ? displayName : representante
  // Sólo los campos que ya se revisaron pueden pintarse en rojo: nadie ve un
  // error en un campo que todavía no ha tocado.
  const [revisados, setRevisados] = useState<Record<Campo, boolean>>({
    nombre: false,
    razonSocial: false,
    nit: false,
    representante: false,
  })

  const revision = useMemo(() => {
    const nitRevisado = revisarNit(nit)
    return {
      nombre: revisarNombreCompleto(displayName),
      razonSocial: revisarRazonSocial(agencyName),
      nit: nitRevisado.ok ? null : nitRevisado.mensaje,
      nitBueno: nitRevisado.ok ? nitRevisado : null,
      // Cuando el tilde está puesto, el representante ES el nombre de arriba:
      // pedir que lo revise por separado sería pintar dos veces el mismo error.
      representante: esElRepresentante ? null : revisarNombreCompleto(representante),
    }
  }, [displayName, agencyName, nit, esElRepresentante, representante])

  const errorDe = (campo: Campo) => (revisados[campo] ? revision[campo] : null)

  /*
   * Salir de un campo lo pone en rojo SÓLO si la persona escribió algo en él.
   *
   * El primer campo llega enfocado (autoFocus), así que quien hace clic en el
   * tilde de abajo —lo primero que muchos quieren responder— lo estaba dejando
   * en rojo sin haber escrito nunca. Regañar por un campo que nadie tocó es
   * mal primer contacto, y lo mismo pasaba tabulando de largo.
   *
   * Lo que no cambia: al enviar se revisa todo, tocado o no; y una vez en rojo,
   * el campo se revisa en cada tecla para que el rojo se vaya solo.
   */
  const [tocados, setTocados] = useState<Record<Campo, boolean>>({
    nombre: false,
    razonSocial: false,
    nit: false,
    representante: false,
  })

  const marcarTocado = (campo: Campo) =>
    setTocados((previo) => (previo[campo] ? previo : { ...previo, [campo]: true }))

  const marcarRevisado = (campo: Campo) =>
    setRevisados((previo) =>
      previo[campo] || !tocados[campo] ? previo : { ...previo, [campo]: true },
    )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Cinturón y tirantes junto al botón deshabilitado (Enter puede llegar
    // antes de que el estado deshabilitado se repinte).
    if (isSubmitting) return

    // Al enviar se revisa todo, incluso lo que nadie tocó.
    setRevisados({ nombre: true, razonSocial: true, nit: true, representante: true })
    if (revision.nombre || revision.razonSocial || !revision.nitBueno || revision.representante) return

    const { firstName, lastName } = partirNombre(displayName)
    onSubmit({
      firstName,
      lastName,
      agencyName: agencyName.trim().replace(/\s+/g, ' '),
      // Normalizado: sin puntos y siempre con su dígito de verificación, aunque
      // la persona no lo haya escrito.
      nit: revision.nitBueno.normalizado,
      legalRepresentative: representanteEfectivo.trim().replace(/\s+/g, ' '),
      // Vacío se omite en vez de viajar como '': el back lo tiene opcional y
      // una cadena vacía escribiría '' donde debería quedar null.
      ...(documentoRepresentante.trim() ? { legalDocumentNumber: documentoRepresentante.trim() } : {}),
    })
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        {/* El logotipo de la marca, el mismo del selector y del resto del asistente: el cuadrado azul no es la marca (Nico, 2026-09-07). */}
        <LeasefyLogotype className="h-6 w-auto" title="Leasefy" />
        <SalirDelRegistro />
      </header>

      <main className="flex min-h-[calc(100vh-5rem)] items-start justify-center px-6 pb-16 pt-2 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <Link
            href="/onboarding/seleccionar-rol"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 -ml-2.5 text-body-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            data-testid="volver-a-perfiles"
          >
            <ArrowLeft className="h-4 w-4" weight="bold" aria-hidden />
            Volver
          </Link>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="space-y-5"
            data-testid="owner-name-step-form"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                Antes de comenzar
              </h1>
              <p className="mt-2 text-body-sm text-fg-muted">
                Con esto creamos tu cuenta y la de tu inmobiliaria. Toma menos de un minuto.
              </p>
            </div>

            <FormField id="ownerFullName" required invalid={!!errorDe('nombre')}>
              <FormLabel>Tu nombre completo</FormLabel>
              <FormControl>
                <Input
                  id="ownerFullName"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  placeholder="Ej: Ana María Pérez"
                  value={displayName}
                  invalid={!!errorDe('nombre')}
                  onBlur={() => marcarRevisado('nombre')}
                  onChange={(event) => {
                      marcarTocado('nombre')
                      setDisplayName(event.target.value)
                    }}
                />
              </FormControl>
              {errorDe('nombre') ? (
                <FormError>{errorDe('nombre')}</FormError>
              ) : (
                <FormHint>
                  Como aparece en tu documento de identidad. Quedarás como administrador de la cuenta.
                </FormHint>
              )}
            </FormField>

            {/*
              El dueño y quien se registra no siempre son la misma persona: un
              contador o un asesor puede crear la cuenta de la inmobiliaria de
              otro. Antes esto se pedía en un solo campo y el correo de quien se
              registraba quedaba atado al nombre del dueño.
              El tilde cubre el caso común sin obligar a escribir dos veces.
            */}
            <label className="-mt-2 flex items-start gap-2 text-body-sm text-fg-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                checked={esElRepresentante}
                onChange={(event) => {
                  setEsElRepresentante(event.target.checked)
                  if (event.target.checked) setRepresentante('')
                }}
              />
              <span>Soy el representante legal de la inmobiliaria</span>
            </label>

            {!esElRepresentante && (
              <FormField
                id="legalRepresentative"
                required
                invalid={!!errorDe('representante')}
              >
                <FormLabel>Representante legal</FormLabel>
                <FormControl>
                  <Input
                    id="legalRepresentative"
                    type="text"
                    autoComplete="off"
                    placeholder="Ej: Roberto Gómez Díaz"
                    value={representante}
                    invalid={!!errorDe('representante')}
                    onBlur={() => marcarRevisado('representante')}
                    onChange={(event) => {
                      marcarTocado('representante')
                      setRepresentante(event.target.value)
                    }}
                  />
                </FormControl>
                {errorDe('representante') ? (
                  <FormError>{errorDe('representante')}</FormError>
                ) : (
                  <FormHint>Nombre de quien figura como representante legal en el RUT.</FormHint>
                )}
              </FormField>
            )}

            {!esElRepresentante && (
              <FormField id="legalDocumentNumber">
                <FormLabel>Documento del representante legal</FormLabel>
                <FormControl>
                  <Input
                    id="legalDocumentNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ej: 80123456"
                    value={documentoRepresentante}
                    onChange={(event) => setDocumentoRepresentante(event.target.value)}
                  />
                </FormControl>
                <FormHint>Opcional. Puedes completarlo después en Configuración.</FormHint>
              </FormField>
            )}

            <FormField id="agencyName" required invalid={!!errorDe('razonSocial')}>
              <FormLabel>Razón social</FormLabel>
              <FormControl>
                <Input
                  id="agencyName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Ej: Inmobiliaria Andes SAS"
                  value={agencyName}
                  invalid={!!errorDe('razonSocial')}
                  onBlur={() => marcarRevisado('razonSocial')}
                  onChange={(event) => {
                      marcarTocado('razonSocial')
                      setAgencyName(event.target.value)
                    }}
                />
              </FormControl>
              {errorDe('razonSocial') ? (
                <FormError>{errorDe('razonSocial')}</FormError>
              ) : (
                <FormHint>El nombre legal, como está en el RUT.</FormHint>
              )}
            </FormField>

            <FormField id="agencyNit" required invalid={!!errorDe('nit')}>
              <FormLabel>NIT</FormLabel>
              <FormControl>
                <Input
                  id="agencyNit"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className="font-mono tabular-nums"
                  placeholder="Ej: 900123456-8"
                  maxLength={LARGO_MAXIMO_AL_ESCRIBIR}
                  value={nit}
                  invalid={!!errorDe('nit')}
                  valid={revisados.nit && !!revision.nitBueno}
                  onBlur={() => marcarRevisado('nit')}
                  // El guion lo pone el campo; la persona sólo teclea números y
                  // no puede pasarse del largo (ver `formatearNitAlEscribir`).
                  onChange={(event) => {
                    marcarTocado('nit')
                    setNit(formatearNitAlEscribir(event.target.value))
                  }}
                />
              </FormControl>
              {errorDe('nit') ? (
                <FormError>{errorDe('nit')}</FormError>
              ) : revision.nitBueno && revisados.nit ? (
                <FormHint className="flex items-center gap-1.5 text-success">
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" weight="fill" aria-hidden />
                  <span className="font-mono tabular-nums">{revision.nitBueno.bonito}</span>
                </FormHint>
              ) : (
                <FormHint>9 dígitos en una empresa; si es tu cédula, escríbela tal cual (de 6 a 10). El dígito de verificación se pone solo y, si no lo sabes, lo calculamos.</FormHint>
              )}
            </FormField>

            <Button type="submit" disabled={isSubmitting} hideArrow size="lg" className="w-full">
              {isSubmitting ? (
                <>
                  <Spinner size="xs" variant="current" />
                  Creando tu cuenta...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" weight="bold" aria-hidden />
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
