'use client';

/**
 * El libro de asientos: la lista paginada, los filtros, el detalle en un
 * cajón, el asiento manual y el cierre de período.
 *
 * Tres vacíos distintos y se pintan distinto: «no hay asientos todavía»
 * (arrancar con uno), «ningún asiento con estos filtros» (aflojar el filtro)
 * y «no pudimos preguntar» (reintentar). Un error que se pinta como lista
 * vacía le dice al contador que el libro está en blanco.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, FunnelSimple, LockSimple, Plus } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  contabilidadApi,
  type AsientoContable,
  type Cierre,
  type OrigenDelAsiento,
  type PaginaDeAsientos,
} from '@/lib/api/contabilidad.service';
import { NOMBRE_DE_ORIGEN, ORIGENES, totalesDeAsiento } from '@/lib/contabilidad/asientos';
import { diaLegible, rangoInvertido } from '@/lib/contabilidad/fechas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { RangoDeFechas } from '../RangoDeFechas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';
import { AsientoManual } from './AsientoManual';
import { CierreDePeriodo } from './CierreDePeriodo';
import { DetalleDeAsiento } from './DetalleDeAsiento';

const POR_PAGINA = 50;
const TODOS = '__todos__';

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
  const [datos, setDatos] = useState<PaginaDeAsientos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [seleccionado, setSeleccionado] = useState<AsientoContable | null>(null);
  const [manualAbierto, setManualAbierto] = useState(false);
  const [cierre, setCierre] = useState<Cierre | null>(null);
  const [cargandoCierre, setCargandoCierre] = useState(true);
  const pedido = useRef(0);

  const cargarCierre = useCallback(async () => {
    setCargandoCierre(true);
    try {
      setCierre(await contabilidadApi.asientos.cierre());
    } catch {
      // Sin la frontera la pantalla sigue sirviendo; el back valida igual.
      setCierre(null);
    } finally {
      setCargandoCierre(false);
    }
  }, []);

  const cargar = useCallback(async () => {
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
        limite: POR_PAGINA,
        desplazamiento: (pagina - 1) * POR_PAGINA,
      });
      if (n === pedido.current) setDatos(r);
    } catch (e) {
      if (n === pedido.current) setError(e);
    } finally {
      if (n === pedido.current) setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    if (rangoInvertido(filtros.desde, filtros.hasta)) return;
    void cargar();
  }, [cargar, filtros.desde, filtros.hasta]);

  useEffect(() => {
    void cargarCierre();
  }, [cargarCierre]);

  const cambiarFiltros = useCallback((cambio: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...cambio }));
    setPagina(1);
  }, []);

  const refrescarTodo = useCallback(() => {
    void cargar();
    void cargarCierre();
  }, [cargar, cargarCierre]);

  const total = datos?.total ?? 0;
  const sinNada = !cargando && !error && total === 0;

  const filas = useMemo(
    () => (datos?.asientos ?? []).map((a) => ({ asiento: a, totales: totalesDeAsiento(a) })),
    [datos],
  );

  return (
    <div className="space-y-6">
      {/* ── Filtros + acción ─────────────────────────────────────────────── */}
      <section
        className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
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
            {hayFiltros(filtros) ? (
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

      {/* ── La lista ─────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {error ? (
          <FalloDeCarga error={error} queEs="el libro de asientos" onReintentar={cargar} enmarcado={false} />
        ) : cargando && !datos ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : sinNada && !hayFiltros(filtros) ? (
          <EmptyState
            icon={BookOpenText}
            title="El libro está en blanco"
            description="Todavía no hay asientos. El primero puede ser manual, o entrar por la migración de registros históricos."
            action={{ label: 'Asiento manual', onClick: () => setManualAbierto(true) }}
          />
        ) : sinNada ? (
          <EmptyState
            icon={FunnelSimple}
            title="Ningún asiento con estos filtros"
            description="Hay asientos en el libro, pero ninguno cae en el rango, la cuenta o el origen elegidos."
            action={{ label: 'Limpiar filtros', onClick: () => cambiarFiltros(SIN_FILTROS) }}
          />
        ) : (
          <>
            <div className={cn('overflow-x-auto', cargando && 'opacity-60')} aria-busy={cargando}>
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
                  {filas.map(({ asiento, totales }) => (
                    <TableRow
                      key={asiento.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Abrir el asiento ${asiento.numero}`}
                      className="cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover"
                      onClick={() => setSeleccionado(asiento)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSeleccionado(asiento);
                        }
                      }}
                      data-testid="fila-de-asiento"
                    >
                      <TableCell numeric>
                        <span className="font-mono tabular-nums">{asiento.numero}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums">{diaLegible(asiento.fecha)}</span>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <span className="block truncate" title={asiento.descripcion}>
                          {asiento.descripcion}
                        </span>
                        <span className="font-mono text-xs text-fg-subtle">
                          {asiento.movimientos.length} líneas
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{NOMBRE_DE_ORIGEN[asiento.origen] ?? asiento.origen}</Badge>
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={totales.debitos} />
                      </TableCell>
                      <TableCell numeric>
                        <Monto valor={totales.creditos} />
                      </TableCell>
                      <TableCell>
                        {asiento.cerrado ? (
                          <Badge variant="outline" className="gap-1">
                            <LockSimple className="h-3 w-3" aria-hidden="true" />
                            Cerrado
                          </Badge>
                        ) : (
                          <span className="text-sm text-fg-muted">Abierto</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {total > POR_PAGINA ? (
              <div className="border-t border-border p-3">
                <TablePagination
                  total={total}
                  page={pagina}
                  pageSize={POR_PAGINA}
                  onPageChange={setPagina}
                />
              </div>
            ) : (
              <p className="border-t border-border px-4 py-3 font-mono text-xs tabular-nums text-fg-muted">
                {total === 1 ? '1 asiento' : `${total.toLocaleString('es-CO')} asientos`}
              </p>
            )}
          </>
        )}
      </section>

      <CierreDePeriodo cierre={cierre} cargando={cargandoCierre} onCerrado={refrescarTodo} />

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
