'use client'

/**
 * /ai/asegurabilidad/ejecucion — Ejecución en tiempo real (visión §7), PREVIEW.
 *
 * Vista de consulta en paralelo: cuando se ejecuta una consulta de
 * asegurabilidad, cada aseguradora avanza de forma independiente por una
 * máquina de ~11 estados (No consultada → Consultando → … → Aprobado / No
 * asegurable / Error). Esta pantalla documenta esa leyenda de estados con sus
 * colores de marca y muestra filas de aseguradoras de ejemplo.
 *
 * UX-only: aún no hay ejecución en vivo cableada, así que se enmarca como
 * empty-state ("se activa al ejecutar una consulta") + CTA a Nueva consulta.
 * No inventa endpoints — las filas son ejemplos ilustrativos de la leyenda.
 */

import Link from 'next/link'
import {
  ArrowRight,
  Circle,
  CircleNotch,
  Hourglass,
  ChatCircleDots,
  CheckCircle,
  SealCheck,
  XCircle,
  Eye,
  ClipboardText,
  PlugsConnected,
  Warning,
  ClockCountdown,
  Lightning,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.asegurabilidad.ejecucion'
const NUEVA_HREF = '/panel/inmobiliaria/ai/asegurabilidad/nueva'

/**
 * Los ~11 estados de consulta por aseguradora (visión §7).
 * Cada estado define un par de clases Tailwind (chip claro/oscuro) usando los
 * hex de marca para los terminales "felices/críticos" y neutrales para los
 * intermedios. `tone` se usa también para colorear el punto de la fila.
 */
type EstadoTone = 'neutral' | 'info' | 'wait' | 'ok' | 'okCond' | 'bad' | 'review' | 'data' | 'offline' | 'error' | 'expired'

type EstadoDef = {
  key: string
  icon: Icon
  defLabel: string
  defDesc: string
  /** clases del chip (bg + texto + borde), tema claro y oscuro */
  chip: string
  /** clase del punto de estado para las filas de ejemplo */
  dot: string
}

const CHIP_NEUTRAL = 'bg-surface-muted text-fg-muted border-border'
const CHIP_INFO = 'bg-primary-soft text-primary border-primary/25'
const CHIP_WARN = 'bg-warning-soft text-warning border-warning/25'
const CHIP_OK = 'bg-success-soft text-success border-success/25'
const CHIP_BAD = 'bg-danger-soft text-danger border-danger/25'

const ESTADOS: EstadoDef[] = [
  {
    key: 'noConsultada',
    icon: Circle,
    defLabel: 'No consultada',
    defDesc: 'Aún no se ha enviado la solicitud a esta aseguradora.',
    chip: CHIP_NEUTRAL,
    dot: 'bg-fg-muted/50',
  },
  {
    key: 'consultando',
    icon: CircleNotch,
    defLabel: 'Consultando',
    defDesc: 'Enviando la solicitud al portal o API de la aseguradora.',
    chip: CHIP_INFO,
    dot: 'bg-primary',
  },
  {
    key: 'enEspera',
    icon: Hourglass,
    defLabel: 'En espera',
    defDesc: 'La solicitud quedó en cola del lado de la aseguradora.',
    chip: CHIP_WARN,
    dot: 'bg-warning',
  },
  {
    key: 'respondio',
    icon: ChatCircleDots,
    defLabel: 'Respondió',
    defDesc: 'La aseguradora respondió; falta clasificar el resultado.',
    chip: CHIP_INFO,
    dot: 'bg-primary',
  },
  {
    key: 'aprobado',
    icon: CheckCircle,
    defLabel: 'Aprobado',
    defDesc: 'El candidato es asegurable sin condiciones.',
    chip: CHIP_OK,
    dot: 'bg-success',
  },
  {
    key: 'aprobadoCondicionado',
    icon: SealCheck,
    defLabel: 'Aprobado condicionado',
    defDesc: 'Asegurable, pero sujeto a condiciones o ajuste de prima.',
    chip: CHIP_OK,
    dot: 'bg-success',
  },
  {
    key: 'noAsegurable',
    icon: XCircle,
    defLabel: 'No asegurable',
    defDesc: 'La aseguradora rechazó la cobertura para este candidato.',
    chip: CHIP_BAD,
    dot: 'bg-danger',
  },
  {
    key: 'requiereRevision',
    icon: Eye,
    defLabel: 'Requiere revisión manual',
    defDesc: 'La respuesta necesita que una persona la interprete.',
    chip: CHIP_WARN,
    dot: 'bg-warning',
  },
  {
    key: 'faltanDatos',
    icon: ClipboardText,
    defLabel: 'Faltan datos',
    defDesc: 'La aseguradora pide información adicional del candidato.',
    chip: CHIP_WARN,
    dot: 'bg-warning',
  },
  {
    key: 'portalNoDisponible',
    icon: PlugsConnected,
    defLabel: 'Portal no disponible',
    defDesc: 'El portal o API de la aseguradora no está respondiendo.',
    chip: CHIP_NEUTRAL,
    dot: 'bg-fg-muted',
  },
  {
    key: 'error',
    icon: Warning,
    defLabel: 'Error',
    defDesc: 'Ocurrió un error técnico durante la consulta.',
    chip: CHIP_BAD,
    dot: 'bg-danger',
  },
  {
    key: 'resultadoVencido',
    icon: ClockCountdown,
    defLabel: 'Resultado vencido',
    defDesc: 'La respuesta caducó; debe volver a consultarse.',
    chip: CHIP_NEUTRAL,
    dot: 'bg-fg-muted',
  },
]

/** Filas de aseguradoras de ejemplo (ilustrativas de la leyenda, no datos reales). */
const FILAS_EJEMPLO: { aseguradora: string; estadoKey: string }[] = [
  { aseguradora: 'Aseguradora A', estadoKey: 'aprobado' },
  { aseguradora: 'Aseguradora B', estadoKey: 'consultando' },
  { aseguradora: 'Aseguradora C', estadoKey: 'aprobadoCondicionado' },
  { aseguradora: 'Aseguradora D', estadoKey: 'requiereRevision' },
  { aseguradora: 'Aseguradora E', estadoKey: 'noAsegurable' },
  { aseguradora: 'Aseguradora F', estadoKey: 'enEspera' },
  { aseguradora: 'Aseguradora G', estadoKey: 'portalNoDisponible' },
]

function EstadoChip({ estado, t }: { estado: EstadoDef; t: (k: string, fb: string) => string }) {
  const Ico = estado.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${estado.chip}`}
    >
      <Ico className="h-3.5 w-3.5" weight="duotone" aria-hidden="true" />
      {t(`${NS}.estado.${estado.key}.label`, estado.defLabel)}
    </span>
  )
}

function AsegurabilidadEjecucion() {
  const { t: rawT } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const t = (key: string, fallback: string): string => {
    const r = rawT(key)
    return r === key ? fallback : r
  }

  const estadoByKey = (k: string) => ESTADOS.find((e) => e.key === k) ?? ESTADOS[0]

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t(`${NS}.title`, 'Ejecución en tiempo real')}
          </h1>
          <p className="text-sm text-fg-muted mt-1 max-w-2xl">
            {t(
              `${NS}.subtitle`,
              'Cuando ejecutas una consulta, cada aseguradora avanza en paralelo por su propio estado. Aquí verás el progreso en vivo de cada una.',
            )}
          </p>
        </div>
        <Button hideArrow asChild className="shrink-0">
          <Link href={NUEVA_HREF}>
            <Lightning className="h-4 w-4" weight="bold" aria-hidden="true" />
            {t(`${NS}.cta`, 'Nueva consulta')}
          </Link>
        </Button>
      </header>

      {/* Empty-state framing — la ejecución en vivo se activa al consultar.
          Sin CTA propio: el header ya es dueño de "Nueva consulta" (UI-DS-CONTRACT §6). */}
      <EmptyState
        icon={Lightning}
        title={t(`${NS}.empty.title`, 'No hay ninguna consulta en curso')}
        description={t(
          `${NS}.empty.description`,
          'Esta vista se activa al ejecutar una consulta de asegurabilidad: cada aseguradora aparecerá con su estado actualizándose en tiempo real. Abajo puedes ver la leyenda de estados posibles.',
        )}
      />

      {/* Leyenda de estados (visión §7) */}
      <section aria-label={t(`${NS}.leyenda.title`, 'Leyenda de estados')}>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t(`${NS}.leyenda.title`, 'Leyenda de estados')}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {t(
            `${NS}.leyenda.desc`,
            'Cada aseguradora puede estar en uno de estos estados durante una consulta.',
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ESTADOS.map((estado) => {
            const Ico = estado.icon
            return (
              <div
                key={estado.key}
                className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
                data-estado={estado.key}
              >
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${estado.chip}`}
                >
                  <Ico className="h-4.5 w-4.5" weight="duotone" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t(`${NS}.estado.${estado.key}.label`, estado.defLabel)}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    {t(`${NS}.estado.${estado.key}.desc`, estado.defDesc)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Filas de aseguradoras de ejemplo */}
      <section aria-label={t(`${NS}.ejemplo.title`, 'Ejemplo de consulta en paralelo')}>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t(`${NS}.ejemplo.title`, 'Ejemplo de consulta en paralelo')}
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          {t(
            `${NS}.ejemplo.desc`,
            'Así se vería el tablero con varias aseguradoras consultándose a la vez. Datos ilustrativos.',
          )}
        </p>
        <ul
          role="list"
          className="rounded-xl border border-border bg-card divide-y divide-border"
        >
          {FILAS_EJEMPLO.map((fila) => {
            const estado = estadoByKey(fila.estadoKey)
            return (
              <li
                key={fila.aseguradora}
                className="px-4 py-3 flex items-center justify-between gap-3"
                data-estado={estado.key}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full shrink-0 ${estado.dot}`}
                  />
                  <span className="text-sm font-medium text-foreground truncate">{fila.aseguradora}</span>
                </div>
                <EstadoChip estado={estado} t={t} />
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2">
          {t(
            `${NS}.ejemplo.disclaimer`,
            'Las aseguradoras y estados mostrados son ejemplos; los datos reales aparecerán al ejecutar una consulta.',
          )}
        </p>
      </section>

      {/* Cómo funciona — la ejecución en paralelo */}
      <section className="rounded-xl border border-border bg-card p-5 flex items-start gap-3 max-w-3xl">
        <span className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
          <Lightning className="w-5 h-5 text-fg" weight="duotone" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">
            {t(`${NS}.como.title`, 'Cómo funciona la ejecución')}
          </h2>
          <p className="text-sm text-fg-muted mt-0.5">
            {t(
              `${NS}.como.desc`,
              'Al lanzar una consulta, Leasefy contacta a cada aseguradora configurada de forma simultánea. No tienes que esperar a una para empezar otra: el tablero se actualiza a medida que cada portal responde, y puedes abrir el caso apenas haya un veredicto.',
            )}
          </p>
          <Link
            href={NUEVA_HREF}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t(`${NS}.cta`, 'Nueva consulta')}
            <ArrowRight className="w-4 h-4" weight="bold" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  )
}

export default function AsegurabilidadEjecucionPage() {
  return (
    <PageGuard module="cotizador">
      <AsegurabilidadEjecucion />
    </PageGuard>
  )
}
