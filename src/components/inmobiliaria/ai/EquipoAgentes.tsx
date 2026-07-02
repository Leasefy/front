'use client'

/**
 * EquipoAgentes — F10 of the Agent Workspace initiative (hub real).
 *
 * The "Equipo de agentes" lead section of /ai (decisión 2026-06-08: 6 colas
 * por rol + vista agregada): aggregate header ("En cola ahora: N") followed by
 * one group per owner role (Cobrador / Analista de riesgo / Contador /
 * Comercial), each with its agent cards — icon, name, enCola badge and two
 * CTAs (Sala + Cola).
 *
 * `disponible:false` on an agent = that count failed server-side (e.g. table
 * pre-migration) → render "—" + a subtle "sin datos" hint, NOT an error.
 * 404 from the resumen endpoint (`notAvailable`) → graceful panel; the rest
 * of the hub page stays functional.
 */

import Link from 'next/link'
import {
  Bank,
  ChatCircleText,
  CurrencyDollar,
  FileText,
  GitMerge,
  Robot,
  Scales,
  ShieldCheck,
  Tray,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { MonoLabel } from '@leasefy/cadence'

import type { AiHubResumenResponse } from '@/lib/api/agent-workspace'
import type { AgenteId } from '@/lib/api/work-item'
import { useI18n } from '@/lib/i18n'
import { relativeTime, workspaceVocab, type TranslateFn } from './ColaHumana'

const NS = 'inmobiliaria.ai.workspace.equipo'

// ── Vocabulary ──────────────────────────────────────────────────────────────

/**
 * Canonical per-agent icons — same mapping the workspace salas + nav use
 * (conciliación=Bank, estudio=ShieldCheck, matching=GitMerge,
 * pagos=CurrencyDollar, cobranza=ChatCircleText, cotizador=FileText,
 * avalúos=Scales — the same icon the onboarding uses for the avalúos service).
 * Finite icon maps crash when a key is missing — ALWAYS fall back to Robot.
 */
const AGENT_ICON: Record<AgenteId, Icon> = {
  cobranza: ChatCircleText,
  cotizador: FileText,
  conciliacion: Bank,
  pagos: CurrencyDollar,
  estudio: ShieldCheck,
  matching: GitMerge,
  avaluos: Scales,
}

/** Agent display name (inmobiliaria.ai.workspace.agente.*; raw-id fallback). */
function agenteNombre(t: TranslateFn, agente: string): string {
  return workspaceVocab(t, 'agente', agente)
}

/** Owner-role group label (inmobiliaria.ai.workspace.rol.*; raw fallback). */
function rolLabel(t: TranslateFn, rol: string): string {
  return workspaceVocab(t, 'rol', rol)
}

const AI_BASE = '/panel/inmobiliaria/ai'

/** Sala (overview) route per agent. */
export function salaHref(agente: AgenteId): string {
  return `${AI_BASE}/${agente}`
}

/** Cola (queue) route per agent — cobranza's human queue = escalaciones. */
export function colaHref(agente: AgenteId): string {
  if (agente === 'cobranza') return `${AI_BASE}/cobranza/escalaciones`
  return `${AI_BASE}/${agente}/cola`
}

const numberFormatter = new Intl.NumberFormat('es-CO')

// ── Props ───────────────────────────────────────────────────────────────────

export interface EquipoAgentesProps {
  data: AiHubResumenResponse | null
  isLoading?: boolean
  error?: string | null
  /** Backend 404 — graceful panel, keep the rest of the hub page. */
  notAvailable?: boolean
}

// ── Agent card ──────────────────────────────────────────────────────────────

function AgenteCard({
  agente,
  enCola,
  disponible,
}: {
  agente: AgenteId
  enCola: number
  disponible: boolean
}) {
  const { t } = useI18n()
  const AgentIcon = AGENT_ICON[agente] ?? Robot
  const nombre = agenteNombre(t, agente)

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
      data-testid={`equipo-agente-${agente}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <AgentIcon className="w-4 h-4 text-foreground" weight="duotone" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground truncate">{nombre}</p>
        </div>

        {disponible ? (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-muted text-foreground shrink-0"
            data-testid="equipo-en-cola"
          >
            <Tray className="w-3 h-3" aria-hidden="true" />
            {numberFormatter.format(enCola)}
          </span>
        ) : (
          <span
            className="inline-flex items-baseline gap-1.5 shrink-0"
            data-testid="equipo-sin-datos"
            title={t(`${NS}.sinDatosTitle`)}
          >
            <span className="text-[11px] font-mono text-muted-foreground">—</span>
            <span className="text-[10px] text-muted-foreground">{t(`${NS}.sinDatos`)}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={salaHref(agente)}
          className="flex-1 text-center text-[11px] font-medium px-2 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] transition"
          data-testid={`equipo-sala-${agente}`}
        >
          {t(`${NS}.sala`)}
        </Link>
        <Link
          href={colaHref(agente)}
          className="flex-1 text-center text-[11px] font-medium px-2 py-1.5 rounded-md border border-border text-foreground hover:bg-muted active:scale-[0.97] transition"
          data-testid={`equipo-cola-${agente}`}
        >
          {t(`${NS}.cola`)}
        </Link>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export function EquipoAgentes({ data, isLoading, error, notAvailable }: EquipoAgentesProps) {
  const { t } = useI18n()
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="equipo-agentes-loading">
        <div className="h-8 w-56 rounded-lg bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-danger/30 bg-danger-soft text-danger"
        data-testid="equipo-agentes-error"
      >
        {t(`${NS}.error`, { error })}
      </div>
    )
  }

  if (notAvailable || !data) {
    // 404 / backend not deployed — graceful panel; rest of the hub keeps working.
    return (
      <div
        className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center"
        data-testid="equipo-agentes-empty"
      >
        <UsersThree className="w-8 h-8 mx-auto text-muted-foreground mb-2" weight="duotone" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{t(`${NS}.emptyTitle`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(`${NS}.emptyBody`)}</p>
      </div>
    )
  }

  return (
    <section className="space-y-5" data-testid="equipo-agentes">
      {/* Aggregate header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">
          <span className="font-semibold tabular-nums" data-testid="equipo-total">
            {t(`${NS}.enColaAhora`, { n: numberFormatter.format(data.totalEnCola) })}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {t(`${NS}.actualizado`, { tiempo: relativeTime(data.generatedAt, t) })}
        </p>
      </div>

      {/* One group per owner role */}
      {data.colas.map((cola) => (
        <div key={cola.rol} className="space-y-2" data-testid={`equipo-rol-${cola.rol}`}>
          <div className="flex items-baseline gap-2">
            <MonoLabel className="text-muted-foreground">
              {cola.label || rolLabel(t, cola.rol)}
            </MonoLabel>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {t(`${NS}.enColaCount`, { n: numberFormatter.format(cola.total) })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cola.agentes.map((entry) => (
              <AgenteCard
                key={entry.agente}
                agente={entry.agente}
                enCola={entry.enCola}
                disponible={entry.disponible}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
