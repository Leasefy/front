'use client'

/**
 * MemosTab — la memoria del caso.
 *
 * Dos tipos de memo, dos autores:
 *   · Memo del agente — lo escribe el workflow post-llamada (resumen en
 *     español, desenlace, estado emocional, objeción literal, promesa
 *     abierta). Verificado real: 36 memos de 10 deudores en la base dev;
 *     un deudor sembrado sin llamadas reales no tiene ninguno y ese vacío
 *     es honesto.
 *   · Nota del equipo — la escribe una persona acá mismo (pedido de Nico
 *     2026-08-25: la pestaña era de solo lectura y el operador no tenía
 *     dónde dejar «habló conmigo al fijo, promete pagar el viernes»).
 *     POST /debtors/:id/memos, permiso cobranza:intervene.
 *
 * Cada memo con llamada enlaza su cajón (LlamadaDetalleSheet) — el memo es
 * el resumen; la llamada completa, con audio y transcripción, está a un clic.
 * Los slugs nunca se muestran crudos: desenlace por call-vocab, emoción y
 * promesa con etiqueta y formato.
 */

import * as React from 'react'
import { useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { useDebtorMemos } from '@/lib/hooks/cobranza/use-debtor-memos'
import { Button } from '@/components/ui'
import { LlamadaDetalleSheet } from '@/components/inmobiliaria/cobranza/LlamadaDetalleSheet'
import { summaryOutcomeLabel } from '@/lib/cobranza/call-vocab'

void React

interface MemosTabProps {
  debtorId: string
}

/** Slug reservado del back para notas escritas por una persona. */
const NOTA_MANUAL = 'manual_note'

/**
 * El desenlace del memo usa los buckets del CallSummarizer (summaryOutcomeLabel),
 * no el outcome de la máquina de llamada. `contacted` es un valor viejo que
 * quedó en la base — se etiqueta acá para no mostrarlo crudo.
 */
const DESENLACE_EXTRA: Record<string, string> = {
  contacted: 'Contactado',
}

/** Estados emocionales que emite el memo-writer (post-call-workflow). */
const EMOCION: Record<string, string> = {
  cooperative: 'Cooperativo',
  neutral: 'Neutral',
  frustrated: 'Frustrado',
  angry: 'Molesto',
  anxious: 'Ansioso',
  distressed: 'Angustiado',
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function fechaCorta(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export function MemosTab({ debtorId }: MemosTabProps) {
  const { t, locale } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const { data, isLoading, error, refetch } = useDebtorMemos({ debtorId })

  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorNota, setErrorNota] = useState<string | null>(null)
  const [llamadaAbierta, setLlamadaAbierta] = useState<string | null>(null)

  const guardarNota = async () => {
    const body = texto.trim()
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!body || guardando || !agentUrl || !agencyId) return
    setGuardando(true)
    setErrorNota(null)
    try {
      const res = await agentFetch(
        `${agentUrl}/api/agency/${agencyId}/cobranza/debtors/${debtorId}/memos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      )
      if (res.status === 403) {
        // El permiso es cobranza:intervene — un VIEWER puede leer y no escribir.
        setErrorNota('Tu rol no puede escribir notas.')
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setTexto('')
      await refetch()
    } catch (err) {
      setErrorNota(err instanceof Error ? err.message : 'No pudimos guardar la nota.')
    } finally {
      setGuardando(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-20 bg-surface-muted rounded-sm animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger-soft p-4 flex items-center justify-between gap-4">
        <p className="text-sm text-danger">
          {t('inmobiliaria.ai.cobranza.detail.memos.error')}: {error}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          hideArrow
        >
          {t('inmobiliaria.ai.cobranza.detail.memos.errorRetry')}
        </Button>
      </div>
    )
  }

  const memos = data?.memos ?? []

  return (
    <div className="space-y-3">
      {/* La nota del equipo se escribe acá mismo — sin salir del caso. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void guardarNota()
        }}
        className="rounded-md border border-border bg-surface p-3 space-y-2"
        data-testid="memo-nota-form"
      >
        <label htmlFor="memo-nota" className="text-xs font-medium text-fg-muted">
          Añadir nota del equipo
        </label>
        <textarea
          id="memo-nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="Contexto que el agente no ve: una llamada tuya, un acuerdo de pasillo, lo que toque recordar…"
          className="w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <div className="flex items-center justify-between gap-3">
          {errorNota ? (
            <p role="alert" className="text-xs text-danger">
              {errorNota}
            </p>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            hideArrow
            disabled={!texto.trim() || guardando}
            isLoading={guardando}
          >
            Guardar nota
          </Button>
        </div>
      </form>

      {memos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center space-y-1">
          <p className="text-sm text-fg-muted">
            {t('inmobiliaria.ai.cobranza.detail.memos.empty')}
          </p>
          {/* Por qué está vacío, no solo que está vacío: el memo lo escribe el
              workflow después de cada llamada del agente. */}
          <p className="text-xs text-fg-muted">
            El agente escribe un memo después de cada llamada que gestiona. Este
            caso todavía no tiene ninguno.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {memos.map((m) => {
            const esManual = m.last_outcome === NOTA_MANUAL || m.call_id == null
            const desenlace = esManual
              ? null
              : m.last_outcome == null
                ? null
                : (DESENLACE_EXTRA[m.last_outcome] ?? summaryOutcomeLabel(m.last_outcome) ?? m.last_outcome)
            const emocion = m.last_emotional_state
              ? (EMOCION[m.last_emotional_state] ?? m.last_emotional_state)
              : null
            return (
              <li
                key={m.id}
                className="rounded-sm border border-border bg-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={[
                      'text-xs font-medium px-1.5 py-0.5 rounded',
                      esManual
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-muted text-fg-muted',
                    ].join(' ')}
                  >
                    {esManual ? 'Nota del equipo' : 'Memo del agente'}
                  </span>
                  <span className="text-xs text-fg-muted tabular-nums">
                    {new Date(m.created_at).toLocaleString(locale)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-fg whitespace-pre-wrap">
                  {m.body ?? '—'}
                </p>

                {/* La objeción literal es oro para la siguiente gestión: va
                    textual, entre comillas. */}
                {m.last_objection_literal && (
                  <p className="mt-1.5 text-xs text-fg-muted italic">
                    Objeción: «{m.last_objection_literal}»
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                  {desenlace && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-muted">
                      {desenlace}
                    </span>
                  )}
                  {emocion && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-muted">
                      {emocion}
                    </span>
                  )}
                  {m.open_ptp_amount_cop != null && m.open_ptp_date && (
                    <span className="px-1.5 py-0.5 rounded bg-surface-muted text-fg">
                      Promesa: {COP.format(m.open_ptp_amount_cop)} ·{' '}
                      {fechaCorta(m.open_ptp_date, locale)}
                    </span>
                  )}
                  {m.call_id && (
                    <button
                      type="button"
                      onClick={() => setLlamadaAbierta(m.call_id)}
                      className="ml-auto text-primary hover:underline"
                      data-testid={`memo-ver-llamada-${m.id}`}
                    >
                      Ver la llamada
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <LlamadaDetalleSheet
        callId={llamadaAbierta}
        onClose={() => setLlamadaAbierta(null)}
      />
    </div>
  )
}
