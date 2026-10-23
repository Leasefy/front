'use client'

/**
 * CobriEsteMes — lo que Cobri hizo este mes, dentro de «Agente de pagos».
 *
 * Traído de cambios-nico-10 (1307e969 y f9e7e790, 26 y 30-09-2026) SIN quitar
 * el equipo de seis de bugs-nico-1 (Nico, 08-10: «trae también lo saltado de
 * Cobri»). Allá la página entera era de Cobri; acá Cobri es la parte del equipo
 * que se ve trabajando, así que va como una sección más, con:
 *
 *   1. la frase del mes (`GET /inmobiliaria/cobros/links/resumen`) —el molde del
 *      panel, `lib/payu/frases.ts`— y la píldora con su estado real;
 *   2. cuándo escribe, dicho UNA vez (los tres avisos de cada cuota);
 *   3. el link de cada cuota (`LinksDePago`), con el mismo mes.
 *
 * 🔴 Con `payuActivo=false` la píldora dice «Apagado» (neutro: no es un error)
 * y no se inventan números. Si el resumen no se pudo leer, la píldora dice «Sin
 * verificar», nunca «Apagado», y la frase es UNA línea con «Intentar de nuevo»:
 * la lista de abajo sigue viva y es lo que se vino a ver.
 *
 * No hay «Enviar link»: Nico eligió el cron, no el pedido manual.
 */

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChatCircleText, HandPalm, WarningCircle } from '@phosphor-icons/react'

import {
  PildoraDelAgente,
  estadoDeLaLectura,
  type EstadoDelAgente,
} from '@/components/inmobiliaria/agentes/EstadoDelAgente'
import { LinksDePago } from '@/components/inmobiliaria/pagos/payu/LinksDePago'
import { Button } from '@/components/ui/button'
import { useCobrosEnLaBandeja } from '@/lib/hooks/use-cobros-en-la-bandeja'
import { useResumenDePayu, type Lectura } from '@/lib/hooks/use-payu'
import { fraseDelMesDePayu } from '@/lib/payu/frases'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { formatCurrency } from '@/lib/format'
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses'
import type { ResumenDeLinksDePago } from '@/lib/types/payu'

export function estadoDeCobri(lectura: Lectura<ResumenDeLinksDePago>): EstadoDelAgente {
  return estadoDeLaLectura({ activo: lectura.data?.payuActivo, error: lectura.error })
}

/** Los tres avisos de cada cuota, en el orden en que salen (`payu-contrato`). */
const AVISOS = [
  { cuando: '3 días antes', de: 'del vencimiento' },
  { cuando: 'El día', de: 'del vencimiento' },
  { cuando: '3 días después', de: 'del vencimiento' },
] as const

function CuandoEscribe() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5" data-testid="cobri-cuando-escribe">
      <h3 className="text-body font-medium text-fg">Cuándo escribe</h3>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {AVISOS.map((a, n) => (
          <li key={a.cuando} className="flex items-start gap-3 rounded-md bg-surface-muted px-4 py-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-caption font-medium text-fg"
              aria-hidden="true"
            >
              {n + 1}
            </span>
            <p className="min-w-0 text-body-sm">
              <span className="block font-medium text-fg">{a.cuando}</span>
              <span className="text-fg-muted">{a.de}</span>
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 max-w-2xl text-body-sm text-fg-muted">
        Son máximo tres mensajes por cuota y siempre el mismo link. Después del tercero ya no escribe: la sigue
        cobranza.
      </p>
    </div>
  )
}

function FraseDelMes({ lectura }: { lectura: Lectura<ResumenDeLinksDePago> }) {
  if (lectura.data) {
    const d = lectura.data
    const conEnlaceSinPagar = Math.max(0, d.linksEnviados - d.pagadosPorLink)
    const sinEnlace = Math.max(0, d.cuotas - d.pagadosPorLink - conEnlaceSinPagar)
    // Revisora r24 (Agente de pagos #1): LA RESPUESTA en una cifra —lo pagado por enlace en el mes, de cuántas
    // cuotas— con su barra; la frase de siempre queda debajo. Antes, seis cifras en un renglón.
    return (
      <CifraHeroe
        rotulo={`Pagadas por enlace en ${nombreDelMes(d.mes)}`}
        cifra={formatCurrency(d.montoCobradoPorLinkCop)}
        contexto={`${d.pagadosPorLink} de ${d.cuotas} ${d.cuotas === 1 ? 'cuota' : 'cuotas'}`}
        total={d.cuotas}
        tamano="mediana"
        tramos={[
          { clave: 'pagadas', etiqueta: 'Pagadas por enlace', monto: d.pagadosPorLink, tono: 'exito', cifra: d.pagadosPorLink, siempre: true },
          { clave: 'enviadas', etiqueta: 'Con enlace, sin pagar', monto: conEnlaceSinPagar, tono: 'aviso', cifra: conEnlaceSinPagar },
          { clave: 'sin-enlace', etiqueta: 'Sin enlace todavía', monto: sinEnlace, tono: 'neutro', cifra: sinEnlace },
        ]}
        pie={
          <p className="flex items-start gap-2" data-testid="frase-de-cobri">
            <ChatCircleText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {fraseDelMesDePayu(d)}
          </p>
        }
        data-testid="cifra-de-cobri"
      />
    )
  }
  if (lectura.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="frase-de-cobri-fallo">
        <p className="flex items-start gap-3 text-body-sm text-fg-muted">
          <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          No se pudo leer el resumen de Cobri, así que no sabemos si está prendido.
        </p>
        <Button variant="outline" size="sm" hideArrow onClick={() => lectura.recargar()}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }
  return (
    <div
      className="h-5 w-full max-w-xl animate-pulse rounded-sm bg-surface-muted motion-reduce:animate-none"
      aria-hidden="true"
    />
  )
}

/**
 * COBRI-4 (QA de los agentes, 16-10-2026): con Cobri en Copiloto (o en
 * Automático por encima del tope por acción), el aviso de cada cuota espera un
 * clic en la Bandeja del Piloto. Se dice aquí, arriba de la lista, con el
 * camino a la Bandeja, sin afirmar el modo: el porqué lo dice el caso.
 * Con uno solo, el enlace abre ESE caso: la Bandeja va de la más vieja a la
 * más nueva y el de Cobri quedaba en la página 23.
 */
function EsperanTuAprobacion({ ids }: { ids: readonly string[] }) {
  const total = ids.length
  if (total === 0) return null
  const href =
    total === 1
      ? `/panel/inmobiliaria/piloto?item=${encodeURIComponent(ids[0])}`
      : '/panel/inmobiliaria/piloto?bandeja=1'
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-warning-soft px-4 py-3"
      data-testid="cobri-espera-aprobacion"
    >
      <p className="flex items-start gap-3 text-body-sm text-fg">
        <HandPalm className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        {total === 1
          ? 'Un link de pago espera tu aprobación para salir: Cobri no lo manda sin tu clic.'
          : `${total} links de pago esperan tu aprobación para salir: Cobri no los manda sin tu clic.`}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
      >
        {total === 1 ? 'Revisar y aprobar' : 'Abrir la Bandeja'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

export function CobriEsteMes() {
  const [mes, setMes] = useState(() => mesActual())
  const resumen = useResumenDePayu(mes)
  const enLaBandeja = useCobrosEnLaBandeja()

  return (
    <section aria-labelledby="cobri-este-mes" className="space-y-4" data-testid="cobri-este-mes">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="cobri-este-mes" className="text-subtitle text-fg">
            Cobri · el link de pago de cada cuota
          </h2>
          <PildoraDelAgente estado={estadoDeCobri(resumen)} data-testid="estado-de-cobri" />
        </div>
        <p className="max-w-2xl text-body-sm text-fg-muted">
          Le manda al inquilino por WhatsApp el link de pago de su cuota más vieja con saldo, por el valor exacto. Es
          el mismo link que va en los correos de aviso de cobro.
        </p>
      </div>

      {/* Revisora r24 (Agente de pagos #2): «Cuándo escribe» se consulta; plegado, no ~600 px abiertos a 390. */}
      <MasDetalles etiqueta="Cuándo escribe Cobri" etiquetaAbierto="Ocultar" montadoSiempre>
        <CuandoEscribe />
      </MasDetalles>

      <EsperanTuAprobacion ids={enLaBandeja.ids} />

      <LinksDePago
        mes={mes}
        onCambiarMes={setMes}
        titulo="El link de cada cuota"
        descripcion={null}
        resumen={<FraseDelMes lectura={resumen} />}
        esperanEnLaBandeja={enLaBandeja.porCuota}
      />
    </section>
  )
}
