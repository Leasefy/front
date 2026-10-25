'use client';

/**
 * 🔴 LA CONCILIACIÓN DEL RECAUDO DIARIO, ARCHIVO POR ARCHIVO (Nico y Vale, 20-10-2026).
 *
 * Vale (Portofino) sube cada día el archivo del banco y necesita ver, línea por
 * línea, si quedó conciliada y, si no, por qué. Pidió, con estas palabras:
 *   - contadores: Total registros procesados · Conciliados · Omitidos · Errores
 *     de carga · Fallidos de conciliación;
 *   - pestañas: Todos · Conciliados · Por conciliar · Omitidos · Con error;
 *   - columnas «Razón» y «Estado conciliado»;
 *   - un botón «Conciliar» para lo que no se concilió solo.
 *
 * El estado de cada línea lo dice el back (`estado-conciliado.ts`) a partir de
 * lo que ya pasó con su plata: una línea que alguien concilia a mano mañana
 * aparece conciliada aquí sin hacer nada más. «Conciliar» es la MISMA operación
 * de Conciliación → Movimientos: contra el CLIENTE, que reparte la plata sobre
 * su deuda más vieja y emite el recibo de caja.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bank, CheckCircle, MagnifyingGlass, WarningOctagon } from '@phosphor-icons/react';
import { Appear } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { ElegirCliente } from '@/components/inmobiliaria/ReciboPorCliente';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { diaLegible, plata } from '@/components/cobros/extracto-bancario/formato';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type {
  ContadoresDelArchivo,
  DetalleDelArchivo,
  EstadoConciliado,
  FilaDelArchivo,
} from '@/lib/api/tesoreria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { contar } from '@/lib/texto/plural';
import { cn } from '@/lib/utils';

type Pestana = 'TODOS' | EstadoConciliado;

const PESTANAS: { valor: Pestana; titulo: string }[] = [
  { valor: 'TODOS', titulo: 'Todos' },
  { valor: 'CONCILIADO', titulo: 'Conciliados' },
  { valor: 'POR_CONCILIAR', titulo: 'Por conciliar' },
  { valor: 'OMITIDO', titulo: 'Omitidos' },
  { valor: 'CON_ERROR', titulo: 'Con error' },
];

const NOMBRE: Record<EstadoConciliado, string> = {
  CONCILIADO: 'Conciliado',
  POR_CONCILIAR: 'Por conciliar',
  OMITIDO: 'Omitido',
  CON_ERROR: 'Con error',
};

const VARIANTE: Record<EstadoConciliado, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  CONCILIADO: 'success',
  POR_CONCILIAR: 'warning',
  OMITIDO: 'secondary',
  CON_ERROR: 'destructive',
};

const COLUMNAS = ['Línea', 'Fecha', 'Referencia', 'Valor', 'Contrato', 'Estado conciliado', 'Razón', ''];

/** Con un back anterior al 20-10 la fila no trae su estado: se deduce igual que allá. */
export function estadoDeLaFila(f: FilaDelArchivo): EstadoConciliado {
  if (f.estadoConciliado) return f.estadoConciliado;
  if (f.estado === 'RECHAZADA') return 'CON_ERROR';
  if (f.estado === 'REPETIDA') return 'OMITIDO';
  if (f.movimiento?.estado === 'CONCILIADO') return 'CONCILIADO';
  if (f.movimiento?.estado === 'IGNORADO' || !f.movimiento) return 'OMITIDO';
  return 'POR_CONCILIAR';
}

export function contadoresDe(filas: FilaDelArchivo[], lineas: number): ContadoresDelArchivo {
  const c = { CONCILIADO: 0, POR_CONCILIAR: 0, OMITIDO: 0, CON_ERROR: 0 };
  for (const f of filas) c[estadoDeLaFila(f)] += 1;
  return {
    procesados: filas.length,
    conciliados: c.CONCILIADO,
    porConciliar: c.POR_CONCILIAR,
    omitidos: c.OMITIDO,
    erroresDeCarga: c.CON_ERROR,
    lineasDeControl: Math.max(0, lineas - filas.length),
  };
}

/** Busca por referencia o cédula, contrato, inquilino, valor o razón; sin tildes. */
export function coincide(f: FilaDelArchivo, busqueda: string): boolean {
  const q = sinTildes(busqueda.trim());
  if (!q) return true;
  const soloDigitos = q.replace(/\D/g, '');
  const texto = sinTildes(
    [f.referencia, f.contrato?.codigo, f.contrato?.inquilino, f.contrato?.documento, f.razon ?? f.motivo, f.secuencia]
      .filter(Boolean)
      .join(' '),
  );
  if (texto.includes(q)) return true;
  return soloDigitos.length >= 3 && String(Math.round(f.valorCop)).includes(soloDigitos);
}

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function ConciliacionDelArchivo({ archivoId, onCambio }: { archivoId: string; onCambio?: () => void }) {
  const [datos, setDatos] = useState<DetalleDelArchivo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [pestana, setPestana] = useState<Pestana>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [conciliando, setConciliando] = useState<FilaDelArchivo | null>(null);
  const [cliente, setCliente] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { canAccess, isLoading: permisosCargando } = usePermissions();
  const puedeConciliar = permisosCargando || canAccess('cobros', 'create');

  /** `silencioso`: después de conciliar se relee sin volver al esqueleto (la tabla no salta). */
  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      setFallo(null);
      try {
        setDatos(await tesoreriaApi.detalleDelArchivo(archivoId));
      } catch (error) {
        setFallo(error);
      } finally {
        setCargando(false);
      }
    },
    [archivoId],
  );

  useEffect(() => {
    setPestana('TODOS');
    setBusqueda('');
    void cargar();
  }, [cargar]);

  const filas = useMemo(() => datos?.filas ?? [], [datos]);
  const contadores = useMemo(
    () => datos?.contadores ?? contadoresDe(filas, datos?.archivo.lineas ?? filas.length),
    [datos, filas],
  );
  const cuantosEn: Record<Pestana, number> = {
    TODOS: contadores.procesados,
    CONCILIADO: contadores.conciliados,
    POR_CONCILIAR: contadores.porConciliar,
    OMITIDO: contadores.omitidos,
    CON_ERROR: contadores.erroresDeCarga,
  };
  const filtradas = useMemo(
    () => filas.filter((f) => (pestana === 'TODOS' || estadoDeLaFila(f) === pestana) && coincide(f, busqueda)),
    [filas, pestana, busqueda],
  );
  const pagina = useTablePagination(filtradas, { initialPageSize: 25, resetKey: `${pestana}|${busqueda}` });

  const abrirConciliar = (f: FilaDelArchivo) => {
    setConciliando(f);
    setCliente(f.contrato?.tenantId ?? null);
  };

  const conciliar = async () => {
    const f = conciliando;
    if (!f?.movimientoId || !cliente) return;
    setOcupado(true);
    try {
      const r = await conciliacionBancariaApi.conciliar(f.movimientoId, { tenantId: cliente });
      const numeros = (r.pago?.recibos ?? []).map((x) => `N.º ${x.numero}`);
      const aFavor = r.pago?.anticipoCop ?? 0;
      toast.success(
        numeros.length === 0
          ? r.recibo
            ? `Recibo N.º ${r.recibo.numero} emitido.`
            : `Quedaron ${plata(aFavor)} a favor del cliente: no debía nada.`
          : `${numeros.length === 1 ? 'Recibo' : 'Recibos'} ${numeros.join(', ')} ${numeros.length === 1 ? 'emitido' : 'emitidos'}` +
              (aFavor > 0 ? ` y ${plata(aFavor)} a favor del cliente.` : '.'),
      );
      setConciliando(null);
      await cargar(true);
      onCambio?.();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo conciliar el pago.',
          accion: 'conciliar el pago contra el cliente',
        }),
      );
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section className="space-y-4" data-testid="conciliacion-del-archivo">
      <EstadoDeDatos
        cargando={cargando && !datos}
        error={datos ? null : fallo}
        queEs="la conciliación de este archivo"
        onReintentar={() => cargar()}
      >
        {datos ? (
          <Appear key={archivoId} distance="xs">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-fg">Conciliación de «{datos.archivo.nombre}»</h2>
                <p className="mt-1 text-body-sm text-fg-muted">
                  {[
                    datos.archivo.banco,
                    `importado el ${diaLegible(datos.archivo.createdAt)}`,
                    `${contar(contadores.procesados, 'pago')} por ${plata(datos.archivo.totalCop)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              {/* Los contadores de Vale. Tocarlos filtra la tabla. */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="contadores-del-archivo">
                {(
                  [
                    ['TODOS', 'Total registros procesados', contadores.procesados],
                    ['CONCILIADO', 'Conciliados', contadores.conciliados],
                    ['OMITIDO', 'Omitidos', contadores.omitidos],
                    ['CON_ERROR', 'Errores de carga', contadores.erroresDeCarga],
                    ['POR_CONCILIAR', 'Fallidos de conciliación', contadores.porConciliar],
                  ] as const
                ).map(([valor, etiqueta, cuantos]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setPestana(valor)}
                    aria-pressed={pestana === valor}
                    data-testid={`contador-${valor}`}
                    className={cn(
                      'rounded-lg border bg-surface p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      pestana === valor ? 'border-primary/60' : 'border-border hover:border-border-strong',
                    )}
                  >
                    <p className="text-caption text-fg-muted">{etiqueta}</p>
                    <p
                      className={cn(
                        'mt-1.5 text-2xl font-semibold tabular-nums',
                        valor === 'POR_CONCILIAR' && cuantos > 0
                          ? 'text-warning'
                          : valor === 'CON_ERROR' && cuantos > 0
                            ? 'text-danger'
                            : 'text-fg',
                      )}
                    >
                      {cuantos}
                    </p>
                  </button>
                ))}
              </div>
              {contadores.lineasDeControl > 0 ? (
                <p className="text-caption text-fg-muted" data-testid="lineas-de-control">
                  Además, el archivo trae {contar(contadores.lineasDeControl, 'línea de control', 'líneas de control')} del
                  banco (encabezado y totales): se leyeron para validar el archivo y no son pagos.
                </p>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
                    <TabsList variant="underline" className="justify-start overflow-x-auto">
                      {PESTANAS.map((p) => (
                        <TabsTrigger key={p.valor} value={p.valor} data-testid={`pestana-del-archivo-${p.valor}`}>
                          {p.titulo} ({cuantosEn[p.valor]})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="relative w-full lg:w-80">
                    <MagnifyingGlass
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                      aria-hidden="true"
                    />
                    <Input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Busca por cédula, contrato, inquilino o valor"
                      aria-label="Buscar en el archivo"
                      className="pl-9"
                      autoComplete="off"
                      data-testid="buscar-en-el-archivo"
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      {COLUMNAS.map((c, i) => (
                        <TableHead key={i} className={cn('whitespace-nowrap', c === 'Valor' && 'text-right')}>
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="filas-del-archivo">
                    {filtradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={COLUMNAS.length} className="p-0">
                          <SinDatos
                            queSon="líneas"
                            icono={Bank}
                            hayFiltros={busqueda.trim() !== '' || pestana !== 'TODOS'}
                            onLimpiarFiltros={() => {
                              setBusqueda('');
                              setPestana('TODOS');
                            }}
                            titulo={busqueda.trim() ? 'Ninguna línea coincide con la búsqueda' : 'No hay líneas en esta pestaña'}
                            descripcion={
                              pestana === 'POR_CONCILIAR' && !busqueda.trim()
                                ? 'Todo lo que trajo el archivo quedó conciliado u omitido con su razón.'
                                : undefined
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagina.pageItems.map((f) => {
                        const estado = estadoDeLaFila(f);
                        return (
                          <TableRow key={f.id} data-testid={`linea-${f.linea}`} data-estado={estado}>
                            <TableCell className="tabular-nums text-fg-muted">{f.linea}</TableCell>
                            <TableCell className="whitespace-nowrap">{f.fecha ? diaLegible(f.fecha) : '—'}</TableCell>
                            <TableCell className="font-mono">
                              {f.referencia ?? <span className="text-fg-muted">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                              {f.estado === 'RECHAZADA' ? '—' : plata(f.valorCop)}
                            </TableCell>
                            <TableCell className="min-w-[10rem]">
                              {f.contrato ? (
                                <div>
                                  <p className="text-fg">Contrato {f.contrato.codigo}</p>
                                  {f.contrato.inquilino ? (
                                    <p className="text-caption text-fg-muted">{f.contrato.inquilino}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-fg-muted">Sin identificar</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={VARIANTE[estado]} className="whitespace-nowrap">
                                {estado === 'CONCILIADO' ? (
                                  <CheckCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                ) : estado === 'CON_ERROR' ? (
                                  <WarningOctagon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                ) : null}
                                {f.estadoConciliadoNombre ?? NOMBRE[estado]}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[16rem] max-w-[28rem] text-body-sm text-fg-muted">
                              {f.razon ?? f.motivo ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {(f.sePuedeConciliar ?? estado === 'POR_CONCILIAR') && f.movimientoId && puedeConciliar ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  hideArrow
                                  onClick={() => abrirConciliar(f)}
                                  data-testid={`conciliar-linea-${f.linea}`}
                                >
                                  Conciliar
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {pagina.shouldPaginate ? (
                  <div className="border-t border-border px-4 py-3">
                    <TablePagination
                      total={pagina.total}
                      page={pagina.page}
                      pageSize={pagina.pageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={pagina.setPage}
                      onPageSizeChange={pagina.setPageSize}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </Appear>
        ) : null}
      </EstadoDeDatos>

      <Dialog open={conciliando !== null} onOpenChange={(abierto) => !abierto && !ocupado && setConciliando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliar el pago</DialogTitle>
            <DialogDescription>
              {conciliando
                ? `${plata(conciliando.valorCop)} del ${conciliando.fecha ? diaLegible(conciliando.fecha) : 'archivo'}, referencia ${conciliando.referencia ?? 'sin referencia'}. `
                : ''}
              Elige de quién es: la plata va a su deuda más vieja y sale el recibo de caja. Si sobra, queda a su favor.
            </DialogDescription>
          </DialogHeader>
          {conciliando?.razon ? (
            <p className="rounded-md border border-border bg-bg p-3 text-body-sm text-fg-muted" data-testid="razon-al-conciliar">
              {conciliando.razon}
            </p>
          ) : null}
          <ElegirCliente value={cliente} onChange={setCliente} />
          <DialogFooter>
            <Button variant="outline" hideArrow disabled={ocupado} onClick={() => setConciliando(null)}>
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={!cliente || ocupado}
              isLoading={ocupado}
              onClick={() => void conciliar()}
              data-testid="confirmar-conciliar-linea"
            >
              Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
