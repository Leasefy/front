'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { FormField, FormLabel, FormControl, FormError, FormHint } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
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
  }
}

type Campo = 'nombre' | 'razonSocial' | 'nit' | 'representante'

/**
 * El campo del glow-up de /auth (`AuthInput`): en reposo un relleno apenas
 * gris y sin filete; al enfocar, blanco con el azul de la marca. Con error o
 * verificado el borde lo pinta el DS, así que ahí sólo se pone el fondo blanco.
 */
function claseDeCampo(conEstado: boolean, extra?: string) {
  return cn(
    'h-12',
    conEstado
      ? 'bg-surface'
      : 'border-transparent bg-surface-muted/70 hover:border-border focus-visible:bg-surface',
    extra,
  )
}

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
 *
 * ── Dónde vive (Nico, 2026-09-30) ──────────────────────────────────────────
 * «Se siente como desconectado»: era una página aparte, con su propio logo y
 * su «Volver». Ahora es sólo el formulario y lo monta `PanelAntesDeComenzar`
 * a la derecha de las tarjetas de «Selecciona tu perfil» (ver
 * `components/onboarding/perfil/`). La cabecera, la salida y el «cambiar de
 * perfil» son del panel; acá queda lo que se llena.
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
      representante: esElRepresentante ? null : revisarNombreCompleto(representante, { deQuien: 'representante' }),
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
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-5"
      data-testid="owner-name-step-form"
    >
      {/* El título como los de /auth: peso medio, sin negrita, tracking cerrado. El aire
          a la derecha es el de la ✕ del panel, que va en esta misma fila. */}
      <div className="pb-1 lg:pr-12">
        <h1 className="text-balance font-heading text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
          Antes de comenzar
        </h1>
        <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg-subtle">
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
            className={claseDeCampo(!!errorDe('nombre'))}
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
      <label className="-mt-1 flex cursor-pointer select-none items-start gap-2.5 text-body-sm text-fg-muted">
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
              className={claseDeCampo(!!errorDe('representante'))}
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


      <FormField id="agencyName" required invalid={!!errorDe('razonSocial')}>
        <FormLabel>Razón social</FormLabel>
        <FormControl>
          <Input
            id="agencyName"
            type="text"
            autoComplete="organization"
            placeholder="Ej: Inmobiliaria Andes SAS"
            className={claseDeCampo(!!errorDe('razonSocial'))}
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
            className={claseDeCampo(
              !!errorDe('nit') || (revisados.nit && !!revision.nitBueno),
              'font-mono tabular-nums',
            )}
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
        {/* Sin repetir el número entero «mejorado» (Nico, 30-09: «pone un
            número en el input y el helper pone otra cosa»), pero SÍ la ayuda
            que servía: si no escribió el dígito de verificación, se le dice
            cuál es, en neutro y sin ✓. */}
        {errorDe('nit') ? (
          <FormError>{errorDe('nit')}</FormError>
        ) : revisados.nit && revision.nitBueno && !revision.nitBueno.traiaDv ? (
          <FormHint data-testid="nit-digito-sugerido">
            Su dígito de verificación es{' '}
            <span className="font-mono font-medium tabular-nums text-fg">{revision.nitBueno.dv}</span>: lo
            agregamos al guardar.
          </FormHint>
        ) : (
          <FormHint>9 dígitos en una empresa; si es tu cédula, escríbela tal cual (de 6 a 10). El dígito de verificación se pone solo y, si no lo sabes, lo calculamos.</FormHint>
        )}
      </FormField>

      <Button type="submit" disabled={isSubmitting} hideArrow className="w-full">
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
  )
}
