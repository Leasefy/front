'use client'

/**
 * PromesaCard — tarjeta expandible de UNA promesa de pago (visión #9).
 *
 * Expone, para cada promesa, todo lo que el deudor "prometió":
 *   fecha prometida · valor · quién la hizo · canal · mensaje original ·
 *   estado (con tono token) · seguimiento · resultado.
 *
 * FUENTE: payment_promises_today del daily-report (promesas de HOY). Ese es el
 * único origen agregado agency-wide que existe hoy; los campos que el endpoint
 * NO devuelve (canal, mensaje original textual, seguimiento, resultado) se
 * muestran con em-dash honesto — nunca inventados.
 *
 * T-323: la card es informativa. NO dispara ninguna acción que presione,
 * escale o rechace automáticamente. Las acciones viven en la fila de la tabla
 * y son placeholders honestos ("Próximamente") salvo el cross-link al detalle.
 *
 * Estilo: contrato DS 2026-06-16 — rounded-lg border-border bg-card, tonos
 * semánticos por token (success/warning/danger/primary + *-soft), sin hex.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarBlank,
  CaretDown,
  ChatCircleText,
  CurrencyDollar,
  Megaphone,
  Quotes,
  User,
} from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { Badge } from '@leasefy/cadence'

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>

// ── Estado derivado de la promesa ────────────────────────────────────────────

export type PromesaEstado =
  | 'activa'
  | 'por_vencer'
  | 'incumplida'
  | 'parcial'
  | 'cumplida'

/** Tono semántico por estado — tokens DS (sin hex inline). */
// El pill de estado se armaba a mano (bg/text/ring + `rounded-full`), en
// paralelo al Badge del DS. Ahora el estado se expresa como `variant` de
// Cadence; `text` sobrevive sólo porque la página de Promesas colorea con él
// un texto suelto (la acción sugerida), que NO es un badge.
export const PROMESA_ESTADO_TOKEN: Record<
  PromesaEstado,
  { variant: BadgeVariant; text: string; label: string }
> = {
  activa: { variant: 'info', text: 'text-primary', label: 'Activa' },
  por_vencer: {
    variant: 'warning',
    text: 'text-warning',
    label: 'Por vencer',
  },
  incumplida: {
    variant: 'danger',
    text: 'text-danger',
    label: 'Incumplida',
  },
  parcial: { variant: 'warning', text: 'text-warning', label: 'Parcial' },
  cumplida: {
    variant: 'success',
    text: 'text-success',
    label: 'Cumplida',
  },
}

export interface Promesa {
  /** Key única para React. */
  key: string
  /** Id del deudor — para el cross-link al detalle. */
  debtorId: string
  /** Nombre (o primer nombre) del inquilino que prometió. */
  inquilino: string
  /** Monto prometido (COP). */
  valorCop: number
  /** Fecha prometida de pago (YYYY-MM-DD). */
  fechaPrometida: string
  /** Cuándo se registró la promesa (ISO). */
  registradaEn: string
  estado: PromesaEstado
  /** Quién la hizo (nombre del deudor / canal-actor). El endpoint solo da el deudor. */
  quienLaHizo: string
  /** Canal por el que se hizo (no expuesto por el endpoint hoy → null). */
  canal: string | null
  /** Mensaje original textual de la promesa (no expuesto hoy → null). */
  mensajeOriginal: string | null
  /** Nota de seguimiento (no expuesto hoy → null). */
  seguimiento: string | null
  /** Resultado conciliado (no expuesto hoy → null). */
  resultado: string | null
}

const VACIO = '—'

/** 'YYYY-MM-DD' → Date LOCAL (evita el corrimiento UTC-5 de Bogotá). */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

const DEUDOR_BASE = '/panel/inmobiliaria/cobros/cobranza/deudores'

interface DatoProps {
  icon: React.ComponentType<any>
  label: string
  value: string
  /** Cita textual (mensaje original) — estilo distinto. */
  quote?: boolean
  /** Dato numérico (monto / fecha) — mono tabular. */
  mono?: boolean
}

function Dato({ icon: Icon, label, value, quote = false, mono = false }: DatoProps) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        className="w-4 h-4 mt-0.5 shrink-0 text-fg-muted"
        weight="duotone"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted leading-tight">
          {label}
        </p>
        {quote ? (
          <p className="mt-0.5 text-sm text-fg italic leading-relaxed">
            {value === VACIO ? VACIO : `“${value}”`}
          </p>
        ) : (
          <p
            className={`mt-0.5 text-sm text-fg leading-relaxed break-words${
              mono ? ' font-mono tabular-nums' : ''
            }`}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

export function PromesaCard({ promesa }: { promesa: Promesa }) {
  const { locale, formatCurrency, formatDate } = useI18n()
  const [open, setOpen] = React.useState(false)
  const token = PROMESA_ESTADO_TOKEN[promesa.estado]

  const fechaPrometidaStr = React.useMemo(() => {
    const d = parseLocalDate(promesa.fechaPrometida)
    return d
      ? formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })
      : promesa.fechaPrometida
  }, [promesa.fechaPrometida, formatDate])

  const registradaStr = React.useMemo(() => {
    const d = new Date(promesa.registradaEn)
    return Number.isNaN(d.getTime())
      ? VACIO
      : formatDate(d, { day: 'numeric', month: 'short' })
  }, [promesa.registradaEn, formatDate])

  const panelId = `promesa-panel-${promesa.key}`

  return (
    <li
      className="rounded-lg border border-border bg-surface overflow-hidden"
      data-testid={`promesa-card-${promesa.key}`}
    >
      {/* Cabecera clicable — quién, valor, fecha, estado */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-muted/50 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-fg truncate">
              {promesa.inquilino}
            </span>
            <Badge variant={token.variant} size="sm">
              {token.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <CurrencyDollar className="w-3.5 h-3.5" aria-hidden="true" />
              {formatCurrency(promesa.valorCop)}
            </span>
            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
              <CalendarBlank className="w-3.5 h-3.5" aria-hidden="true" />
              {fechaPrometidaStr}
            </span>
          </div>
        </div>
        <CaretDown
          className={`w-4 h-4 shrink-0 text-fg-muted transition-transform ${
            open ? 'rotate-180' : ''
          } motion-reduce:transition-none`}
          aria-hidden="true"
        />
      </button>

      {/* Detalle — todos los datos de la promesa */}
      {open && (
        <div
          id={panelId}
          className="border-t border-border p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
        >
          <Dato icon={User} label="Quién la hizo" value={promesa.quienLaHizo || VACIO} />
          <Dato
            icon={Megaphone}
            label="Canal"
            value={promesa.canal ?? VACIO}
          />
          <Dato
            icon={CurrencyDollar}
            label="Valor prometido"
            value={formatCurrency(promesa.valorCop)}
          />
          <Dato
            icon={CalendarBlank}
            label="Fecha prometida"
            value={fechaPrometidaStr}
          />
          <Dato
            icon={ChatCircleText}
            label="Registrada"
            value={registradaStr}
          />
          <Dato
            icon={ChatCircleText}
            label="Estado"
            value={token.label}
          />
          <div className="sm:col-span-2">
            <Dato
              icon={Quotes}
              label="Mensaje original"
              value={promesa.mensajeOriginal ?? VACIO}
              quote
            />
          </div>
          <Dato
            icon={ChatCircleText}
            label="Seguimiento"
            value={promesa.seguimiento ?? VACIO}
          />
          <Dato
            icon={ChatCircleText}
            label="Resultado"
            value={promesa.resultado ?? VACIO}
          />

          <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-fg-muted leading-relaxed">
              El mensaje original, el canal y el seguimiento se ven completos en el
              detalle del deudor.
            </p>
            <Button asChild variant="link" size="sm" hideArrow className="shrink-0">
              <Link href={`${DEUDOR_BASE}/${promesa.debtorId}`}>Ver deudor</Link>
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
