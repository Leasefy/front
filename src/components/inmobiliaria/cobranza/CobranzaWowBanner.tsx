'use client'

/**
 * CobranzaWowBanner — el momento wow de la Sala de cobranza (visión #21).
 *
 * Anatomía (sigue el BRAND-CONTRACT de FeatureAnnouncementCard / Sala avalúos):
 *   1. Banner narrativo: Eyebrow (BrandDot + mono uppercase) + frase grande
 *      con los datos REALES del día + footer hairline con CTA brand-blue
 *      (flecha con la firma translate-x) → /cobranza/pendientes.
 *   2. Fila de 4 cards de beneficio: Recaudado hoy · Promesas de hoy ·
 *      Esperan tu aprobación (→ pendientes) · Candidatos a prejurídico
 *      (→ deudores?stage=S3).
 *
 * Datos — SOLO APIs existentes:
 *   - overview (props, ya cargado por la página): enMora (S1..SX), llamadasHoy,
 *     escalacionesPendientes, S3 count, pagadoHoyCop (fallback).
 *   - useDailyReport: payments_today_total_cop + payment_promises_today
 *     (el endpoint del agente SÍ devuelve `payment_promises_today` —
 *     build-daily-report.ts — aunque el tipo del hook aún no lo declara;
 *     se extiende localmente y se lee de forma defensiva).
 *   - useLegalArtifacts({status:'pending_human_review'}) → cartas pendientes.
 *   - useInsuranceClaims({status:'pending_human_review'}) → siniestros.
 *
 * Degradación: si el daily-report falla, recuperadoCop cae al pagadoHoyCop
 * del overview y promesas a 0 — el banner NUNCA rompe la página.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CurrencyDollar,
  Handshake,
  Scales,
  Stamp,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import type { DailyReportResponse } from '@/lib/hooks/cobranza/use-daily-report'
import { useLegalArtifacts } from '@/lib/hooks/cobranza/use-legal-artifacts'
import { useInsuranceClaims } from '@/lib/hooks/cobranza/use-insurance-claims'

const NS = 'inmobiliaria.ai.cobranza'

const PENDIENTES_HREF = '/panel/inmobiliaria/ai/cobranza/pendientes'
const PREJURIDICO_HREF = '/panel/inmobiliaria/ai/cobranza/deudores?stage=S3'

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * payment_promises_today — shape real del endpoint (agent
 * build-daily-report.ts → DailyReportPtpEntry); el tipo del hook del front
 * aún no lo declara, así que se extiende aquí sin tocar el hook.
 */
interface PtpEntry {
  debtor_id: string
  debtor_first_name: string
  amount_cop: number
  due_date: string
  status: string
  created_at: string
}

type DailyReportWithPtps = DailyReportResponse & {
  payment_promises_today?: PtpEntry[]
}

/** 'YYYY-MM-DD' → Date LOCAL (evita el corrimiento UTC-5 de Bogotá). */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export interface CobranzaWowBannerProps {
  /** Suma de counts de stages S1..SX (overview). */
  enMora: number
  /** kpis.llamadasHoy (overview). */
  gestionados: number
  /** kpis.escalacionesPendientes (overview). */
  escalacionesPendientes: number
  /** Count del stage S3 (overview). */
  prejuridicoCount: number
  /** kpis.pagadoHoyCop (overview) — fallback si el daily-report falla. */
  pagadoHoyCopFallback: number
}

export function CobranzaWowBanner({
  enMora,
  gestionados,
  escalacionesPendientes,
  prejuridicoCount,
  pagadoHoyCopFallback,
}: CobranzaWowBannerProps) {
  const { t, locale } = useI18n()

  const { data: daily, isLoading: dailyLoading } = useDailyReport()
  const { data: cartas, isLoading: cartasLoading } = useLegalArtifacts({
    status: 'pending_human_review',
  })
  const { data: siniestros, isLoading: siniestrosLoading } = useInsuranceClaims({
    status: 'pending_human_review',
  })

  // ── Datos del día (con degradación al overview) ──────────────────────────
  const recuperadoCop =
    daily?.summary?.payments_today_total_cop ?? pagadoHoyCopFallback

  const ptps = React.useMemo<PtpEntry[]>(() => {
    const raw = (daily as DailyReportWithPtps | null)?.payment_promises_today
    if (!Array.isArray(raw)) return []
    return [...raw].sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [daily])

  const promesas = ptps.length
  const proximaPtp = ptps[0] ?? null

  const cartasPendientes = cartas?.artifacts?.length ?? 0
  const siniestrosPendientes = siniestros?.claims?.length ?? 0
  const porAprobar = escalacionesPendientes + cartasPendientes + siniestrosPendientes

  // La frase espera a que las 3 fuentes asienten (todas resuelven isLoading
  // también en error) para no mostrar números que saltan.
  const fraseLoading = dailyLoading || cartasLoading || siniestrosLoading

  const proximaDetalle = React.useMemo(() => {
    if (!proximaPtp) return null
    const fecha = parseLocalDate(proximaPtp.due_date)
    const fechaStr = fecha
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(fecha)
      : proximaPtp.due_date
    return `${proximaPtp.debtor_first_name} · ${COP_FORMATTER.format(proximaPtp.amount_cop)} · ${fechaStr}`
  }, [proximaPtp, locale])

  return (
    <div className="space-y-4" data-testid="cobranza-wow">
      {/* ── 1. Banner narrativo ──────────────────────────────────────────── */}
      <section
        aria-labelledby="cobranza-wow-titulo"
        className="rounded-xl border border-border bg-surface p-5 md:p-6"
        data-testid="cobranza-wow-banner"
      >
        {/* Eyebrow — BrandDot + uppercase (único uppercase permitido, contrato §4) */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-[2px] bg-primary shrink-0"
          />
          <span
            id="cobranza-wow-titulo"
            className="text-xs font-medium uppercase tracking-wide text-primary"
          >
            {t(`${NS}.resumen.wow.titulo`)}
          </span>
        </div>

        {/* Frase narrativa con datos reales */}
        {fraseLoading ? (
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="h-6 w-full max-w-xl rounded bg-surface-muted animate-pulse" />
            <div className="h-6 w-2/3 max-w-md rounded bg-surface-muted animate-pulse" />
          </div>
        ) : (
          <p className="mt-3.5 max-w-3xl text-xl md:text-2xl font-medium tracking-tight leading-snug text-fg">
            {t(`${NS}.resumen.wow.frase`, {
              enMora,
              gestionados,
              recuperadoCop: COP_FORMATTER.format(recuperadoCop),
              promesas,
              porAprobar,
            })}
          </p>
        )}

        {/* Footer — hairline + CTA brand (CTA de hero: flecha de marca) */}
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-end">
          <Button asChild data-testid="cobranza-wow-cta">
            <Link href={PENDIENTES_HREF}>
              {t(`${NS}.resumen.bloques.verPendientes`)}
              {!fraseLoading && porAprobar > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-xs font-semibold font-mono tabular-nums">
                  {porAprobar}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </section>

      {/* ── 2. Fila de 4 cards de beneficio ─────────────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="cobranza-wow-cards"
      >
        <BenefitCard
          icon={CurrencyDollar}
          iconColor="text-success"
          label={t(`${NS}.resumen.bloques.recuperadoHoy`)}
          value={COP_FORMATTER.format(recuperadoCop)}
          isLoading={dailyLoading}
          testId="cobranza-wow-card-recuperado"
        />
        <BenefitCard
          icon={Handshake}
          iconColor="text-primary"
          label={t(`${NS}.resumen.bloques.promesasHoy`)}
          value={String(promesas)}
          detail={proximaDetalle ?? undefined}
          isLoading={dailyLoading}
          testId="cobranza-wow-card-promesas"
        />
        <BenefitCard
          icon={Stamp}
          iconColor="text-warning"
          label={t(`${NS}.resumen.bloques.porAprobar`)}
          value={String(porAprobar)}
          href={PENDIENTES_HREF}
          isLoading={cartasLoading || siniestrosLoading}
          testId="cobranza-wow-card-aprobar"
        />
        <BenefitCard
          icon={Scales}
          iconColor="text-danger"
          label={t(`${NS}.resumen.bloques.riesgoJuridico`)}
          value={String(prejuridicoCount)}
          href={PREJURIDICO_HREF}
          testId="cobranza-wow-card-prejuridico"
        />
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────────

interface BenefitCardProps {
  icon: Icon
  iconColor: string
  label: string
  value: string
  /** Línea de dato secundaria (p.ej. la próxima promesa: quién · cuánto · cuándo). */
  detail?: string
  /** Si viene, toda la card es un Link (hover border brand + flecha). */
  href?: string
  isLoading?: boolean
  testId?: string
}

function BenefitCard({
  icon: IconCmp,
  iconColor,
  label,
  value,
  detail,
  href,
  isLoading = false,
  testId,
}: BenefitCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <IconCmp size={18} className={iconColor} weight="duotone" aria-hidden="true" />
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle leading-tight">
          {label}
        </p>
        {href && (
          <ArrowRight
            className="ml-auto w-3.5 h-3.5 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
            aria-hidden="true"
          />
        )}
      </div>
      {isLoading ? (
        <div className="mt-2.5 h-7 w-20 rounded bg-surface-muted animate-pulse" />
      ) : (
        <p className="mt-2 text-xl font-semibold font-mono tabular-nums text-fg">
          {value}
        </p>
      )}
      {!isLoading && detail && (
        <p className="mt-1 text-xs text-fg-subtle font-mono tabular-nums truncate">
          {detail}
        </p>
      )}
    </>
  )

  const baseClass = 'rounded-xl border border-border bg-surface p-4'

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} group block hover:border-primary/40 transition-colors motion-reduce:transition-none`}
        data-testid={testId}
      >
        {body}
      </Link>
    )
  }

  return (
    <div className={baseClass} data-testid={testId}>
      {body}
    </div>
  )
}
