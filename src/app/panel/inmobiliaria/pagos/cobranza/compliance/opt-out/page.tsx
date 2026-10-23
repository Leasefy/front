'use client'

/**
 * Compliance — Opt-out registry — Phase 34 plan 34-07.
 *
 * Paginated table of opt-out requests with "Marcar el acuse" button on pending
 * rows. Glow up r26: el marco siempre (también vacío y fallo), la cifra «Por
 * acusar» dentro de la tarjeta, pestañas por acuse (abre en lo pendiente),
 * buscador, la fuente en español, fechas «17 oct 2026», aviso al marcar y
 * tarjetas en el celular. Button gated by `usePermissionsContext().canAccess('cobranza',
 * 'configure')` per Phase 34-06 canonical pattern (NOT useAgentPerms which
 * does not exist in the mvp repo).
 *
 * Backend RBAC in 34-04 is authoritative — the client gate is a hint.
 *
 * Refs mvp:docs/DESIGN.md §4 (cards), §16 (tabular-nums).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, BellSlash, MagnifyingGlass } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { toast } from '@/components/ui'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableHead,
  TableCell,
  TableRowAnimada,
} from '@/components/ui'
import { Card, CrossFade } from '@leasefy/cadence'
import {
  normalizeOptOuts,
  nextCursorOf,
  type OptOutEntry,
  type ComplianceLogResponse,
  type RawOptOut,
} from '@/lib/hooks/cobranza/compliance-entries'
import { channelLabel } from '@/lib/cobranza/call-vocab'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'

// Mismo desajuste que en la bitácora de Ley 2300: acá se leía `json.items` /
// `json.next_cursor` y el agente manda `entries` / `nextCursor`, así que el
// registro salía vacío por contrato. Contrato real en `compliance-entries.ts`.

/**
 * De dónde llegó la solicitud. Revisora r25: la «Fuente» salía cruda (un código
 * del micro). Un canal conocido se nombra; un código que no conocemos no se
 * muestra; un texto escrito va tal cual.
 */
function fuenteLegible(fuente: string | null): string {
  if (!fuente) return '—'
  const limpio = fuente.trim()
  const canal = channelLabel(limpio)
  if (canal && !canal.startsWith('Otro (')) return canal
  return /^[a-z0-9_.-]+$/i.test(limpio) ? 'Registrada por Mori' : limpio
}

type Filtro = 'por_acusar' | 'acusadas' | 'todas'

function OptOutContent() {
  const { t, formatDate } = useI18n()
  const { agency } = useAuth()
  const { canAccess } = usePermissionsContext()
  const agencyId = agency?.id ?? null
  const hasConfigPerm = canAccess('cobranza', 'configure')
  const [items, setItems] = useState<OptOutEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)
  const [acking, setAcking] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Filtro | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) {
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }
      try {
        const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/opt-out${qs}`)
        if (!res.ok) throw await falloDelMicro(res)
        const json = (await res.json()) as ComplianceLogResponse<RawOptOut>
        const page = normalizeOptOuts(json)
        setItems((prev) => (append ? [...prev, ...page] : page))
        setNextCursor(nextCursorOf(json))
        setError(null)
      } catch (err) {
        // El error entero, para `FalloDeCarga` (antes la frase suelta en un aviso rojo).
        setError(err)
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [agencyId],
  )

  useEffect(() => {
    if (!agencyId) return
    setIsLoading(true)
    void fetchPage(null, false)
  }, [agencyId, fetchPage])

  const recargar = useCallback(async () => {
    setIsLoading(true)
    await fetchPage(null, false)
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    await fetchPage(nextCursor, true)
  }, [nextCursor, isLoadingMore, fetchPage])

  const acknowledge = useCallback(
    async (row: OptOutEntry) => {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
      if (!agentUrl || !agencyId) return
      const eventId = row.eventId
      setAcking((prev) => new Set(prev).add(eventId))
      try {
        const res = await agentFetch(
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/opt-out/${eventId}/acknowledge`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
          },
        )
        if (!res.ok) throw await falloDelMicro(res)
        // Revisora r25 (1c): al terminar se dice que quedó.
        toast.success(`Listo: quedó registrado el acuse${row.debtorName ? ` de ${row.debtorName}` : ''}.`)
        setNextCursor(null)
        await fetchPage(null, false)
      } catch (e) {
        toast.error(
          mensajeParaLaPersona(e, {
            porDefecto: 'No pudimos registrar el acuse.',
            accion: 'registrar el acuse',
          }),
        )
      } finally {
        setAcking((prev) => {
          const n = new Set(prev)
          n.delete(eventId)
          return n
        })
      }
    },
    [agencyId, fetchPage],
  )

  const porAcusar = useMemo(() => items.filter((i) => i.acknowledgedAt === null).length, [items])
  const acusadas = items.length - porAcusar
  // Lo pendiente va primero: abre en «Por acusar» cuando hay alguna.
  const filtroVivo: Filtro = filtro ?? (porAcusar > 0 ? 'por_acusar' : 'todas')

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((i) => {
      if (filtroVivo === 'por_acusar' && i.acknowledgedAt !== null) return false
      if (filtroVivo === 'acusadas' && i.acknowledgedAt === null) return false
      if (!q) return true
      return [i.debtorName, fuenteLegible(i.source)].some((v) => (v ?? '').toLowerCase().includes(q))
    })
  }, [items, filtroVivo, busqueda])

  const dia = (iso: string, conHora = true) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? '—'
      : formatDate(
          d,
          conHora
            ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
            : { day: 'numeric', month: 'short', year: 'numeric' },
        )
  }

  const estado = isLoading && items.length === 0 ? 'cargando' : error && items.length === 0 ? 'fallo' : items.length === 0 ? 'vacio' : 'lista'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza · Cumplimiento"
        titulo={t('inmobiliaria.ai.cobranza.compliance.subPages.optOutTitle')}
        descripcion="Los deudores que pidieron que no los contacten por un canal. Marcar el acuse deja constancia de que la inmobiliaria recibió la solicitud."
      />

      <CrossFade swapKey={estado}>
        {estado === 'cargando' ? (
          <Card className="overflow-hidden">
            <EsqueletoTabla columnas={5} filas={5} />
          </Card>
        ) : estado === 'fallo' ? (
          <FalloDeCarga error={error} queEs="las solicitudes de no contactar" onReintentar={recargar} />
        ) : estado === 'vacio' ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="no-contactar-vacio">
            <BellSlash className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
            <p className="text-body font-medium text-fg">{t('inmobiliaria.ai.cobranza.compliance.optOut.empty.title')}</p>
            <p className="max-w-lg text-body-sm text-fg-muted">{t('inmobiliaria.ai.cobranza.compliance.optOut.empty.description')}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CifraHeroe
              className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
              data-testid="no-contactar-cifra"
              tamano="mediana"
              rotulo="Por acusar"
              cifra={porAcusar.toLocaleString('es-CO')}
              contexto={
                porAcusar === 0
                  ? 'Todas las solicitudes tienen su acuse.'
                  : porAcusar === 1
                    ? 'solicitud espera que la inmobiliaria deje constancia'
                    : 'solicitudes esperan que la inmobiliaria deje constancia'
              }
              esCero={porAcusar === 0}
              cuandoEsCero="Todas las solicitudes de no contactar tienen su acuse."
            />
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
              <PestanasDeEstado<Filtro>
                pestanas={[
                  { valor: 'por_acusar', etiqueta: 'Por acusar', cuantos: porAcusar, tono: 'aviso', testid: 'no-contactar-pestana-por-acusar' },
                  { valor: 'acusadas', etiqueta: 'Con acuse', cuantos: acusadas, testid: 'no-contactar-pestana-acusadas' },
                  { valor: 'todas', etiqueta: 'Todas', cuantos: items.length, fija: true, testid: 'no-contactar-pestana-todas' },
                ]}
                valor={filtroVivo}
                onCambio={setFiltro}
                etiqueta="Filtrar las solicitudes por acuse"
              />
              <div className="relative w-full md:w-64">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <Input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar deudor"
                  aria-label="Buscar por deudor"
                  className="pl-9"
                  data-testid="no-contactar-buscar"
                />
              </div>
            </div>

            {error ? (
              <FalloDeCarga error={error} queEs="las solicitudes que siguen" onReintentar={loadMore} enmarcado={false} />
            ) : null}

            {visibles.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-body-sm font-medium text-fg">Ninguna solicitud con ese filtro</p>
                <p className="mt-1 text-caption text-fg-muted">Cambia la pestaña o borra la búsqueda para ver las demás.</p>
              </div>
            ) : (
              <div className="overflow-x-auto overscroll-contain max-md:overflow-visible">
                <Table className="max-md:block">
                  <TableHeader className="max-md:hidden">
                    <TableRow>
                      <TableHead>Deudor</TableHead>
                      <TableHead>Lo pidió</TableHead>
                      <TableHead>Por dónde llegó</TableHead>
                      <TableHead>Acuse</TableHead>
                      <TableHead className="text-right">
                        <span className="sr-only">Acción</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  {/* Filtrar o cargar más: las filas entran escalonadas (techo 320 ms). */}
                  <TableBodyAnimado className="max-md:block">
                    {visibles.map((row) => {
                      const isAcked = row.acknowledgedAt !== null
                      const isAcking = acking.has(row.eventId)
                      return (
                        <TableRowAnimada
                          key={row.eventId}
                          data-testid={`no-contactar-${row.eventId}`}
                          className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                        >
                          {/* El nombre; sin él (agente anterior al JOIN), dicho, no un código. */}
                          <TableCell className="font-medium text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                            {row.debtorName ?? <span className="text-fg-muted">Deudor sin nombre</span>}
                          </TableCell>
                          <TableCell className="font-mono tabular-nums text-body-sm text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption">
                            {dia(row.requestedAt)}
                          </TableCell>
                          <TableCell className="text-body-sm text-fg max-md:col-start-1 max-md:row-start-3 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                            {fuenteLegible(row.source)}
                          </TableCell>
                          <TableCell className="max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                            {isAcked ? (
                              <span className="inline-flex items-center gap-1 font-mono text-body-sm tabular-nums text-success">
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                {dia(row.acknowledgedAt as string, false)}
                              </span>
                            ) : (
                              <Badge variant="warning">Por acusar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right max-md:col-span-2 max-md:block max-md:p-0 max-md:pt-1 max-md:text-left">
                            {!isAcked && hasConfigPerm && (
                              <Button
                                variant="outline"
                                size="sm"
                                hideArrow
                                onClick={() => void acknowledge(row)}
                                isLoading={isAcking}
                                disabled={isAcking}
                                className="max-md:w-full"
                                data-testid={`no-contactar-acusar-${row.eventId}`}
                              >
                                {isAcking ? 'Registrando…' : 'Marcar el acuse'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRowAnimada>
                      )
                    })}
                  </TableBodyAnimado>
                </Table>
              </div>
            )}

            {nextCursor ? (
              <div className="border-t border-border px-4 py-3 text-center">
                <Button variant="outline" size="sm" hideArrow onClick={() => void loadMore()} isLoading={isLoadingMore} disabled={isLoadingMore}>
                  Cargar las siguientes
                </Button>
              </div>
            ) : null}
          </Card>
        )}
      </CrossFade>
    </div>
  )
}

export default function OptOutPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <OptOutContent />
    </PageGuard>
  )
}
