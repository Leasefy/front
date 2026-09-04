'use client'

import { useState } from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { ChatText, ClipboardText, Buildings, Copy, Check } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useRetencionCaso } from '@/lib/hooks/retencion/use-retencion'
import { formatCop } from '@/lib/data/mock-retencion'
import type { CaseBundle, NoSource, RetentionState, TaskStatus } from '@/lib/types/retencion'
import { CasoSidebar } from './CasoSidebar'
import { VolverALaLista } from '@/components/inmobiliaria/ai/VolverALaLista'

const STATE_LABEL: Record<RetentionState, string> = {
  saludable: 'Saludable',
  observacion: 'Observación',
  riesgo_medio: 'Riesgo medio',
  alto_riesgo: 'Alto riesgo',
  critico: 'Crítico',
  recuperado: 'Recuperado',
  perdido: 'Perdido',
}

type TabKey = 'perfil' | 'plan' | 'mensaje'
const TABS: { key: TabKey; label: string; icon: Icon }[] = [
  { key: 'perfil', label: 'Perfil 360', icon: Buildings },
  { key: 'plan', label: 'Plan de retención', icon: ClipboardText },
  { key: 'mensaje', label: 'Mensaje', icon: ChatText },
]

export default function CasoDetailClient({ caseId }: { caseId: string }) {
  const { data, isLoading, error, usingMock } = useRetencionCaso(caseId)
  const [tab, setTab] = useState<TabKey>('perfil')

  if (isLoading && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mb-4" />
        <div className="h-40 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 animate-pulse" />
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-600 dark:text-rose-400">
          No pude cargar el caso: {error}
        </div>
      </main>
    )
  }

  if (!data) return null
  const c = data.profile.header

  return (
    <main className="p-6 lg:p-8 space-y-5">
      <VolverALaLista
        href="/panel/inmobiliaria/contratos/riesgo"
        label="Volver a la bandeja de riesgos"
      />

      {/* Header */}
      <header className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-base font-semibold text-rose-700 dark:text-rose-300">
          {c.score}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{c.ownerName}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {STATE_LABEL[c.state]} · {c.city ?? '—'} · {c.propertyCount} inmueble{c.propertyCount === 1 ? '' : 's'} · {c.ownerType}
          </p>
        </div>
        {usingMock ? (
          <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Demo
          </span>
        ) : null}
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main */}
        <section className="flex-1 min-w-0">
          <nav role="tablist" aria-label="Detalle del caso" className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                  (tab === key
                    ? 'border-rose-600 text-rose-700 dark:text-rose-300'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200')
                }
              >
                <Icon size={15} weight="duotone" /> {label}
              </button>
            ))}
          </nav>

          {tab === 'perfil' && <PerfilTab bundle={data} />}
          {tab === 'plan' && <PlanTab bundle={data} />}
          {tab === 'mensaje' && <MensajeTab bundle={data} />}
        </section>

        {/* Sidebar */}
        <div className="md:w-80 md:shrink-0">
          <CasoSidebar bundle={data} />
        </div>
      </div>
    </main>
  )
}

/* ─── Tabs ──────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>
      {children}
    </div>
  )
}

function NoSourceBlock<T>({ src, render }: { src: NoSource<T>; render: (item: T, i: number) => React.ReactNode }) {
  if (!src.available) {
    return <p className="text-xs text-neutral-400 italic">No disponible{src.reason ? ` — ${src.reason}` : ''}.</p>
  }
  if (src.items.length === 0) {
    return <p className="text-xs text-neutral-400">Sin registros.</p>
  }
  return <ul className="space-y-1.5">{src.items.map((it, i) => render(it, i))}</ul>
}

function PerfilTab({ bundle }: { bundle: CaseBundle }) {
  const p = bundle.profile
  return (
    <div className="space-y-4">
      <Section title="Resumen de salud">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{p.resumenSalud.diagnosis}</p>
        <p className="mt-2 text-xs text-neutral-400">
          Causa raíz: {p.resumenSalud.rootCause.label} ({p.resumenSalud.rootCause.pct}%) · Confianza: {p.resumenSalud.confidence}
        </p>
      </Section>

      <Section title="Inmuebles asociados">
        <NoSourceBlock
          src={p.inmuebles}
          render={(it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">{it.address ?? 'Sin dirección'}</span>
              <span className="text-xs text-neutral-400">
                {it.estado}
                {it.canon != null ? ` · ${formatCop(it.canon)}` : ''}
                {it.diasVacio ? ` · ${it.diasVacio}d vacío` : ''}
              </span>
            </li>
          )}
        />
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Historial financiero">
          <NoSourceBlock
            src={p.financiero}
            render={(it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">{it.label}</span>
                <span className="text-neutral-900 dark:text-white">{it.value}</span>
              </li>
            )}
          />
        </Section>
        <Section title="Interacciones">
          <NoSourceBlock
            src={p.interacciones}
            render={(it, i) => (
              <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300">
                {it.summary} <span className="text-xs text-neutral-400">· {it.at.slice(0, 10)}</span>
              </li>
            )}
          />
        </Section>
        <Section title="Contratos">
          <NoSourceBlock
            src={p.contratos}
            render={(it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">{it.label}</span>
                {it.vence ? <span className="text-xs text-neutral-400">vence {it.vence}</span> : null}
              </li>
            )}
          />
        </Section>
        <Section title="Mantenimientos">
          <NoSourceBlock
            src={p.mantenimientos}
            render={(it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-700 dark:text-neutral-300">{it.label}</span>
                <span className="text-xs text-neutral-400">{it.status} · {it.at}</span>
              </li>
            )}
          />
        </Section>
        <Section title="Documentos">
          <NoSourceBlock src={p.documentos} render={(it, i) => <li key={i} className="text-sm">{it.label}</li>} />
        </Section>
        <Section title="Bitácora de acciones">
          <NoSourceBlock src={p.bitacora} render={(it, i) => <li key={i} className="text-sm">{it.label}</li>} />
        </Section>
      </div>
    </div>
  )
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

function PlanTab({ bundle }: { bundle: CaseBundle }) {
  const plan = bundle.plan
  if (!plan) {
    return <Section title="Plan de retención"><p className="text-sm text-neutral-500">Este caso es saludable — no requiere plan.</p></Section>
  }
  return (
    <div className="space-y-4">
      <Section title="Objetivo del plan">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{plan.objective}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
            Playbook: {plan.playbookId}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
            Responsable: {plan.responsibleRole}
          </span>
          {plan.proposed ? (
            <span className="rounded-full bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 text-rose-700 dark:text-rose-300">
              Propuesto (sin materializar)
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
              {plan.status}
            </span>
          )}
        </div>
      </Section>

      <Section title="Tareas">
        <ul className="space-y-2">
          {plan.tasks.map((t, i) => (
            <li key={t.id ?? t.code ?? i} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-neutral-800 dark:text-neutral-200">{t.title}</p>
                <p className="text-xs text-neutral-400">
                  {t.responsibleRole}
                  {t.dueDate ? ` · vence ${t.dueDate}` : ''} · {TASK_STATUS_LABEL[t.status]}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {plan.proposed ? (
          <p className="mt-3 text-xs text-neutral-400">
            Plan generado por Laura. Al confirmarlo se crean las tareas internas asignadas a cada responsable.
          </p>
        ) : null}
      </Section>
    </div>
  )
}

function MensajeTab({ bundle }: { bundle: CaseBundle }) {
  const m = bundle.message
  const guard = bundle.guard
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard no disponible */
    }
  }

  if (!guard.canDraftMessage) {
    return (
      <Section title="Mensaje al propietario">
        <AlertaAccionable severidad="danger" titulo="No se puede redactar el mensaje todavía">
          {guard.reasons.length
            ? `Los datos del caso no cuadran (${guard.reasons.join(', ')}). Revisalos antes de escribirle al propietario.`
            : 'Los datos del caso no cuadran. Revisalos antes de escribirle al propietario.'}
        </AlertaAccionable>
      </Section>
    )
  }

  return (
    <div className="space-y-4">
      {/* Antes: «Laura nunca envía sola (v1)» — nombre interno y versión en la
          cara de la inmobiliaria, en una caja ámbar fuera del sistema de tokens. */}
      <AlertaAccionable severidad="info" titulo="El mensaje no se manda solo: lo revisás y lo enviás vos">
        El asistente redacta el borrador de abajo. Ajustalo si hace falta, copialo y mandalo desde tu WhatsApp o correo.
      </AlertaAccionable>

      <Section title="Borrador de mensaje">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 capitalize text-neutral-600 dark:text-neutral-300">
            {m.channel}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 capitalize text-neutral-600 dark:text-neutral-300">
            tono {m.tone}
          </span>
          <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
            {m.source === 'llm' ? 'redactado por IA' : 'plantilla'}
          </span>
          {m.barrierApplied ? (
            <span className="rounded-full bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 text-rose-700 dark:text-rose-300">
              barrera de compliance aplicada
            </span>
          ) : null}
        </div>
        {m.subject ? <p className="mb-1 text-sm font-medium text-neutral-900 dark:text-white">{m.subject}</p> : null}
        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{m.body}</p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </Section>
    </div>
  )
}
