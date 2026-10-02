'use client'

/**
 * PostularButton — el botón de postularse, con el camino adentro.
 *
 * Acá se resuelve el debate de la reunión. Víctor tenía razón en el riesgo
 * ("el man cree que ya quedó postulado") y Nico tenía razón en la solución
 * ("son pasos de ahí atrás"): **el botón se queda y enseña el camino**.
 *
 * Nunca se deshabilita ni se esconde. Si la persona todavía no puede
 * postularse, el clic abre una explicación de qué falta y por qué — un muro se
 * convierte en un escalón. Si ya puede, se comporta exactamente como antes.
 *
 * Aditivo: reemplaza al `<Link href="/aplicar/…">` sin cambiar su resultado
 * para quien ya está aprobado.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useLenis } from '@/components/providers/SmoothScroll'
import { getAccessToken } from '@/lib/api/client'
import { useAprobacion } from '@/lib/hooks/use-aprobacion'
import { useAplicacionParaPropiedad } from '@/lib/hooks/use-aplicacion-propiedad'
import { diasParaVencer, estadoVigencia } from '@/lib/api/aprobacion.service'

/** Por qué no puede postularse todavía. */
export type MotivoBloqueo =
  | 'sin_sesion'
  | 'sin_aprobacion'
  | 'vencida'
  | 'en_proceso'
  | 'rechazado'

interface PostularButtonProps {
  propertyId: string
  /** Canon mensual de la propiedad, para contrastarlo con el tope aprobado. */
  canonCop?: number
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  hideArrow?: boolean
  children?: React.ReactNode
}

export function PostularButton({
  propertyId,
  canonCop,
  className,
  variant,
  hideArrow,
  children = 'Postularme',
}: PostularButtonProps) {
  const { aprobacion, cargando, vigente } = useAprobacion()
  const { activa } = useAplicacionParaPropiedad(propertyId)
  const [abierto, setAbierto] = useState(false)

  /*
   * El token vive en memoria, así que esto sólo se puede mirar en el cliente.
   * Se calcula en un efecto para que el HTML del servidor y el del primer
   * render del cliente coincidan — leerlo durante el render rompe la
   * hidratación en las fichas públicas, que son estáticas.
   */
  const [haySesion, setHaySesion] = useState(true)
  useEffect(() => {
    setHaySesion(Boolean(getAccessToken()))
  }, [])

  const motivo = motivoDeBloqueo({ aprobacion, vigente, canonCop, haySesion })

  // Prioridad sobre todo lo demás: si ya hay una postulación ACTIVA para esta
  // propiedad, no se ofrece re-postular (el back lo rechaza con 409). El CTA
  // lleva a la postulación existente, sin importar el estado de la aprobación.
  if (activa) {
    return (
      <Button asChild className={className} variant={variant} hideArrow={hideArrow}>
        <Link href={`/inquilino/aplicaciones/${activa.id}`}>Ir a mi postulación</Link>
      </Button>
    )
  }

  // Mientras carga se deja pasar: bloquear por una milésima de duda castiga a
  // quien SÍ está aprobado. El wizard de /aplicar valida igual del otro lado.
  if (cargando || motivo === null) {
    return (
      <Button asChild className={className} variant={variant} hideArrow={hideArrow}>
        <Link href={`/aplicar/${propertyId}`}>{children}</Link>
      </Button>
    )
  }

  return (
    <>
      <Button
        className={className}
        variant={variant}
        hideArrow={hideArrow}
        onClick={() => setAbierto(true)}
      >
        {children}
      </Button>
      <AntesDePostularte
        open={abierto}
        onClose={() => setAbierto(false)}
        motivo={motivo}
        propertyId={propertyId}
      />
    </>
  )
}

/** Decide el motivo. `null` = puede postularse, sin fricción. */
export function motivoDeBloqueo({
  aprobacion,
  vigente,
  canonCop,
  haySesion = true,
}: {
  aprobacion: { estado: string; topeAprobadoCop: number | null; vigenteHasta: string | null } | null
  vigente: boolean
  canonCop?: number
  /**
   * ¿Hay sesión abierta? Por defecto `true` para no cambiarle el resultado a
   * quien ya llamaba a esta función sin el dato.
   */
  haySesion?: boolean
}): MotivoBloqueo | null {
  if (!aprobacion) return null
  if (aprobacion.estado === 'en_proceso') return 'en_proceso'
  if (aprobacion.estado === 'rechazado') return 'rechazado'
  /*
   * Sin sesión y sin nada estudiado, «sin_estudio» es una conclusión que no
   * nos consta: puede ser alguien que ya tiene cuenta y aprobación, y sólo
   * está deslogueado. Mandarlo a pagar de nuevo un estudio que ya pagó es el
   * peor error posible de esta pantalla.
   *
   * `sin_sesion` no decide por él: le ofrece las DOS puertas —entrar, o
   * conocer su tope si es la primera vez—. Es lo que se acordó en la reunión
   * del 11-08: «venga, papito, ¿usted tiene cuenta?».
   *
   * Ojo con el orden: si hay respaldo local (se aprobó por un link de
   * WhatsApp, todavía sin cuenta) el estado NO es `sin_estudio`, así que ese
   * camino sigue pasando de largo por acá y puede postularse. Ver
   * `use-aprobacion.ts`.
   */
  if (aprobacion.estado === 'sin_estudio') return haySesion ? 'sin_aprobacion' : 'sin_sesion'
  // Aprobada: solo falta que no esté vencida.
  if (!vigente) return 'vencida'
  /*
   * 🔴 El canon por encima del tope YA NO BLOQUEA (D13, Nico y Juan Camilo,
   * 17-09-2026): «canon mayor al tope asegurable del estudio: la inmobiliaria
   * decide; el tope es sólo informativo». Antes esto devolvía `sobre_tope` y el
   * diálogo mandaba a «Ver las que sí puedo»: la persona nunca llegaba a la
   * inmobiliaria, que es la que decide. El tope se sigue mostrando como dato
   * (el aviso de la ficha, `TopeAprobadoBanner`) y el back tampoco rechaza.
   */
  void canonCop
  return null
}

// ─────────────────────────────────────────────────────────────────────────────

const PASOS = [
  {
    n: '01',
    title: 'Te estudiamos',
    desc: 'Consultamos a todas las aseguradoras con las que trabajamos, no solo a una. Se paga una vez y la respuesta es inmediata.',
  },
  {
    n: '02',
    title: 'Eliges',
    desc: 'Te mostramos las propiedades que van con tu tope aprobado.',
  },
  {
    n: '03',
    title: 'El propietario decide',
    desc: 'Te postulas a las que quieras con la misma aprobación, sin volver a pagar.',
  },
]

export function AntesDePostularte({
  open,
  onClose,
  motivo,
  propertyId,
}: {
  open: boolean
  onClose: () => void
  motivo: MotivoBloqueo
  propertyId: string
}) {
  const lenis = useLenis()
  useEffect(() => {
    if (open) lenis.stop()
    else lenis.start()
    return () => lenis.start()
  }, [open, lenis])

  const copy = COPY[motivo]
  /*
   * Después de entrar, **seguir postulándose** — no volver a la ficha.
   *
   * Esto devolvía a `window.location.pathname`, o sea al inmueble. La persona
   * tocaba «Postularme», la mandábamos a entrar, y al volver aterrizaba en el
   * mismo punto donde había empezado, teniendo que tocar el botón otra vez.
   * Desde afuera se lee como «no pasó nada»: hizo el trámite de entrar y no
   * avanzó un paso.
   *
   * El destino es la acción que pidió, no el lugar donde estaba parada.
   */
  const volverA = `/aplicar/${propertyId}`

  /*
   * T-0132 (owner decision, ledger §2.4): la aprobación ya NUNCA bloquea
   * postularse — el back no vuelve a rechazar con 409 por esto. Todo
   * motivo salvo `sin_sesion` (O-1, fuera de alcance, sin cambios: sin
   * sesión no sabemos si la persona ya tiene cuenta y aprobación) gana una
   * salida para seguir sin este dato.
   */
  const puedeContinuarSinAprobacion = motivo !== 'sin_sesion'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>

        {motivo === 'sin_aprobacion' && (
          <ol className="space-y-3">
            {PASOS.map((p) => (
              <li key={p.n} className="flex gap-3">
                <span className="font-mono tabular-nums text-sm text-primary/50 pt-0.5 shrink-0">
                  {p.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-fg">{p.title}</p>
                  <p className="text-sm text-fg-muted leading-relaxed">{p.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {motivo === 'en_proceso' && (
          <div className="flex items-start gap-2 rounded-lg bg-primary-soft p-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-fg-muted">
              Te avisamos por correo apenas tengamos respuesta.
            </p>
          </div>
        )}

        {/*
          T-0132, contract §3.3: `rechazado` gana una alerta de advertencia
          (probable rechazo) en vez de la nota neutral — es la única de las
          cuatro que SÍ tiene un veredicto desfavorable conocido.
        */}
        {motivo === 'rechazado' && (
          <div
            className="flex items-start gap-2 rounded-lg bg-danger-soft border border-danger/30 p-3"
            data-testid="antes-de-postularte-alerta-rechazo"
          >
            <WarningCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-danger">
              Es probable que no te aprueben: tu última consulta no fue favorable. Aun así, la
              decisión final siempre es de la inmobiliaria y puedes intentarlo.
            </p>
          </div>
        )}

        {/*
          T-0132, contract §3.3 (A-1): nota neutral, SIN alerta — `sin_aprobacion`,
          `vencida` y `en_proceso` se tratan igual que "sin aprobación": la
          inmobiliaria podría rechazar porque no conoce el tope aprobado, pero
          nada acá dice que vaya a pasar.
        */}
        {puedeContinuarSinAprobacion && motivo !== 'rechazado' && (
          <div
            className="rounded-lg bg-surface-muted p-3"
            data-testid="antes-de-postularte-nota-neutral"
          >
            <p className="text-sm text-fg-muted">
              Si te postulas sin esto, la inmobiliaria no sabrá hasta cuánto te respaldamos y
              podría rechazarte por eso.
            </p>
          </div>
        )}

        {/* Apilados a propósito: el diálogo es `max-w-md` y los dos botones en
            fila hacían que el min-content del contenido superara el ancho de la
            caja — se cortaba el texto de los pasos y "Ahora no" quedaba fuera. */}
        <div className="flex flex-col gap-2 pt-1">
          {/*
            T-0132: la salida de "continuar sin conocer mi aprobación" pasa a
            ser la PRIMARIA — el CTA que antes abría el camino (aprobarse) baja
            a secundario. El texto varía solo para `rechazado`, donde "de todas
            formas" reconoce el veredicto en vez de sonar a que no hay uno.
          */}
          {puedeContinuarSinAprobacion && (
            <Button asChild>
              <Link href={volverA}>
                {motivo === 'rechazado'
                  ? 'Postularme de todas formas'
                  : 'Continuar sin conocer mi aprobación'}
              </Link>
            </Button>
          )}
          {/* Sin ArrowRight manual: el Button ya pone su flecha (hideArrow la apaga). */}
          <Button
            asChild
            variant={puedeContinuarSinAprobacion ? 'secondary' : undefined}
            hideArrow={puedeContinuarSinAprobacion}
          >
            <Link href={copy.href}>{copy.cta}</Link>
          </Button>
          {/* La segunda puerta, sólo cuando no hay sesión: quien ya tiene
              cuenta vuelve ACÁ después de entrar, no al panel. Sin el
              returnUrl, postularse costaba encontrar el inmueble otra vez. */}
          {motivo === 'sin_sesion' ? (
            <Button asChild variant="secondary" hideArrow>
              <Link href={`/auth?returnUrl=${encodeURIComponent(volverA)}`}>
                Ya tengo cuenta, entrar
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} hideArrow>
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const COPY: Record<MotivoBloqueo, { title: string; desc: string; cta: string; href: string }> = {
  /*
   * El CTA principal es «conocer el tope», no «crear cuenta»: la cuenta se
   * pre-crea sola con los datos de la aprobación (ver el recorrido en
   * `/aprobacion`), así que pedir un registro antes sería una puerta de más.
   * Quien YA tiene cuenta entra por el enlace secundario del diálogo.
   */
  sin_sesion: {
    title: '¿Ya tienes cuenta en Leasefy?',
    desc: 'Si ya te aprobamos alguna vez, entra y sigues desde donde ibas — no hay que estudiarte de nuevo. Si es tu primera vez, empieza por saber hasta cuánto te respaldan.',
    cta: 'Es mi primera vez',
    href: '/aprobacion',
  },
  sin_aprobacion: {
    title: 'Antes de postularte',
    desc: 'Para postularte necesitas saber hasta cuánto te respaldan las aseguradoras. Son tres pasos y se hace una sola vez.',
    cta: 'Conoce hasta cuánto te arrendamos',
    href: '/aprobacion',
  },
  vencida: {
    title: 'Tu aprobación venció',
    desc: 'Las aseguradoras revisan tu situación cada vez, así que hay que renovarla. Es el mismo proceso de antes.',
    cta: 'Renovar mi aprobación',
    href: '/aprobacion',
  },
  en_proceso: {
    title: 'Estamos consultando a las aseguradoras',
    desc: 'Todavía no tenemos respuesta. En cuanto la tengamos vas a poder postularte a esta y a las demás que vayan con tu tope.',
    cta: 'Ver el estado',
    href: '/inquilino/aprobacion',
  },
  rechazado: {
    title: 'Por ahora no podemos aprobarte',
    desc: 'No es definitivo, y hay salidas: mejorar tu perfil, volver a intentarlo, o que un familiar o amigo se postule por ti.',
    cta: 'Ver qué puedo hacer',
    href: '/inquilino/aprobacion',
  },
}
