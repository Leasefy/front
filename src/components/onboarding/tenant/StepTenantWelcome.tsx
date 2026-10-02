'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SignIn } from '@phosphor-icons/react'
import { FormField, FormLabel, FormControl, FormError, FormHint } from '@leasefy/cadence'
import { Input } from '@/components/ui/input'
import { PhoneField } from '@/components/ui/phone-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import { useAuth } from '@/lib/auth/use-auth'
import { recortarAlPais } from '@/lib/phone/countries'
import {
  TIPOS_DE_DOCUMENTO_DEL_INQUILINO,
  TIPO_DE_DOCUMENTO_POR_DEFECTO,
  esTipoDeDocumentoDelInquilino,
  revisarDatosDelInquilino,
  type ErroresDelInquilino,
} from '@/lib/onboarding/datos-del-inquilino'
import { useIntentosDeAvanzar } from './intento-de-avanzar'

type Campo = keyof ErroresDelInquilino

export function StepTenantWelcome() {
  const { draft, updateDraft } = useTenantOnboarding()
  const { user } = useAuth()
  const intentos = useIntentosDeAvanzar()
  const nombreRef = useRef<HTMLInputElement>(null)
  const documentoRef = useRef<HTMLInputElement>(null)
  const telefonoRef = useRef<HTMLDivElement>(null)

  // The document number is immutable once set on the backend profile —
  // changes go through Leasefy support (the backend enforces this too).
  const rutLocked = user?.profileSource === 'backend' && !!user.rut

  const tipo = esTipoDeDocumentoDelInquilino(draft.documentType)
    ? draft.documentType
    : TIPO_DE_DOCUMENTO_POR_DEFECTO
  const ejemplo = TIPOS_DE_DOCUMENTO_DEL_INQUILINO.find((t) => t.value === tipo)?.ejemplo

  // Set WhatsApp as default contact preference
  useEffect(() => {
    if (!draft.preferredContact) {
      updateDraft({ preferredContact: 'whatsapp' })
    }
  }, [draft.preferredContact, updateDraft])

  /*
   * Los errores salen en el campo, con el estilo de la casa, cuando
   * corresponde: al intentar «Continuar» con algo mal, o al salir de un campo
   * después de haber escrito en él. Pasar por un campo sin escribir no es un
   * error (Nico 30-09: un aviso fijo desde que se abre «se siente a error sin
   * haber hecho nada»). Las reglas son las de `isStepValid(1)`.
   */
  const errores = revisarDatosDelInquilino(draft, { documentoBloqueado: rutLocked })
  const [escritos, setEscritos] = useState<Partial<Record<Campo, boolean>>>({})
  const [revisados, setRevisados] = useState<Partial<Record<Campo, boolean>>>({})
  const errorDe = (campo: Campo) =>
    intentos > 0 || revisados[campo] ? errores[campo] : undefined
  const escribio = (campo: Campo) => setEscritos((p) => (p[campo] ? p : { ...p, [campo]: true }))
  const revisar = (campo: Campo) => {
    if (escritos[campo]) setRevisados((p) => (p[campo] ? p : { ...p, [campo]: true }))
  }

  // Cada intento fallido lleva el foco al primer campo que falta.
  useEffect(() => {
    if (intentos === 0) return
    if (errores.nombre) nombreRef.current?.focus()
    else if (errores.documento) documentoRef.current?.focus()
    else if (errores.telefono) telefonoRef.current?.querySelector('input')?.focus()
    // Sólo al intentar: no robar el foco mientras la persona escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentos])

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <FormField id="displayName" required invalid={!!errorDe('nombre')}>
        <FormLabel>¿Cómo te llamas?</FormLabel>
        <FormControl>
          <Input
            ref={nombreRef}
            type="text"
            autoComplete="name"
            value={draft.displayName || ''}
            onChange={(e) => {
              escribio('nombre')
              updateDraft({ displayName: e.target.value })
            }}
            onBlur={() => revisar('nombre')}
            placeholder="Tu nombre completo"
          />
        </FormControl>
        <FormError>{errorDe('nombre')}</FormError>
      </FormField>

      {/* Documento: tipo + número, como en el resto de la plataforma. */}
      <FormField id="rut" required disabled={rutLocked} invalid={!!errorDe('documento')}>
        <FormLabel>Documento de identidad</FormLabel>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <Select
            value={tipo}
            onValueChange={(v) => {
              if (esTipoDeDocumentoDelInquilino(v)) updateDraft({ documentType: v })
            }}
            disabled={rutLocked}
          >
            <SelectTrigger aria-label="Tipo de documento" data-testid="tipo-de-documento-inquilino">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_DE_DOCUMENTO_DEL_INQUILINO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormControl>
            <Input
              ref={documentoRef}
              type="text"
              inputMode={tipo === 'PASSPORT' ? 'text' : 'numeric'}
              autoComplete="off"
              value={draft.rut || ''}
              onChange={(e) => {
                escribio('documento')
                updateDraft({ rut: e.target.value })
              }}
              onBlur={() => revisar('documento')}
              placeholder={ejemplo}
              disabled={rutLocked}
              aria-label="Número de documento"
            />
          </FormControl>
        </div>
        {rutLocked ? (
          <FormHint>Para modificar tu número de documento, contacta al soporte de Leasefy.</FormHint>
        ) : null}
        <FormError>{errorDe('documento')}</FormError>
      </FormField>

      {/* Celular: indicativo, largo y validación del país (`PhoneField`). */}
      <FormField id="phone" required invalid={!!errorDe('telefono')}>
        <FormLabel>Tu celular</FormLabel>
        <div ref={telefonoRef} onBlur={() => revisar('telefono')}>
          <PhoneField
            id="phone"
            value={recortarAlPais(draft.phone || '')}
            onChange={(nacional) => {
              escribio('telefono')
              updateDraft({ phone: nacional })
            }}
            invalid={!!errorDe('telefono')}
          />
        </div>
        <FormHint>Para que los propietarios puedan contactarte sobre tus aplicaciones.</FormHint>
        <FormError>{errorDe('telefono')}</FormError>
      </FormField>

      {/* Already have account */}
      <div className="border-t border-border-faint pt-4">
        {/* 🔴 22-09: decía `/auth/login?redirect=/inquilino`, y estaba mal dos
            veces. `/auth/login` NO EXISTE —la pantalla es `/auth`—, así que
            «¿Ya tienes cuenta? Inicia sesión» llevaba a un 404. Y el parámetro
            es `returnUrl`: nadie lee `redirect`, así que aun llegando, después
            de entrar no volvía al portal del inquilino.
            El mismo error ya se había arreglado en `FalloDeCarga.tsx`; quedó
            el comentario y no se barrió el resto. */}
        <Link
          href={`/auth?returnUrl=${encodeURIComponent('/inquilino')}`}
          className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full px-3 py-2 text-body-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <SignIn className="h-4 w-4" aria-hidden />
          ¿Ya tienes cuenta? <span className="font-medium text-primary">Inicia sesión</span>
        </Link>
      </div>
    </div>
  )
}
