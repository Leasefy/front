'use client';

/**
 * El libro de asientos: los filtros, la lista paginada, el detalle en un
 * cajón, el asiento manual y el cierre de período.
 *
 * ── Una fila = un asiento, en UNA línea (Nico, 2026-09-03) ─────────────────
 *
 * La versión anterior metía la descripción y «N líneas» en dos renglones
 * dentro de la misma celda: cada fila medía ~85 px y cincuenta asientos eran
 * una pantalla y media de scroll. El libro se lee de arriba abajo buscando un
 * número o una fecha, no leyendo párrafos: la descripción va truncada con su
 * texto completo en el `title`, y el conteo de líneas queda como sufijo en la
 * MISMA línea. El detalle completo está a un clic.
 *
 * ── La paginación es del SERVIDOR ─────────────────────────────────────────
 *
 * `GET /asientos` ya pagina (`limite` ≤ 200 y `desplazamiento`) y devuelve
 * `total`, así que el pie no recorta una lista que ya vino entera: page y
 * pageSize se traducen a limite/desplazamiento y cada cambio es un pedido.
 * Por eso NO se usa `useTablePagination` acá — ese hook es para cuando el
 * endpoint devuelve todo.
 *
 * Tres vacíos distintos y se pintan distinto: «no hay asientos todavía»
 * (arrancar con uno), «ningún asiento con estos filtros» (aflojar el filtro)
 * y «no pudimos preguntar» (reintentar). Un error que se pinta como lista
 * vacía le dice al contador que el libro está en blanco.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, LockSimple, Plus } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TablePagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import {
  contabilidadApi,
  type AsientoContable,
  type Cierre,
  type OrigenDelAsiento,
  type PaginaDeAsientos,
} from '@/lib/api/contabilidad.service';
import {
  claseDelOrigen,
  estadoDelAsiento,
  NOMBRE_DE_ORIGEN,
  nombreDelOrigen,
  NOMBRE_DEL_ESTADO,
  ORIGENES,
  textoDeLineas,
  totalesDeAsiento,
} from '@/lib/contabilidad/asientos';
import { diaDe, diaLegible, rangoInvertido } from '@/lib/contabilidad/fechas';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';
import { AsientoManual } from './AsientoManual';
import { CierreDePeriodo } from './CierreDePeriodo';
import { DetalleDeAsiento } from './DetalleDeAsiento';

const TODOS = '__todos__';
const COLUMNAS = 7;

interface Filtros {
  desde: string;
  hasta: string;
  cuentaId: string;
  origen: OrigenDelAsiento | '';
  cerrado: '' | 'true' | 'false';
}

const SIN_FILTROS: Filtros = { desde: '', hasta: '', cuentaId: '', origen: '', cerrado: '' };

function hayFiltros(f: Filtros): boolean {
  return Boolean(f.desde || f.hasta || f.cuentaId || f.origen || f.cerrado);
}

export function LibroDeAsientos() {
  const esCelular = useIsMobile();
  const { cuentas, error: errorDeCuentas } = useCuentas();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(DEFAULT_PAGE_SIZE);
  const [datos, setDatos] = useState<PaginaDeAsientos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [seleccionado, setSeleccionado] = useState<AsientoContable | null>(null);
  const [manualAbierto, setManualAbierto] = useState(false);
  const [cierre, setCierre] = useState<Cierre | null>(null);
  const [cargandoCierre, setCargandoCierre] = useState(true);
  const [falloDelCierre, setFalloDelCierre] = useState(false);
  const pedido = useRef(0);

  const cargarCierre = useCallback(async () => {
    setCargandoCierre(true);
    try {
      setCierre(await contabilidadApi.asientos.cierre());
      setFalloDelCierre(false);
    } catch {
      // Sin la frontera la pantalla sigue sirviendo; el back valida igual.
      // Pero se DICE que no se pudo: un `null` acá no es «nunca se cerró».
      setCierre(null);
      setFalloDelCierre(true);
    } finally {
      setCargandoCierre(false);
    }
  }, []);

  const cargar = useCallback(async () => {
    // Un rango al revés no devuelve nada útil: se avisa en el filtro y no se
    // pide nada hasta que se corrija.
    if (rangoInvertido(filtros.desde, filtros.hasta)) return;
    const n = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const r = await contabilidadApi.asientos.listar({
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
        cuentaId: filtros.cuentaId || undefined,
        origen: filtros.origen || undefined,
        cerrado: filtros.cerrado === '' ? undefined : filtros.cerrado === 'true',
        limite: porPagina,
        desplazamiento: (pagina - 1) * porPagina,
      });
      if (n === pedido.current) setDatos(r);
    } catch (e) {
      if (n === pedido.current) setError(e);
    } finally {
      if (n === pedido.current) setCargando(false);
    }
  }, [filtros, pagina, porPagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    void cargarCierre();
  }, [cargarCierre]);

  const cambiarFiltros = useCallback((cambio: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...cambio }));
    setPagina(1);
  }, []);

  const cambiarPorPagina = useCallback((tamano: number) => {
    setPorPagina(tamano);
    setPagina(1);
  }, []);

  const refrescarTodo = useCallback(() => {
    void cargar();
    void cargarCierre();
  }, [cargar, cargarCierre]);

  const total = datos?.total ?? 0;
  const conFiltros = hayFiltros(filtros);

  const filas = useMemo(
    () => (datos?.asientos ?? []).map((a) => ({ asiento: a, totales: totalesDeAsiento(a) })),
    [datos],
  );

  return (
    <div className="space-y-6">
      {/* ── Filtros y tabla: UNA tarjeta ──────────────────────────────────
          🔴 20-09 · Eran dos, separadas por 24 px. Nico lo dijo de
          Facturación —«porque esto no está pegado a la tabla»— y valía igual
          acá: al bajar por 1.094 asientos el filtro se va de pantalla y la
          tabla queda sin decir de qué rango habla. */}
      <section
        className="overflow-x-clip rounded-lg border border-border bg-surface"
        aria-label="Filtros del libro"
      >
      <div className="space-y-4 border-b border-border p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(300px,1.2fr)_minmax(200px,1fr)_160px_150px]">
            <RangoDeFechas
              desde={filtros.desde}
              hasta={filtros.hasta}
              onChange={(r) => cambiarFiltros(r)}
            />
            <div className="space-y-1.5">
              <Label>Cuenta</Label>
              <SelectorDeCuenta
                cuentas={cuentas}
                value={filtros.cuentaId}
                onChange={(cuentaId) => cambiarFiltros({ cuentaId })}
                placeholder="Todas las cuentas"
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label id="filtro-origen">Origen</Label>
              <Select
                value={filtros.origen || TODOS}
                onValueChange={(v) => cambiarFiltros({ origen: v === TODOS ? '' : (v as OrigenDelAsiento) })}
              >
                <SelectTrigger aria-labelledby="filtro-origen" data-testid="filtro-origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {ORIGENES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {NOMBRE_DE_ORIGEN[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label id="filtro-cerrado">Período</Label>
              <Select
                value={filtros.cerrado || TODOS}
                onValueChange={(v) => cambiarFiltros({ cerrado: v === TODOS ? '' : (v as 'true' | 'false') })}
              >
                <SelectTrigger aria-labelledby="filtro-cerrado" data-testid="filtro-cerrado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  <SelectItem value="false">Abiertos</SelectItem>
                  <SelectItem value="true">Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conFiltros ? (
              <Button variant="ghost" hideArrow onClick={() => cambiarFiltros(SIN_FILTROS)}>
                Limpiar
              </Button>
            ) : null}
            <Button hideArrow onClick={() => setManualAbierto(true)} data-testid="abrir-asiento-manual">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Asiento manual
            </Button>
          </div>
        </div>
        {errorDeCuentas ? (
          <p className="text-caption text-warning" role="status">
            No se pudo cargar el plan de cuentas: el filtro por cuenta y el asiento manual no van a
            tener opciones hasta recargar.
          </p>
        ) : null}
      </div>

        <EstadoDeDatos
          cargando={cargando && datos === null}
          error={error}
          queEs="el libro de asientos"
          onReintentar={cargar}
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
          <div className={cn(cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            {esCelular ? (
              /* 🔴 CB-22 (QA de Contabilidad, 03-10-2026): a 390 px la tabla se
                 corría de lado y la descripción no se leía. Bajo 768 px cada
                 asiento es una tarjeta —n.º, fecha, descripción en dos líneas,
                 el monto (débitos = créditos), origen y estado— que abre el
                 mismo cajón (como «Por facturar»). */
              filas.length === 0 ? (
                <SinDatos
                  hayFiltros={conFiltros}
                  queSon="asientos"
                  icono={BookOpenText}
                  titulo="El libro está en blanco"
                  descripcion="Todavía no hay asientos. El primero puede ser manual, o entrar por la migración de registros históricos."
                  crear={{ label: 'Asiento manual', onClick: () => setManualAbierto(true) }}
                  onLimpiarFiltros={() => cambiarFiltros(SIN_FILTROS)}
                />
              ) : (
                <ul className="divide-y divide-border" data-testid="tarjetas-de-asientos">
                  {filas.map(({ asiento, totales }) => (
                    <li key={asiento.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionado(asiento)}
                        aria-label={`Abrir el asiento ${asiento.numero}`}
                        className="flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                        data-testid="tarjeta-de-asiento"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-mono text-caption tabular-nums text-fg-muted">
                            N.º {asiento.numero} · {fechaCorta(diaDe(asiento.fecha))}
                          </span>
                          <Monto valor={totales.debitos} className="text-sm font-medium text-fg" />
                        </span>
                        <span className="line-clamp-2 text-sm text-fg">{asiento.descripcion}</span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                              claseDelOrigen(asiento),
                            )}
                          >
                            {nombreDelOrigen(asiento)}
                          </span>
                          <EstadoDeLaFila asiento={asiento} />
                          <span className="text-caption text-fg-muted">
                            {textoDeLineas(asiento.movimientos.length)}
                            {totales.debitos !== totales.creditos ? ' · no cuadra' : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead numeric>N.º</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead numeric>Débitos</TableHead>
                  <TableHead numeric>Créditos</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBodyAnimado>
                {filas.length === 0 ? (
                  <TableRow key="vacio" className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNAS} className="p-0">
                      <SinDatos
                        hayFiltros={conFiltros}
                        queSon="asientos"
                        icono={BookOpenText}
                        titulo="El libro está en blanco"
                        descripcion="Todavía no hay asientos. El primero puede ser manual, o entrar por la migración de registros históricos."
                        crear={{ label: 'Asiento manual', onClick: () => setManualAbierto(true) }}
                        onLimpiarFiltros={() => cambiarFiltros(SIN_FILTROS)}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map(({ asiento, totales }) => (
                    <TableRowAnimada
                      key={asiento.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Abrir el asiento ${asiento.numero}`}
                      className="cursor-pointer focus-visible:bg-surface-muted"
                      onClick={() => setSeleccionado(asiento)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSeleccionado(asiento);
                        }
                      }}
                      data-testid="fila-de-asiento"
                    >
                      <TableCell numeric className="whitespace-nowrap font-mono">
                        {asiento.numero}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                        {diaLegible(asiento.fecha)}
                      </TableCell>
                      <TableCell className="max-w-[340px]">
                        <span className="flex items-baseline gap-1.5">
                          <span className="truncate text-fg" title={asiento.descripcion}>
                            {asiento.descripcion}
                          </span>
                          <span className="shrink-0 whitespace-nowrap text-caption text-fg-muted">
                            · {textoDeLineas(asiento.movimientos.length)}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                            claseDelOrigen(asiento),
                          )}
                        >
                          {nombreDelOrigen(asiento)}
                        </span>
                      </TableCell>
                      <TableCell numeric className="whitespace-nowrap">
                        <Monto valor={totales.debitos} />
                      </TableCell>
                      <TableCell numeric className="whitespace-nowrap">
                        <Monto valor={totales.creditos} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap" data-testid="estado-de-la-fila">
                        {/* 🔴 CB-14: decía «Abierto» en cada fila (= el PERÍODO está
                            abierto), que no dice nada del asiento. Ahora dice lo
                            que el asiento ES — reversado, reversa o de un período
                            cerrado — y nada si es un asiento vivo. */}
                        <EstadoDeLaFila asiento={asiento} />
                      </TableCell>
                    </TableRowAnimada>
                  ))
                )}
              </TableBodyAnimado>
            </Table>
            )}
          </div>

          {total > 0 ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={pagina}
                pageSize={porPagina}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPagina}
                onPageSizeChange={cambiarPorPagina}
              />
            </div>
          ) : null}
        </EstadoDeDatos>
      </section>

      <CierreDePeriodo
        cierre={cierre}
        cargando={cargandoCierre}
        fallo={falloDelCierre}
        onCerrado={refrescarTodo}
        onReabierto={refrescarTodo}
      />

      <DetalleDeAsiento
        asiento={seleccionado}
        abierto={seleccionado !== null}
        onCerrar={() => setSeleccionado(null)}
        onReversado={() => void cargar()}
      />

      <AsientoManual
        abierto={manualAbierto}
        onCerrar={() => setManualAbierto(false)}
        onCreado={() => {
          setPagina(1);
          void cargar();
        }}
        cuentas={cuentas}
        cerradaHasta={cierre?.cerradaHasta ?? null}
      />
    </div>
  );
}

/** La marca del estado del asiento en su fila (CB-14). Un asiento vivo: nada. */
function EstadoDeLaFila({ asiento }: { asiento: AsientoContable }) {
  const estado = estadoDelAsiento(asiento);
  // Si la pastilla del origen ya dice «Reversa» (back con `origenLegible`), no se repite.
  if (!estado || (estado === 'REVERSA' && nombreDelOrigen(asiento) === 'Reversa')) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium',
        estado === 'REVERSADO' && 'bg-warning-soft text-warning',
        estado === 'REVERSA' && 'bg-surface-muted text-fg-muted',
        estado === 'CERRADO' && 'bg-surface-muted text-fg-muted',
      )}
    >
      {estado === 'CERRADO' ? <LockSimple className="h-3 w-3" aria-hidden="true" /> : null}
      {NOMBRE_DEL_ESTADO[estado]}
    </span>
  );
}
