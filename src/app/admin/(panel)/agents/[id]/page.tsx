'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi, ApiError } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import {
  splitSections,
  joinSections,
  replaceSection,
  diffStats,
  type PromptSection,
} from '@/lib/admin/prompt-sections'

/** Flat agent detail shape per docs/ADMIN-API-CONTRACT.md — GET /agents/:id. */
interface AgentDetail {
  id: string
  name?: string | null
  model?: { provider?: string | null; model?: string | null } | null
  voice?: { provider?: string | null } | null
  silenceTimeoutSeconds?: number | null
  updatedAt?: string | null
  firstMessage?: string | null
  maxDurationSeconds?: number | null
  endCallPhrases?: string[] | null
  temperature?: number | null
  maxTokens?: number | null
  toolsCount: number
  systemPrompt: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm border-b border-bg-border pb-2 last:border-0 last:pb-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{label}</div>
      <div className="text-fg mt-0.5 break-words">{children}</div>
    </div>
  )
}

function MetaKV({ k, v }: { k: string; v?: string | null }) {
  return (
    <span>
      <span className="text-fg-subtle">{k}:</span>{' '}
      <span className="text-fg">{v ?? '—'}</span>
    </span>
  )
}

/** Section editor — lives inside the detail page, all in one component per SPA pattern. */
function PromptEditor({
  agentId,
  initialSystemPrompt,
  onSaved,
}: {
  agentId: string
  initialSystemPrompt: string
  onSaved: () => void
}) {
  const [sections, setSections] = useState<PromptSection[]>(() =>
    splitSections(initialSystemPrompt),
  )
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // Reset editor when parent re-fetches (new initialSystemPrompt after save).
  const prevRef = useRef(initialSystemPrompt)
  useEffect(() => {
    if (initialSystemPrompt !== prevRef.current) {
      prevRef.current = initialSystemPrompt
      setSections(splitSections(initialSystemPrompt))
      setFeedback(null)
    }
  }, [initialSystemPrompt])

  const currentPrompt = useMemo(() => joinSections(sections), [sections])
  const stats = useMemo(() => diffStats(initialSystemPrompt, currentPrompt), [initialSystemPrompt, currentPrompt])
  const dirty = currentPrompt !== initialSystemPrompt

  // Client-side validation mirrors BACK.md §8.2: non-empty, ≤ 50_000 chars.
  const tooLong = currentPrompt.length > 50_000
  const isEmpty = currentPrompt.trim().length === 0
  const canSave = dirty && !tooLong && !isEmpty

  function toggle(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function onSave() {
    if (!canSave) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await adminApi<{ ok: boolean; length: number }>(
        `/agents/${agentId}/system-prompt`,
        { method: 'PATCH', body: { prompt: currentPrompt } },
      )
      setFeedback({ ok: true, msg: `Guardado. Prompt: ${res.length} chars.` })
      onSaved()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error de red'
      setFeedback({ ok: false, msg })
    } finally {
      setSubmitting(false)
    }
  }

  function onRevert() {
    setSections(splitSections(initialSystemPrompt))
    setFeedback(null)
  }

  return (
    <>
      {/* Sticky toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 sticky top-0 z-10 bg-bg/90 backdrop-blur py-3 border-b border-bg-border -mx-6 px-6 lg:-mx-8 lg:px-8">
        <button
          onClick={onSave}
          disabled={!canSave || submitting}
          className="btn btn-primary"
        >
          {submitting ? 'Guardando…' : 'Guardar →'}
        </button>
        <button
          onClick={onRevert}
          disabled={!dirty || submitting}
          className="btn"
        >
          Revertir
        </button>
        {dirty ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            <span className="text-ok">+{stats.added}</span>
            {' / '}
            <span className="text-bad">−{stats.removed}</span>
            {' líneas · '}
            <span className={tooLong ? 'text-bad' : 'text-fg'}>
              {currentPrompt.length} / 50 000 chars
            </span>
          </span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
            sin cambios
          </span>
        )}
        {feedback && (
          <span
            className={
              'ml-auto font-mono text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 ' +
              (feedback.ok ? 'text-ok' : 'text-bad')
            }
          >
            <span
              className={'inline-block w-2 h-2 ' + (feedback.ok ? 'bg-ok' : 'bg-bad')}
            />
            {feedback.msg}
          </span>
        )}
      </div>

      {(isEmpty || tooLong) && (
        <div className="card p-3 border-bad/40 mb-4">
          <p className="text-sm text-bad">
            {isEmpty
              ? 'El prompt no puede estar vacío.'
              : `El prompt excede 50 000 caracteres (${currentPrompt.length}).`}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sections.map((sec, i) => {
          const isOpen = expanded.has(i)
          const origRaw = splitSections(initialSystemPrompt)[i]?.raw ?? ''
          const changed = sec.raw !== origRaw
          return (
            <div key={i} className={'card ' + (changed ? 'border-warn/50' : '')}>
              <button
                onClick={() => toggle(i)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-bg-hover transition-colors"
              >
                <span className="text-fg-subtle text-xs font-mono w-4">
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="font-medium text-sm flex-1 truncate">{sec.title}</span>
                {sec.markers.map((mk) => (
                  <Pill key={mk} tone="info">{mk}</Pill>
                ))}
                {changed && <Pill tone="warn">editado</Pill>}
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle tabular-nums">
                  {sec.raw.length}c
                </span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-bg-border">
                  <textarea
                    value={sec.raw}
                    onChange={(e) => setSections(replaceSection(sections, i, e.target.value))}
                    className="textarea mt-3"
                    rows={Math.min(Math.max(6, sec.raw.split('\n').length + 1), 30)}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/** /admin/agents/:id — prompt editor (FRONT.md §6.3 · BACK.md §8.2). */
export default function AgentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { data, isLoading, error, refetch } = useApiQuery<AgentDetail>(
    (signal) => adminApi(`/agents/${id}`, { signal }),
    [id],
  )

  if (isLoading) return <div className="p-6 lg:p-8"><LoadingBlock /></div>

  // 404 — Vapi rejected the lookup (contract: any Vapi error → 404 "Agent not found")
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="p-6 lg:p-8">
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-fg">Agente no encontrado</p>
          <p className="text-xs text-fg-muted mt-1">
            El assistant <span className="font-mono">{id}</span> no existe en Vapi o Vapi no respondió.
          </p>
          <Link href="/admin/agents" className="btn mt-4 inline-flex">
            ← Volver a Agentes
          </Link>
        </div>
      </div>
    )
  }

  if (error) return <div className="p-6 lg:p-8"><ErrorBlock error={error} /></div>
  if (!data) return null

  const systemPrompt = data.systemPrompt ?? ''
  const sections = splitSections(systemPrompt)

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Breadcrumb + header */}
      <div className="mb-8">
        <Link
          href="/admin/agents"
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-fg"
        >
          ← Agentes
        </Link>
        <h1 className="font-display text-display tracking-tight text-fg mt-2">
          {data.name ?? '(sin nombre)'}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-fg-muted">
          <MetaKV k="modelo" v={`${data.model?.provider ?? '—'}/${data.model?.model ?? '—'}`} />
          <MetaKV k="voz" v={data.voice?.provider} />
          <MetaKV k="silencio" v={`${data.silenceTimeoutSeconds ?? '—'}s`} />
        </div>
      </div>

      {/* Read-only config block */}
      <div className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mb-3">
          config rápida (read-only)
        </div>
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <Field label="firstMessage">
            {data.firstMessage ? (
              data.firstMessage.length > 120
                ? data.firstMessage.slice(0, 120) + '…'
                : data.firstMessage
            ) : '—'}
          </Field>
          <Field label="maxDurationSeconds">{String(data.maxDurationSeconds ?? '—')}</Field>
          <Field label="endCallPhrases">
            {(data.endCallPhrases ?? []).join(' · ') || '—'}
          </Field>
          <Field label="temperature">{String(data.temperature ?? '—')}</Field>
          <Field label="maxTokens">{String(data.maxTokens ?? '—')}</Field>
          <Field label="tools">{String(data.toolsCount ?? 0)}</Field>
        </div>
      </div>

      {/* Section editor */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            system prompt
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            {systemPrompt.length} chars · {sections.length} secc.
          </span>
        </div>
        <PromptEditor
          agentId={id}
          initialSystemPrompt={systemPrompt}
          onSaved={refetch}
        />
      </div>
    </div>
  )
}
