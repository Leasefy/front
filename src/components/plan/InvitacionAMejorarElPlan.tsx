'use client'

/**
 * INVITAR A MEJORAR EL PLAN (Nico, 10-10-2026): «construyas todas las opciones
 * de upgrade para el caso de inmobiliarias que están gratuitas, que salgan
 * modales hermosos […] ERP y CRM, piloto automático […] el chat […] tú sabes
 * más». Decisión de Nico: SOLO INVITAN.
 *
 * Reglas (las de su respuesta, tal cual):
 *  - Sólo para la inmobiliaria en el plan gratuito (`isDefault`), y sólo al
 *    administrador, que es quien puede mejorarlo.
 *  - Un modal por función, al entrar a su pantalla.
 *  - «Mejorar mi plan» lleva a /panel/inmobiliaria/upgrade; «Ahora no» lo cierra.
 *  - La misma función no vuelve a salir en 7 días (en este navegador).
 *  - Sin precios, y no cierra NADA de lo que hoy se puede usar.
 */

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowsLeftRight,
  Buildings,
  ChatsCircle,
  CheckCircle,
  PhoneCall,
  Receipt,
  RocketLaunch,
} from '@phosphor-icons/react'
import { enterTransition, Stagger, StaggerItem, usePrefersReducedMotion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface Invitacion {
  clave: string
  rutas: readonly string[]
  icono: React.ElementType
  eyebrow: string
  titulo: string
  subtitulo: string
  beneficios: readonly string[]
}

const P = '/panel/inmobiliaria'

export const INVITACIONES: readonly Invitacion[] = [
  {
    clave: 'gestion',
    rutas: [`${P}/inmuebles`, `${P}/contratos`, `${P}/propietarios`, `${P}/inquilinos`, `${P}/pipeline`, `${P}/postulaciones`],
    icono: Buildings,
    eyebrow: 'ERP y CRM inmobiliario',
    titulo: 'Tu inmobiliaria completa, en un solo lugar',
    subtitulo:
      'Todavía no tienes Leasefy para gestionar tus inmuebles. Con el plan de Leasefy, el ERP y el CRM trabajan juntos: del primer interesado al último pago.',
    beneficios: [
      'Inmuebles, propietarios, inquilinos y contratos conectados',
      'Interesados, visitas y postulaciones en el mismo embudo',
      'Cartera, recaudo y giros que se cuadran solos',
    ],
  },
  {
    clave: 'piloto',
    rutas: [`${P}/piloto`],
    icono: RocketLaunch,
    eyebrow: 'Piloto automático',
    titulo: 'Tu inmobiliaria puede ir sola',
    subtitulo:
      'El piloto automático cobra, concilia, factura y gira sin depender de nadie. Tú solo apruebas lo importante, y el equipo deja de apagar incendios.',
    beneficios: [
      'Menos horas de oficina en tareas que se repiten cada mes',
      'Nada se queda sin hacer por vacaciones o rotación',
      'Cada paso queda registrado y lo puedes deshacer',
    ],
  },
  {
    clave: 'chat',
    rutas: [`${P}/beta`],
    icono: ChatsCircle,
    eyebrow: 'Chat de tu inmobiliaria',
    titulo: 'Pregúntale lo que quieras a tu inmobiliaria',
    subtitulo:
      'Cuánto te deben, quién está en mora, qué contratos se vencen este mes: el chat te lo responde al instante, con las cifras de tu cartera.',
    beneficios: [
      'Respuestas con tus datos, no con promedios',
      'Desde el celular o el computador, cuando lo necesites',
      'Y si hace falta, lo hace por ti',
    ],
  },
  {
    clave: 'cobranza',
    rutas: [`${P}/pagos/cobranza`],
    icono: PhoneCall,
    eyebrow: 'Laura, la cobranza',
    titulo: 'Laura cobra por ti',
    subtitulo:
      'Laura llama y escribe a los inquilinos en mora, negocia acuerdos de pago y te avisa cuando pagan. Tu equipo se dedica a lo que no se puede automatizar.',
    beneficios: [
      'Llamadas y WhatsApp con el tono de tu inmobiliaria',
      'Acuerdos de pago con fecha y seguimiento',
      'Respeta la Ley 2300: horarios y canales autorizados',
    ],
  },
  {
    clave: 'recaudo',
    rutas: [`${P}/pagos/recaudo`, `${P}/pagos/dispersiones`, `${P}/pagos/liquidaciones`, `${P}/conciliacion`],
    icono: ArrowsLeftRight,
    eyebrow: 'Recaudo y giros',
    titulo: 'La plata entra y sale sola',
    subtitulo: 'Recaudo en línea, conciliación con el banco y giros a los propietarios, sin hojas de cálculo.',
    beneficios: [
      'El inquilino paga en línea y el recibo sale solo',
      'El extracto del banco se concilia solo',
      'Los giros salen en el archivo de tu banco',
    ],
  },
  {
    clave: 'facturacion',
    rutas: [`${P}/facturacion`, `${P}/contabilidad`],
    icono: Receipt,
    eyebrow: 'Facturación y contabilidad',
    titulo: 'Factura y lleva la contabilidad sin salir de Leasefy',
    subtitulo: 'Facturación electrónica ante la DIAN, asientos automáticos y los informes del mes, al día.',
    beneficios: [
      'Facturas por mandato y de comisión, a tiempo',
      'Cada pago deja su asiento contable',
      'Exógena y certificados de retención listos',
    ],
  },
]

const DIAS_ENTRE_INVITACIONES = 7
const MS_POR_DIA = 24 * 60 * 60 * 1000
const llave = (clave: string) => `leasefy-invitacion-plan:${clave}`

/** La invitación de la pantalla en la que se está, o ninguna. Pura. */
export function invitacionDeLaRuta(ruta: string | null): Invitacion | null {
  if (!ruta) return null
  return INVITACIONES.find((i) => i.rutas.some((r) => ruta === r || ruta.startsWith(`${r}/`))) ?? null
}

/** ¿Ya se mostró en los últimos 7 días? Sin `localStorage` (privado, bloqueado): se muestra. */
export function yaSeMostro(clave: string, ahora = Date.now()): boolean {
  try {
    const vez = Number(window.localStorage.getItem(llave(clave)))
    return Number.isFinite(vez) && vez > 0 && ahora - vez < DIAS_ENTRE_INVITACIONES * MS_POR_DIA
  } catch {
    return false
  }
}

function marcarComoMostrada(clave: string) {
  try {
    window.localStorage.setItem(llave(clave), String(Date.now()))
  } catch {
    /* sin almacenamiento: puede volver a salir, no rompe nada */
  }
}

export function InvitacionAMejorarElPlan({ activa }: { activa: boolean }) {
  const ruta = usePathname()
  const router = useRouter()
  const reducido = usePrefersReducedMotion()
  const [abierta, setAbierta] = useState<Invitacion | null>(null)

  useEffect(() => {
    if (!activa) return
    const inv = invitacionDeLaRuta(ruta)
    if (!inv || yaSeMostro(inv.clave)) return
    // Un respiro: que la pantalla cargue antes de invitar.
    const t = window.setTimeout(() => {
      marcarComoMostrada(inv.clave)
      setAbierta(inv)
    }, 1200)
    return () => window.clearTimeout(t)
  }, [activa, ruta])

  if (!abierta) return null
  const Icono = abierta.icono

  return (
    <Dialog open onOpenChange={(o) => !o && setAbierta(null)}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid={`invitacion-plan-${abierta.clave}`}>
        <div className="grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-primary-soft px-6 py-12">
            {/* Anillos suaves detrás del ícono: le dan profundidad sin degradados. */}
            {[18, 13, 8].map((rem, i) => (
              <motion.span
                key={rem}
                aria-hidden="true"
                className="absolute rounded-full border border-primary/15"
                style={{ width: `${rem}rem`, height: `${rem}rem` }}
                initial={{ opacity: 0, scale: reducido ? 1 : 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...enterTransition(reducido), delay: reducido ? 0 : 0.08 * (3 - i) }}
              />
            ))}
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8, rotate: -6 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0, y: [0, -6, 0] }}
              transition={
                reducido
                  ? enterTransition(true)
                  : { ...enterTransition(false), y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }
              }
              className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-surface shadow-lg ring-1 ring-primary/10"
            >
              <Icono className="h-12 w-12 text-primary" weight="duotone" aria-hidden="true" />
            </motion.div>
          </div>
          <div className="space-y-5 p-6 md:p-8">
            <DialogHeader className="space-y-2 border-0 p-0 text-left">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">{abierta.eyebrow}</p>
              <DialogTitle className="text-h3 text-fg">{abierta.titulo}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">{abierta.subtitulo}</DialogDescription>
            </DialogHeader>
            <Stagger className="space-y-2.5">
              {abierta.beneficios.map((b) => (
                <StaggerItem key={b} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />
                  <span className="text-sm text-fg">{b}</span>
                </StaggerItem>
              ))}
            </Stagger>
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" hideArrow onClick={() => setAbierta(null)} data-testid="invitacion-ahora-no">
                Ahora no
              </Button>
              <Button
                onClick={() => {
                  setAbierta(null)
                  router.push('/panel/inmobiliaria/upgrade')
                }}
                data-testid="invitacion-mejorar"
              >
                Mejorar mi plan
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
