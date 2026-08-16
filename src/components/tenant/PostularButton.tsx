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
import { Info } from '@phosphor-icons/react'

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
import { cabeEnTope, diasParaVencer, estadoVigencia } from '@/lib/api/aprobacion.service'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Por qué no puede postularse todavía. */
export type MotivoBloqueo =
  | 'sin_sesion'
  | 'sin_aprobacion'
  | 'vencida'
  | 'sobre_tope'
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
        canonCop={canonCop}
        topeCop={aprobacion?.topeAprobadoCop ?? null}
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
  // Aprobada: solo falta que no esté vencida y que el canon entre.
  if (!vigente) return 'vencida'
  if (typeof canonCop === 'number') {
    // `null` (no sabemos el tope) NO bloquea: no se le niega algo a alguien
    // por un dato que todavía no tenemos.
    if (cabeEnTope(canonCop, aprobacion.topeAprobadoCop) === false) return 'sobre_tope'
  }
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
    desc: 'Te postulas a las que quieras con el mismo estudio, sin volver a pagar.',
  },
]

function AntesDePostularte({
  open,
  onClose,
  motivo,
  canonCop,
  topeCop,
  propertyId,
}: {
  open: boolean
  onClose: () => void
  motivo: MotivoBloqueo
  canonCop?: number
  topeCop: number | null
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>

        {motivo === 'sobre_tope' && topeCop !== null && (
          <div className="rounded-lg bg-surface-muted p-4 space-y-2">
            <Fila label="Canon de esta propiedad" valor={canonCop} destacado />
            <Fila label="Tu tope aprobado" valor={topeCop} />
          </div>
        )}

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

        {/* Apilados a propósito: el diálogo es `max-w-md` y los dos botones en
            fila hacían que el min-content del contenido superara el ancho de la
            caja — se cortaba el texto de los pasos y "Ahora no" quedaba fuera. */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Sin ArrowRight manual: el Button ya pone su flecha (hideArrow la apaga). */}
          <Button asChild>
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

function Fila({ label, valor, destacado }: { label: string; valor?: number | null; destacado?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-fg-muted">{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums text-sm',
          destacado ? 'text-fg font-medium' : 'text-fg-muted',
        )}
      >
        {typeof valor === 'number' ? formatCurrency(valor) : '—'}
      </span>
    </div>
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
    title: '¿Ya tenés cuenta en Leasefy?',
    desc: 'Si ya te aprobamos alguna vez, entrá y seguís desde donde ibas — no hay que estudiarte de nuevo. Si es tu primera vez, empezá por saber hasta cuánto te respaldan.',
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
  sobre_tope: {
    title: 'Esta propiedad está por encima de tu tope',
    desc: 'Puedes postularte a cualquier propiedad hasta tu tope aprobado. Esta se pasa, pero hay otras que sí van contigo.',
    cta: 'Ver las que sí puedo',
    href: '/inquilino/para-ti',
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
