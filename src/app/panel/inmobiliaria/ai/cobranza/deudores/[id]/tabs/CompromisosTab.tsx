'use client'

/**
 * CompromisosTab — lo que el deudor y el caso tienen comprometido.
 *
 * Cuatro secciones, en orden de frecuencia real:
 *   1. Promesas de pago — EL compromiso más común (el agente registra una en
 *      cada llamada donde el deudor se compromete). Faltaba entera: 46/46
 *      deudores con promesa veían «Sin compromisos registrados» (medido en la
 *      base dev, 2026-08-25). La pestaña mentía por omisión.
 *   2. Planes de pago  3. Siniestros  4. Documentos legales.
 *
 * Nada de slugs crudos ni números sin formato: estado con etiqueta y color,
 * montos en COP, fechas es-CO, y la promesa abierta ya vencida lo dice con
 * todas las letras («vencida hace N días») — es el dato que dispara la
 * siguiente gestión. La promesa que nació en una llamada la enlaza
 * (LlamadaDetalleSheet), igual que los memos.
 */

import * as React from 'react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { useDebtorCompromisos } from '@/lib/hooks/cobranza/use-debtor-compromisos'
import { Button } from '@/components/ui'
import { LlamadaDetalleSheet } from '@/components/inmobiliaria/cobranza/LlamadaDetalleSheet'
import { channelLabel } from '@/lib/cobranza/call-vocab'

void React

interface CompromisosTabProps {
  debtorId: string
}

// ── Vocabularios (validados contra los enums reales del agente) ──────────────

const PROMESA_ESTADO: Record<string, { label: string; tono: string }> = {
  open: { label: 'Abierta', tono: 'bg-warning-soft text-warning' },
  kept: { label: 'Cumplida', tono: 'bg-success-soft text-success' },
  partially_kept: { label: 'Cumplida en parte', tono: 'bg-warning-soft text-warning' },
  broken: { label: 'Incumplida', tono: 'bg-danger-soft text-danger' },
  superseded: { label: 'Reemplazada por una nueva', tono: 'bg-surface-muted text-fg-muted' },
}

const PLAN_ESTADO: Record<string, string> = {
  draft: 'Borrador',
  offered: 'Ofrecido',
  accepted: 'Aceptado',
  active: 'Activo',
  completed: 'Completado',
  defaulted: 'Incumplido',
}

const SINIESTRO_ESTADO: Record<string, string> = {
  draft: 'Borrador',
  pending_human_review: 'Espera tu firma',
  filed: 'Radicado ante la aseguradora',
  accepted: 'Aceptado por la aseguradora',
  rejected: 'Rechazado',
}

const CARTA_ESTADO: Record<string, string> = {
  pending_human_review: 'Espera tu aprobación',
  approved: 'Aprobada',
  sent: 'Enviada',
  void: 'Anulada',
}

const CARTA_TIPO: Record<string, string> = {
  pre_judicial_letter: 'Carta prejurídica',
  pre_bureau_notification: 'Notificación a centrales de riesgo',
}

/** Nunca el slug con guiones: si el mapa no lo conoce, al menos se lee. */
function etiqueta(mapa: Record<string, string>, slug: string): string {
  return mapa[slug] ?? slug.replaceAll('_', ' ')
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function fecha(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

function diasDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

export function CompromisosTab({ debtorId }: CompromisosTabProps) {
  const { t, locale } = useI18n()
  const { data, isLoading, error, refetch } = useDebtorCompromisos({ debtorId })
  const [llamadaAbierta, setLlamadaAbierta] = useState<string | null>(null)

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-24 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.compromisos.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.compromisos.errorRetry')}
        </Button>
      </div>
    )
  }

  const promesas = data?.paymentPromises ?? []
  const paymentPlans = data?.paymentPlans ?? []
  const claims = data?.insuranceClaims ?? []
  const legals = data?.legalArtifacts ?? []

  if (
    promesas.length === 0 &&
    paymentPlans.length === 0 &&
    claims.length === 0 &&
    legals.length === 0
  ) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center space-y-1">
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.ai.cobranza.detail.compromisos.empty')}
        </p>
        <p className="text-xs text-fg-muted">
          Acá aparecen las promesas de pago, los planes, los siniestros y las
          cartas del caso. Este todavía no tiene ninguno.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {promesas.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-fg mb-2">
            Promesas de pago
          </h3>
          <ul className="space-y-2">
            {promesas.map((pp) => {
              const estado = PROMESA_ESTADO[pp.status] ?? {
                label: pp.status.replaceAll('_', ' '),
                tono: 'bg-surface-muted text-fg-muted',
              }
              const vencidaDias =
                pp.status === 'open' && new Date(pp.due_date).getTime() < Date.now()
                  ? diasDesde(pp.due_date)
                  : 0
              return (
                <li
                  key={pp.id}
                  className="rounded-sm border border-border bg-surface p-3"
                  data-testid={`compromiso-promesa-${pp.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg font-mono tabular-nums">
                      {COP.format(pp.amount_cop)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estado.tono}`}>
                      {estado.label}
                    </span>
                  </div>
                  <p className="text-xs text-fg-muted mt-1">
                    {vencidaDias > 0 ? (
                      <>
                        Prometió pagar el {fecha(pp.due_date, locale)} —{' '}
                        <span className="text-danger font-medium">
                          vencida hace {vencidaDias} {vencidaDias === 1 ? 'día' : 'días'}
                        </span>
                      </>
                    ) : (
                      <>Prometió pagar el {fecha(pp.due_date, locale)}</>
                    )}
                    {pp.channel ? ` · por ${channelLabel(pp.channel)}` : ''}
                  </p>
                  {pp.conditions && (
                    <p className="text-xs text-fg-muted mt-0.5 italic">
                      «{pp.conditions}»
                    </p>
                  )}
                  {pp.call_id && (
                    <button
                      type="button"
                      onClick={() => setLlamadaAbierta(pp.call_id)}
                      className="mt-1.5 text-xs text-primary hover:underline"
                      data-testid={`compromiso-ver-llamada-${pp.id}`}
                    >
                      Ver la llamada donde la hizo
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {paymentPlans.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-fg mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.paymentPlans')}
          </h3>
          <ul className="space-y-2">
            {paymentPlans.map((p) => (
              <li
                key={p.id}
                className="rounded-sm border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-fg font-mono tabular-nums">
                    {COP.format(Number(p.total_due_cop))}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted">
                    {etiqueta(PLAN_ESTADO, p.status)}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Ofrecido el {fecha(p.offered_at, locale)}
                  {p.payment_provider ? ` · ${p.payment_provider}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {claims.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-fg mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.insuranceClaims')}
          </h3>
          <ul className="space-y-2">
            {claims.map((c) => (
              <li
                key={c.id}
                className="rounded-sm border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-fg">
                    {c.aseguradora
                      ? c.aseguradora.charAt(0).toUpperCase() + c.aseguradora.slice(1)
                      : '—'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted">
                    {etiqueta(SINIESTRO_ESTADO, c.status)}
                  </span>
                </div>
                {c.policy_number && (
                  <p className="text-xs text-fg-muted mt-0.5 font-mono">
                    Póliza {c.policy_number}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {legals.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-fg mb-2">
            {t('inmobiliaria.ai.cobranza.detail.compromisos.legalArtifacts')}
          </h3>
          <ul className="space-y-2">
            {legals.map((l) => (
              <li
                key={l.id}
                className="rounded-sm border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-fg">
                    {etiqueta(CARTA_TIPO, l.kind)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted">
                    {etiqueta(CARTA_ESTADO, l.status)}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">
                  Generada el {fecha(l.generated_at, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LlamadaDetalleSheet
        callId={llamadaAbierta}
        onClose={() => setLlamadaAbierta(null)}
      />
    </div>
  )
}
