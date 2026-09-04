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
import { BookOpenText, Plus } from '@phosphor-icons/react';

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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  CLASE_DE_ORIGEN,
  NOMBRE_DE_ORIGEN,
  ORIGENES,
  textoDeLineas,
  totalesDeAsiento,
} from '@/lib/contabilidad/asientos';
import { diaLegible, rangoInvertido } from '@/lib/contabilidad/fechas';
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
      {/* ── Filtros + acción ─────────────────────────────────────────────── */}
      <section
        className="space-y-4 rounded-lg border border-border bg-surface p-4"
        aria-label="Filtros del libro"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_minmax(240px,1fr)_160px_150px]">
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
          <p className="text-xs text-warning" role="status">
            No se pudo cargar el plan de cuentas: el filtro por cuenta y el asiento manual no van a
            tener opciones hasta recargar.
          </p>
        ) : null}
      </section>

      {/* ── La tabla, sola en su tarjeta y sin título encima ─────────────── */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
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
              <TableBody>
                {filas.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
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
                    <TableRow
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
                      <TableCell className="max-w-[420px]">
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
                            CLASE_DE_ORIGEN[asiento.origen] ?? 'bg-surface-muted text-fg-muted',
                          )}
                        >
                          {NOMBRE_DE_ORIGEN[asiento.origen] ?? asiento.origen}
                        </span>
                      </TableCell>
                      <TableCell numeric className="whitespace-nowrap">
                        <Monto valor={totales.debitos} />
                      </TableCell>
                      <TableCell numeric className="whitespace-nowrap">
                        <Monto valor={totales.creditos} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium',
                            asiento.cerrado
                              ? 'bg-surface-muted text-fg-muted'
                              : 'bg-success-soft text-success',
                          )}
                        >
                          {asiento.cerrado ? 'Cerrado' : 'Abierto'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
