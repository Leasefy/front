'use client'

/**
 * CobranzaTeTocaATi — lo único de la pantalla que pide que una persona haga
 * algo. Va primero y es la sección con más peso visual; todo lo demás es
 * información.
 *
 * ── Qué reemplaza y por qué ─────────────────────────────────────────────────
 * El Resumen tenía CUATRO superficies contestando la misma pregunta:
 *
 *   · el banner «Ver pendientes 6»
 *   · la fila de tarjetas, con «Esperan tu aprobación 6»
 *   · la tarjeta «Revisar escalaciones pendientes», con el botón 6
 *   · «Qué necesita tu atención hoy», con la lista real
 *
 * Cuatro veces el mismo 6, tres botones a dos rutas distintas, y la lista —lo
 * único accionable— al final. Acá es una sola: la frase de estado, lo urgente
 * en su propia línea, y los pendientes como lista.
 *
 * ── El orden no es estético ─────────────────────────────────────────────────
 * 1. Siniestros: son los únicos que bloquean plata. La base no deja radicar sin
 *    firma humana, así que mientras nadie apruebe, la reclamación no se
 *    presenta ante la aseguradora. Van con su antigüedad, que es la parte que
 *    mueve a actuar.
 * 2. Alertas de umbral del reporte diario.
 * 3. El resto de pendientes, por prioridad.
 *
 * Los siniestros NO se repiten abajo: `usePendientes` ya los trae, y mostrarlos
 * en el aviso y otra vez en la lista es contar dos veces el mismo trabajo.
 */

import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, Siren, Warning } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { usePendientes, type PendienteItem } from '@/lib/hooks/cobranza/use-pendientes'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'

const NS = 'inmobiliaria.ai.cobranza.pendientes'
const PENDIENTES_HREF = '/panel/inmobiliaria/ai/cobranza/pendientes'
const SINIESTROS_HREF = '/panel/inmobiliaria/ai/cobranza/siniestros'

/** Cuántos pendientes se muestran acá. El resto, en su pantalla. */
const TOPE = 5

const PRIORIDAD_TOKEN: Record<
  PendienteItem['prioridad'],
  { bg: string; text: string; ring: string; label: string }
> = {
  alta: { bg: 'bg-danger-soft', text: 'text-danger', ring: 'ring-danger', label: 'Alta' },
  media: { bg: 'bg-warning-soft', text: 'text-warning', ring: 'ring-warning', label: 'Media' },
  baja: { bg: 'bg-success-soft', text: 'text-success', ring: 'ring-success', label: 'Baja' },
}

const GRUPO_ES: Record<string, string> = {
  escalaciones: 'Escalación',
  cartas: 'Carta prejurídica',
  siniestros: 'Siniestro',
  planes: 'Plan de pago',
}

/** Días enteros transcurridos desde una fecha ISO. */
function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

function haceCuanto(iso: string): string {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seg < 60) return `hace ${seg}s`
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min}m`
  const hr = Math.round(min / 60)
  if (hr < 24) return `hace ${hr}h`
  return `hace ${Math.round(hr / 24)}d`
}

function Fila({ item }: { item: PendienteItem }) {
  const token = PRIORIDAD_TOKEN[item.prioridad]
  const grupo = GRUPO_ES[item.grupo] ?? item.grupo
  // Las cartas no traen deudor en el resumen del endpoint, así que `titulo`
  // viene vacío. Antes eso pintaba «Carta prejurídica» dos veces, una encima de
  // la otra: sin nombre no hay segunda línea que escribir.
  const titulo = item.titulo || grupo
  const subtitulo = item.titulo ? grupo : null

  return (
    <li>
      <Link
        href={item.href}
        data-testid={`te-toca-${item.key}`}
        className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-surface-muted"
      >
        <span
          className={`inline-flex items-center text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 shrink-0 ${token.bg} ${token.text} ${token.ring}`}
        >
          {token.label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg truncate">{titulo}</p>
          {subtitulo && <p className="text-xs text-fg-muted truncate">{subtitulo}</p>}
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-fg-muted tabular-nums shrink-0">
          <Clock className="w-3 h-3" aria-hidden="true" />
          {haceCuanto(item.fecha)}
        </span>
        <ArrowRight
          className="w-4 h-4 text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

export interface CobranzaTeTocaATiProps {
  /** Casos en mora (S1..SX) del overview. */
  enMora: number
  /** Casos que el agente trabajó hoy. */
  gestionados: number
}

export function CobranzaTeTocaATi({ enMora, gestionados }: CobranzaTeTocaATiProps) {
  const { t } = useI18n()
  const { items, isLoading, error } = usePendientes()
  const { data: reporte } = useDailyReport()

  const alertas = reporte?.alerts ?? []

  // Los siniestros salen de `usePendientes`, NO de un `useInsuranceClaims`
  // propio. Con dos llamadas al mismo endpoint las respuestas llegaban
  // distintas: el aviso decía que no había ninguno mientras la lista de abajo
  // mostraba dos. Una pantalla, una fuente.
  const porRadicar = items.filter((i) => i.grupo === 'siniestros')
  const restoDePendientes = items.filter((i) => i.grupo !== 'siniestros')

  const visibles = restoDePendientes.slice(0, TOPE)
  const restantes = Math.max(0, restoDePendientes.length - TOPE)
  const totalQueEspera = porRadicar.length + restoDePendientes.length

  const frase =
    totalQueEspera === 0
      ? 'Nada espera tu aprobación.'
      : `${totalQueEspera} ${totalQueEspera === 1 ? 'decisión espera' : 'decisiones esperan'} tu aprobación.`

  return (
    <section className="space-y-3" data-testid="cobranza-te-toca">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-fg">Te toca a ti</h2>
        {/* La frase de estado. Antes ocupaba un banner entero con las mismas
            cifras que repetían las tarjetas de abajo. */}
        <p className="text-sm text-fg-muted max-w-2xl">
          <span className="text-fg font-medium">{frase}</span>{' '}
          El agente gestionó{' '}
          <span className="font-mono tabular-nums text-fg">{gestionados}</span> de tus{' '}
          <span className="font-mono tabular-nums text-fg">{enMora}</span> casos en mora hoy.
        </p>
      </div>

      {/* 1 — Siniestros: los únicos que bloquean plata. */}
      {porRadicar.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-warning/30 bg-warning-soft p-3 flex items-start gap-3 text-sm text-warning"
        >
          <Siren className="w-4 h-4 shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
          <div className="flex-1 min-w-0 space-y-1">
            <p>
              <strong className="font-semibold">
                {porRadicar.length === 1
                  ? '1 siniestro espera tu firma'
                  : `${porRadicar.length} siniestros esperan tu firma`}
              </strong>
              {(() => {
                const dias = porRadicar.reduce((m, c) => Math.max(m, diasDesde(c.fecha)), 0)
                if (dias === 0) return '.'
                return (
                  <>
                    {' — el más antiguo lleva '}
                    <span className="font-mono tabular-nums">{dias}</span>
                    {dias === 1 ? ' día' : ' días'}.
                  </>
                )
              })()}
            </p>
            <p className="text-xs opacity-90">
              Hasta que los apruebes no se radican ante la aseguradora.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" hideArrow className="shrink-0">
            <Link href={SINIESTROS_HREF}>Revisar</Link>
          </Button>
        </div>
      )}

      {/* 2 — Alertas de umbral. `message_es` viene redactado del agente. */}
      {alertas.map((a, i) => (
        <div
          key={`${a.code}-${i}`}
          role="alert"
          className={[
            'rounded-xl border p-3 flex items-start gap-3 text-sm',
            a.level === 'CRITICAL'
              ? 'border-danger/30 bg-danger-soft text-danger'
              : 'border-warning/30 bg-warning-soft text-warning',
          ].join(' ')}
        >
          <Warning className="w-4 h-4 shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
          <p>{a.message_es}</p>
        </div>
      ))}

      {/* 3 — El resto, por prioridad. */}
      {isLoading && items.length === 0 && !error && (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      )}

      {/* Cargando, falló y «no hay» son tres cosas distintas. Sobre un fallo no
          se dice «todo al día»: no lo sabemos. */}
      {error && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
        >
          No pudimos cargar tus pendientes. {error}
        </div>
      )}

      {!isLoading && !error && totalQueEspera === 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center space-y-1">
          <CheckCircle
            className="w-6 h-6 text-success mx-auto"
            weight="duotone"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-fg">{t(`${NS}.vacio`)}</p>
          <p className="text-xs text-fg-muted">{t(`${NS}.vacioHint`)}</p>
        </div>
      )}

      {visibles.length > 0 && (
        <ul className="space-y-2">
          {visibles.map((item) => (
            <Fila key={item.key} item={item} />
          ))}
        </ul>
      )}

      {restantes > 0 && (
        <Button asChild variant="outline" size="sm" hideArrow className="w-full sm:w-auto">
          <Link href={PENDIENTES_HREF}>
            Ver {restantes} {restantes === 1 ? 'pendiente más' : 'pendientes más'}
          </Link>
        </Button>
      )}
    </section>
  )
}
