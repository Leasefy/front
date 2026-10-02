'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  AGENT_ORB_DEFAULT_LOOK,
  AGENT_ORB_LOOKS,
  AgentOrbLookProvider,
  type AgentOrbLook,
} from '@leasefy/cadence'

import { EquipoDeAgentes } from '@/components/agentes/EquipoDeAgentes'
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import type { EstadoDelOrbe } from '@/lib/agentes/agente-que-habla'
import { agentePorId, nombreDelAgente, type IdDeAgente } from '@/lib/agentes/equipo'
import type { ActivityItem, PilotoFlotaResponse } from '@/lib/api/piloto'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Vista previa de los orbes (02-10-2026). Los tres looks del MISMO motor de
 * Cadence, vivos en los contextos reales —la fila de la lista, la cabecera
 * del chat, la presentación y el modal «El equipo» de verdad—, en oscuro y
 * en claro. Los botones de arriba pasan a «quien habla» por todos los
 * estados: las transiciones se funden, no saltan.
 *
 * Para capturas: `?estado=pensando&quietos=1&equipo=silk-oscuro`.
 */

type Tema = 'oscuro' | 'claro'

const LOOKS: AgentOrbLook[] = ['silk', 'mist', 'nebula']
const TEMAS: Tema[] = ['oscuro', 'claro']

const ESTADOS: Array<{ estado: EstadoDelOrbe; texto: string }> = [
  { estado: 'quieto', texto: 'Quieto' },
  { estado: 'pensando', texto: 'Pensando' },
  { estado: 'trabajando', texto: 'Trabajando' },
  { estado: 'listo', texto: 'Listo' },
  { estado: 'fallo', texto: 'Falló' },
  { estado: 'apagado', texto: 'Apagado' },
]

/** La fila: el orquestador, quien habla (Laura) y tres más, uno apagado. */
const FILA: Array<{ id: IdDeAgente; habla?: boolean; apagado?: boolean }> = [
  { id: 'orquestador' },
  { id: 'cobranza', habla: true },
  { id: 'pagos' },
  { id: 'retencion', apagado: true },
  { id: 'calidad' },
]

const LABEL = 'font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle'

// Datos de muestra para el modal real (no se pide nada a la red).
const FLOTA: PilotoFlotaResponse = {
  activo: true,
  modo: 'copiloto',
  agentes: [
    { agente: 'chat', modo: 'copiloto', origen: 'default', corre: true, gobierna: true, actua: true, efectoReal: 'Cada acción te la deja lista en el chat con «¿Lo hago?».' },
    { agente: 'cobranza', modo: 'autonomo', origen: 'piloto', corre: true, gobierna: true, actua: true, efectoReal: 'Laura llama y escribe sola.' },
    { agente: 'pagos', modo: 'copiloto', origen: 'default', corre: true, gobierna: true, actua: true },
    { agente: 'retencion', modo: 'copiloto', origen: 'default', corre: false, porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.' },
    { agente: 'conciliacion', modo: 'copiloto', origen: 'default', corre: true, gobierna: true, actua: false },
  ],
  resumen: { sombra: 0, copiloto: 3, autonomo: 1 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-10-02T10:00:00-05:00',
}
const ACTIVIDAD: ActivityItem[] = [
  { id: 'a1', at: '2026-10-02T09:00:00-05:00', agente: 'cobranza', tipo: 'promesa', titulo: 'Promesa de pago de Ana M.', detalle: '$1.200.000 para el viernes' },
]

function leerQuery(): URLSearchParams {
  return typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)
}

export function VistaDeLosOrbes() {
  return (
    <I18nProvider>
      <Vista />
    </I18nProvider>
  )
}

function Vista() {
  const [estado, setEstado] = useState<EstadoDelOrbe>('quieto')
  const [quietos, setQuietos] = useState(false)
  const [equipo, setEquipo] = useState<{ look: AgentOrbLook; tema: Tema } | null>(null)

  // La query manda al montar (capturas automáticas).
  useEffect(() => {
    const q = leerQuery()
    const e = q.get('estado')
    if (e && ESTADOS.some((x) => x.estado === e)) setEstado(e as EstadoDelOrbe)
    if (q.get('quietos') === '1') setQuietos(true)
    const eq = q.get('equipo')?.split('-')
    if (eq && LOOKS.includes(eq[0] as AgentOrbLook) && TEMAS.includes(eq[1] as Tema)) {
      setEquipo({ look: eq[0] as AgentOrbLook, tema: eq[1] as Tema })
    }
  }, [])

  // La página es clara (las secciones oscuras llevan `.dark`); el modal real
  // va a <body>, así que para verlo en oscuro se pone `.dark` en <html> sólo
  // mientras está abierto. Al salir, <html> queda como estaba.
  useEffect(() => {
    const html = document.documentElement
    const eraOscuro = html.classList.contains('dark')
    html.classList.toggle('dark', equipo?.tema === 'oscuro')
    return () => {
      html.classList.toggle('dark', eraOscuro)
    }
  }, [equipo])

  return (
    <main className="min-h-dvh bg-bg text-fg" data-testid="vista-de-los-orbes">
      <header className="mx-auto max-w-[1360px] space-y-5 px-6 pb-8 pt-10">
        <p className={LABEL}>Cadence v1.2.0 · vista previa</p>
        <h1 className="text-h1 font-semibold tracking-[-0.02em]">Los orbes del equipo</h1>
        <p className="max-w-[72ch] text-body text-fg-muted">
          Tres looks del mismo motor: un fluido que emite luz, con un solo contexto WebGL para todos los orbes de la página.
          La predeterminada es <b className="font-medium text-fg">{AGENT_ORB_LOOKS[AGENT_ORB_DEFAULT_LOOK].nombre}</b>. Los
          botones pasan a quien habla (Ori en el chat, Laura en la lista) por cada estado.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Segmentado
            id="estado"
            valor={estado}
            opciones={ESTADOS.map((e) => ({ valor: e.estado, texto: e.texto }))}
            onCambio={(v) => setEstado(v as EstadoDelOrbe)}
          />
          <button
            type="button"
            onClick={() => setQuietos((q) => !q)}
            aria-pressed={quietos}
            className={cn(
              'rounded-full border px-4 py-2 text-body-sm font-medium transition-colors',
              quietos ? 'border-fg bg-fg text-bg' : 'border-border bg-surface text-fg hover:bg-surface-hover',
            )}
            data-testid="boton-quietos"
          >
            Cuadro fijo (still)
          </button>
        </div>
      </header>

      {TEMAS.map((tema) => (
        <section
          key={tema}
          className={cn('bg-bg py-10 text-fg', tema === 'oscuro' && 'dark')}
          data-tema={tema}
          aria-label={tema === 'oscuro' ? 'En oscuro' : 'En claro'}
        >
          <div className="mx-auto max-w-[1360px] px-6">
            <p className={cn(LABEL, 'mb-5')}>{tema === 'oscuro' ? 'Oscuro' : 'Claro'}</p>
            <div className="grid gap-6 lg:grid-cols-3">
              {LOOKS.map((look) => (
                <AgentOrbLookProvider key={look} look={look}>
                  <TarjetaDelLook
                    look={look}
                    tema={tema}
                    estado={estado}
                    quietos={quietos}
                    onAbrirEquipo={() => setEquipo({ look, tema })}
                  />
                </AgentOrbLookProvider>
              ))}
            </div>
          </div>
        </section>
      ))}

      {equipo && (
        <AgentOrbLookProvider look={equipo.look}>
          <EquipoDeAgentes
            open
            onOpenChange={(o) => !o && setEquipo(null)}
            agenteInicial="orquestador"
            datos={{ flota: FLOTA, actividad: ACTIVIDAD }}
          />
        </AgentOrbLookProvider>
      )}
    </main>
  )
}

function TarjetaDelLook({
  look,
  tema,
  estado,
  quietos,
  onAbrirEquipo,
}: {
  look: AgentOrbLook
  tema: Tema
  estado: EstadoDelOrbe
  quietos: boolean
  onAbrirEquipo: () => void
}) {
  const { t } = useI18n()
  const ori = agentePorId('orquestador')
  const nombreOri = nombreDelAgente(ori, t)
  const predeterminada = look === AGENT_ORB_DEFAULT_LOOK
  return (
    <article
      className="flex flex-col gap-7 rounded-xl border border-border bg-surface p-6"
      data-look={look}
      data-testid={`tarjeta-${look}-${tema}`}
    >
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 font-semibold">{AGENT_ORB_LOOKS[look].nombre}</h2>
          {predeterminada && (
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-primary">
              Predeterminada
            </span>
          )}
        </div>
        <p className="text-body-sm text-fg-muted">{AGENT_ORB_LOOKS[look].descripcion}</p>
      </header>

      <Bloque titulo="Fila de la lista · 24 px">
        <ul className="m-0 list-none space-y-0.5 rounded-lg border border-border-faint p-1.5">
          {FILA.map((f) => {
            const a = agentePorId(f.id)
            const orq = a.orbe.variante === 'orchestrator'
            return (
              <li
                key={f.id}
                className={cn('flex items-center gap-3 rounded-md px-3 py-2', f.habla && 'bg-surface-selected')}
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <OrbeDeAgente
                    agente={a}
                    tamano={orq ? 28 : 24}
                    estado={f.habla ? estado : f.apagado ? 'apagado' : 'quieto'}
                    quieto={quietos}
                    decorativo
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium text-fg">{nombreDelAgente(a, t)}</span>
                  <span className="block truncate text-caption text-fg-muted">{t(`agentes.${a.id}.rol`)}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </Bloque>

      <Bloque titulo="Cabecera del chat · 32 px">
        <div className="flex items-center gap-3 rounded-lg border border-border-faint px-4 py-3">
          <OrbeDeAgente agente={ori} tamano={32} estado={estado} quieto={quietos} decorativo />
          <span className="text-body-sm text-fg">
            {t(`agentes.orbe.${estado}`, { nombre: nombreOri })}
            {estado === 'pensando' || estado === 'trabajando' ? '…' : ''}
          </span>
        </div>
      </Bloque>

      <Bloque titulo="Presentación · 132 px">
        <div className="flex items-center gap-6">
          <span className="flex size-[136px] shrink-0 items-center justify-center">
            <OrbeDeAgente agente={ori} tamano={132} estado={estado} quieto={quietos} />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-h2 font-semibold tracking-[-0.015em]">{nombreOri}</p>
            <p className="text-body-sm text-fg-muted">
              {t('agentes.orquestador.rol')} · {t('agentes.frentes.direccion')}
            </p>
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Los seis estados · Laura, 44 px">
        <div className="grid grid-cols-6 gap-2">
          {ESTADOS.map((e) => (
            <figure key={e.estado} className="flex flex-col items-center gap-2.5">
              <span className="flex size-12 items-center justify-center">
                <OrbeDeAgente agente="cobranza" tamano={44} estado={e.estado} quieto={quietos} decorativo />
              </span>
              <figcaption className="text-[11px] text-fg-muted">{e.texto}</figcaption>
            </figure>
          ))}
        </div>
      </Bloque>

      <button
        type="button"
        onClick={onAbrirEquipo}
        className="mt-auto inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-2 text-body-sm font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid={`abrir-equipo-${look}-${tema}`}
      >
        Abrir «El equipo» en {tema} con {AGENT_ORB_LOOKS[look].nombre}
      </button>
    </article>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className={LABEL}>{titulo}</h3>
      {children}
    </section>
  )
}

/** Control segmentado con la píldora que se desliza (framer `layoutId`). */
function Segmentado({
  id,
  valor,
  opciones,
  onCambio,
}: {
  id: string
  valor: string
  opciones: Array<{ valor: string; texto: string }>
  onCambio: (v: string) => void
}) {
  const reducir = useReducedMotion()
  return (
    <LayoutGroup id={id}>
      <div role="radiogroup" aria-label="Estado de quien habla" className="inline-flex flex-wrap rounded-full border border-border bg-surface p-1">
        {opciones.map((o) => {
          const activo = o.valor === valor
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onCambio(o.valor)}
              className={cn(
                'relative rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors',
                activo ? 'text-bg' : 'text-fg-muted hover:text-fg',
              )}
              data-testid={`boton-estado-${o.valor}`}
            >
              {activo && (
                <motion.span
                  layoutId={reducir ? undefined : 'pildora'}
                  className="absolute inset-0 rounded-full bg-fg"
                  transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative">{o.texto}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
