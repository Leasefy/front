'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SignIn } from '@phosphor-icons/react'
import { FormField, FormLabel, FormControl, FormError, FormHint } from '@leasefy/cadence'
import { Input } from '@/components/ui/input'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'
import { useAuth } from '@/lib/auth/use-auth'
import { useIntentosDeAvanzar } from './intento-de-avanzar'

export function StepTenantWelcome() {
  const { draft, updateDraft } = useTenantOnboarding()
  const { user } = useAuth()
  const intentos = useIntentosDeAvanzar()
  const nombreRef = useRef<HTMLInputElement>(null)

  // The document number is immutable once set on the backend profile —
  // changes go through Leasefy support (the backend enforces this too).
  const rutLocked = user?.profileSource === 'backend' && !!user.rut

  // Set WhatsApp as default contact preference
  useEffect(() => {
    if (!draft.preferredContact) {
      updateDraft({ preferredContact: 'whatsapp' })
    }
  }, [draft.preferredContact, updateDraft])

  /*
   * El aviso «Ingresa tu nombre para continuar» ya no es un bloque amarillo
   * fijo desde que se abre el paso (se sentía a error sin haber hecho nada,
   * Nico 30-09). Sale en el campo, con el estilo de error de la casa, cuando
   * corresponde: al intentar «Continuar» sin nombre, o al dejar el campo vacío
   * después de haber escrito. La regla es la de siempre (`isStepValid(1)`).
   */
  const nombreValido = !!draft.displayName && draft.displayName.trim().length > 0
  const [nombreEscrito, setNombreEscrito] = useState(false)
  const [nombreRevisado, setNombreRevisado] = useState(false)
  const errorDelNombre = !nombreValido && (intentos > 0 || nombreRevisado)

  // Cada intento fallido lleva el foco al campo que falta.
  useEffect(() => {
    if (intentos > 0 && !nombreValido) nombreRef.current?.focus()
    // Sólo al intentar: no robar el foco mientras la persona escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentos])

  return (
    <div className="space-y-5">
      {/* Name */}
      <FormField id="displayName" required invalid={errorDelNombre}>
        <FormLabel>¿Cómo te llamas?</FormLabel>
        <FormControl>
          <Input
            ref={nombreRef}
            type="text"
            autoComplete="name"
            value={draft.displayName || ''}
            onChange={(e) => {
              setNombreEscrito(true)
              updateDraft({ displayName: e.target.value })
            }}
            // Pasar por el campo sin escribir no es un error; salir de él
            // después de escribir, sí cuenta como revisado.
            onBlur={() => {
              if (nombreEscrito) setNombreRevisado(true)
            }}
            placeholder="Tu nombre completo"
          />
        </FormControl>
        <FormError>Ingresa tu nombre para continuar</FormError>
      </FormField>

      {/* CC */}
      <FormField id="rut" disabled={rutLocked}>
        <FormLabel>Cédula de Ciudadanía</FormLabel>
        <FormControl>
          <Input
            type="text"
            inputMode="numeric"
            value={draft.rut || ''}
            onChange={(e) => updateDraft({ rut: e.target.value })}
            placeholder="Ej: 1090525663"
            disabled={rutLocked}
          />
        </FormControl>
        {rutLocked && (
          <FormHint>Para modificar tu número de documento, contacta al soporte de Leasefy.</FormHint>
        )}
      </FormField>

      {/* Phone */}
      <FormField id="phone">
        <FormLabel>Tu número de teléfono</FormLabel>
        <FormControl>
          <Input
            type="tel"
            autoComplete="tel"
            value={draft.phone || ''}
            onChange={(e) => updateDraft({ phone: e.target.value })}
            placeholder="+57 300 123 4567"
          />
        </FormControl>
        <FormHint>Para que propietarios puedan contactarte sobre tus aplicaciones</FormHint>
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
