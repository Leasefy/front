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
     * false ⇒ el grupo NUNCA debería auto-responderse (sin entender / disputa
     * / requiere humano).
     *
     * ⚠️ HOY NO LO HACE CUMPLIR NADIE. Es una nota de política, no una
     * salvaguarda: ni esta UI ni el agente la consultan. Hoy da igual porque
     * el inbox no manda nada solo —responder es siempre un clic de una
     * persona— pero el día que el agente conteste desde acá, la regla tiene
     * que vivir del lado del agente, no en este objeto.
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
  /** Pausa al agente en este deudor para que lo atienda una persona. */
  onTomarControl?: () => void
}

/**
 * Fila de una conversación. "Abrir deudor" es un cross-link al detalle,
 * "Ver conversación" abre el hilo con sus mensajes reales, y "Tomar control"
 * pausa al agente en ese deudor. El agente nunca auto-responde: responder es
 * siempre una acción de una persona.
 */
export function InboxItemCard({
  item,
  deudorHref,
  onOpenThread,
  isOpen = false,
  unread = false,
  recibidoTexto = null,
  onTomarControl,
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

        {/*
          Acá vivía «Aprobar respuesta sugerida», deshabilitado. Se quitó: el
          hilo NO trae ninguna respuesta sugerida —el contrato del inbox no
          tiene ese campo— así que el botón prometía revisar algo que no
          existe. Cuando el agente empiece a proponer respuestas, vuelve.
        */}

        {/*
          «Tomar control» = que el agente deje de contactar a este deudor
          mientras vos te hacés cargo. Eso ES pausar el agente
          (POST /cobranza/debtors/:debtorId/pause), que ya funciona desde la
          ficha del deudor. Estuvo deshabilitado como «Próximamente» mientras
          el endpoint existía.
        */}
        {onTomarControl && (
          <Button
            variant="ghost"
            size="sm"
            hideArrow
            onClick={onTomarControl}
            title="Pausar al agente en este deudor para atenderlo vos"
          >
            Tomar control
          </Button>
        )}
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
  /** Abre el envío manual de WhatsApp para el deudor del hilo. */
  onResponder?: () => void
}

/**
 * Render de los mensajes reales de un hilo, oldest → newest. Burbujas alineadas
 * por dirección (inbound = inquilino, izquierda; outbound = agencia, derecha).
 *
 * "Responder" abre el envío manual por WhatsApp (ManualWAModal →
 * POST /cobranza/debtors/:debtorId/wa-send). Estuvo deshabilitado como
 * «Próximamente» mientras el endpoint YA existía y ya se usaba desde la ficha
 * del deudor — el hilo trae `debtorId`, que es todo lo que hacía falta.
 *
 * Sigue valiendo la regla de fondo: sólo se manda una plantilla aprobada, y
 * sólo porque una persona la eligió y la envió. El agente no auto-responde.
 */
export function InboxThreadPanel({
  messages,
  isLoading,
  onMarkRead,
  marcandoLeido = false,
  unread = false,
  formatRecibido,
  onResponder,
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
        {onResponder && (
          <Button
            size="sm"
            hideArrow
            onClick={onResponder}
            title="Enviar una plantilla aprobada por WhatsApp"
          >
            Responder
          </Button>
        )}
      </div>
    </div>
  )
}
