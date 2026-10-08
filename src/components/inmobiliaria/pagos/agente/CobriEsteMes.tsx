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
import { ChatCircleText, WarningCircle } from '@phosphor-icons/react'

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
    return (
      <div className="flex items-start gap-3">
        <ChatCircleText className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <p className="text-body text-fg" data-testid="frase-de-cobri">
          {fraseDelMesDePayu(lectura.data)}
        </p>
      </div>
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

export function CobriEsteMes() {
  const [mes, setMes] = useState(() => mesActual())
  const resumen = useResumenDePayu(mes)

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

      <CuandoEscribe />

      <LinksDePago
        mes={mes}
        onCambiarMes={setMes}
        titulo="El link de cada cuota"
        descripcion={null}
        resumen={<FraseDelMes lectura={resumen} />}
      />
    </section>
  )
}
