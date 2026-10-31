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
 *  - «Mejorar mi plan» abre NUESTRO WhatsApp con el mensaje ya escrito (Nico,
 *    20-10-2026: «a todas las del plan gratis»; antes llevaba a
 *    /panel/inmobiliaria/upgrade, que sólo ofrece el correo). A la que vino del
 *    marketplace le sale el mensaje de ventas; «Ahora no» lo cierra.
 *  - La misma función no vuelve a salir en 7 días (en este navegador).
 *  - Sin precios, y no cierra NADA de lo que hoy se puede usar.
 */

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { NombreIlustracion } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  BeneficiosEn3D,
  EscenaDeMarca,
  FOTOS_DE_LA_ESCENA,
  PlacaDe3D,
  VentanaDelProducto,
} from '@/components/conversion/EscenaDeMarca'
import { useAuth } from '@/lib/auth/use-auth'
import { enlaceParaMejorarElPlan } from '@/lib/venta/whatsapp-de-leasefy'

export interface Invitacion {
  clave: string
  rutas: readonly string[]
  /** El 3D de la función, montado en la esquina de la pantalla. */
  ilustracion: NombreIlustracion
  /** La pantalla REAL de esa parte (la captura de su demo) que asoma sobre la foto. */
  captura: { src: string; alt: string }
  eyebrow: string
  titulo: string
  subtitulo: string
  beneficios: readonly string[]
}

const P = '/panel/inmobiliaria'
const C = '/landing-v2/producto'

export const INVITACIONES: readonly Invitacion[] = [
  {
    clave: 'gestion',
    rutas: [`${P}/inmuebles`, `${P}/contratos`, `${P}/propietarios`, `${P}/inquilinos`, `${P}/pipeline`, `${P}/postulaciones`],
    ilustracion: 'llaves',
    captura: { src: `${C}/erp-tablero.webp`, alt: 'El tablero de la operación: recaudo, cartera y giros del mes' },
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
    ilustracion: 'novedad_cohete',
    captura: { src: `${C}/erp-recaudo.webp`, alt: 'El recaudo del mes que se aplica solo' },
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
    ilustracion: 'mensajes',
    captura: { src: `${C}/home-chat.webp`, alt: 'El chat que responde con las cifras de tu cartera' },
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
    ilustracion: 'sobre_cobro',
    captura: { src: `${C}/cob-resumen.webp`, alt: 'El resumen de la cobranza del mes' },
    eyebrow: 'Cobranza con IA',
    titulo: 'Cobramos por ti con IA',
    subtitulo:
      'Nuestra IA llama y escribe a los inquilinos en mora, negocia acuerdos de pago y te avisa cuando pagan. Tu equipo se dedica a lo que no se puede automatizar.',
    beneficios: [
      'Llamadas y WhatsApp con el tono de tu inmobiliaria',
      'Acuerdos de pago con fecha y seguimiento',
      'Respeta la Ley 2300: horarios y canales autorizados',
    ],
  },
  {
    clave: 'recaudo',
    rutas: [`${P}/pagos/recaudo`, `${P}/pagos/dispersiones`, `${P}/pagos/liquidaciones`, `${P}/conciliacion`],
    ilustracion: 'banco',
    captura: { src: `${C}/erp-dispersiones.webp`, alt: 'Los giros a los propietarios con su liquidación' },
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
    ilustracion: 'factura',
    captura: { src: `${C}/demo-facturacion.webp`, alt: 'La facturación electrónica con datos de ejemplo' },
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
  const { agency, user } = useAuth()
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
  // Cada función con su foto del banco de Leasefy: dos invitaciones seguidas no se ven iguales.
  const foto = FOTOS_DE_LA_ESCENA[Math.max(0, INVITACIONES.indexOf(abierta)) % FOTOS_DE_LA_ESCENA.length]

  /*
   * Nico 31-10-2026: «haz más hermosos los modales de mejora tu plan… ya te lo había pedido». La misma escena que el
   * modal del plan (foto real + placa), ahora con la pantalla de verdad de esa parte asomando y su 3D en la esquina;
   * sin el ícono en la cajita de color con anillos (DESIGN.md §1: nada de íconos en cajitas).
   */
  return (
    <Dialog open onOpenChange={(o) => !o && setAbierta(null)}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid={`invitacion-plan-${abierta.clave}`}>
        <DialogBody className="p-0 sm:p-0">
          <EscenaDeMarca foto={foto} asomando>
            <VentanaDelProducto
              captura={abierta.captura.src}
              alt={abierta.captura.alt}
              acento={<PlacaDe3D nombre={abierta.ilustracion} tamano={64} />}
            />
          </EscenaDeMarca>
          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">{abierta.eyebrow}</p>
              <DialogTitle className="text-h2 text-fg">{abierta.titulo}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">{abierta.subtitulo}</DialogDescription>
            </div>
            <BeneficiosEn3D
              className="sm:grid-cols-1"
              items={abierta.beneficios.map((texto) => ({ ilustracion: abierta.ilustracion, texto }))}
            />
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button variant="ghost" hideArrow onClick={() => setAbierta(null)} data-testid="invitacion-ahora-no">
                Ahora no
              </Button>
              <Button asChild onClick={() => setAbierta(null)}>
                <a
                  href={enlaceParaMejorarElPlan({
                    nombre: user?.firstName ?? null,
                    empresa: agency?.name ?? null,
                    queVio: abierta.eyebrow,
                    vinoDelMarketplace: agency?.vinoDelMarketplace === true,
                  })}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-testid="invitacion-mejorar"
                >
                  Mejorar mi plan
                </a>
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
