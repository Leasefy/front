'use client'

/**
 * AgenteDePagos — la pantalla de la fila «Agente de pagos» de «Agentes IA».
 *
 * Tres cosas, en este orden, y ninguna inventada:
 *
 *   1. Si el equipo trabaja hoy: una píldora con el estado real (gobierno del
 *      micro) y la lista de lo que necesita para trabajar, cada paso con su
 *      lectura. Si una lectura falló se dice «sin verificar», nunca «falta».
 *   2. Lo que está haciendo: SÓLO cuando el micro publica el tablero. Mientras
 *      no exista no se dibuja ni una tarjeta con «—»: eso fue lo que tuvo la
 *      Sala que se retiró, ocho indicadores en rayas. Si la consulta falla, lo
 *      dice el paso «Su tablero publicado» con su «Volver a consultar»: un
 *      solo lugar para el mismo aviso, no dos carteles.
 *   3. Quién es quién: los seis del equipo, qué hace cada uno y en qué
 *      pantalla del panel se ve su trabajo. Esas pantallas ya existen y
 *      funcionan sin el equipo; acá se ENLAZAN, no se repiten.
 *
 * El texto y la lógica de estados viven en `lib/pagos/equipo-de-pagos.ts`; las
 * lecturas, en `useAgenteDePagos`. Este archivo sólo dibuja.
 */

import Link from 'next/link'
import type { Icon } from '@phosphor-icons/react'
import {
  ArrowRight,
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  HourglassMedium,
  Power,
  Question,
  XCircle,
} from '@phosphor-icons/react'

import { SectionLabel } from '@/components/ui/section-label'
import { Button } from '@/components/ui/button'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AgenteDePagosLectura } from '@/lib/hooks/use-agente-de-pagos'
import type { OverviewKpi } from '@/lib/api/agent-workspace'
import {
  EQUIPO_DE_PAGOS,
  ETIQUETA_DEL_ESTADO,
  estadoDelEquipo,
  pasosParaQueTrabaje,
  type EstadoDelEquipo,
  type EstadoDelPaso,
  type Especialista,
} from '@/lib/pagos/equipo-de-pagos'

// ── La píldora del estado ───────────────────────────────────────────────────

const TONO_DEL_ESTADO: Record<EstadoDelEquipo, { clase: string; icon: Icon; gira?: boolean }> = {
  cargando: { clase: 'bg-surface-muted text-fg-muted', icon: CircleNotch, gira: true },
  'apagado-en-leasefy': { clase: 'bg-warning-soft text-warning', icon: Power },
  'apagado-para-tu-inmobiliaria': { clase: 'bg-warning-soft text-warning', icon: Power },
  encendido: { clase: 'bg-success-soft text-success', icon: CheckCircle },
  'sin-verificar': { clase: 'bg-surface-muted text-fg-muted', icon: Question },
}

function PildoraDelEstado({ estado }: { estado: EstadoDelEquipo }) {
  const tono = TONO_DEL_ESTADO[estado]
  const Icono = tono.icon
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="estado-del-equipo"
      data-estado={estado}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium', tono.clase)}
    >
      <Icono
        className={cn('h-4 w-4 flex-shrink-0', tono.gira && 'animate-spin motion-reduce:animate-none')}
        weight="bold"
        aria-hidden="true"
      />
      {ETIQUETA_DEL_ESTADO[estado]}
    </span>
  )
}

// ── Los pasos ───────────────────────────────────────────────────────────────

const PASO: Record<EstadoDelPaso, { icon: Icon; clase: string; palabra: string; gira?: boolean }> = {
  hecho: { icon: CheckCircle, clase: 'text-success', palabra: 'Listo' },
  falta: { icon: XCircle, clase: 'text-warning', palabra: 'Falta' },
  espera: { icon: HourglassMedium, clase: 'text-fg-subtle', palabra: 'Después' },
  'sin-verificar': { icon: Question, clase: 'text-fg-muted', palabra: 'Sin verificar' },
  cargando: { icon: CircleNotch, clase: 'text-fg-subtle', palabra: 'Consultando', gira: true },
}

// ── Los números, cuando existen ─────────────────────────────────────────────

function valorDelKpi(kpi: OverviewKpi): string {
  if (kpi.format === 'cop') return formatCurrency(kpi.value)
  if (kpi.format === 'percent') return `${Math.round(kpi.value * 100)} %`
  return new Intl.NumberFormat('es-CO').format(kpi.value)
}

// ── La tarjeta de cada especialista ─────────────────────────────────────────

function TarjetaDelEspecialista({ persona }: { persona: Especialista }) {
  const { canAccess, isAdmin, agencyRole, agentAccessStatus } = usePermissionsContext()
  const Icono = persona.icon
  const donde = persona.dondeSeVe
  const puedeAbrir =
    donde !== null &&
    pasaGateDeFila(donde, {
      canAccess,
      isAdmin,
      agencyRole,
      agentUnverified: agentAccessStatus === 'sin-verificar',
    })

  return (
    <li
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm"
      data-testid={`especialista-${persona.id}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-soft">
          <Icono className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-body font-medium text-fg">{persona.nombre}</h3>
          <p className="text-caption text-fg-muted">{persona.rol}</p>
        </div>
      </div>
      <p className="text-body-sm text-fg-muted">{persona.queHace}</p>
      <p className="mt-auto border-t border-border-faint pt-3 text-caption text-fg-muted">
        {donde === null ? (
          persona.sinPantalla
        ) : (
          <>
            Su trabajo se ve en{' '}
            {puedeAbrir ? (
              <Link
                href={donde.href}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                {donde.nombre}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : (
              <span className="font-medium text-fg">{donde.nombre}</span>
            )}
            .
          </>
        )}
      </p>
    </li>
  )
}

// ── La pantalla ─────────────────────────────────────────────────────────────

export function AgenteDePagos({ lectura }: { lectura: AgenteDePagosLectura }) {
  const { gobierno, tablero, resumen, reintentar } = lectura
  const estado = estadoDelEquipo(gobierno)
  const pasos = pasosParaQueTrabaje(gobierno, tablero)
  const algoSinVerificar = pasos.some((p) => p.estado === 'sin-verificar')

  return (
    <div className="space-y-10 p-6 lg:p-8">
      <header className="space-y-3">
        <SectionLabel>Agentes IA</SectionLabel>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2 text-fg">Agente de pagos</h1>
          <PildoraDelEstado estado={estado} />
        </div>
        <p className="max-w-2xl text-body-sm text-fg-muted">
          Seis agentes que preparan y envían el cobro por link de pago, vigilan los pagos que fallan y
          dejan lista la liquidación de cada propietario. Entran a trabajar cuando el ERP les pasa un
          cobro. La plata se sigue operando en Pagos: este equipo automatiza partes de ese trabajo.
        </p>
      </header>

      <section aria-labelledby="que-necesita" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="que-necesita" className="text-subtitle text-fg">
            Qué necesita para trabajar
          </h2>
          {algoSinVerificar && (
            <Button variant="secondary" size="sm" hideArrow onClick={() => void reintentar()}>
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Volver a consultar
            </Button>
          )}
        </div>
        <ol className="divide-y divide-border-faint rounded-lg border border-border bg-surface">
          {pasos.map((paso, i) => {
            const aspecto = PASO[paso.estado]
            const Icono = aspecto.icon
            return (
              <li
                key={paso.id}
                className="flex gap-4 p-5"
                data-testid={`paso-${paso.id}`}
                data-estado={paso.estado}
              >
                <Icono
                  className={cn(
                    'mt-0.5 h-5 w-5 flex-shrink-0',
                    aspecto.clase,
                    aspecto.gira && 'animate-spin motion-reduce:animate-none',
                  )}
                  weight={paso.estado === 'hecho' ? 'fill' : 'regular'}
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-body-sm font-medium text-fg">
                    <span className="mr-2 font-mono text-caption text-fg-subtle tabular-nums">{i + 1}</span>
                    {paso.titulo}
                    <span className={cn('ml-2 text-caption font-normal', aspecto.clase)}>· {aspecto.palabra}</span>
                  </p>
                  <p className="text-body-sm text-fg-muted">{paso.detalle}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {tablero.estado === 'listo' && resumen && (
        <section aria-labelledby="que-esta-haciendo" className="space-y-4" data-testid="tablero-del-equipo">
          <h2 id="que-esta-haciendo" className="text-subtitle text-fg">
            Lo que está haciendo
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resumen.kpis.map((kpi) => (
              <div key={kpi.id} className="space-y-2 rounded-lg border border-border bg-surface p-5">
                <dt className="text-caption text-fg-muted">{kpi.label}</dt>
                <dd className="text-numeric text-stat font-medium text-fg">{valorDelKpi(kpi)}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-body-sm font-medium text-fg">Pendientes</h3>
            {resumen.feed.length === 0 ? (
              <p className="mt-2 text-body-sm text-fg-muted">El equipo no tiene nada esperando por ti.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border-faint">
                {resumen.feed.map((f) => (
                  <li key={f.id} className="py-3">
                    <p className="text-body-sm text-fg">{f.titulo}</p>
                    {f.detalle && <p className="text-caption text-fg-muted">{f.detalle}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="el-equipo" className="space-y-4">
        <h2 id="el-equipo" className="text-subtitle text-fg">
          El equipo
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EQUIPO_DE_PAGOS.map((persona) => (
            <TarjetaDelEspecialista key={persona.id} persona={persona} />
          ))}
        </ul>
      </section>
    </div>
  )
}
