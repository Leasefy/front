'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime, fmtDuration, fmtCOP } from '@/lib/admin/format'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'

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

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-1">{label}</div>
      <pre className="card p-3 text-[11px] leading-relaxed text-fg-muted overflow-x-auto font-mono">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{label}</div>
      <div className="text-sm text-fg mt-0.5">{children}</div>
    </div>
  )
}

/** /calls/:id — DB row merged with live Vapi (BACK.md §8.4). vapi may be null. */
export default function CallDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error } = useApiQuery<CallDetail>(
    (signal) => adminApi(`/calls/${id}`, { signal }),
    [id],
  )

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>
  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
  if (!data) return null

  const recording = data.recording_url ?? data.vapi?.recordingUrl ?? null

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/calls" className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg">
          ← Llamadas
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">{data.debtor_name ?? 'Llamada'}</h1>
      </div>

      {/* Header fields */}
      <div className="card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field label="agencia">{data.legal_name ?? '—'}</Field>
        <Field label="teléfono">{data.debtor_phone ?? '—'}</Field>
        <Field label="inicio">{fmtDateTime(data.initiated_at)}</Field>
        <Field label="duración">{fmtDuration(data.duration_seconds)}</Field>
        <Field label="outcome"><Pill>{data.outcome ?? '—'}</Pill></Field>
        <Field label="qa score">{data.qa_score ?? '—'}</Field>
        {data.vapi?.status && <Field label="estado vapi">{data.vapi.status}</Field>}
        {data.vapi?.endedReason && <Field label="ended reason">{data.vapi.endedReason}</Field>}
        {data.vapi?.cost != null && <Field label="costo vapi">{fmtCOP((data.vapi.cost ?? 0) * 4000)}</Field>}
      </div>

      {/* Audio */}
      {recording && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">grabación</div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={recording} className="w-full" />
        </div>
      )}

      {/* Compliance flags */}
      {data.compliance_flags && data.compliance_flags.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">compliance flags</div>
          <div className="flex flex-wrap gap-1.5">
            {data.compliance_flags.map((f, i) => (
              <Pill key={i} tone="warn">{f}</Pill>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      {data.vapi?.artifact?.messages && data.vapi.artifact.messages.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">conversación</div>
          <div className="card p-4 space-y-2">
            {data.vapi.artifact.messages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mr-2">{m.role ?? '—'}</span>
                <span className="text-fg-muted">{m.message ?? ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!data.vapi?.artifact?.messages?.length && (data.vapi?.transcript || data.transcript_url) && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">transcripción</div>
          {data.vapi?.transcript ? (
            <pre className="card p-3 text-[12px] leading-relaxed text-fg-muted whitespace-pre-wrap font-sans">{data.vapi.transcript}</pre>
          ) : (
            <a href={data.transcript_url!} target="_blank" rel="noreferrer" className="btn inline-flex">Ver transcripción →</a>
          )}
        </div>
      )}

      {/* Raw JSON */}
      <div className="grid grid-cols-1 gap-4">
        <JsonBlock label="agent_summary" value={data.agent_summary} />
        <JsonBlock label="summary_json" value={data.summary_json} />
        <JsonBlock label="qa_dimensions" value={data.qa_dimensions} />
        {data.vapi?.costBreakdown != null && <JsonBlock label="vapi costBreakdown" value={data.vapi.costBreakdown} />}
      </div>
    </div>
  )
}
