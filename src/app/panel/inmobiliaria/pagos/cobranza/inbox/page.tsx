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
import { MagnifyingGlass, Tray } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'

import { PageGuard } from '@/components/auth/PageGuard'
import { toast } from '@/components/ui'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useI18n } from '@/lib/i18n'
import { formatRelativeTime } from '@/lib/format'
import { Card, Collapse, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'
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
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe, type TonoDelTramo } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'

/** Lo que pide a una persona va en ámbar; la disputa, en rojo. */
const TONO_DEL_GRUPO: Record<InboxGrupo, TonoDelTramo> = {
  nuevas: 'neutro',
  promesas: 'neutro',
  pagos: 'neutro',
  acuerdos: 'neutro',
  disputas: 'critico',
  sin_entender: 'aviso',
  requiere_humano: 'aviso',
}

const BASE = '/panel/inmobiliaria/pagos/cobranza'
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
  const tr = useTr();
  const en = useLocaleDelPanel() === 'en';
  const { locale } = useI18n()

  // FUENTE: endpoint unificado de inbox del agente (GET /cobranza/inbox).
  // FAIL-SOFT: si el backend no está desplegado responde vacío/404 → este hook
  // degrada a 0 hilos y la página cae a su <EmptyState>, nunca rompe.
  const { groups, totalThreads, totalUnread, isLoading, error, markRead, refetch } = useCobranzaInbox()

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
  // Los modales se montaban con `{x && <Modal open />}`: abrían suave y
  // cerraban de golpe (se desmontaban). Con el último deudor presente siguen
  // montados mientras se van, y salen con su animación.
  const responderAVivo = useUltimoPresente(responderA)
  const tomarControlDeVivo = useUltimoPresente(tomarControlDe)


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
          // Revisora r25: todas las filas decían «Conversación»; ahora, quién escribió.
          inquilino: th.debtorName?.trim() || tr('Deudor sin nombre'),
          ultimoMensaje: th.lastMessagePreview ?? '',
          grupo: backendLabelToGrupo(th.label),
          canal: th.channel || null,
          recibidoEn: th.lastMessageAt ?? null,
        })),
      ),
    [groups, tr],
  )

  // Estado de no-leído por threadId (para el badge "Nuevo" y "Marcar leído").
  const unreadByThread = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const g of groups) for (const th of g.threads) m.set(th.id, th.unread)
    return m
  }, [groups])

  const [filtro, setFiltro] = useState<GrupoFiltro>('todos')
  // Regla de Nico (23-10): toda lista larga lleva buscador. Por inquilino o por lo que escribió.
  const [buscar, setBuscar] = useState('')
  const q = buscar.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  /** El nombre del deudor para los modales (antes abrían con `debtorName=""`). */
  const nombreDe = (debtorId: string | null) =>
    (debtorId ? items.find((it) => it.debtorId === debtorId)?.inquilino : undefined) ?? ''

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
    () =>
      items.filter(
        (it) =>
          (filtro === 'todos' || it.grupo === filtro) &&
          (!q ||
            `${it.inquilino} ${it.ultimoMensaje}`
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .includes(q)),
      ),
    [items, filtro, q],
  )

  // Los hilos del inbox no tienen techo: se pintaban todos. Mismo pie que las
  // tablas del panel; cambiar de grupo vuelve a la página 1.
  //
  // `total` ya está tomado en esta pantalla: es el total de hilos del backend,
  // el que narra el resumen del agente. Lo que cuenta el pie es OTRA cosa —las
  // filas del filtro activo— así que va con su propio nombre.
  const {
    pageItems,
    total: totalVisibles,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(visibles, { resetKey: `${filtro}|${q}` })

  const handleMarkRead = async () => {
    if (!openThreadId) return
    setMarcandoLeido(true)
    try {
      await markRead(openThreadId)
    } catch (e) {
      // Antes un try/finally sin catch: el rechazo quedaba sin atrapar y la
      // pantalla no decía nada.
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos marcar la conversación como leída.',
          accion: 'marcar la conversación como leída',
        }),
      )
    } finally {
      setMarcandoLeido(false)
    }
  }

  const estado = isLoading && total === 0 ? 'cargando' : error && total === 0 ? 'fallo' : total === 0 ? 'vacio' : 'lista'
  const errorDelCartel = error ? { status: /^\d{3}$/.test(error) ? Number(error) : 0, message: error } : null

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={tr("Bandeja de conversaciones")}
        descripcion={tr("Las respuestas de tus inquilinos, agrupadas por lo que piden. Lo que el agente no entendió o pide a una persona lo atiendes tú.")}
        ayuda={
          <ParaEntenderMas etiqueta={tr("Cómo funciona")} titulo={tr("Cómo funciona la bandeja")} variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>{tr("Responder envía una plantilla aprobada por WhatsApp, y sale sólo porque tú la elegiste. Los mensajes sin entender, las disputas y los que requieren humano nunca se responden automáticamente. Un acuerdo siempre requiere tu aprobación explícita.")}</p>
              <p>
                {tr("Las conversaciones de voz están en")}{' '}
                <Link href={LLAMADAS_HREF} className="text-fg underline underline-offset-2">{tr("Llamadas")}</Link>
                {tr("; el hilo completo de cada inquilino, en")}{' '}
                <Link href={DEUDORES_HREF} className="text-fg underline underline-offset-2">{tr("Casos")}</Link>.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Cargando, fallo, vacío o la lista: cada uno entra con su fundido. Antes
          mientras cargaba (o si fallaba) la pantalla afirmaba «Aún no hay
          conversaciones en el inbox» (bloqueante r25: falso y en inglés). */}
      <CrossFade swapKey={estado}>
      {estado === 'cargando' ? (
        <EsqueletoTarjetas cantidad={4} />
      ) : estado === 'fallo' ? (
        <FalloDeCarga error={errorDelCartel} queEs="las conversaciones" onReintentar={refetch} />
      ) : estado === 'vacio' ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="inbox-vacio">
          <Tray className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
          <p className="text-body font-medium text-fg">{tr("Todavía no hay conversaciones")}</p>
          <p className="max-w-md text-body-sm text-fg-muted">
            {tr("Cuando tus inquilinos respondan por WhatsApp, voz o correo, sus mensajes llegan aquí agrupados por lo que piden.")}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* LA RESPUESTA, dentro de la tarjeta: cuántas no has leído. Los grupos son las pestañas, con su conteo. */}
          <CifraHeroe
            className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
            data-testid="inbox-resumen"
            tamano="mediana"
            rotulo={tr("Sin leer")}
            cifra={totalUnread.toLocaleString(en ? 'en-US' : 'es-CO')}
            contexto={total === 1 ? tr("de 1 conversación") : tr("de {n} conversaciones", { n: total })}
          />
          {/* QA-IA-B (04-10-2026): a 390 px las pestañas se desplazan dentro de su riel. */}
          <div className="border-b border-border px-4 py-3">
            <PestanasDeEstado<GrupoFiltro>
              data-testid="inbox-filtro-riel"
              pestanas={FILTRO_OPCIONES.map((o) => ({
                valor: o.value,
                etiqueta: tr(o.label),
                cuantos: o.value === 'todos' ? total : counts[o.value],
                fija: o.value === 'todos',
                tono: o.value !== 'todos' && TONO_DEL_GRUPO[o.value] !== 'neutro' ? ('aviso' as const) : undefined,
                testid: o.value === 'todos' ? undefined : `inbox-chip-${o.value}`,
              }))}
              valor={filtro}
              onCambio={setFiltro}
              etiqueta={tr("Filtrar conversaciones por grupo")}
            />
          </div>
          <div className="border-b border-border px-4 py-3">
            <div className="relative min-w-0 sm:max-w-sm">
              <label htmlFor="inbox-buscar" className="sr-only">
                {tr("Buscar por inquilino o mensaje")}
              </label>
              <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
              <Input
                id="inbox-buscar"
                type="search"
                className="pl-9"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder={tr("Buscar por inquilino o mensaje")}
                data-testid="inbox-buscar"
              />
            </div>
          </div>

          <CrossFade swapKey={visibles.length > 0 ? 'lista' : 'sin-resultados'}>
          {visibles.length > 0 ? (
            <div className="p-4">
              <Stagger className="space-y-3" role="list" aria-label={tr("Bandeja de conversaciones")}>
                {pageItems.map((it) => {
                  const open = openThreadId === it.key
                  return (
                    <StaggerItem key={it.key} className="space-y-3" role="listitem">
                      <ul>
                        <InboxItemCard
                          item={it}
                          deudorHref={`${DEUDORES_HREF}/${it.debtorId}`}
                          unread={unreadByThread.get(it.key) ?? false}
                          recibidoTexto={recibido(it.recibidoEn)}
                          isOpen={open}
                          onOpenThread={() => setOpenThreadId(open ? null : it.key)}
                          onTomarControl={it.debtorId ? () => setTomarControlDe(it.debtorId) : undefined}
                        />
                      </ul>
                      {/* Panel de conversación con los mensajes REALES del hilo. */}
                      <Collapse open={open} className="pl-1">
                        <InboxThreadPanel
                          messages={threadDetail?.messages ?? []}
                          isLoading={threadLoading}
                          onMarkRead={handleMarkRead}
                          marcandoLeido={marcandoLeido}
                          unread={unreadByThread.get(it.key) ?? false}
                          formatRecibido={(iso) => formatRelativeTime(iso, locale)}
                          onResponder={it.debtorId ? () => setResponderA(it.debtorId) : undefined}
                        />
                      </Collapse>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-body-sm font-medium text-fg">
                {q ? tr("Ninguna conversación coincide con «{q}»", { q: buscar.trim() }) : tr("Ninguna conversación en este grupo")}
              </p>
              <p className="mt-1 text-caption text-fg-muted">
                {q ? tr("Prueba con otro nombre o borra la búsqueda.") : tr("Cambia la pestaña para ver las demás.")}
              </p>
            </div>
          )}
          </CrossFade>

          {/* El pie va fuera del contenedor `role="list"`. */}
          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={totalVisibles}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </Card>
      )}
      </CrossFade>

      {responderAVivo && (
        <ManualWAModal
          open={responderA !== null}
          onClose={() => setResponderA(null)}
          debtorId={responderAVivo}
          debtorName={nombreDe(responderAVivo)}
          prefill={{}}
          onSuccess={() => {
            setResponderA(null)
            void refetch()
          }}
        />
      )}

      {tomarControlDeVivo && (
        <PauseModal
          open={tomarControlDe !== null}
          onClose={() => setTomarControlDe(null)}
          debtorId={tomarControlDeVivo}
          debtorName={nombreDe(tomarControlDeVivo)}
          onSuccess={() => {
            setTomarControlDe(null)
            void refetch()
          }}
        />
      )}
    </div>
  )
}

export default function CobranzaInboxPage() {
  return (
    <PageGuard module="cobranza">
      <InboxContent />
    </PageGuard>
  )
}
