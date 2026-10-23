'use client'

/**
 * Compliance — Audit log (forensic read-only) — Phase 34 plan 34-07
 * (D-34-08, RESEARCH §6 risk-7).
 *
 * Filtered, PII-redacted audit log table with 4 combinable filters:
 *   - actor (agency members dropdown, cached once)
 *   - action (enum dropdown + free-text fallback for forward-compat values)
 *   - date range (from/to, default last 7 days)
 *   - search q (≥ 8 chars, matches cedula_hash_prefix8 OR entity_id UUID-prefix)
 *
 * CRITICAL forensic invariant (RESEARCH §6 risk-7 + threat T-34-07-01):
 *   - Mask is rendered with `onReveal={undefined}` everywhere on this page
 *   - NO PIIRevealContext.Provider in this subtree → if any descendant Mask
 *     tries to use the context, the safe `usePIIRevealContextSafe()` hook
 *     returns null and the Mask falls into no-reveal mode
 *   - Details are rendered as plain-text «clave: valor» rows
 *     (`detallesLegibles`, N-09) — NEVER via raw-HTML injection sinks (see T-34-07-02)
 *
 * Refs mvp:docs/DESIGN.md §4 (cards, tables, inputs), §16 (tabular-nums).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardText, DownloadSimple } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { agentFetch } from '@/lib/api/agent-fetch'
import { Mask } from '@/components/inmobiliaria/cobranza/Mask'
import Link from 'next/link'
import { detallesLegibles } from '@/lib/cobranza/detalles-de-la-auditoria'
import {
  accionConNombre,
  accionLegible,
  actorLegible,
  cuandoPaso,
  enlaceDeLaEntidad,
  entidadLegible,
} from '@/lib/cobranza/vocabulario-de-la-auditoria'
import { Card, CrossFade, Presence } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableHead,
  TableCell,
  TableRowAnimada,
} from '@/components/ui/table'
import {
  useAuditLog,
  type AuditLogFilters,
} from '@/lib/hooks/cobranza/use-audit-log'
import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service'
import type { AgencyUser } from '@/lib/types/inmobiliaria'
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

// D-34-08 + 34-04: las acciones que se pueden filtrar. Glow up r26 (bloqueante):
// se quitó el «Otro…» que abría un campo para escribir el «código de la acción»:
// pedía un código interno. Lo que no está en la lista se ve con «Todas».
const ACTION_OPTIONS = [
  'pii_reveal',
  'intervention',
  'force_stage',
  'escalation_resolve',
  'threshold_edit',
  'manual_wa_send',
  'manual_call_trigger',
  'opt_out_acknowledged',
  'subscription_update',
] as const

/** Quién actuó cuando no hay una persona detrás. */
const ACTOR_SISTEMA: Record<string, string> = {
  saas_orchestrator: 'Agente (automático)',
  system: 'Sistema',
  cron: 'Tarea programada',
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayYmd(): string {
  return ymd(new Date())
}

function daysAgoYmd(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return ymd(d)
}

function AuditContent() {
  const { t, formatDate } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? ''

  const [actor, setActor] = useState<string | undefined>(undefined)
  const [action, setAction] = useState<string | undefined>(undefined)
  const [from, setFrom] = useState<string>(daysAgoYmd(7))
  const [to, setTo] = useState<string>(todayYmd())
  const [qInput, setQInput] = useState<string>('')
  // MORI-26: una cédula (con o sin puntos, desde 5 cifras) o 8 caracteres de
  // una referencia; el micro busca el caso de esa cédula.
  const esCedula = /^\d{5,15}$/.test(qInput.replace(/[.\s-]/g, ''))
  const qValid = qInput.length === 0 || esCedula || qInput.length >= 8
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [exportFallo, setExportFallo] = useState(false)

  // Stable filter object: only re-fire fetch when ALL inputs stabilize
  const filters = useMemo<AuditLogFilters>(
    () => ({
      actor: actor && actor.length > 0 ? actor : undefined,
      action: action && action.length > 0 ? action : undefined,
      from,
      to,
      q: qValid && qInput.length > 0 ? qInput : undefined,
    }),
    [actor, action, from, to, qInput, qValid],
  )

  const { items, isLoading, isLoadingMore, error, fallo, hasMore, loadMore, refetch } =
    useAuditLog(filters)

  // N-15 (QA-PAGOS-95): la lista del equipo es `configuracion:view`; sin él (el
  // contador) era un 403 en cada visita. Sin la lista, el filtro de «Quién» no se ofrece.
  const { canAccess, isLoading: permisosCargando } = usePermissionsContext()
  const veElEquipo = !permisosCargando && canAccess('configuracion', 'view')
  const [members, setMembers] = useState<AgencyUser[]>([])
  useEffect(() => {
    if (!veElEquipo) return
    let cancelled = false
    inmobiliariaConfigApi
      .getUsers()
      .then((list: AgencyUser[]) => {
        if (!cancelled) setMembers(list)
      })
      .catch(() => {
        /* sin la lista, el filtro de «Quién» no se ofrece */
      })
    return () => {
      cancelled = true
    }
  }, [veElEquipo])

  // Phase 38-07 (D-38-10): el CSV se baja con fetch + blob (el micro pide el
  // Bearer: un <a download> pelado no lo manda). Glow up r26: si falla, se dice
  // con «Intentar de nuevo» (antes sólo quedaba en la consola) y el archivo se
  // llama en español.
  const exportCsv = useCallback(async () => {
    if (isExportingCsv) return
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
    if (!agentUrl || !agencyId) return
    setIsExportingCsv(true)
    setExportFallo(false)
    try {
      const qs = new URLSearchParams({ from, to })
      if (action) qs.set('kind', action)
      const url = `${agentUrl}/api/agency/${agencyId}/compliance/audit-log.csv?${qs.toString()}`
      const resp = await agentFetch(url)
      if (!resp.ok) throw new Error(`[exportCsv] backend returned ${resp.status}`)
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `bitacora-de-cobranza-${from}-a-${to}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      console.error('[exportCsv] failed:', err)
      setExportFallo(true)
    } finally {
      setIsExportingCsv(false)
    }
  }, [isExportingCsv, agencyId, from, to, action])

  const hayFiltros =
    filters.actor !== undefined || filters.action !== undefined || filters.q !== undefined
  const limpiarFiltros = () => {
    setActor(undefined)
    setAction(undefined)
    setQInput('')
  }

  const cuando = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? cuandoPaso(iso)
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const estado =
    isLoading && items.length === 0 ? 'cargando' : error && items.length === 0 ? 'fallo' : items.length === 0 ? 'vacio' : 'tabla'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.compliance.subPages.auditTitle')}
        descripcion="Lo que pasó en la cobranza, quién lo hizo y cuándo. Es sólo lectura y los datos personales no se muestran aquí."
        acciones={
          items.length > 0 && agencyId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void exportCsv() }}
              isLoading={isExportingCsv}
              disabled={isExportingCsv}
              hideArrow
              data-testid="auditoria-exportar"
            >
              <DownloadSimple className="h-4 w-4" aria-hidden="true" />
              {isExportingCsv ? 'Preparando el archivo…' : t('inmobiliaria.ai.cobranza.compliance.audit.exportCsv')}
            </Button>
          ) : null
        }
      />

      <Presence
        show={exportFallo}
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-body-sm text-danger"
      >
        <span>No pudimos preparar el archivo de la bitácora.</span>
        <Button variant="outline" size="sm" hideArrow onClick={() => void exportCsv()} data-testid="auditoria-exportar-reintentar">
          Intentar de nuevo
        </Button>
      </Presence>

      <Card className="overflow-hidden">
        {/* La barra de filtros, DENTRO de la tarjeta de la tabla (antes una grilla de cuatro selects aparte). */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative w-full lg:w-72">
            <Input
              id="audit-q"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Buscar por cédula (Ej.: 1.017.234.567)"
              aria-label={t('inmobiliaria.ai.cobranza.compliance.filters.search')}
              aria-invalid={!qValid ? true : undefined}
              aria-describedby={!qValid ? 'audit-q-pista' : undefined}
              className="w-full"
              data-testid="auditoria-buscar"
            />
          </div>
          <div className="flex items-center gap-2">
            <CampoDeDia
              id="auditoria-desde"
              value={from}
              onChange={(v) => setFrom(v)}
              max={to}
              placeholder="Desde"
              className="w-40"
            />
            <span className="text-caption text-fg-muted">a</span>
            <CampoDeDia
              id="auditoria-hasta"
              value={to}
              onChange={(v) => setTo(v)}
              min={from}
              max={todayYmd()}
              placeholder="Hasta"
              className="w-40"
            />
          </div>
          {members.length > 0 ? (
            <Select value={actor ?? '__all__'} onValueChange={(v) => setActor(v === '__all__' ? undefined : v)}>
              <SelectTrigger id="audit-actor" aria-label={t('inmobiliaria.ai.cobranza.compliance.filters.actor')} className="w-full lg:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Cualquier persona</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.email}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={action ?? '__all__'} onValueChange={(v) => setAction(v === '__all__' ? undefined : v)}>
            <SelectTrigger id="audit-action" aria-label={t('inmobiliaria.ai.cobranza.compliance.filters.action')} className="w-full lg:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las acciones</SelectItem>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {accionLegible(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hayFiltros ? (
            <Button variant="ghost" size="sm" hideArrow onClick={limpiarFiltros} data-testid="auditoria-limpiar">
              Limpiar filtros
            </Button>
          ) : null}
        </div>
        {!qValid ? (
          <p id="audit-q-pista" className="border-b border-border px-4 py-2 text-caption text-warning">
            Escribe la cédula completa o al menos 8 caracteres de la referencia.
          </p>
        ) : null}

        <CrossFade swapKey={estado}>
          {estado === 'cargando' ? (
            <EsqueletoTabla columnas={5} filas={6} />
          ) : estado === 'fallo' ? (
            <FalloDeCarga error={fallo ?? new TypeError('Failed to fetch')} queEs="la bitácora" onReintentar={refetch} enmarcado={false} />
          ) : estado === 'vacio' ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="auditoria-vacia">
              <ClipboardText className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
              <p className="text-body font-medium text-fg">
                {hayFiltros ? 'Nada con esos filtros' : t('inmobiliaria.ai.cobranza.compliance.audit.empty.title')}
              </p>
              <p className="max-w-md text-body-sm text-fg-muted">
                {hayFiltros
                  ? 'Cambia las fechas o limpia los filtros para ver lo demás.'
                  : t('inmobiliaria.ai.cobranza.compliance.audit.empty.description')}
              </p>
              {hayFiltros ? (
                <Button variant="outline" size="sm" hideArrow onClick={limpiarFiltros} className="mt-2">
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto max-md:overflow-visible">
              <Table className="w-full max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead>Cuándo</TableHead>
                    <TableHead>Quién</TableHead>
                    <TableHead>Qué pasó</TableHead>
                    <TableHead>Sobre qué</TableHead>
                    <TableHead>Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                {/* «Cargar los siguientes» o un filtro: las filas entran escalonadas (techo 320 ms). */}
                <TableBodyAnimado className="max-md:block">
                  {items.map((row) => {
                    // El servidor ya redacta la cédula («XXXXXXXX50»); se pinta con Mask
                    // sin poder revelarla (invariante forense T-34-07-01).
                    const details = row.details ?? {}
                    const cedulaMasked =
                      typeof (details as Record<string, unknown>)['cedula_raw'] === 'string'
                        ? ((details as Record<string, unknown>)['cedula_raw'] as string)
                        : typeof (details as Record<string, unknown>)['cedula_masked'] === 'string'
                          ? ((details as Record<string, unknown>)['cedula_masked'] as string)
                          : null
                    const href = enlaceDeLaEntidad(row.entity_type, row.entity_id)
                    const detalles = detallesLegibles(details)
                    return (
                      <TableRowAnimada
                        key={row.id}
                        className="align-top max-md:grid max-md:grid-cols-1 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                      >
                        {/* MORI-26: el día en palabras, la acción y «sobre qué» en español, con enlace al caso o al acuerdo. */}
                        <TableCell className="whitespace-nowrap font-mono tabular-nums text-body-sm text-fg-muted max-md:order-3 max-md:block max-md:p-0 max-md:text-caption">
                          {cuando(row.occurred_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-body-sm text-fg max-md:order-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                          {/* Sin `actor_id` actuó el sistema; un tipo que no conocemos se dice «Sistema», nunca el código. */}
                          {actorLegible(row.actor_id) ?? ACTOR_SISTEMA[row.actor_type] ?? 'Sistema'}
                        </TableCell>
                        <TableCell className="text-body-sm text-fg max-md:order-1 max-md:block max-md:p-0 max-md:font-medium">
                          {accionConNombre(row.action) ? accionLegible(row.action) : 'Otra acción del sistema'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-body-sm text-fg-muted max-md:order-4 max-md:block max-md:p-0 max-md:text-caption">
                          <span>{entidadLegible(row.entity_type)}</span>
                          {/* `entity_id` es nullable; el id suelto no se muestra (bloqueante r25: «a0f5dcc3…»). */}
                          {href ? (
                            <Link href={href} className="ml-2 text-fg underline underline-offset-2 hover:no-underline md:ml-0 md:block">
                              {row.entity_type === 'debtor' ? 'Ver el caso' : 'Ver el acuerdo'}
                            </Link>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-md max-md:order-5 max-md:block max-md:p-0">
                          {cedulaMasked && (
                            <div className="mb-1">
                              <Mask field="cedula" value={cedulaMasked} onReveal={undefined} />
                            </div>
                          )}
                          {/* N-09 (QA-PAGOS-95): renglones «clave: valor» en TEXTO plano — NUNCA HTML (T-34-07-02). */}
                          {detalles.length > 0 ? (
                            <dl className="max-h-32 space-y-0.5 overflow-y-auto text-caption text-fg-muted" data-testid="detalles-de-la-auditoria">
                              {detalles.map((d, i) => (
                                <div key={`${d.clave}-${i}`} className="flex flex-wrap gap-x-1">
                                  <dt className="font-medium text-fg-muted">{d.clave}:</dt>
                                  <dd className="break-words">{d.valor}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <span className="text-caption text-fg-subtle max-md:hidden">—</span>
                          )}
                        </TableCell>
                      </TableRowAnimada>
                    )
                  })}
                </TableBodyAnimado>
              </Table>
            </div>
          )}
        </CrossFade>

        {estado === 'tabla' && error ? (
          <FalloDeCarga error={fallo ?? new TypeError('Failed to fetch')} queEs="lo que sigue de la bitácora" onReintentar={loadMore} enmarcado={false} />
        ) : null}

        {estado === 'tabla' && hasMore ? (
          <div className="border-t border-border px-4 py-3 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadMore()}
              isLoading={isLoadingMore}
              disabled={isLoadingMore}
              hideArrow
              data-testid="auditoria-cargar-mas"
            >
              Cargar los siguientes
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

export default function AuditPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <AuditContent />
    </PageGuard>
  )
}
