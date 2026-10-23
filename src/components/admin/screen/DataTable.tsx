'use client'

import { useMemo, useState } from 'react'
import { Export, Funnel, SortAscending, SortDescending, X } from '@phosphor-icons/react'
import { Stagger, StaggerItem } from '@leasefy/cadence'
import type { TonoDeEsfera } from '@leasefy/cadence'
import { toast } from 'sonner'

import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/pagination'
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useEstadoDeLaTabla } from '@/lib/admin/use-estado-de-la-tabla'
import {
  FILAS_POR_PAGINA,
  FILAS_POR_DEFECTO,
  buscarEnLasFilas,
  contarSegmentos,
  cortarPagina,
  escribirOrden,
  fraseDelConteo,
  hojaDeLaTabla,
  leerOrden,
  leerTamano,
  nombreDelArchivo,
  ordenarFilas,
  siguienteOrden,
  type Segmento,
  type Sentido,
  type ValorDeCelda,
} from '@/lib/admin/tabla-del-admin'
import { Buscador } from './Filtros'
import { LoadingBlock, ErrorBlock, EmptyBlock } from './states'

export type { Segmento } from '@/lib/admin/tabla-del-admin'

export interface Column<T> {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  /** Valor por el que se ordena la columna. Sin esto, no se ordena. */
  orden?: (row: T) => ValorDeCelda
  /** Con qué sentido arranca al ordenar (cifras y fechas: de mayor a menor). */
  ordenPrimero?: Sentido
  /** Lo que la columna dice en texto: se busca con el buscador y va al Excel. */
  texto?: (row: T) => ValorDeCelda
  /** `false` = no se muestra en la tarjeta del celular. */
  enCelular?: boolean
  /** Ronda 28 (revisora r27): en la tarjeta del celular, a lo ancho (las dos columnas) — p. ej. una insignia larga. */
  enCelularAncho?: boolean
}

/** La paginación del SERVIDOR: el back corta la página y manda el total. */
export interface PaginacionDelServidor {
  page: number
  total: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize?: (pageSize: number) => void
}

/**
 * La tabla del admin, con lo mismo que las tablas del panel de la inmobiliaria
 * (20-10-2026, Nico: «que las tablas tengan paginación, filtros y todo lo que
 * tienen las tablas de la plataforma real»):
 *
 * - UNA tarjeta: la barra (buscador, filtros, pestañas con su conteo, «Limpiar
 *   filtros», cuántas hay y «Exportar»), la tabla —o su estado— y el paginador.
 *   Cargando, error y vacío van ADENTRO: un vacío que reemplazara la tarjeta se
 *   llevaría el texto que la persona acaba de escribir.
 * - Buscar (sin tildes ni mayúsculas) y filtrar sobre la lista ENTERA; después
 *   ordenar; al final, la página. Cambiar un filtro vuelve a la página 1.
 * - Ordenar por cualquier columna con `orden` (`aria-sort`).
 * - «Exportar» baja a Excel lo que se ve: filtrado y ordenado, todas las páginas.
 * - Filas por página (10, 25, 50, 100). Con filas, el paginador siempre está:
 *   es lo que dice cuántas hay.
 * - Todo vive en la URL: una tabla filtrada se comparte con el enlace.
 * - En el celular (< 768 px), cada fila es una tarjeta.
 *
 * Las pantallas que ya cortaban su página (`pie`) o la piden al servidor
 * (`paginacion`) siguen funcionando: el corte del cliente no se aplica.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  isLoading,
  error,
  emptyTitle = 'Sin resultados',
  emptyHint,
  emptyIcon,
  emptyTono,
  cifraDelCelular,
  emptyAction,
  onReintentar,
  barra,
  buscadorPropio,
  acciones,
  pie,
  filaMarcada,
  rowClassName,
  filaTestid,
  className,
  id,
  queSon,
  buscar,
  textoExtra,
  segmentos,
  segmentoInicial,
  filtrar,
  filtrosActivos = 0,
  filtrosEnLaUrl = [],
  onLimpiarFiltros,
  exportar,
  traerTodoParaElExcel,
  masEnElExcel = [],
  paginar = true,
  filasPorPagina = FILAS_POR_DEFECTO,
  paginacion,
  ordenInicial,
  tarjetas = true,
  'aria-label': ariaLabel,
}: {
  columns: Column<T>[]
  /** TODAS las filas (la tabla filtra, ordena y pagina). Con `pie` o `paginacion`, sólo las de la página. */
  rows: T[] | undefined
  getKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  error?: Error | null
  emptyTitle?: string
  emptyHint?: string
  emptyIcon?: React.ReactNode
  /** Ronda 26 (T9): `exito` cuando no tener nada está bien (la esfera no es azul: el azul es de la acción). */
  emptyTono?: TonoDeEsfera
  /**
   * Ronda 26 (T8): el encabezado de la columna que va como cifra en la tarjeta del
   * celular (la que responde). Sin esto, la primera columna numérica; siempre con su rótulo.
   */
  cifraDelCelular?: string
  /** Lo que se puede hacer desde el vacío (p. ej. «Nueva…»). */
  emptyAction?: React.ReactNode
  onReintentar?: () => void
  /** Filtros propios de la pantalla (desplegables), en la misma barra. */
  barra?: React.ReactNode
  /**
   * Ronda 28 (revisora r27, T13): el buscador PROPIO de la pantalla (uno que busca en el servidor, con su
   * botón), en el lugar del buscador de la tabla: a 390 va a lo ancho y SIEMPRE a la vista; sólo los
   * desplegables de `barra` se pliegan detrás de «Filtros (n)».
   */
  buscadorPropio?: React.ReactNode
  /** Botones de la pantalla al lado de «Exportar». */
  acciones?: React.ReactNode
  /** El paginador propio de la pantalla (si ya corta la página ella). */
  pie?: React.ReactNode
  /** La fila abierta en un cajón, marcada. */
  filaMarcada?: (row: T) => boolean
  /** Clases propias de una fila (p. ej. atenuar lo desactivado). */
  rowClassName?: (row: T) => string | undefined
  /** `data-testid` de cada fila (tabla y tarjeta), para las pruebas de la pantalla. */
  filaTestid?: (row: T) => string
  className?: string
  /** Prefijo de la URL cuando hay más de una tabla en la pantalla. */
  id?: string
  /** [singular, plural] — «12 de 40 inmobiliarias». */
  queSon?: [string, string]
  /** Buscador: `true` o el texto de ayuda. Busca en las columnas con `texto`. */
  buscar?: boolean | string
  /** Más texto donde buscar, que no es una columna (un id, un correo). */
  textoExtra?: (row: T) => ValorDeCelda
  /** Pestañas con su conteo («Todas 40 · Activas 32 · …»). */
  segmentos?: Segmento<T>[]
  /** La pestaña que se ve sin nada en la URL (por defecto, la primera). */
  segmentoInicial?: string
  /** Los filtros propios ya puestos (los desplegables de `barra`). */
  filtrar?: (row: T) => boolean
  /** Cuántos filtros propios hay puestos, para «Limpiar filtros». */
  filtrosActivos?: number
  /**
   * Los parámetros de la URL de esos filtros: «Limpiar filtros» los borra en
   * el MISMO cambio que la búsqueda y la pestaña. Dos `router.replace`
   * seguidos se arman con la misma URL vieja y el segundo pisa al primero.
   */
  filtrosEnLaUrl?: string[]
  /** Para filtros que NO viven en la URL (nunca hacer otro `setFilters` acá). */
  onLimpiarFiltros?: () => void
  /** Nombre del archivo de Excel. Sin esto, no hay «Exportar». */
  exportar?: string
  /**
   * Con paginación del SERVIDOR: trae TODAS las filas del filtro para el Excel
   * (si no, se bajaría sólo la página que se ve).
   */
  traerTodoParaElExcel?: () => Promise<T[]>
  /** Columnas que van SÓLO al Excel (lo que la tabla dice chiquito o no dice: NIT, correo…). */
  masEnElExcel?: Array<{ header: string; texto: (row: T) => ValorDeCelda }>
  /** `false` = sin paginador (una tabla corta y fija). */
  paginar?: boolean
  filasPorPagina?: number
  paginacion?: PaginacionDelServidor
  ordenInicial?: { columna: number; sentido: Sentido }
  /** `false` = en el celular sigue siendo tabla (se desplaza de lado). */
  tarjetas?: boolean
  'aria-label'?: string
}) {
  const { get, setFilters } = useEstadoDeLaTabla()
  const esCelular = useIsMobile()
  const [exportando, setExportando] = useState(false)
  /** En el celular los filtros propios se pliegan detrás de «Filtros». */
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const k = (nombre: string) => (id ? `${id}.${nombre}` : nombre)

  const busqueda = buscar ? get(k('q')) : ''
  const vista = segmentos?.length ? get(k('vista')) || segmentoInicial || segmentos[0].valor : ''
  const orden = leerOrden(get(k('orden'))) ?? ordenInicial ?? null
  const corteDelCliente = !pie && !paginacion && paginar
  const tamano = leerTamano(get(k('filas')), filasPorPagina)

  // 1) filtros propios y búsqueda sobre la lista entera; 2) conteo por pestaña;
  // 3) la pestaña; 4) el orden; 5) la página.
  const calculo = useMemo(() => {
    const todas = rows ?? []
    const conFiltros = filtrar ? todas.filter(filtrar) : todas
    const buscadas = buscar ? buscarEnLasFilas(conFiltros, busqueda, columns, textoExtra) : conFiltros
    const conteo = segmentos?.length ? contarSegmentos(buscadas, segmentos) : {}
    const segmento = segmentos?.find((s) => s.valor === vista)
    const enLaVista = segmento ? buscadas.filter(segmento.cumple) : buscadas
    const col = orden ? columns[orden.columna] : undefined
    const ordenadas = col?.orden ? ordenarFilas(enLaVista, col.orden, orden!.sentido) : enLaVista
    return { total: todas.length, conteo, ordenadas }
  }, [rows, filtrar, buscar, busqueda, columns, textoExtra, segmentos, vista, orden])

  const pagina = corteDelCliente ? cortarPagina(calculo.ordenadas, Number(get(k('page')) || 0), tamano) : null
  const filasVisibles = pagina ? pagina.filas : calculo.ordenadas

  const hayBusqueda = busqueda.trim() !== ''
  // Con paginación del servidor, lo filtrado lo sabe el back: «hay datos» no se puede medir acá.
  const hayDatosSinFiltro = paginacion ? true : calculo.total > 0
  const primerSegmento = segmentoInicial || segmentos?.[0]?.valor
  const propiosPuestos = filtrosActivos || filtrosEnLaUrl.filter((f) => get(f)).length
  const hayFiltros = hayBusqueda || propiosPuestos > 0 || (segmentos?.length ? vista !== primerSegmento : false)

  const poner = (patch: Record<string, string | number | undefined>) =>
    setFilters({ ...patch, [k('page')]: undefined })

  const limpiar = () => {
    poner({
      [k('q')]: undefined,
      [k('vista')]: undefined,
      ...Object.fromEntries(filtrosEnLaUrl.map((f) => [f, undefined])),
    })
    onLimpiarFiltros?.()
  }

  async function bajarExcel() {
    if (!exportar || exportando) return
    setExportando(true)
    try {
      const XLSX = await import('xlsx')
      const filas = traerTodoParaElExcel ? await traerTodoParaElExcel() : calculo.ordenadas
      const hoja = hojaDeLaTabla(filas, [...columns, ...masEnElExcel])
      const libro = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(hoja)
      ws['!cols'] = (hoja[0] ?? []).map((t) => ({ wch: Math.max(14, String(t).length + 4) }))
      XLSX.utils.book_append_sheet(libro, ws, 'Datos')
      const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
      const archivo = nombreDelArchivo(exportar)
      const url = URL.createObjectURL(
        new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = archivo
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      const n = filas.length
      toast.success('Listo, se bajó el Excel', { description: `${archivo} · ${n} ${n === 1 ? 'fila' : 'filas'}` })
    } catch {
      toast.error('No se pudo armar el Excel. Vuelve a intentarlo.')
    } finally {
      setExportando(false)
    }
  }

  const alineacion = (a?: Column<T>['align']) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

  const abrirConTeclado = (row: T) =>
    onRowClick
      ? (e: React.KeyboardEvent) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRowClick(row)
          }
        }
      : undefined

  const cabecera = (c: Column<T>, i: number) => {
    if (!c.orden)
      return (
        <TableHead key={i} className={cn('whitespace-nowrap', alineacion(c.align))}>
          {c.header}
        </TableHead>
      )
    const activa = orden?.columna === i
    const Icono = orden?.sentido === 'desc' ? SortDescending : SortAscending
    return (
      <TableHead
        key={i}
        className={cn('whitespace-nowrap', alineacion(c.align))}
        aria-sort={activa ? (orden!.sentido === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {/* allowlist: disparador de orden — no hay primitiva en Cadence. Hereda
            la letra del TH (un <button> trae text-transform:none). */}
        <button
          type="button"
          onClick={() => poner({ [k('orden')]: escribirOrden(siguienteOrden(orden, i, c.ordenPrimero ?? 'asc')) })}
          className={cn(
            'inline-flex items-center gap-1 font-[inherit] uppercase tracking-[inherit] text-[inherit] outline-none hover:text-fg focus-visible:text-fg focus-visible:underline',
            activa && 'text-fg',
          )}
          title={`Ordenar por ${c.header.toLowerCase()}`}
        >
          {c.header}
          <Icono
            weight="bold"
            className={cn('h-3.5 w-3.5 shrink-0 transition-opacity', activa ? 'opacity-100' : 'opacity-30')}
            aria-hidden
          />
        </button>
      </TableHead>
    )
  }

  let cuerpo: React.ReactNode
  if (isLoading && !rows) cuerpo = <LoadingBlock suelto={false} />
  else if (error) cuerpo = <ErrorBlock error={error} onReintentar={onReintentar} suelto={false} />
  else if (filasVisibles.length === 0)
    cuerpo =
      hayFiltros && hayDatosSinFiltro ? (
        <EmptyBlock
          title="Nada con estos filtros"
          hint={hayBusqueda ? `No hay resultados para «${busqueda.trim()}».` : 'Prueba con otros filtros.'}
          icono={<Funnel weight="bold" />}
          tono="neutro"
          suelto={false}
          accion={
            <Button variant="outline" size="sm" hideArrow onClick={limpiar}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <EmptyBlock title={emptyTitle} hint={emptyHint} icono={emptyIcon} accion={emptyAction} tono={emptyTono} suelto={false} />
      )
  else if (esCelular && tarjetas)
    cuerpo = (
      <TarjetasDeLaTabla
        cifraDelCelular={cifraDelCelular}
        columns={columns}
        rows={filasVisibles}
        getKey={getKey}
        onRowClick={onRowClick}
        filaMarcada={filaMarcada}
        rowClassName={rowClassName}
        filaTestid={filaTestid}
        ariaLabel={ariaLabel}
      />
    )
  else
    cuerpo = (
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((c, i) => cabecera(c, i))}
          </TableRow>
        </TableHeader>
        <TableBodyAnimado>
          {filasVisibles.map((row, ri) => (
            <TableRowAnimada
              key={getKey(row, ri)}
              data-testid={filaTestid?.(row)}
              selected={filaMarcada?.(row) ?? false}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={abrirConTeclado(row)}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                rowClassName?.(row),
                onRowClick &&
                  'cursor-pointer outline-none focus-visible:bg-surface-muted focus-visible:shadow-[inset_3px_0_0_var(--primary)]',
              )}
            >
              {columns.map((c, ci) => (
                <TableCell key={ci} className={cn('align-top', alineacion(c.align), c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRowAnimada>
          ))}
        </TableBodyAnimado>
      </Table>
    )

  const conBuscador = Boolean(buscar) || Boolean(buscadorPropio)
  const conSegmentos = Boolean(segmentos?.length)
  // Ronda 28 (revisora r27, T3): con FALLO, sin barra (antes el buscador y «Exportar» apagado encima del
  // cartel). Sin datos, la barra se queda (Nico: las tablas SIEMPRE con buscador, filtros y paginación).
  // El buscador PROPIO (el que busca en el servidor) se queda con el fallo: puede ser la búsqueda la que falló.
  const barraArriba = error ? Boolean(buscadorPropio) : Boolean(conBuscador || barra || acciones || exportar)
  const conExportarEnLaFila = !error && Boolean(exportar) && Boolean(conBuscador || barra)

  const paginador = paginacion ? (
    paginacion.total > 0 ? (
      <TablePagination
        total={paginacion.total}
        page={paginacion.page + 1}
        pageSize={paginacion.pageSize}
        pageSizeOptions={paginacion.onPageSize ? FILAS_POR_PAGINA : undefined}
        onPageChange={(p) => paginacion.onPage(p - 1)}
        onPageSizeChange={paginacion.onPageSize}
      />
    ) : null
  ) : pagina && calculo.ordenadas.length > 0 ? (
    <TablePagination
      total={calculo.ordenadas.length}
      page={pagina.pagina + 1}
      pageSize={tamano}
      pageSizeOptions={FILAS_POR_PAGINA}
      onPageChange={(p) => setFilters({ [k('page')]: p - 1 <= 0 ? undefined : p - 1 })}
      onPageSizeChange={(n) => poner({ [k('filas')]: n === filasPorPagina ? undefined : n })}
    />
  ) : null

  // Ronda 28 (revisora r27, T14): «N cosas» suelto sólo cuando dice algo que nada más dice: sin paginador
  // («Mostrando 1–N de N») y sin pestañas con su conteo, o cuando la búsqueda o un filtro recortan.
  const seVeElPaginador = !pie && Boolean(paginador)
  const recortado = hayBusqueda || propiosPuestos > 0
  const conteoVisible =
    !error &&
    queSon &&
    rows &&
    (paginacion ? paginacion.total > 0 : calculo.total > 0) &&
    !seVeElPaginador &&
    (!conSegmentos || recortado)
  const barraAbajo = !error && (conSegmentos || (hayFiltros && hayDatosSinFiltro) || conteoVisible)

  const botonExportar = (soloIcono: boolean) =>
    exportar ? (
      <Button
        variant="secondary"
        size="sm"
        hideArrow
        isLoading={exportando}
        onClick={() => void bajarExcel()}
        disabled={exportando || (paginacion ? paginacion.total === 0 : calculo.ordenadas.length === 0)}
        className={cn('gap-2', soloIcono ? 'shrink-0 px-2.5 sm:hidden' : conExportarEnLaFila && 'max-sm:hidden')}
        aria-label={soloIcono ? 'Exportar a Excel' : undefined}
        title={soloIcono ? 'Exportar a Excel' : undefined}
      >
        <Export className="h-4 w-4" aria-hidden />
        {soloIcono ? null : exportando ? 'Armando el Excel…' : 'Exportar a Excel'}
      </Button>
    ) : null

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      {barraArriba || barraAbajo ? (
        <div className="space-y-3 border-b border-border p-4">
          {barraArriba ? (
            /* 🔴 21-10 (Nico: «esos selects por ahí tirados»): UNA línea, todo al
               centro y a la misma altura — buscador, filtros, y Exportar a la
               derecha. En el celular el buscador va a lo ancho y los filtros se
               pliegan detrás de «Filtros (n)». */
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {buscadorPropio || (!error && (conBuscador || barra)) ? (
                <div
                  className={cn(
                    'flex w-full min-w-0 items-center gap-2',
                    buscadorPropio
                      ? 'sm:w-auto sm:min-w-[20rem] sm:flex-1'
                      : conBuscador
                        ? 'sm:w-auto sm:min-w-[16rem] sm:max-w-sm sm:flex-1'
                        : 'sm:hidden',
                  )}
                >
                  {buscadorPropio ? (
                    <div className="min-w-0 flex-1">{buscadorPropio}</div>
                  ) : conBuscador ? (
                    <div className="min-w-0 flex-1">
                      <Buscador
                        id={k('buscar')}
                        value={busqueda}
                        onChange={(v) => poner({ [k('q')]: v })}
                        placeholder={typeof buscar === 'string' ? buscar : 'Buscar'}
                      />
                    </div>
                  ) : null}
                  {barra && !error ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      className={cn('shrink-0 gap-2 sm:hidden', !conBuscador && 'w-full')}
                      aria-expanded={filtrosAbiertos}
                      onClick={() => setFiltrosAbiertos((v) => !v)}
                      data-testid="tabla-boton-filtros"
                    >
                      <Funnel className="h-4 w-4" aria-hidden />
                      Filtros{propiosPuestos > 0 ? ` (${propiosPuestos})` : ''}
                    </Button>
                  ) : null}
                  {/* Ronda 28 (T3): a 390, «Exportar» al lado del buscador y de «Filtros» (antes en su renglón). */}
                  {conExportarEnLaFila ? botonExportar(true) : null}
                </div>
              ) : null}
              {barra && !error ? (
                <div className={cn('min-w-0 sm:block', filtrosAbiertos ? 'block' : 'hidden')} data-testid="tabla-filtros-propios">
                  {barra}
                </div>
              ) : null}
              {!error && (acciones || exportar) ? (
                <div className={cn('flex flex-wrap items-center gap-2 sm:ml-auto', !acciones && conExportarEnLaFila && 'max-sm:hidden')}>
                  {acciones}
                  {botonExportar(false)}
                </div>
              ) : null}
            </div>
          ) : null}
          {barraAbajo ? (
            <div className="flex flex-wrap items-center gap-3">
              {conSegmentos ? (
                /* Glow up 22-10: las pestañas de estado del panel, con su conteo en
                   mono; una pestaña en cero no se pinta (salvo la primera y la
                   elegida); en el celular se desliza dentro de su riel. */
                <PestanasDeEstado<string>
                  etiqueta="Ver"
                  className="min-w-0 max-w-full"
                  valor={vista}
                  onCambio={(v) => poner({ [k('vista')]: v === primerSegmento ? undefined : v })}
                  pestanas={segmentos!.map((s) => ({
                    valor: s.valor,
                    etiqueta: s.nombre,
                    // Ronda 26 (T3): con fallo o cargando, sin conteo (un «0» sería inventado).
                    cuantos: error || (isLoading && !rows) ? null : calculo.conteo[s.valor] ?? 0,
                    fija: s.fija || s.valor === primerSegmento,
                    tono: s.tono && (calculo.conteo[s.valor] ?? 0) > 0 ? s.tono : undefined,
                    testid: `pestana-${id ? `${id}-` : ''}${s.valor}`,
                  }))}
                />
              ) : null}
              {hayFiltros && hayDatosSinFiltro ? (
                <Button variant="ghost" size="sm" hideArrow onClick={limpiar} className="gap-1.5 text-fg-muted">
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Limpiar filtros
                </Button>
              ) : null}
              {conteoVisible ? (
                <span className="ml-auto text-body-sm tabular-nums text-fg-muted" aria-live="polite">
                  {paginacion
                    ? fraseDelConteo(paginacion.total, paginacion.total, queSon!)
                    : fraseDelConteo(calculo.ordenadas.length, calculo.total, queSon!)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {cuerpo}
      {pie || paginador ? <div className="border-t border-border px-4 py-3">{pie ?? paginador}</div> : null}
    </div>
  )
}

/**
 * En el celular, cada fila es una tarjeta (el patrón de `CuotasDelMesTabla`):
 * arriba, la primera columna —lo que la fila ES— y, a su derecha, la primera
 * cifra de la tabla (la primera columna alineada a la derecha), en mono; debajo,
 * las demás con su nombre. Las columnas sin nombre (los botones) van al pie.
 */
function TarjetasDeLaTabla<T>({
  columns,
  rows,
  getKey,
  onRowClick,
  filaMarcada,
  rowClassName,
  filaTestid,
  ariaLabel,
  cifraDelCelular,
}: {
  columns: Column<T>[]
  rows: T[]
  getKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  filaMarcada?: (row: T) => boolean
  rowClassName?: (row: T) => string | undefined
  filaTestid?: (row: T) => string
  ariaLabel?: string
  cifraDelCelular?: string
}) {
  const [principal, ...resto] = columns
  const visibles = resto.filter((c) => c.enCelular !== false)
  const cifra =
    (cifraDelCelular ? visibles.find((c) => c.header === cifraDelCelular) : undefined) ??
    visibles.find((c) => c.align === 'right' && c.header.trim())
  const conNombre = visibles.filter((c) => c.header.trim() && c !== cifra)
  const sinNombre = visibles.filter((c) => !c.header.trim())
  return (
    <Stagger as="ul" layout={false} className="divide-y divide-border" aria-label={ariaLabel}>
      {rows.map((row, i) => (
        <StaggerItem
          as="li"
          key={getKey(row, i)}
          data-testid={filaTestid?.(row)}
          className={cn(
            'px-4 py-3.5',
            filaMarcada?.(row) && 'bg-surface-muted',
            rowClassName?.(row),
            onRowClick && 'cursor-pointer outline-none focus-visible:bg-surface-muted',
          )}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={
            onRowClick
              ? (e: React.KeyboardEvent) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(row)
                  }
                }
              : undefined
          }
          tabIndex={onRowClick ? 0 : undefined}
        >
          {principal || cifra ? (
            <div className="flex items-start justify-between gap-4">
              {principal ? <div className="min-w-0 flex-1 break-words">{principal.cell(row)}</div> : null}
              {cifra ? (
                <div className="shrink-0 text-right">
                  {/* Ronda 26 (T8): la cifra con su rótulo (antes un «0» suelto). */}
                  <div className="text-caption text-fg-subtle">{cifra.header}</div>
                  <div className="font-mono text-body-sm tabular-nums text-fg">{cifra.cell(row)}</div>
                </div>
              ) : null}
            </div>
          ) : null}
          {conNombre.length ? (
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
              {conNombre.map((c, ci) => (
                <div key={ci} className={cn('min-w-0', c.enCelularAncho && 'col-span-2')}>
                  <dt className="font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">{c.header}</dt>
                  <dd className="min-w-0 break-words text-body-sm text-fg">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {sinNombre.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {sinNombre.map((c, ci) => (
                <div key={ci}>{c.cell(row)}</div>
              ))}
            </div>
          ) : null}
        </StaggerItem>
      ))}
    </Stagger>
  )
}
