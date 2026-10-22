'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Robot, WarningCircle } from '@phosphor-icons/react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  KeyValueList,
  MonoLabel,
  Presence,
} from '@leasefy/cadence'
import { adminApi, ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { LoadingBlock, ErrorBlock, EmptyBlock } from '@/components/admin/screen/states'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { Tarjeta } from '@/components/admin/screen/Tarjeta'
import { Pill } from '@/components/admin/Pill'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  const [abiertas, setAbiertas] = useState<string[]>([])
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

  async function onSave() {
    if (!canSave) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await adminApi<{ ok: boolean; length: number }>(
        `/agents/${agentId}/system-prompt`,
        { method: 'PATCH', body: { prompt: currentPrompt } },
      )
      setFeedback({ ok: true, msg: `Guardado: ${res.length.toLocaleString('es-CO')} caracteres.` })
      onSaved()
    } catch (err) {
      const msg = mensajeDelAdmin(err, { accion: 'guardar las instrucciones' })
      setFeedback({ ok: false, msg })
    } finally {
      setSubmitting(false)
    }
  }

  function onRevert() {
    setSections(splitSections(initialSystemPrompt))
    setFeedback(null)
  }

  const originales = splitSections(initialSystemPrompt)

  return (
    <div className="space-y-4">
      {/* La barra de guardar queda pegada bajo la cabecera mientras se edita. */}
      <div className="sticky top-16 z-10 -mx-6 flex flex-wrap items-center gap-3 border-b border-border bg-bg/95 px-6 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button onClick={onSave} disabled={!canSave || submitting} isLoading={submitting} hideArrow>
          {submitting ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button variant="outline" onClick={onRevert} disabled={!dirty || submitting} hideArrow>
          Deshacer los cambios
        </Button>
        {dirty ? (
          <MonoLabel className="tabular-nums">
            <span className="text-success">+{stats.added}</span>
            {' / '}
            <span className="text-danger">−{stats.removed}</span>
            {' líneas · '}
            <span className={tooLong ? 'text-danger' : 'text-fg'}>
              {currentPrompt.length.toLocaleString('es-CO')} / 50.000
            </span>
          </MonoLabel>
        ) : (
          <MonoLabel>Sin cambios</MonoLabel>
        )}
        <Presence show={Boolean(feedback)} className="ml-auto">
          {feedback ? (
            <span
              role="status"
              className={'flex items-center gap-1.5 text-body-sm ' + (feedback.ok ? 'text-success' : 'text-danger')}
            >
              {feedback.ok ? (
                <CheckCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
              ) : (
                <WarningCircle className="h-4 w-4" weight="fill" aria-hidden="true" />
              )}
              {feedback.msg}
            </span>
          ) : null}
        </Presence>
      </div>

      {(isEmpty || tooLong) && (
        <Alert variant="danger">
          {isEmpty
            ? 'Las instrucciones no pueden quedar vacías.'
            : `Las instrucciones pasan de 50.000 caracteres (${currentPrompt.length.toLocaleString('es-CO')}).`}
        </Alert>
      )}

      <Accordion
        type="multiple"
        value={abiertas}
        onValueChange={setAbiertas}
        className="overflow-hidden rounded-lg border border-border bg-surface"
      >
        {sections.map((sec, i) => {
          const changed = sec.raw !== (originales[i]?.raw ?? '')
          return (
            <AccordionItem key={i} value={String(i)} className={changed ? 'bg-warning-soft' : undefined}>
              <AccordionTrigger className="gap-3 px-5 py-4 hover:bg-surface-hover">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-body-sm font-medium">{sec.title}</span>
                  {sec.markers.map((mk) => (
                    <Pill key={mk} tone="info">
                      {mk}
                    </Pill>
                  ))}
                  {changed && <Pill tone="warn">Editada</Pill>}
                </span>
                <MonoLabel className="shrink-0 tabular-nums">{sec.raw.length.toLocaleString('es-CO')}</MonoLabel>
              </AccordionTrigger>
              <AccordionContent className="max-w-none px-5 pb-5">
                <Textarea
                  aria-label={`Sección ${sec.title}`}
                  value={sec.raw}
                  onChange={(e) => setSections(replaceSection(sections, i, e.target.value))}
                  className="font-mono text-caption leading-relaxed"
                  rows={Math.min(Math.max(6, sec.raw.split('\n').length + 1), 30)}
                  spellCheck={false}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
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

  if (isLoading) return <div className="space-y-6 p-6 lg:p-8"><LoadingBlock filas={8} /></div>

  // 404 — Vapi rechazó la consulta (contrato: cualquier error de Vapi → 404).
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="space-y-6 p-6 lg:p-8">
        <BackButton href="/admin/agents" label="Volver a agentes de voz" />
        <EmptyBlock
          icono={<Robot weight="bold" />}
          title="No encontramos este agente"
          hint={`El agente ${id} no existe en Vapi, o Vapi no respondió.`}
        />
      </div>
    )
  }

  if (error) return <div className="space-y-6 p-6 lg:p-8"><ErrorBlock error={error} onReintentar={refetch} /></div>
  if (!data) return null

  const systemPrompt = data.systemPrompt ?? ''
  const sections = splitSections(systemPrompt)

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <BackButton href="/admin/agents" label="Volver a agentes de voz" />
      <PageHeader
        title={data.name ?? 'Agente sin nombre'}
        description={
          <span className="font-mono text-body-sm">
            {data.model?.provider ?? '—'} / {data.model?.model ?? '—'} · voz {data.voice?.provider ?? '—'} · silencio{' '}
            {data.silenceTimeoutSeconds ?? '—'} s
          </span>
        }
      />

      <Tarjeta titulo="Configuración" descripcion="Sólo lectura: se cambia en Vapi.">
        <KeyValueList
          className="grid gap-x-8 md:grid-cols-2"
          items={[
            {
              label: 'Primer mensaje',
              value: data.firstMessage
                ? data.firstMessage.length > 120
                  ? data.firstMessage.slice(0, 120) + '…'
                  : data.firstMessage
                : '—',
            },
            { label: 'Duración máxima', value: <span className="font-mono tabular-nums">{data.maxDurationSeconds != null ? `${data.maxDurationSeconds} s` : '—'}</span> },
            { label: 'Frases para colgar', value: (data.endCallPhrases ?? []).join(' · ') || '—' },
            { label: 'Temperatura', value: <span className="font-mono tabular-nums">{String(data.temperature ?? '—')}</span> },
            { label: 'Tokens máximos', value: <span className="font-mono tabular-nums">{String(data.maxTokens ?? '—')}</span> },
            { label: 'Herramientas', value: <span className="font-mono tabular-nums">{String(data.toolsCount ?? 0)}</span> },
          ]}
        />
      </Tarjeta>

      <section className="space-y-3" aria-label="Instrucciones del agente">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-subtitle font-medium text-fg">Instrucciones</h2>
          <MonoLabel className="tabular-nums">
            {systemPrompt.length.toLocaleString('es-CO')} caracteres · {sections.length} secciones
          </MonoLabel>
        </div>
        <PromptEditor agentId={id} initialSystemPrompt={systemPrompt} onSaved={refetch} />
      </section>
    </div>
  )
}
