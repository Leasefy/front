'use client'

/**
 * /ai/cobranza/inbox — "Inbox de conversaciones" (visión #20).
 *
 * Vista tipo inbox con AGRUPACIONES de las respuestas que llegan de los
 * inquilinos: Nuevas respuestas, Promesas detectadas, Pagos reportados,
 * Solicitudes de acuerdo, Disputas, Mensajes sin entender y Requiere humano.
 * Arriba, un resumen del agente; cada conversación se vería como una fila con
 * {inquilino, último mensaje, grupo (badge token), acción}.
 *
 * FUENTE: endpoint unificado de inbox del agente
 * (GET /api/agency/{id}/cobranza/inbox + /{threadId} + /{threadId}/read, vía
 * use-inbox.ts). Las 7 agrupaciones se llenan con conteos reales; al abrir un
 * hilo se ven sus mensajes reales; "Marcar leído" hace POST /read + refetch.
 * FAIL-SOFT: el backend aún no está desplegado (Victor lo despliega + aplica
 * la migración). Si responde 404 / vacío / error, la página degrada EXACTO al
 * estado actual: conteos en 0 + <EmptyState> + cross-link a las llamadas
 * (/ai/cobranza/llamadas) y al detalle de cada deudor (/ai/cobranza/deudores).
 * Nunca rompe ni muestra un error feo.
 *
 * T-323 (cobranza es el caso MÁS sensible): los grupos "Mensajes sin entender"
 * y "Requiere humano" NUNCA se auto-responden — siempre los atiende un humano.
 * La única acción de escritura cableada es "Marcar leído" (estado de lectura,
 * sin contacto con el deudor). Responder / Tomar control / Aprobar respuesta
 * sugerida NO tienen endpoint de envío → quedan como placeholders honestos
 * "Próximamente" deshabilitados. Nunca se auto-responde, rechaza, escala ni presiona.
 *
 * Estilo: contrato DS 2026-06-16 — PageGuard module="cobranza", MigaDePan,
 * SegmentedControl para el filtro de grupo, Chips de conteo, tonos por token.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Tray, PhoneCall, Users } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { formatRelativeTime } from '@/lib/format'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Chip, SegmentedControl } from '@leasefy/cadence'
import {
  InboxItemCard,
  InboxThreadPanel,
  INBOX_GRUPOS,
  INBOX_GRUPO_META,
  type InboxGrupo,
  type InboxItem,
} from '@/components/inmobiliaria/cobranza/CobranzaInboxGroups'
import {
  useCobranzaInbox,
  useInboxThread,
  backendLabelToGrupo,
} from '@/lib/hooks/cobranza/use-inbox'
import { ManualWAModal } from '@/components/inmobiliaria/cobranza/intervention/ManualWAModal'
import { PauseModal } from '@/components/inmobiliaria/cobranza/intervention/PauseModal'

const BASE = '/panel/inmobiliaria/cobros/cobranza'
const LLAMADAS_HREF = `${BASE}/llamadas`
const DEUDORES_HREF = `${BASE}/deudores`

// ── Filtro de grupo (SegmentedControl, excluyente) ───────────────────────────

type GrupoFiltro = 'todos' | InboxGrupo

const FILTRO_OPCIONES: { value: GrupoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  ...INBOX_GRUPOS.map((g) => ({ value: g, label: INBOX_GRUPO_META[g].label })),
]

// ── Contenido ────────────────────────────────────────────────────────────────

function InboxContent() {
  const { locale } = useI18n()

  // FUENTE: endpoint unificado de inbox del agente (GET /cobranza/inbox).
  // FAIL-SOFT: si el backend no está desplegado responde vacío/404 → este hook
  // degrada a 0 hilos y la página cae a su <EmptyState>, nunca rompe.
  const { groups, totalThreads, totalUnread, markRead, refetch } = useCobranzaInbox()

  // Hilo abierto (master-detail). null = ninguno seleccionado.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const { data: threadDetail, isLoading: threadLoading } =
    useInboxThread(openThreadId)
  const [marcandoLeido, setMarcandoLeido] = useState(false)

  /**
   * Deudor al que se le está respondiendo. El envío va por `ManualWAModal`
   * (POST /cobranza/debtors/:debtorId/wa-send), el mismo camino que usa la
   * ficha del deudor: sólo plantillas aprobadas, y sólo porque una persona
   * eligió y envió.
   */
  const [responderA, setResponderA] = useState<string | null>(null)

  /**
   * Deudor sobre el que se está tomando control: pausar al agente para
   * atenderlo una persona (POST /cobranza/debtors/:debtorId/pause).
   */
  const [tomarControlDe, setTomarControlDe] = useState<string | null>(null)

  const recibido = (iso: string | null | undefined): string | null =>
    iso ? formatRelativeTime(iso, locale) : null

  // Mapea los hilos reales del backend a las filas del inbox. El backend no
  // expone el nombre del inquilino (PII redactada) → usamos una etiqueta no-PII
  // y el cross-link al detalle del deudor donde sí vive el nombre.
  const items: InboxItem[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.threads.map((th) => ({
          key: th.id,
          debtorId: th.debtorId,
          inquilino: 'Conversación',
          ultimoMensaje: th.lastMessagePreview ?? '',
          grupo: backendLabelToGrupo(th.label),
          canal: th.channel || null,
          recibidoEn: th.lastMessageAt ?? null,
        })),
      ),
    [groups],
  )

  // Estado de no-leído por threadId (para el badge "Nuevo" y "Marcar leído").
  const unreadByThread = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const g of groups) for (const th of g.threads) m.set(th.id, th.unread)
    return m
  }, [groups])

  const [filtro, setFiltro] = useState<GrupoFiltro>('todos')

  // Conteos por grupo de UI derivados de los conteos reales del backend.
  const counts = useMemo(() => {
    const c = Object.fromEntries(INBOX_GRUPOS.map((g) => [g, 0])) as Record<
      InboxGrupo,
      number
    >
    for (const g of groups) c[backendLabelToGrupo(g.label)] += g.count
    return c
  }, [groups])

  const total = totalThreads

  const visibles = useMemo(
    () => (filtro === 'todos' ? items : items.filter((it) => it.grupo === filtro)),
    [items, filtro],
  )

  const handleMarkRead = async () => {
    if (!openThreadId) return
    setMarcandoLeido(true)
    try {
      await markRead(openThreadId)
    } finally {
      setMarcandoLeido(false)
    }
  }

  // Resumen del agente — honesto: con datos, narra el desglose; sin datos, encuadra
  // qué va a aparecer aquí sin inventar cifras.
  const resumen = useMemo(() => {
    if (total === 0) {
      return 'Cuando lleguen respuestas de tus inquilinos, te las resumiré aquí agrupadas por intención: promesas, pagos reportados, solicitudes de acuerdo y las que necesitan tu atención.'
    }
    const partes: string[] = []
    for (const g of INBOX_GRUPOS) {
      const n = counts[g]
      if (n > 0) {
        const meta = INBOX_GRUPO_META[g]
        partes.push(`${n} ${(n === 1 ? meta.singular : meta.label).toLowerCase()}`)
      }
    }
    const desglose = partes.length > 0 ? ` ${partes.join(', ')}.` : ''
    const sinLeer =
      totalUnread > 0
        ? ` ${totalUnread} sin leer.`
        : ''
    return `Tengo ${total} conversación${total === 1 ? '' : 'es'} activa${
      total === 1 ? '' : 's'
    }:${desglose}${sinLeer}`
  }, [total, counts, totalUnread])

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Inbox de conversaciones
        </h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Las respuestas de tus inquilinos, agrupadas por intención. Cada
          conversación muestra el último mensaje y la acción sugerida. Los
          mensajes sin entender y los que requieren humano nunca se responden
          solos: los atiendes tú.
        </p>
      </header>

      {/* Resumen del agente */}
      <section
        role="status"
        className="rounded-lg border border-border bg-surface-muted p-4 flex items-start gap-3"
        data-testid="inbox-resumen"
      >
        <Tray
          className="w-5 h-5 shrink-0 text-fg-muted mt-0.5"
          weight="duotone"
          aria-hidden="true"
        />
        <p className="text-sm text-fg leading-relaxed min-w-0">{resumen}</p>
      </section>

      {/* Filtro de grupo (excluyente) + total */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SegmentedControl<GrupoFiltro>
          options={FILTRO_OPCIONES}
          value={filtro}
          onChange={setFiltro}
          aria-label="Filtrar conversaciones por grupo"
        />
        <span className="text-xs text-fg-muted tabular-nums shrink-0">
          {visibles.length} de {total}
        </span>
      </div>

      {/* Chips de conteo por grupo — agrupaciones siempre visibles */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Agrupaciones del inbox"
      >
        {INBOX_GRUPOS.map((g) => {
          const meta = INBOX_GRUPO_META[g]
          const GrupoIcon = meta.icon
          const active = filtro === g
          return (
            <Chip
              key={g}
              size="sm"
              selected={active}
              onClick={() => setFiltro(active ? 'todos' : g)}
              icon={<GrupoIcon weight="duotone" aria-hidden="true" />}
              data-testid={`inbox-chip-${g}`}
            >
              {meta.label}
              <span className="tabular-nums">{counts[g]}</span>
            </Chip>
          )
        })}
      </div>

      {/* Lista de conversaciones (datos reales del endpoint). FAIL-SOFT: si el
          backend no está desplegado, `visibles` queda vacío → <EmptyState>. */}
      {visibles.length > 0 ? (
        <div
          className="space-y-3 max-w-3xl"
          role="list"
          aria-label="Inbox de conversaciones"
        >
          {visibles.map((it) => {
            const open = openThreadId === it.key
            return (
              <div key={it.key} className="space-y-3" role="listitem">
                <ul>
                  <InboxItemCard
                    item={it}
                    deudorHref={`${DEUDORES_HREF}/${it.debtorId}`}
                    unread={unreadByThread.get(it.key) ?? false}
                    recibidoTexto={recibido(it.recibidoEn)}
                    isOpen={open}
                    onOpenThread={() =>
                      setOpenThreadId(open ? null : it.key)
                    }
                    onTomarControl={
                      it.debtorId ? () => setTomarControlDe(it.debtorId) : undefined
                    }
                  />
                </ul>
                {/* Panel de conversación con los mensajes REALES del hilo. */}
                {open && (
                  <div className="pl-1">
                    <InboxThreadPanel
                      messages={threadDetail?.messages ?? []}
                      isLoading={threadLoading}
                      onMarkRead={handleMarkRead}
                      marcandoLeido={marcandoLeido}
                      unread={unreadByThread.get(it.key) ?? false}
                      formatRecibido={(iso) => formatRelativeTime(iso, locale)}
                      onResponder={
                        it.debtorId ? () => setResponderA(it.debtorId) : undefined
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Tray}
          title="Aún no hay conversaciones en el inbox"
          description="Cuando lleguen respuestas de tus inquilinos por WhatsApp, voz o correo, aparecerán aquí agrupadas por intención. Mientras tanto, encontrás las conversaciones en las llamadas y en el detalle de cada deudor."
        />
      )}

      {/* Cross-links explícitos a las superficies donde sí vive la conversación */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
        <Link
          href={LLAMADAS_HREF}
          className="rounded-lg border border-border bg-card p-4 hover:bg-surface-muted/50 transition-colors flex items-start gap-3"
        >
          <PhoneCall
            className="w-5 h-5 shrink-0 text-fg-muted mt-0.5"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Llamadas</p>
            <p className="text-xs text-fg-muted leading-relaxed mt-0.5">
              Conversaciones de voz y su resultado, con transcripción y QA.
            </p>
          </div>
        </Link>
        <Link
          href={DEUDORES_HREF}
          className="rounded-lg border border-border bg-card p-4 hover:bg-surface-muted/50 transition-colors flex items-start gap-3"
        >
          <Users
            className="w-5 h-5 shrink-0 text-fg-muted mt-0.5"
            weight="duotone"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Deudores</p>
            <p className="text-xs text-fg-muted leading-relaxed mt-0.5">
              El hilo completo de cada inquilino, con sus mensajes y seguimiento.
            </p>
          </div>
        </Link>
      </section>

      {/* Nota honesta de alcance de la fuente */}
      <p className="text-xs text-fg-muted leading-relaxed max-w-2xl">
        Responder envía una plantilla aprobada por WhatsApp, y sale sólo porque
        vos la elegiste. Los mensajes sin entender, las disputas y los que
        requieren humano nunca se responden automáticamente. Un acuerdo siempre
        requiere tu aprobación explícita.
      </p>

      {responderA && (
        <ManualWAModal
          open
          onClose={() => setResponderA(null)}
          debtorId={responderA}
          debtorName=""
          prefill={{}}
          onSuccess={() => {
            setResponderA(null)
            void refetch()
          }}
        />
      )}

      {tomarControlDe && (
        <PauseModal
          open
          onClose={() => setTomarControlDe(null)}
          debtorId={tomarControlDe}
          debtorName=""
          onSuccess={() => {
            setTomarControlDe(null)
            void refetch()
          }}
        />
      )}
    </main>
  )
}

export default function CobranzaInboxPage() {
  return (
    <PageGuard module="cobranza">
      <InboxContent />
    </PageGuard>
  )
}
