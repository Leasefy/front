'use client'

/**
 * PilotoPulso — el tablero vivo: qué está pasando ahora, qué puede explotar.
 *
 * La torre ya respondía «qué necesita de mí» (la bandeja) y «qué pasó» (el
 * feed). Faltaba el presente: si el piloto está trabajando en este momento,
 * y si algo se está saliendo de cauce ANTES de que se convierta en una fila
 * más de la bandeja.
 *
 * Tres piezas, en orden de lectura:
 *
 *   1. El ESTADO con su titular — una frase que resume el momento. El punto
 *      late cuando hay trabajo en curso: es la señal de que esto está vivo.
 *   2. AHORA MISMO — la llamada que está sonando, el chat con la ventana
 *      abierta, la decisión que un workflow está esperando. Todo con su
 *      «desde cuándo».
 *   3. ALERTAS — riesgos derivados de reglas explícitas sobre datos reales,
 *      ordenados por severidad. Cada una dice qué pasa y a dónde ir.
 *
 * Nada de esto se inventa en el front: el micro calcula estado, titular,
 * alertas y conteos (`GET /ai-hub/pulso`). Acá solo se pinta.
 *
 * Si el endpoint todavía no existe (404 → `notAvailable`) el panel no se
 * dibuja: la torre sigue funcionando sin él.
 */

import {
  ArrowUpRight,
  CheckCircle,
  ChatCircleDots,
  Info,
  PhoneCall,
  Pulse,
  Timer,
  WarningCircle,
  WarningOctagon,
  type Icon,
} from '@phosphor-icons/react'
import Link from 'next/link'

import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import type { PulsoAlerta, PulsoEnCurso, PulsoEstado, PulsoResponse } from '@/lib/api/piloto'

/** El estado tiñe SOLO el punto y el borde: el resto del panel queda neutro. */
const ESTADO_META: Record<PulsoEstado, { punto: string; borde: string; icono: Icon }> = {
  ok: { punto: 'bg-success', borde: 'border-border', icono: CheckCircle },
  atencion: { punto: 'bg-warning', borde: 'border-warning/40', icono: WarningCircle },
  critico: { punto: 'bg-danger', borde: 'border-danger/40', icono: WarningOctagon },
}

const SEVERIDAD_META: Record<
  PulsoAlerta['severidad'],
  { icono: Icon; texto: string; fondo: string }
> = {
  critica: { icono: WarningOctagon, texto: 'text-danger', fondo: 'bg-danger-soft' },
  alta: { icono: WarningCircle, texto: 'text-danger', fondo: 'bg-danger-soft' },
  media: { icono: WarningCircle, texto: 'text-warning', fondo: 'bg-warning-soft' },
  info: { icono: Info, texto: 'text-info', fondo: 'bg-info-soft' },
}

const EN_CURSO_ICON: Array<{ match: RegExp; icon: Icon }> = [
  { match: /llamada/i, icon: PhoneCall },
  { match: /conversacion|conversación|whatsapp|chat/i, icon: ChatCircleDots },
  { match: /espera|decision|decisión/i, icon: Timer },
]

function iconoEnCurso(tipo: string): Icon {
  return EN_CURSO_ICON.find((e) => e.match.test(tipo))?.icon ?? Pulse
}

export interface PilotoPulsoProps {
  data: PulsoResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  /**
   * La lectura del Gerente (del briefing). Va acá y no en una banda aparte:
   * dos textos que resumen el mismo momento, uno encima del otro, se leen
   * como repetición. Una sola voz arriba.
   */
  lectura?: string[]
}

export function PilotoPulso({ data, isLoading, error, notAvailable, lectura }: PilotoPulsoProps) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div
        className="h-32 animate-pulse rounded-lg border border-border bg-surface-muted"
        role="status"
        aria-label={t('common.loading')}
      />
    )
  }

  // Sin endpoint o con la fuente caída, la torre sigue: este panel no se pinta.
  if (notAvailable || error || !data) return null

  const meta = ESTADO_META[data.estado] ?? ESTADO_META.ok
  const hayTrabajo = data.enCurso.length > 0
  const alertas = [...data.alertas].sort((a, b) => orden(a.severidad) - orden(b.severidad))

  return (
    <section
      className={`overflow-hidden rounded-lg border bg-surface ${meta.borde}`}
      aria-label={t('inmobiliaria.piloto.pulso.titulo')}
    >
      {/* Estado + titular */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {hayTrabajo && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${meta.punto}`}
            />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.punto}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{data.titular}</p>
          {lectura && lectura.length > 0 && (
            <p className="mt-0.5 text-sm text-fg-muted">{lectura.join(' ')}</p>
          )}
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
            {t(`inmobiliaria.piloto.pulso.estado.${data.estado}`)}
          </p>
        </div>
        {/* Los números de hoy, en una línea */}
        <dl className="hidden shrink-0 gap-4 sm:flex">
          <Numero label={t('inmobiliaria.piloto.pulso.hoyLlamadas')} valor={data.hoy.llamadas} />
          <Numero
            label={t('inmobiliaria.piloto.pulso.hoyChats')}
            valor={data.hoy.conversacionesActivas}
          />
          <Numero
            label={t('inmobiliaria.piloto.pulso.hoyResueltas')}
            valor={data.hoy.decisionesResueltas}
          />
          {typeof data.hoy.contactosPlaneados === 'number' && (
            <Numero
              label={t('inmobiliaria.piloto.pulso.hoyPlaneados')}
              valor={data.hoy.contactosPlaneados}
            />
          )}
        </dl>
      </div>

      {(data.enCurso.length > 0 || alertas.length > 0) && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {/* Ahora mismo */}
          <div className="bg-surface px-4 py-3">
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
              {t('inmobiliaria.piloto.pulso.ahora')}
            </h3>
            {data.enCurso.length === 0 ? (
              <p className="text-xs text-fg-subtle">{t('inmobiliaria.piloto.pulso.ahoraVacio')}</p>
            ) : (
              <ul role="list" className="space-y-2">
                {data.enCurso.slice(0, 4).map((item) => (
                  <FilaEnCurso key={item.id} item={item} />
                ))}
              </ul>
            )}
          </div>

          {/* Alertas */}
          <div className="bg-surface px-4 py-3">
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg-subtle">
              {t('inmobiliaria.piloto.pulso.alertas')}
            </h3>
            {alertas.length === 0 ? (
              <p className="text-xs text-fg-subtle">
                {t('inmobiliaria.piloto.pulso.alertasVacio')}
              </p>
            ) : (
              <ul role="list" className="space-y-2">
                {alertas.slice(0, 4).map((a) => (
                  <FilaAlerta key={a.id} alerta={a} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function orden(s: PulsoAlerta['severidad']): number {
  return { critica: 0, alta: 1, media: 2, info: 3 }[s] ?? 9
}

function Numero({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="text-right">
      <dt className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="font-mono text-sm font-semibold tabular-nums text-fg">{valor}</dd>
    </div>
  )
}

function FilaEnCurso({ item }: { item: PulsoEnCurso }) {
  const { t } = useI18n()
  const ItemIcon = iconoEnCurso(item.tipo)
  const contenido = (
    <>
      <ItemIcon
        weight="duotone"
        className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-fg">{item.titulo}</span>
        {item.detalle && (
          <span className="block truncate text-[11px] text-fg-muted">{item.detalle}</span>
        )}
      </span>
      {item.desde && (
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
          {relativeTime(item.desde, t)}
        </span>
      )}
    </>
  )
  return (
    <li>
      {item.href ? (
        <Link
          href={item.href}
          className="flex items-start gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-muted"
        >
          {contenido}
        </Link>
      ) : (
        <div className="flex items-start gap-2 px-1 py-0.5">{contenido}</div>
      )}
    </li>
  )
}

function FilaAlerta({ alerta }: { alerta: PulsoAlerta }) {
  const meta = SEVERIDAD_META[alerta.severidad] ?? SEVERIDAD_META.info
  const AlertaIcon = meta.icono
  const contenido = (
    <>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${meta.fondo}`}
        aria-hidden="true"
      >
        <AlertaIcon weight="fill" className={`h-3 w-3 ${meta.texto}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-fg">{alerta.titulo}</span>
        <span className="block truncate text-[11px] text-fg-muted">{alerta.detalle}</span>
      </span>
      {alerta.href && (
        <ArrowUpRight
          weight="bold"
          className="mt-0.5 h-3 w-3 shrink-0 text-fg-subtle"
          aria-hidden="true"
        />
      )}
    </>
  )
  return (
    <li>
      {alerta.href ? (
        <Link
          href={alerta.href}
          className="flex items-start gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-surface-muted"
        >
          {contenido}
        </Link>
      ) : (
        <div className="flex items-start gap-2 px-1 py-0.5">{contenido}</div>
      )}
    </li>
  )
}
