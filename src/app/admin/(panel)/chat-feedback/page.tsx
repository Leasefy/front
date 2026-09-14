'use client'

/**
 * /admin/chat-feedback — dónde está fallando el chat.
 *
 * Nico, 2026-09-13: «Un pulgar arriba o abajo en cada respuesta… que las
 * preguntas reales alimenten el banco de preguntas.» Esta es la pantalla que
 * hace útil ese pulgar: las últimas valoraciones de TODAS las inmobiliarias, con
 * la pregunta, la respuesta, el comentario, y el porcentaje de pulgares arriba
 * semana a semana.
 *
 * Los datos salen del micro de agentes (schema `agent`), no del micro de admin:
 * `agentAdminApi` con el mismo bearer y la misma lista `ADMIN_EMAILS`.
 *
 * Patrón de pantalla: `/admin/approvals` (PageHeader + facetas + tarjetas),
 * design system del backoffice (`admin.css`), NO el de la app.
 */

import { useState } from 'react'
import { getChatFeedback, type ChatFeedbackRow } from '@/lib/admin/agent-api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { useUrlFilters } from '@/lib/admin/use-url-filters'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

/** La semana en corto: «8 sep». */
function semanaCorta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

function FilaFeedback({ row }: { row: ChatFeedbackRow }) {
  const [abierto, setAbierto] = useState(false)
  const arriba = row.veredicto === 'up'

  return (
    <div className={`card border-l-4 ${arriba ? 'border-l-ok' : 'border-l-bad'} p-4`}>
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <Pill tone={arriba ? 'ok' : 'bad'}>{arriba ? 'pulgar arriba' : 'pulgar abajo'}</Pill>
        {row.cifraMal && <Pill tone="warn">la cifra está mal</Pill>}
        {row.leccionId && <Pill tone="info">lección creada</Pill>}
        <span className="font-medium text-fg">{row.pregunta}</span>
      </div>

      {row.comentario && (
        <div className="text-sm text-fg-muted leading-snug mb-2">
          <span className="text-fg-subtle">esperaba: </span>
          {row.comentario}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="text-xs text-fg-subtle hover:text-fg underline underline-offset-2 mb-2"
      >
        {abierto ? 'ocultar la respuesta' : 'ver la respuesta del chat'}
      </button>
      {abierto && (
        <pre className="text-xs text-fg-muted whitespace-pre-wrap leading-snug mb-2 max-h-64 overflow-y-auto">
          {row.respuesta}
        </pre>
      )}

      <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        <span title={row.agencyId}>agencia {row.agencyId.slice(0, 8)}</span>
        <span>{row.usuario}</span>
        {row.herramientas.length > 0 && <span>{row.herramientas.join(' · ')}</span>}
        <span className="tabular-nums">{fmtDateTime(row.createdAt)}</span>
      </div>
    </div>
  )
}

export default function ChatFeedbackPage() {
  const { get, setFilters } = useUrlFilters()
  const veredicto = get('veredicto')
  const agencyId = get('agencia')

  const { data, isLoading, error } = useApiQuery(
    (signal) =>
      getChatFeedback({
        ...(veredicto === 'up' || veredicto === 'down' ? { veredicto } : {}),
        ...(agencyId ? { agencyId } : {}),
        limit: 100,
        signal,
      }),
    [veredicto, agencyId],
  )

  const filas = data?.filas ?? []
  const semanas = data?.semanas ?? []

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        label="chat"
        title="Feedback del chat"
        description="El pulgar que dejó cada inmobiliaria en cada respuesta. Es lo que dice dónde falla el chat."
      />

      {/* Porcentaje de pulgares arriba por semana. Sin valoraciones esa semana
          no se pinta un 0 % — se dice que no hubo. */}
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        pulgares arriba por semana
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {semanas.length === 0 && !isLoading ? (
          <span className="text-sm text-fg-subtle">sin valoraciones todavía</span>
        ) : (
          semanas.map((s) => (
            <div key={s.semana} className="card px-3 py-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                {semanaCorta(s.semana)}
              </div>
              <div className="text-lg font-medium tabular-nums text-fg">
                {s.porcentajeArriba === null ? 'sin datos' : `${s.porcentajeArriba}%`}
              </div>
              <div className="font-mono text-[10px] text-fg-subtle tabular-nums">
                {s.arriba}/{s.total}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Facetas */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilters({ veredicto: undefined })}
          className={`pill ${!veredicto ? 'pill-info' : ''}`}
        >
          todas
        </button>
        <button
          onClick={() => setFilters({ veredicto: 'down' })}
          className={`pill ${veredicto === 'down' ? 'pill-info' : ''}`}
        >
          pulgar abajo
        </button>
        <button
          onClick={() => setFilters({ veredicto: 'up' })}
          className={`pill ${veredicto === 'up' ? 'pill-info' : ''}`}
        >
          pulgar arriba
        </button>
        {agencyId && (
          <button onClick={() => setFilters({ agencia: undefined })} className="pill pill-info">
            agencia {agencyId.slice(0, 8)} ✕
          </button>
        )}
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
        últimas valoraciones · más recientes primero
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} />
      ) : filas.length === 0 ? (
        <EmptyBlock
          title="Sin valoraciones"
          hint="Nadie ha marcado todavía una respuesta del chat con el pulgar."
        />
      ) : (
        <div className="space-y-2">
          {filas.map((f) => (
            <FilaFeedback key={f.id} row={f} />
          ))}
        </div>
      )}
    </div>
  )
}
