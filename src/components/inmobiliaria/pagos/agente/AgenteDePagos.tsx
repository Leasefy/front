'use client'

/**
 * AgenteDePagos — la pantalla de Cobri en «Agentes IA» (`/pagos/agente`).
 *
 * 26-09-2026: decía «Apagado» y «tablero no publicado» porque leía rutas del
 * micro (`/pagos/home/*`) que nunca existieron. Ahora lee las del back que
 * fijó el integrador (`payu-api-front.md`):
 *
 *   1. el resumen del mes (`GET /inmobiliaria/cobros/links/resumen`) en UNA
 *      frase —el molde del panel, `components/retencion/frases.ts`—, y
 *   2. la lista del link de cada cuota (`LinksDePago`), con el mismo mes.
 *
 * 30-09-2026 (glow up, Nico: «mira eso como se ve de horrible»): el margen y
 * el encabezado de las demás pantallas del panel (Eyebrow, h1, bajada), la
 * píldora común con Niti (`EstadoDelAgente`) y las reglas de cuándo escribe en
 * su propia tarjeta, dichas UNA vez: antes la bajada y la tarjeta de los
 * links repetían «3 días antes, el día y 3 días después».
 *
 * 🔴 Con `payuActivo=false` lo dice con las palabras de Nico —«Cobri está
 * apagado en el servidor: lo prende Leasefy»— y no inventa números. Si el
 * resumen no se pudo leer, la píldora dice «Sin verificar», nunca «Apagado»:
 * decir apagado sin haber preguntado es la misma mentira que decir prendido.
 *
 * No hay «Enviar link»: Nico eligió el cron, no el pedido manual.
 */

import { useState } from 'react'
import { ChatCircleText, WarningCircle } from '@phosphor-icons/react'
import { Eyebrow } from '@leasefy/cadence'

import {
  PildoraDelAgente,
  estadoDeLaLectura,
  type EstadoDelAgente,
} from '@/components/inmobiliaria/agentes/EstadoDelAgente'
import { LinksDePago } from '@/components/inmobiliaria/pagos/payu/LinksDePago'
import { Button } from '@/components/ui/button'
import { useResumenDePayu, type Lectura } from '@/lib/hooks/use-payu'
import { fraseDelMesDePayu } from '@/lib/payu/frases'
import { mesActual } from '@/lib/recaudo/meses'
import type { ResumenDeLinksDePago } from '@/lib/types/payu'

export type EstadoDePayu = EstadoDelAgente

export function estadoDePayu(lectura: Lectura<ResumenDeLinksDePago>): EstadoDePayu {
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
    <section
      aria-labelledby="cobri-cuando-escribe"
      className="rounded-lg border border-border bg-surface p-5"
      data-testid="cobri-cuando-escribe"
    >
      <h2 id="cobri-cuando-escribe" className="text-subtitle text-fg">
        Cuándo escribe
      </h2>
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
    </section>
  )
}

/**
 * La frase del mes, entre la barra del mes y la tabla. Si no se pudo leer, UNA
 * línea con reintentar —no el cartel grande de fallo en medio de la tarjeta:
 * la lista de abajo sigue viva y es lo que se vino a ver.
 */
function FraseDelMes({ lectura }: { lectura: Lectura<ResumenDeLinksDePago> }) {
  if (lectura.data) {
    return (
      <div className="flex items-start gap-3">
        <ChatCircleText className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <p className="text-body text-fg" data-testid="frase-de-payu">
          {fraseDelMesDePayu(lectura.data)}
        </p>
      </div>
    )
  }
  if (lectura.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="frase-de-payu-fallo">
        <p className="flex items-start gap-3 text-body-sm text-fg-muted">
          <WarningCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          No se pudo leer el resumen de Cobri, así que no sabemos si está prendido.
        </p>
        <Button variant="outline" size="sm" hideArrow onClick={() => void lectura.recargar()}>
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

export function AgenteDePagos() {
  const [mes, setMes] = useState(() => mesActual())
  const resumen = useResumenDePayu(mes)

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="agente-de-pagos">
      <header className="space-y-1">
        <Eyebrow>Agentes IA</Eyebrow>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-h2 text-fg">Agente de pagos · Cobri</h1>
          <PildoraDelAgente estado={estadoDePayu(resumen)} data-testid="estado-de-payu" />
        </div>
        <p className="max-w-2xl text-sm text-fg-muted">
          Le manda al inquilino por WhatsApp el link de pago de su cuota más vieja con saldo, por el valor exacto. Es
          el mismo link que va en los correos de aviso de cobro.
        </p>
      </header>

      <CuandoEscribe />

      <LinksDePago
        mes={mes}
        onCambiarMes={setMes}
        titulo="El link de cada cuota"
        descripcion={null}
        resumen={<FraseDelMes lectura={resumen} />}
      />
    </div>
  )
}
