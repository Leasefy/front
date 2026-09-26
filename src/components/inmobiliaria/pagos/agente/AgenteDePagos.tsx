'use client'

/**
 * AgenteDePagos — la pantalla de Payu en «Agentes IA» (`/pagos/agente`).
 *
 * 26-09-2026: decía «Apagado» y «tablero no publicado» porque leía rutas del
 * micro (`/pagos/home/*`) que nunca existieron. Ahora lee las del back que
 * fijó el integrador (`payu-api-front.md`):
 *
 *   1. el resumen del mes (`GET /inmobiliaria/cobros/links/resumen`) en UNA
 *      frase —el molde del panel, `components/retencion/frases.ts`—, y
 *   2. la lista del link de cada cuota (`LinksDePago`), con el mismo mes.
 *
 * 🔴 Con `payuActivo=false` lo dice con las palabras de Nico —«Payu está
 * apagado en el servidor: lo prende Leasefy»— y no inventa números. Si el
 * resumen no se pudo leer, la píldora dice «Sin verificar», nunca «Apagado»:
 * decir apagado sin haber preguntado es la misma mentira que decir prendido.
 *
 * No hay «Enviar link»: Nico eligió el cron, no el pedido manual.
 */

import { useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { CheckCircle, CircleNotch, Power, Question } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { LinksDePago } from '@/components/inmobiliaria/pagos/payu/LinksDePago'
import { SectionLabel } from '@/components/ui/section-label'
import { useResumenDePayu, type Lectura } from '@/lib/hooks/use-payu'
import { fraseDelMesDePayu } from '@/lib/payu/frases'
import { mesActual } from '@/lib/recaudo/meses'
import type { ResumenDeLinksDePago } from '@/lib/types/payu'
import { cn } from '@/lib/utils'

export type EstadoDePayu = 'cargando' | 'prendido' | 'apagado' | 'sin-verificar'

export function estadoDePayu(lectura: Lectura<ResumenDeLinksDePago>): EstadoDePayu {
  if (lectura.data) return lectura.data.payuActivo ? 'prendido' : 'apagado'
  if (lectura.error) return 'sin-verificar'
  return 'cargando'
}

const PILDORA: Record<EstadoDePayu, { clase: string; icon: Icon; texto: string; gira?: boolean }> = {
  cargando: { clase: 'bg-surface-muted text-fg-muted', icon: CircleNotch, texto: 'Consultando…', gira: true },
  prendido: { clase: 'bg-success-soft text-success', icon: CheckCircle, texto: 'Prendido' },
  apagado: { clase: 'bg-warning-soft text-warning', icon: Power, texto: 'Apagado' },
  'sin-verificar': { clase: 'bg-surface-muted text-fg-muted', icon: Question, texto: 'Sin verificar' },
}

function PildoraDePayu({ estado }: { estado: EstadoDePayu }) {
  const { clase, icon: Icono, texto, gira } = PILDORA[estado]
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="estado-de-payu"
      data-estado={estado}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium', clase)}
    >
      <Icono
        className={cn('h-4 w-4 flex-shrink-0', gira && 'animate-spin motion-reduce:animate-none')}
        weight="bold"
        aria-hidden="true"
      />
      {texto}
    </span>
  )
}

function FraseDelMes({ lectura }: { lectura: Lectura<ResumenDeLinksDePago> }) {
  return (
    <EstadoDeDatos
      cargando={lectura.cargando && !lectura.data}
      error={lectura.error}
      queEs="el resumen de Payu"
      onReintentar={() => void lectura.recargar()}
      esqueleto={<div className="h-5 w-full max-w-xl animate-pulse rounded-sm bg-surface-muted" aria-hidden="true" />}
    >
      {lectura.data && (
        <p className="text-body text-fg" data-testid="frase-de-payu">
          {fraseDelMesDePayu(lectura.data)}
        </p>
      )}
    </EstadoDeDatos>
  )
}

export function AgenteDePagos() {
  const [mes, setMes] = useState(() => mesActual())
  const resumen = useResumenDePayu(mes)

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="space-y-3">
        <SectionLabel>Agentes IA</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-fg">Agente de pagos · Payu</h1>
          <PildoraDePayu estado={estadoDePayu(resumen)} />
        </div>
        <p className="max-w-2xl text-body-sm text-fg-muted">
          Payu le manda al inquilino por WhatsApp el link de pago de su cuota más vieja con saldo, por el valor exacto:
          3 días antes del vencimiento, el día y 3 días después. Son máximo tres mensajes por cuota y siempre el mismo
          link, que también va en los correos de aviso de cobro. Después del tercero ya no escribe: la sigue cobranza.
        </p>
      </header>

      <LinksDePago mes={mes} onCambiarMes={setMes} resumen={<FraseDelMes lectura={resumen} />} />
    </div>
  )
}
