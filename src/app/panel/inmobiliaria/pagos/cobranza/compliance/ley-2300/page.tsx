'use client'

/**
 * Cumplimiento › Ley 2300 — los intentos de contacto fuera del horario que
 * permite la ley (el servidor une los salientes que la cadencia frenó,
 * `cadence_skip`, con los entrantes fuera de hora, `inbound_outside_hours`).
 *
 * Glow up (revisora r25, 6,1 → ronda 26):
 *   · el marco va SIEMPRE (encabezado, vuelta en el layout) — también en la
 *     carga, en el vacío y en el fallo; antes el vacío salía desnudo y es el
 *     estado normal (el objetivo es cero);
 *   · LA RESPUESTA arriba, dentro de la tarjeta: cuántos intentos hubo; las
 *     pestañas Salientes / Entrantes son los conteos (una sola fila);
 *   · buscador por deudor y canal, y «Cargar más» al pie de la tabla;
 *   · el canal y la dirección en español («Voz», «Saliente»), nunca
 *     «voice»/«INBOUND» (bloqueante);
 *   · la fecha «17 oct 2026, 5:14 p. m.», no el `toLocaleString` del navegador;
 *   · el fallo con `FalloDeCarga` (antes «fetch_failed» o «500» pegado a la frase);
 *   · en el celular, tarjetas.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gavel, MagnifyingGlass } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { agentFetch } from '@/lib/api/agent-fetch'
import { ApiError } from '@/lib/api/client'
import {
  Button,
  Badge,
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
  normalizeAttempts,
  nextCursorOf,
  type Attempt,
  type ComplianceLogResponse,
  type RawAttempt,
} from '@/lib/hooks/cobranza/compliance-entries'
import { channelLabel, directionLabel } from '@/lib/cobranza/call-vocab'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'

type Direccion = 'todos' | 'outbound' | 'inbound'

function Ley2300Content() {
  const { t, formatDate } = useI18n()
  const { agency } = useAuth()
  const agencyId = agency?.id ?? null
  const [items, setItems] = useState<Attempt[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)
  const [direccion, setDireccion] = useState<Direccion>('todos')
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
          `${agentUrl}/api/agency/${agencyId}/cobranza/compliance/ley-2300/attempts${qs}`)
        if (!res.ok) {
          const cuerpo = await res.json().catch(() => undefined)
          throw new ApiError(res.status, 'No pudimos cargar los intentos.', undefined, cuerpo)
        }
        const json = (await res.json()) as ComplianceLogResponse<RawAttempt>
        const page = normalizeAttempts(json)
        setItems((prev) => (append ? [...prev, ...page] : page))
        setNextCursor(nextCursorOf(json))
        setError(null)
      } catch (err) {
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

  const salientes = useMemo(() => items.filter((i) => i.direction === 'outbound').length, [items])
  const entrantes = items.length - salientes

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((i) => {
      if (direccion !== 'todos' && i.direction !== direccion) return false
      if (!q) return true
      return [i.debtorName, i.debtorRef, i.channel ? channelLabel(i.channel) : null]
        .filter((v): v is string => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    })
  }, [items, direccion, busqueda])

  const cuando = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
      ? '—'
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const estado = isLoading && items.length === 0 ? 'cargando' : error && items.length === 0 ? 'fallo' : items.length === 0 ? 'vacio' : 'lista'
  // Revisora r27 (Ley 2300): «50+» no es una cifra. La cifra es lo cargado y el contexto dice que hay más.
  const cuantos = items.length.toLocaleString('es-CO')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title')}
        descripcion="Cada intento de contacto fuera del horario que permite la Ley 2300. Lo normal es que no haya ninguno."
      />

      <CrossFade swapKey={estado}>
        {estado === 'cargando' ? (
          <Card className="overflow-hidden" data-testid="ley2300-cargando">
            <EsqueletoTabla columnas={4} filas={6} />
          </Card>
        ) : estado === 'fallo' ? (
          <FalloDeCarga error={error} queEs="los intentos fuera de horario" onReintentar={recargar} />
        ) : estado === 'vacio' ? (
          <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center" data-testid="ley2300-vacio">
            <Gavel className="h-8 w-8 text-fg-subtle" weight="duotone" aria-hidden="true" />
            <p className="text-body font-medium text-fg">
              {t('inmobiliaria.ai.cobranza.compliance.ley2300.empty.title')}
            </p>
            <p className="max-w-md text-body-sm text-fg-muted">
              {t('inmobiliaria.ai.cobranza.compliance.ley2300.empty.description')}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {/* LA RESPUESTA, dentro de la tarjeta; los conteos por dirección son las pestañas. */}
            <CifraHeroe
              className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
              data-testid="ley2300-cifra"
              tamano="mediana"
              rotulo="Fuera de horario"
              cifra={cuantos}
              contexto={
                items.length === 1
                  ? `intento de contacto para revisar${nextCursor ? ' · hay más: cárgalos al pie' : ''}`
                  : `intentos de contacto para revisar${nextCursor ? ' · hay más: cárgalos al pie' : ''}`
              }
            />
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between empty:hidden">
              <PestanasDeEstado<Direccion>
                pestanas={[
                  { valor: 'todos', etiqueta: 'Todos', cuantos: items.length, fija: true, testid: 'ley2300-pestana-todos' },
                  { valor: 'outbound', etiqueta: 'Salientes', cuantos: salientes, tono: 'aviso', testid: 'ley2300-pestana-salientes' },
                  { valor: 'inbound', etiqueta: 'Entrantes', cuantos: entrantes, testid: 'ley2300-pestana-entrantes' },
                ]}
                valor={direccion}
                onCambio={setDireccion}
                etiqueta="Filtrar por dirección del contacto"
              />
              <div className="relative w-full md:w-64">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                <Input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar deudor o canal"
                  aria-label="Buscar por deudor o canal"
                  className="pl-9"
                  data-testid="ley2300-buscar"
                />
              </div>
            </div>

            {error ? (
              <FalloDeCarga error={error} queEs="los intentos que siguen" onReintentar={loadMore} enmarcado={false} />
            ) : null}

            <CrossFade swapKey={visibles.length === 0 ? 'sin-resultados' : 'tabla'}>
              {visibles.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-body-sm font-medium text-fg">Ningún intento con ese filtro</p>
                  <p className="mt-1 text-caption text-fg-muted">Cambia la pestaña o borra la búsqueda para ver los demás.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-md:overflow-visible">
                  <Table className="max-md:block">
                    <TableHeader className="max-md:hidden">
                      <TableRow>
                        <TableHead>Cuándo</TableHead>
                        <TableHead>Deudor</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Dirección</TableHead>
                      </TableRow>
                    </TableHeader>
                    {/* «Cargar más» o un filtro: las filas entran escalonadas (techo 320 ms). */}
                    <TableBodyAnimado className="max-md:block">
                      {visibles.map((row) => (
                        <TableRowAnimada
                          key={row.eventId}
                          data-testid={`ley2300-intento-${row.eventId}`}
                          className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                        >
                          <TableCell className="font-mono tabular-nums text-body-sm text-fg-muted max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-caption">
                            {cuando(row.timestamp)}
                          </TableCell>
                          {/* El nombre; la referencia sólo si el dato no lo trae (agente anterior al JOIN). */}
                          <TableCell className="font-medium text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                            {row.debtorName ?? <span className="text-fg-muted">Deudor sin nombre</span>}
                          </TableCell>
                          <TableCell className="text-fg max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-right max-md:text-caption max-md:text-fg-muted">
                            {row.channel ? channelLabel(row.channel) : '—'}
                          </TableCell>
                          <TableCell className="max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                            <Badge variant={row.direction === 'inbound' ? 'default' : 'warning'}>
                              {directionLabel(row.direction)}
                            </Badge>
                          </TableCell>
                        </TableRowAnimada>
                      ))}
                    </TableBodyAnimado>
                  </Table>
                </div>
              )}
            </CrossFade>

            {nextCursor ? (
              <div className="border-t border-border px-4 py-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  hideArrow
                  onClick={() => void loadMore()}
                  isLoading={isLoadingMore}
                  disabled={isLoadingMore}
                  data-testid="ley2300-cargar-mas"
                >
                  Cargar los siguientes
                </Button>
              </div>
            ) : null}
          </Card>
        )}
      </CrossFade>
    </div>
  )
}

export default function Ley2300Page() {
  return (
    <PageGuard module="cobranza" action="view">
      <Ley2300Content />
    </PageGuard>
  )
}
