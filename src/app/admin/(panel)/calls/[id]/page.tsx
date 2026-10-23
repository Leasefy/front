'use client'

import { useParams } from 'next/navigation'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { CodeBlock, KeyValueList, MessageBubble, Stagger, StaggerItem } from '@leasefy/cadence'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime, fmtDuration, fmtCOP, USD_TO_COP } from '@/lib/admin/format'
import { estadoEnVapi, fallaDeCalidad, porQueTermino, resultadoDeLaLlamada, tonoDelResultado } from '@/lib/admin/textos-del-admin'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { Pill } from '@/components/admin/Pill'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'

interface CallDetail {
  id: string
  tenant_id: string | null
  initiated_at: string | null
  connected_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  outcome: string | null
  qa_score: string | null
  qa_compliance: unknown
  recording_url: string | null
  transcript_url: string | null
  agent_summary: unknown
  summary_json: unknown
  qa_dimensions: unknown
  compliance_flags: string[] | null
  debtor_name: string | null
  debtor_phone: string | null
  legal_name: string | null
  vapi: {
    transcript?: string | null
    recordingUrl?: string | null
    artifact?: {
      messages?: Array<{ role?: string; message?: string; time?: number }> | null
    } | null
    status?: string | null
    endedReason?: string | null
    cost?: number | null
    costBreakdown?: unknown
  } | null
}

/** Un JSON crudo del agente o de Vapi, en el bloque de código de Cadence. */
function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null
  return <CodeBlock language="json" filename={label} code={JSON.stringify(value, null, 2)} />
}

/** Quién habla en la conversación de Vapi. */
function quienHabla(rol: string | undefined): 'user' | 'agent' | null {
  if (rol === 'user') return 'user'
  if (rol === 'assistant' || rol === 'bot') return 'agent'
  return null
}

/** /calls/:id — DB row merged with live Vapi (BACK.md §8.4). vapi may be null. */
export default function CallDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error, refetch } = useApiQuery<CallDetail>(
    (signal) => adminApi(`/calls/${id}`, { signal }),
    [id],
  )

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={8} /></div>
  if (error)
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <ErrorBlock error={error} onReintentar={refetch} volverA={{ label: 'Volver a llamadas', href: '/admin/calls' }} />
      </div>
    )
  if (!data) return null

  const recording = data.recording_url ?? data.vapi?.recordingUrl ?? null
  const mensajes = (data.vapi?.artifact?.messages ?? []).filter((m) => quienHabla(m.role) && m.message)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/calls" label="Volver a llamadas" />
      <PageHeader
        title={data.debtor_name ?? 'Llamada'}
        description={data.legal_name ?? undefined}
        junto={<Pill tone={tonoDelResultado(data.outcome)}>{resultadoDeLaLlamada(data.outcome)}</Pill>}
      />

      {recording && (
        <Tarjeta titulo="Grabación">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={recording} className="w-full" />
        </Tarjeta>
      )}

      {data.compliance_flags && data.compliance_flags.length > 0 && (
        <Tarjeta titulo="Alertas de cumplimiento">
          <div className="flex flex-wrap gap-1.5">
            {data.compliance_flags.map((f, i) => (
              <Pill key={i} tone="warn">
                {fallaDeCalidad(f)}
              </Pill>
            ))}
          </div>
        </Tarjeta>
      )}

      {mensajes.length > 0 ? (
        <Tarjeta titulo="Conversación" descripcion="Lo que se dijo, tal como lo guardó Vapi.">
          <Stagger className="space-y-3">
            {mensajes.map((m, i) => (
              <StaggerItem key={i}>
                <MessageBubble role={quienHabla(m.role)!} agentName="Agente">
                  {m.message}
                </MessageBubble>
              </StaggerItem>
            ))}
          </Stagger>
        </Tarjeta>
      ) : data.vapi?.transcript || data.transcript_url ? (
        <Tarjeta titulo="Transcripción">
          {data.vapi?.transcript ? (
            <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-fg-muted">{data.vapi.transcript}</p>
          ) : (
            <Button asChild variant="outline" hideArrow>
              <a href={data.transcript_url!} target="_blank" rel="noreferrer">
                Ver la transcripción
                <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </Tarjeta>
      ) : null}

      {typeof data.agent_summary === 'string' && data.agent_summary.trim() ? (
        <Tarjeta titulo="Resumen del agente">
          <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-fg-muted">{data.agent_summary}</p>
        </Tarjeta>
      ) : null}

      <Tarjeta titulo="La llamada">
        <KeyValueList
          className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3"
          items={[
            { label: 'Inmobiliaria', value: data.legal_name ?? '—' },
            { label: 'Teléfono', value: <span className="font-mono tabular-nums">{data.debtor_phone ?? '—'}</span> },
            { label: 'Empezó', value: <span className="font-mono tabular-nums">{fmtDateTime(data.initiated_at)}</span> },
            { label: 'Duración', value: <span className="font-mono tabular-nums">{fmtDuration(data.duration_seconds)}</span> },
            { label: 'Calidad', value: <span className="font-mono tabular-nums">{data.qa_score != null ? Number(data.qa_score).toFixed(0) : '—'}</span> },
            ...(data.vapi?.status ? [{ label: 'Estado en Vapi', value: estadoEnVapi(data.vapi.status) }] : []),
            ...(data.vapi?.endedReason ? [{ label: 'Por qué terminó', value: porQueTermino(data.vapi.endedReason) }] : []),
            ...(data.vapi?.cost != null
              ? [{ label: 'Costo en Vapi', value: <span className="font-mono tabular-nums">{fmtCOP((data.vapi.cost ?? 0) * USD_TO_COP)}</span> }]
              : []),
          ]}
        />
      </Tarjeta>

      {data.agent_summary != null || data.summary_json != null || data.qa_dimensions != null || data.vapi?.costBreakdown != null ? (
        // Glow up 22-10: lo técnico (JSON del agente y de Vapi), plegado: se consulta, no se lee.
        <MasDetalles etiqueta="Ver los datos técnicos de la llamada" etiquetaAbierto="Ocultar los datos técnicos" data-testid="datos-crudos">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {typeof data.agent_summary === 'string' ? null : <JsonBlock label="Resumen del agente" value={data.agent_summary} />}
            <JsonBlock label="Resumen (JSON)" value={data.summary_json} />
            <JsonBlock label="Calidad por dimensión" value={data.qa_dimensions} />
            {data.vapi?.costBreakdown != null && <JsonBlock label="Costo en Vapi, desglosado" value={data.vapi.costBreakdown} />}
          </div>
        </MasDetalles>
      ) : null}
    </div>
  )
}
