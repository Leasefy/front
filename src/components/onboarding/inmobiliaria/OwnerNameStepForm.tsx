'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { FormField, FormLabel, FormControl, FormError, FormHint } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { LeasefyLogo } from '@/components/brand'
import { SalirDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { revisarNit } from '@/lib/onboarding/nit'
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
  valoresIniciales?: { nombreCompleto?: string; razonSocial?: string; nit?: string }
}

type Campo = 'nombre' | 'razonSocial' | 'nit'

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
  // Sólo los campos que ya se revisaron pueden pintarse en rojo: nadie ve un
  // error en un campo que todavía no ha tocado.
  const [revisados, setRevisados] = useState<Record<Campo, boolean>>({
    nombre: false,
    razonSocial: false,
    nit: false,
  })

  const revision = useMemo(() => {
    const nitRevisado = revisarNit(nit)
    return {
      nombre: revisarNombreCompleto(displayName),
      razonSocial: revisarRazonSocial(agencyName),
      nit: nitRevisado.ok ? null : nitRevisado.mensaje,
      nitBueno: nitRevisado.ok ? nitRevisado : null,
    }
  }, [displayName, agencyName, nit])

  const errorDe = (campo: Campo) => (revisados[campo] ? revision[campo] : null)

  const marcarRevisado = (campo: Campo) =>
    setRevisados((previo) => (previo[campo] ? previo : { ...previo, [campo]: true }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Cinturón y tirantes junto al botón deshabilitado (Enter puede llegar
    // antes de que el estado deshabilitado se repinte).
    if (isSubmitting) return

    // Al enviar se revisa todo, incluso lo que nadie tocó.
    setRevisados({ nombre: true, razonSocial: true, nit: true })
    if (revision.nombre || revision.razonSocial || !revision.nitBueno) return

    const { firstName, lastName } = partirNombre(displayName)
    onSubmit({
      firstName,
      lastName,
      agencyName: agencyName.trim().replace(/\s+/g, ' '),
      // Normalizado: sin puntos y siempre con su dígito de verificación, aunque
      // la persona no lo haya escrito.
      nit: revision.nitBueno.normalizado,
    })
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <LeasefyLogo className="h-6 w-auto" />
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
              <FormLabel>Nombre completo</FormLabel>
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
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </FormControl>
              {errorDe('nombre') ? (
                <FormError>{errorDe('nombre')}</FormError>
              ) : (
                <FormHint>Como aparece en tu documento.</FormHint>
              )}
            </FormField>

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
                  onChange={(event) => setAgencyName(event.target.value)}
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
                  value={nit}
                  invalid={!!errorDe('nit')}
                  valid={revisados.nit && !!revision.nitBueno}
                  onBlur={() => marcarRevisado('nit')}
                  onChange={(event) => setNit(event.target.value)}
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
                <FormHint>9 dígitos y el dígito de verificación. Si no lo sabes, lo calculamos.</FormHint>
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
