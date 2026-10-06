'use client'

/**
 * El estudio de arrendamiento ofrecido como lo que es: algo que AYUDA.
 *
 * 🔴 Nico (04-10-2026): «el estudio es opcional, no es obligatorio». Reemplaza
 * «Antes de postularte», que no dejaba entrar al asistente de /aplicar sin
 * estudio. Ahora la persona se postula igual, por cualquier puerta (con
 * sesión, como invitada o por el enlace de un asesor), y esto le dice —sin
 * frenarla— que con su estudio la inmobiliaria responde más rápido. La
 * inmobiliaria ve la postulación marcada («Sin estudio», «Estudio vencido»…).
 *
 * Va encima del primer paso del asistente; en el último (`compacta`) sólo
 * recuerda cómo la va a ver la inmobiliaria.
 */

import Link from 'next/link'
import { Alert, AlertAction } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import type { OfertaDelEstudio as Oferta } from '@/components/tenant/PostularButton'

const COPY: Record<
  Oferta,
  { titulo: string; texto: string; cta: string; href: string; alEnviar: string }
> = {
  sin_sesion: {
    titulo: 'Tu estudio de arrendamiento te ayuda',
    texto:
      'Puedes postularte sin cuenta y sin estudio. Si ya te estudiamos, entra con tu cuenta: con tu estudio la inmobiliaria responde más rápido.',
    cta: 'Conocer hasta cuánto me respaldan',
    href: '/aprobacion',
    alEnviar: 'Te postulas sin estudio de arrendamiento: la inmobiliaria lo verá así.',
  },
  sin_estudio: {
    titulo: 'Tu estudio de arrendamiento te ayuda',
    texto:
      'No es obligatorio para postularte. Con tu estudio la inmobiliaria responde más rápido: sabe de entrada hasta cuánto te respaldan las aseguradoras.',
    cta: 'Hacer mi estudio',
    href: '/aprobacion',
    alEnviar: 'Te postulas sin estudio de arrendamiento: la inmobiliaria lo verá así.',
  },
  vencido: {
    titulo: 'Tu estudio de arrendamiento venció',
    texto:
      'Puedes postularte igual. Si lo renuevas, la inmobiliaria responde más rápido.',
    cta: 'Renovar mi estudio',
    href: '/aprobacion',
    alEnviar: 'Te postulas con el estudio vencido: la inmobiliaria lo verá así.',
  },
  en_curso: {
    titulo: 'Tu estudio de arrendamiento está en curso',
    texto:
      'Puedes postularte ya. Cuando las aseguradoras respondan, la inmobiliaria verá el resultado en tu postulación.',
    cta: 'Ver el estado',
    href: '/inquilino/aprobacion',
    alEnviar: 'Te postulas con el estudio en curso: la inmobiliaria verá el resultado cuando llegue.',
  },
  sin_respaldo: {
    titulo: 'Con tu estudio de hoy las aseguradoras no te respaldan',
    texto:
      'Puedes postularte igual: la inmobiliaria decide. Si quieres reforzar tu postulación, suma a otra persona (un codeudor).',
    cta: 'Ver qué puedo hacer',
    href: '/inquilino/aprobacion',
    alEnviar: 'La inmobiliaria verá que las aseguradoras no te respaldan con el estudio de hoy.',
  },
}

export function OfertaDelEstudio({
  oferta,
  propertyId,
  compacta = false,
}: {
  oferta: Oferta
  propertyId: string
  /** En el último paso: sólo cómo la va a ver la inmobiliaria. */
  compacta?: boolean
}) {
  const copy = COPY[oferta]
  if (compacta) {
    return (
      <p
        className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-fg-muted"
        data-testid="oferta-del-estudio-al-enviar"
      >
        {copy.alEnviar}
      </p>
    )
  }
  return (
    <Alert variant="info" title={copy.titulo} data-testid="oferta-del-estudio" data-oferta={oferta}>
      {copy.texto}
      <AlertAction className="flex flex-wrap gap-2">
        {oferta === 'sin_sesion' ? (
          <Button asChild size="sm" variant="secondary" hideArrow>
            <Link href={`/auth?returnUrl=${encodeURIComponent(`/aplicar/${propertyId}`)}`}>
              Ya tengo cuenta, entrar
            </Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline" hideArrow>
          <Link href={copy.href}>{copy.cta}</Link>
        </Button>
      </AlertAction>
    </Alert>
  )
}
