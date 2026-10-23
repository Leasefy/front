'use client'

/**
 * AgenteDePagos — la pantalla de la fila «Agente de pagos» de «Agentes IA».
 *
 * Tres cosas, en este orden, y ninguna inventada:
 *
 *   1. Si el equipo trabaja hoy: una píldora con el estado real (gobierno del
 *      micro) y la lista de lo que necesita para trabajar, cada paso con su
 *      lectura. Si una lectura falló se dice «sin verificar», nunca «falta».
 *   2. (Hasta el 14-10-2026 había un «tablero» del micro que nunca se
 *      publicó: un paso en «Falta» y un 404 en cada visita. Se quitó; ver la
 *      nota de `lib/pagos/equipo-de-pagos.ts`.)
 *   2b. Cobri este mes (08-10-2026, de cambios-nico-10): la frase del mes, cuándo
 *      escribe y el link de cada cuota (`CobriEsteMes`), con el resumen del back.
 *   3. Quién es quién: los seis del equipo (COBRI-6, 18-10-2026: Pagui,
 *      Cuenti, Cobri, Reti, Giri y Noti, los que corren de verdad), qué hace
 *      cada uno y en qué pantalla del panel se ve su trabajo. Esas pantallas
 *      ya existen; acá se ENLAZAN, no se repiten.
 *
 * El texto y la lógica de estados viven en `lib/pagos/equipo-de-pagos.ts`; las
 * lecturas, en `useAgenteDePagos`. Este archivo sólo dibuja.
 */

import Link from 'next/link'
import type { Icon } from '@phosphor-icons/react'
import {
  ArrowsClockwise,
  CheckCircle,
  CircleNotch,
  HourglassMedium,
  Power,
  Question,
  XCircle,
} from '@phosphor-icons/react'

import { CobriEsteMes } from '@/components/inmobiliaria/pagos/agente/CobriEsteMes'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { Button } from '@/components/ui/button'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter'
import { cn } from '@/lib/utils'
import type { AgenteDePagosLectura } from '@/lib/hooks/use-agente-de-pagos'
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
      className="flex gap-3 px-5 py-4"
      data-testid={`especialista-${persona.id}`}
    >
      <Icono className="mt-0.5 h-5 w-5 flex-shrink-0 text-fg-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
      <p className="text-body-sm text-fg">
        <span className="font-medium">{persona.nombre}</span>
        <span className="text-fg-muted"> · {persona.rol}</span>
      </p>
      <p className="text-body-sm text-fg-muted">{persona.queHace}</p>
      <p className="text-caption text-fg-muted">
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
              </Link>
            ) : (
              <span className="font-medium text-fg">{donde.nombre}</span>
            )}
            .
          </>
        )}
      </p>
      </div>
    </li>
  )
}

// ── La pantalla ─────────────────────────────────────────────────────────────

export function AgenteDePagos({ lectura }: { lectura: AgenteDePagosLectura }) {
  const { gobierno, reintentar } = lectura
  const estado = estadoDelEquipo(gobierno)
  const pasos = pasosParaQueTrabaje(gobierno)
  const algoSinVerificar = pasos.some((p) => p.estado === 'sin-verificar')
  const todoListo = pasos.length > 0 && pasos.every((p) => p.estado === 'hecho')

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* GLOW UP 22-10 (UX): el encabezado común —el estado al lado del título, UNA línea de para qué
          sirve y la explicación larga en la ayuda— (antes un párrafo de cinco renglones). */}
      <EncabezadoDePantalla
        seccion="Agentes IA"
        titulo="Agente de pagos"
        junto={<PildoraDelEstado estado={estado} />}
        descripcion="Cobran por enlace de pago, recuperan los pagos que fallan y revisan cada giro."
        ayuda={
          <ParaEntenderMas etiqueta="Qué hace este equipo" titulo="Agente de pagos">
            <p className="text-sm leading-relaxed text-fg-muted">
              Seis agentes que trabajan el cobro por enlace de pago de punta a punta: revisan cada cuota antes
              de que venza, le mandan el enlace al inquilino, recuperan los pagos que fallan, revisan cada giro
              al propietario antes de aprobarlo, te avisan y cada mañana te dejan el resumen. La plata se
              sigue operando en Pagos: este equipo automatiza partes de ese trabajo.
            </p>
          </ParaEntenderMas>
        }
      />

      {/* Revisora r24 (Agente de pagos #3): «Sin verificar» UNA vez (la píldora); con la consulta caída, una
          línea con su salida, y con todo prendido, una línea. La lista queda adentro, plegada. */}
      <section aria-labelledby="que-necesita" className="space-y-3">
        <h2 id="que-necesita" className="sr-only">
          Qué necesita para trabajar
        </h2>
        {algoSinVerificar ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg-muted" data-testid="equipo-sin-verificar">
            No pudimos ver si el equipo está prendido.
            <Button variant="outline" size="sm" hideArrow onClick={() => void reintentar()}>
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Volver a consultar
            </Button>
          </p>
        ) : todoListo ? (
          <p className="flex items-center gap-2 text-body-sm text-fg-muted" data-testid="equipo-listo">
            <CheckCircle className="h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden="true" />
            Prendido en Leasefy y para tu inmobiliaria.
          </p>
        ) : null}
        {algoSinVerificar || todoListo ? (
          <MasDetalles etiqueta="Qué necesita para trabajar" etiquetaAbierto="Ocultar" montadoSiempre>
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
          </MasDetalles>
        ) : (
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
        )}
      </section>

      {/* Cobri (08-10, de cambios-nico-10): lo que el equipo ya hace de verdad,
          con el resumen del back. */}
      <CobriEsteMes />

      {/* Revisora r24 (Agente de pagos #2): «El equipo» es de consulta (≈900 px a 1440, ≈2.300 a 390): plegado. */}
      <section aria-labelledby="el-equipo">
        <h2 id="el-equipo" className="sr-only">
          El equipo
        </h2>
        <MasDetalles
          etiqueta={`Los ${EQUIPO_DE_PAGOS.length} agentes del equipo`}
          etiquetaAbierto="Ocultar el equipo"
          montadoSiempre
          data-testid="el-equipo-plegado"
        >
          <ul className="divide-y divide-border-faint rounded-lg border border-border bg-surface">
            {EQUIPO_DE_PAGOS.map((persona) => (
              <TarjetaDelEspecialista key={persona.id} persona={persona} />
            ))}
          </ul>
        </MasDetalles>
      </section>
    </div>
  )
}
