'use client'

/**
 * CobranzaInboxGroups — taxonomía y tarjeta de fila del "Inbox de
 * conversaciones" (visión #20).
 *
 * Define las 7 agrupaciones del inbox (Nuevas respuestas, Promesas detectadas,
 * Pagos reportados, Solicitudes de acuerdo, Disputas, Mensajes sin entender,
 * Requiere humano), su tono semántico por token del DS, y la <InboxItemCard>
 * con {inquilino, último mensaje, grupo (badge token), acción}.
 *
 * FUENTE: HOY no existe un endpoint unificado de inbox de conversaciones (las
 * respuestas viven dispersas entre llamadas/WhatsApp y el detalle del deudor).
 * Por eso la PÁGINA usa estos tipos para dejar la UI de agrupaciones lista y
 * muestra un <EmptyState> honesto + cross-link; la card aquí queda disponible
 * para cuando el endpoint exista. No inventa datos.
 *
 * T-323 (cobranza es el caso MÁS sensible): los grupos "Mensajes sin entender"
 * y "Requiere humano" NUNCA ofrecen "Aprobar respuesta sugerida" — su única
 * acción posible es que un humano abra/tome el control. La acción "Aprobar
 * respuesta sugerida" no tiene endpoint → placeholder honesto "Próximamente"
 * deshabilitado. Nunca se auto-responde, escala ni presiona.
 *
 * Estilo: contrato DS 2026-06-16 — rounded-xl border-border bg-card, tonos por
 * token (primary/success/warning/danger + *-soft), badges de estado en pill,
 * sin hex inline.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ChatCircleDots,
  Handshake,
  CurrencyCircleDollar,
  FileText,
  Warning,
  Question,
  UserGear,
  type Icon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui'
import { Badge, type BadgeProps } from '@/components/ui/badge'

// ── Grupos del inbox ──────────────────────────────────────────────────────────

export type InboxGrupo =
  | 'nuevas'
  | 'promesas'
  | 'pagos'
  | 'acuerdos'
  | 'disputas'
  | 'sin_entender'
  | 'requiere_humano'

/** Orden canónico de presentación de los grupos. */
export const INBOX_GRUPOS: InboxGrupo[] = [
  'nuevas',
  'promesas',
  'pagos',
  'acuerdos',
  'disputas',
  'sin_entender',
  'requiere_humano',
]

/** Metadatos de cada grupo: etiqueta, ícono y tono semántico por token. */
export const INBOX_GRUPO_META: Record<
  InboxGrupo,
  {
    label: string
    icon: Icon
    /** Clases del badge de grupo (pill no interactivo) — solo tokens DS. */
    badge: { bg: string; text: string; ring: string }
    /**
     * T-323: false ⇒ el grupo NUNCA puede auto-responder (sin entender /
     * requiere humano). La acción siempre es de un humano (Abrir / Tomar control).
     */
    autoResponseAllowed: boolean
  }
> = {
  nuevas: {
    label: 'Nuevas respuestas',
    icon: ChatCircleDots,
    badge: { bg: 'bg-primary-soft', text: 'text-primary', ring: 'ring-primary/30' },
    autoResponseAllowed: true,
  },
  promesas: {
    label: 'Promesas detectadas',
    icon: Handshake,
    badge: { bg: 'bg-primary-soft', text: 'text-primary', ring: 'ring-primary/30' },
    autoResponseAllowed: true,
  },
  pagos: {
    label: 'Pagos reportados',
    icon: CurrencyCircleDollar,
    badge: { bg: 'bg-success-soft', text: 'text-success', ring: 'ring-success/30' },
    autoResponseAllowed: true,
  },
  acuerdos: {
    label: 'Solicitudes de acuerdo',
    icon: FileText,
    badge: { bg: 'bg-warning-soft', text: 'text-warning', ring: 'ring-warning/30' },
    // Un acuerdo SIEMPRE requiere aprobación humana explícita; aquí solo se abre
    // o se toma el control — no hay respuesta sugerida que aprobar de un clic.
    autoResponseAllowed: false,
  },
  disputas: {
    label: 'Disputas',
    icon: Warning,
    badge: { bg: 'bg-danger-soft', text: 'text-danger', ring: 'ring-danger/30' },
    // Una disputa es sensible: nunca se auto-responde, la atiende un humano.
    autoResponseAllowed: false,
  },
  sin_entender: {
    label: 'Mensajes sin entender',
    icon: Question,
    badge: { bg: 'bg-surface-muted', text: 'text-fg-muted', ring: 'ring-border' },
    autoResponseAllowed: false,
  },
  requiere_humano: {
    label: 'Requiere humano',
    icon: UserGear,
    badge: { bg: 'bg-danger-soft', text: 'text-danger', ring: 'ring-danger/30' },
    autoResponseAllowed: false,
  },
}

// ── Modelo de una conversación del inbox ──────────────────────────────────────

export interface InboxItem {
  /** Key única para React. */
  key: string
  /** Id del deudor — para el cross-link al detalle. */
  debtorId: string
  /** Nombre (o primer nombre) del inquilino. */
  inquilino: string
  /** Último mensaje recibido (texto). */
  ultimoMensaje: string
  /** Grupo derivado de la conversación. */
  grupo: InboxGrupo
  /** Canal de la conversación (WhatsApp / voz…) — meta, no señal de estado. */
  canal: string | null
  /** Cuándo llegó el último mensaje (ISO) — para tiempo relativo. */
  recibidoEn: string | null
}

// ── Card de fila ──────────────────────────────────────────────────────────────

/** Tono del Badge de grupo (pill de estado) por grupo del inbox. */
const GRUPO_BADGE_VARIANT: Record<InboxGrupo, BadgeProps['variant']> = {
  nuevas: 'default',
  promesas: 'default',
  pagos: 'success',
  acuerdos: 'warning',
  disputas: 'destructive',
  sin_entender: 'secondary',
  requiere_humano: 'destructive',
}

const VACIO = '—'

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

export interface InboxItemCardProps {
  item: InboxItem
  /** Detalle del deudor — cross-link de "Abrir" (superficie existente). */
  deudorHref: string
  /**
   * Abre el hilo seleccionado para ver sus mensajes reales (endpoint nuevo).
   * Cuando se pasa, la fila ofrece "Ver conversación" y resalta si está activa.
   * Si se omite, la card se comporta como antes (sin endpoint de inbox).
   */
  onOpenThread?: () => void
  /** Marca visual de hilo abierto. */
  isOpen?: boolean
  /** El hilo aún tiene mensajes sin leer (badge "Nuevo"). */
  unread?: boolean
  /** Texto de tiempo relativo del último mensaje (ya formateado). */
  recibidoTexto?: string | null
}

/**
 * Fila de una conversación. "Abrir" es un cross-link real al detalle del
 * deudor (superficie existente). "Ver conversación" abre el hilo con sus
 * mensajes reales (endpoint nuevo, vía onOpenThread). Las acciones que aún no
 * tienen endpoint (Aprobar respuesta sugerida / Tomar control) son placeholders
 * honestos "Próximamente" — T-323: nunca se auto-responde.
 */
export function InboxItemCard({
  item,
  deudorHref,
  onOpenThread,
  isOpen = false,
  unread = false,
  recibidoTexto = null,
}: InboxItemCardProps) {
  const meta = INBOX_GRUPO_META[item.grupo]
  const GrupoIcon = meta.icon

  return (
    <li
      className={`rounded-xl border bg-surface p-4 space-y-2.5 transition-colors ${
        isOpen ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      }`}
      data-testid={`inbox-item-${item.key}`}
    >
      {/* Header: inquilino + badge de grupo + canal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-fg truncate">
            {item.inquilino || VACIO}
          </span>
          {unread && (
            <Badge variant="default" className="shrink-0">
              Nuevo
            </Badge>
          )}
          <Badge variant={GRUPO_BADGE_VARIANT[item.grupo]} className="gap-1 shrink-0">
            <GrupoIcon className="w-3 h-3" weight="duotone" aria-hidden="true" />
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {item.canal && (
            <span className="text-xs text-fg-muted">{item.canal}</span>
          )}
          {recibidoTexto && (
            <span className="text-xs text-fg-muted">· {recibidoTexto}</span>
          )}
        </div>
      </div>

      {/* Último mensaje */}
      <p className="text-sm text-fg-muted leading-relaxed">
        <span className="font-medium text-fg">Último mensaje:</span>{' '}
        {item.ultimoMensaje ? truncate(item.ultimoMensaje, 160) : VACIO}
      </p>

      {/* Footer: acciones */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-2.5">
        {/* "Ver conversación" = abre el hilo con sus mensajes reales (endpoint
            nuevo). Solo si la página pasó onOpenThread. */}
        {onOpenThread && (
          <Button
            variant={isOpen ? 'secondary' : 'outline'}
            size="sm"
            hideArrow
            onClick={onOpenThread}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Ocultar conversación' : 'Ver conversación'}
          </Button>
        )}

        {/* "Abrir" = cross-link real al detalle del deudor */}
        <Button asChild variant="ghost" size="sm" hideArrow>
          <Link href={deudorHref}>Abrir deudor</Link>
        </Button>

        {/* Aprobar respuesta sugerida — SOLO en grupos donde está permitido (T-323).
            Sin endpoint de envío → placeholder honesto deshabilitado. */}
        {meta.autoResponseAllowed && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            disabled
            title="Próximamente"
          >
            Aprobar respuesta sugerida · Próximamente
          </Button>
        )}

        {/* Tomar control — siempre disponible como intención humana; sin endpoint
            de envío todavía → placeholder honesto deshabilitado. */}
        <Button variant="ghost" size="sm" hideArrow disabled title="Próximamente">
          Tomar control · Próximamente
        </Button>
      </div>
    </li>
  )
}

// ── Panel de conversación (mensajes reales del hilo) ──────────────────────────

/** Un mensaje del hilo (forma del endpoint GET /inbox/{threadId}). */
export interface InboxThreadMessage {
  id: string
  direction: string
  channel: string
  body: string
  classification: string | null
  occurredAt: string
  createdAt: string
}

export interface InboxThreadPanelProps {
  messages: InboxThreadMessage[]
  isLoading: boolean
  /** Marca el hilo como leído (POST /read). Sin endpoint → no-op fail-soft. */
  onMarkRead?: () => void
  marcandoLeido?: boolean
  /** El hilo tiene mensajes sin leer (habilita "Marcar leído"). */
  unread?: boolean
  /** Formatea un timestamp ISO a texto relativo (inyectado por la página). */
  formatRecibido?: (iso: string) => string
}

/**
 * Render de los mensajes reales de un hilo, oldest → newest. Burbujas alineadas
 * por dirección (inbound = inquilino, izquierda; outbound = agencia, derecha).
 *
 * T-323: este panel SOLO muestra y permite "Marcar leído" (estado de lectura,
 * sin contacto con el deudor). "Responder" / "Tomar control" quedan como
 * placeholder honesto "Próximamente" hasta que exista un endpoint de envío:
 * nunca se auto-responde, escala ni presiona.
 */
export function InboxThreadPanel({
  messages,
  isLoading,
  onMarkRead,
  marcandoLeido = false,
  unread = false,
  formatRecibido,
}: InboxThreadPanelProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-fg-muted"
        role="status"
      >
        Cargando conversación…
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-fg-muted">
        Esta conversación todavía no tiene mensajes para mostrar.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4 space-y-3">
      <ul className="space-y-2.5" aria-label="Mensajes de la conversación">
        {messages.map((m) => {
          const inbound = m.direction === 'inbound'
          return (
            <li
              key={m.id}
              className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  inbound
                    ? 'bg-surface border border-border'
                    : 'bg-primary-soft'
                }`}
              >
                <p className="text-xs font-medium text-fg-muted mb-0.5">
                  {inbound ? 'Inquilino' : 'Agencia'}
                  {m.channel ? ` · ${m.channel}` : ''}
                </p>
                <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap break-words">
                  {m.body || VACIO}
                </p>
                {formatRecibido && (
                  <p className="text-xs text-fg-muted mt-1">
                    {formatRecibido(m.occurredAt)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Acciones del hilo — solo "Marcar leído" es real (estado de lectura). */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        {onMarkRead && (
          <Button
            variant="outline"
            size="sm"
            hideArrow
            onClick={onMarkRead}
            disabled={marcandoLeido || !unread}
            title={unread ? 'Marcar como leído' : 'Sin mensajes nuevos'}
          >
            {marcandoLeido ? 'Marcando…' : 'Marcar leído'}
          </Button>
        )}
        {/* Responder — sin endpoint de envío → placeholder honesto (T-323). */}
        <Button variant="ghost" size="sm" hideArrow disabled title="Próximamente">
          Responder · Próximamente
        </Button>
      </div>
    </div>
  )
}
