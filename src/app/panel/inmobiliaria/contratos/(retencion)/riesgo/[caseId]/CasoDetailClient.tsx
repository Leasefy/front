'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import { useState } from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { Button } from '@/components/ui/button'
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
        <div className="h-6 w-48 rounded bg-surface-muted animate-pulse mb-4" />
        <div className="h-40 rounded-lg bg-surface-muted animate-pulse" />
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
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
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-base font-semibold text-danger">
          {c.score}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-fg">{c.ownerName}</h1>
          <p className="text-sm text-fg-muted">
            {STATE_LABEL[c.state]} · {c.city ?? '—'} · {c.propertyCount} inmueble{c.propertyCount === 1 ? '' : 's'} · {c.ownerType}
          </p>
        </div>

      </header>

      {usingMock ? (
        <AvisoDatosDeEjemplo
          queEsInventado="El propietario, su historial, el plan propuesto y los montos en pesos"
          queFalta="El agente de Retención no está desplegado: el microservicio sólo monta el webhook de WhatsApp, no las rutas /api/agency/:id/retencion/*. Sin ellas, el cliente cae al mock de src/lib/data/mock-retencion.ts."
        />
      ) : null}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main */}
        <section className="flex-1 min-w-0">
          <nav role="tablist" aria-label="Detalle del caso" className="flex items-center gap-1 border-b border-border mb-4">
            {TABS.map(({ key, label, icon: Icon }) => (
              // Pestaña subrayada, no botón: no lleva superficie ni pill, así
              // que se queda como <button type="button"> (excepción del DS).
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                  (tab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-fg-muted hover:text-fg')
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-fg mb-2">{title}</h3>
      {children}
    </div>
  )
}

function NoSourceBlock<T>({ src, render }: { src: NoSource<T>; render: (item: T, i: number) => React.ReactNode }) {
  if (!src.available) {
    return <p className="text-xs text-fg-subtle italic">No disponible{src.reason ? ` — ${src.reason}` : ''}.</p>
  }
  if (src.items.length === 0) {
    return <p className="text-xs text-fg-subtle">Sin registros.</p>
  }
  return <ul className="space-y-1.5">{src.items.map((it, i) => render(it, i))}</ul>
}

function PerfilTab({ bundle }: { bundle: CaseBundle }) {
  const p = bundle.profile
  return (
    <div className="space-y-4">
      <Section title="Resumen de salud">
        <p className="text-sm text-fg-muted">{p.resumenSalud.diagnosis}</p>
        <p className="mt-2 text-xs text-fg-subtle">
          Causa raíz: {p.resumenSalud.rootCause.label} ({p.resumenSalud.rootCause.pct}%) · Confianza: {p.resumenSalud.confidence}
        </p>
      </Section>

      <Section title="Inmuebles asociados">
        <NoSourceBlock
          src={p.inmuebles}
          render={(it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-fg-muted">{it.address ?? 'Sin dirección'}</span>
              <span className="text-xs text-fg-subtle">
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
                <span className="text-fg-muted">{it.label}</span>
                <span className="text-fg">{it.value}</span>
              </li>
            )}
          />
        </Section>
        <Section title="Interacciones">
          <NoSourceBlock
            src={p.interacciones}
            render={(it, i) => (
              <li key={i} className="text-sm text-fg-muted">
                {it.summary} <span className="text-xs text-fg-subtle">· {it.at.slice(0, 10)}</span>
              </li>
            )}
          />
        </Section>
        <Section title="Contratos">
          <NoSourceBlock
            src={p.contratos}
            render={(it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-muted">{it.label}</span>
                {it.vence ? <span className="text-xs text-fg-subtle">vence {it.vence}</span> : null}
              </li>
            )}
          />
        </Section>
        <Section title="Mantenimientos">
          <NoSourceBlock
            src={p.mantenimientos}
            render={(it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg-muted">{it.label}</span>
                <span className="text-xs text-fg-subtle">{it.status} · {it.at}</span>
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
    return <Section title="Plan de retención"><p className="text-sm text-fg-muted">Este caso es saludable — no requiere plan.</p></Section>
  }
  return (
    <div className="space-y-4">
      <Section title="Objetivo del plan">
        <p className="text-sm text-fg-muted">{plan.objective}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-fg-muted">
            Playbook: {plan.playbookId}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-fg-muted">
            Responsable: {plan.responsibleRole}
          </span>
          {plan.proposed ? (
            // «Propuesto» no es un error: es un plan que todavía no existe como
            // tareas reales. Es el estado de atención del par (el otro ramal es
            // el plan ya materializado), así que va en warning, no en danger.
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">
              Propuesto (sin materializar)
            </span>
          ) : (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-success">
              {plan.status}
            </span>
          )}
        </div>
      </Section>

      <Section title="Tareas">
        <ul className="space-y-2">
          {plan.tasks.map((t, i) => (
            <li key={t.id ?? t.code ?? i} className="flex items-start gap-3 text-sm">
              {/* Viñeta decorativa: el rose original era el acento del módulo,
                  no un estado (el estado de la tarea va escrito abajo). */}
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-fg">{t.title}</p>
                <p className="text-xs text-fg-subtle">
                  {t.responsibleRole}
                  {t.dueDate ? ` · vence ${t.dueDate}` : ''} · {TASK_STATUS_LABEL[t.status]}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {plan.proposed ? (
          <p className="mt-3 text-xs text-fg-subtle">
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
          <span className="rounded-full bg-surface-muted px-2 py-0.5 capitalize text-fg-muted">
            {m.channel}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 capitalize text-fg-muted">
            tono {m.tone}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-fg-muted">
            {m.source === 'llm' ? 'redactado por IA' : 'plantilla'}
          </span>
          {m.barrierApplied ? (
            // La barrera recortó el borrador: es un aviso para que lo revises
            // antes de mandarlo, no un fallo → atención, no error.
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">
              barrera de compliance aplicada
            </span>
          ) : null}
        </div>
        {m.subject ? <p className="mb-1 text-sm font-medium text-fg">{m.subject}</p> : null}
        <p className="whitespace-pre-wrap text-sm text-fg-muted">{m.body}</p>
        <Button type="button" variant="outline" size="sm" hideArrow onClick={copy} className="mt-3">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </Section>
    </div>
  )
}
