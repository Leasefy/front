'use client'

/**
 * PilotoCatalogo.tsx — TODOS los procesos de la plataforma, en una tabla.
 *
 * Nico (2026-09-04), mirando la píldora «Piloto · Sombra» del header con su
 * menú: «¿el modal con todos los procesos funcionales, que muestre todos los
 * procesos de todo lo que pasa en la plataforma? Si no, hacelo».
 *
 * No lo mostraba: la pantalla contaba INSTANCIAS de tres cosas (un depósito,
 * una llamada, un hilo de WhatsApp). Esta tabla cuenta la MAQUINARIA: qué
 * procesos existen, quién los corre, en qué modo están, cuándo dejaron su
 * última huella y a dónde ir a mirarlos.
 *
 * ── La columna incómoda ─────────────────────────────────────────────────────
 *
 * «Última señal» dice «la última vez que este proceso produjo algo», no «la
 * última corrida»: en las dos bases NO existe una tabla de corridas, así que
 * un proceso que corrió y no encontró trabajo no dejó fila. Cuando no hay
 * forma de saberlo, la celda dice «No disponible» y explica el porqué en vez
 * de pintar una fecha inventada. Esa distinción es el valor de la pantalla.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Chip } from '@leasefy/cadence'
import { ArrowRight, MagnifyingGlass, Robot, Gear } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'
import type {
  AreaDeProceso,
  AutonomiaModo,
  PilotoCatalogoResponse,
  ProcesoDelCatalogo,
} from '@/lib/api/piloto'

const AREAS: Array<AreaDeProceso | 'todas'> = ['todas', 'dinero', 'operacion', 'captacion', 'plataforma']
/** `sistema` = lo corre el ERP, no un agente: no tiene modo y hay que poder verlos. */
const MODOS: Array<AutonomiaModo | 'sistema' | 'todos'> = ['todos', 'sombra', 'copiloto', 'autonomo', 'sistema']

const COLUMNAS = ['proceso', 'quien', 'cuando', 'ultima'] as const

export interface PilotoCatalogoProps {
  data: PilotoCatalogoResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  onRefetch?: () => Promise<void> | void
}

/** Lo que el buscador mira: el nombre, lo que hace, quién y el nombre técnico. */
function coincide(p: ProcesoDelCatalogo, q: string): boolean {
  if (!q) return true
  const aguja = q.toLowerCase()
  return [p.nombre, p.queHace, p.quien.etiqueta, p.id, p.disparador].some((campo) =>
    campo.toLowerCase().includes(aguja),
  )
}

export function PilotoCatalogo({ data, isLoading, error, notAvailable, onRefetch }: PilotoCatalogoProps) {
  const { t } = useI18n()
  const k = (s: string) => `inmobiliaria.piloto.catalogo.${s}`

  const [busqueda, setBusqueda] = useState('')
  const [area, setArea] = useState<AreaDeProceso | 'todas'>('todas')
  const [modo, setModo] = useState<AutonomiaModo | 'sistema' | 'todos'>('todos')

  const procesos = useMemo(() => data?.procesos ?? [], [data])

  const visibles = useMemo(
    () =>
      procesos.filter((p) => {
        if (area !== 'todas' && p.area !== area) return false
        if (modo === 'sistema' && p.modo !== null) return false
        if (modo !== 'todos' && modo !== 'sistema' && p.modo !== modo) return false
        return coincide(p, busqueda)
      }),
    [procesos, area, modo, busqueda],
  )

  const hayFiltros = area !== 'todas' || modo !== 'todos' || busqueda.trim() !== ''
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: `${area}|${modo}|${busqueda}` })

  return (
    <div className="space-y-3" data-testid="piloto-catalogo">
      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <MagnifyingGlass
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t(k('buscar'))}
              aria-label={t(k('buscar'))}
              className="pl-9"
              data-testid="catalogo-buscar"
            />
          </div>
          {data && (
            <p className="text-caption text-fg-muted sm:ml-auto">
              {t(k('resumen'), {
                total: String(data.totales.total),
                corriendo: String(data.totales.corriendo),
                conSenal: String(data.totales.conSenal),
              })}
            </p>
          )}
        </div>

        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{t(k('filtrarArea'))}</legend>
          {AREAS.map((a) => (
            <Chip
              key={a}
              size="sm"
              selected={area === a}
              onClick={() => setArea(a)}
              data-testid={`catalogo-area-${a}`}
            >
              {t(k(`area.${a}`))}{' '}
              {data && (
                <span className="tabular-nums">
                  {a === 'todas' ? data.totales.total : data.porArea[a]}
                </span>
              )}
            </Chip>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">{t(k('filtrarModo'))}</legend>
          {MODOS.map((m) => {
            const n =
              m === 'todos'
                ? procesos.length
                : m === 'sistema'
                  ? procesos.filter((p) => p.modo === null).length
                  : procesos.filter((p) => p.modo === m).length
            return (
              <Chip
                key={m}
                size="sm"
                selected={modo === m}
                onClick={() => setModo(m)}
                data-testid={`catalogo-modo-${m}`}
              >
                {t(k(`modo.${m}`))} {data && <span className="tabular-nums">{n}</span>}
              </Chip>
            )
          })}
          {hayFiltros && (
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                setArea('todas')
                setModo('todos')
                setBusqueda('')
              }}
              data-testid="catalogo-limpiar"
            >
              {t('inmobiliaria.piloto.bandeja.limpiar')}
            </Button>
          )}
        </fieldset>
      </div>

      {/* ── La tabla ──────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        <EstadoDeDatos
          cargando={isLoading}
          error={notAvailable ? null : error}
          queEs={t(k('queEs'))}
          {...(onRefetch ? { onReintentar: () => void onRefetch() } : {})}
          esqueleto={<EsqueletoTabla filas={8} columnas={COLUMNAS.length} />}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNAS.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {t(k(`col.${c}`))}
                    </TableHead>
                  ))}
                  <TableHead className="w-10">
                    <span className="sr-only">{t(k('col.abrir'))}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNAS.length + 1} className="p-0">
                      <SinDatos
                        queSon={t(k('queEs'))}
                        hayFiltros={hayFiltros}
                        icono={Robot}
                        titulo={notAvailable ? t(k('sinFuente')) : t(k('vacio'))}
                        descripcion={notAvailable ? t(k('sinFuenteHint')) : t(k('vacioHint'))}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((p) => <FilaDeProceso key={p.clave} proceso={p} />)
                )}
              </TableBody>
            </Table>
          </div>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>
    </div>
  )
}

/**
 * El punto de color de cada modo: los MISMOS de la píldora del header
 * (`PilotoModoHeader`), para que la pantalla y la perilla hablen igual.
 */
const PUNTO_DE_MODO: Record<AutonomiaModo, string> = {
  sombra: 'bg-fg-muted',
  copiloto: 'bg-primary',
  autonomo: 'bg-success',
}

function FilaDeProceso({ proceso: p }: { proceso: ProcesoDelCatalogo }) {
  const { t } = useI18n()
  const k = (s: string) => `inmobiliaria.piloto.catalogo.${s}`

  return (
    <TableRow data-testid="catalogo-fila" data-clave={p.clave}>
      <TableCell className="max-w-[320px] align-top">
        <p className="font-medium text-fg">{p.nombre}</p>
        <p className="mt-0.5 text-caption text-fg-muted">{p.queHace}</p>
      </TableCell>

      <TableCell className="align-top">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {p.quien.tipo === 'agente' ? (
            <Robot className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
          ) : (
            <Gear className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
          )}
          <span className="text-fg-muted">{p.quien.etiqueta}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {p.modo ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-caption font-medium text-fg"
              data-testid="catalogo-modo-chip"
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', PUNTO_DE_MODO[p.modo])}
                aria-hidden="true"
              />
              {t(k(`modo.${p.modo}`))}
            </span>
          ) : (
            <span className="text-caption text-fg-subtle">{t(k('sinModo'))}</span>
          )}
          {!p.corre && (
            <span
              className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-caption font-medium text-fg-muted"
              title={p.porQueNoCorre ?? undefined}
              data-testid="catalogo-apagado"
            >
              {t(k('apagado'))}
            </span>
          )}
        </div>
        {p.modo && !p.modoGobierna && (
          <p className="mt-1 max-w-[240px] text-caption text-fg-subtle" data-testid="catalogo-modo-no-manda">
            {t(k('modoNoManda'))}
          </p>
        )}
        {!p.corre && p.porQueNoCorre && (
          <p className="mt-1 max-w-[240px] text-caption text-fg-subtle">{p.porQueNoCorre}</p>
        )}
      </TableCell>

      <TableCell className="max-w-[220px] align-top text-caption text-fg-muted">
        {p.disparador}
      </TableCell>

      <TableCell className="max-w-[240px] align-top">
        {p.ultima ? (
          <>
            <p className="whitespace-nowrap tabular-nums text-fg">{relativeTime(p.ultima.at, t)}</p>
            <p className="mt-0.5 text-caption text-fg-muted">{p.ultima.que}</p>
            {p.fuente && <p className="mt-0.5 font-mono text-caption text-fg-subtle">{p.fuente}</p>}
          </>
        ) : (
          <>
            <p className="text-fg-muted">{t(k('noDisponible'))}</p>
            <p className="mt-0.5 text-caption text-fg-subtle">{p.sinDato}</p>
          </>
        )}
      </TableCell>

      <TableCell className="align-top">
        {p.enlace && (
          <Button asChild variant="ghost" size="sm" hideArrow className="h-7 w-7 p-0">
            <Link href={p.enlace.href} aria-label={p.enlace.label} title={p.enlace.label}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
