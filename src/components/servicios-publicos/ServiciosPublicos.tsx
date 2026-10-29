'use client';

/**
 * 🔴 Operación → Servicios públicos (reunión con Portofino, Nico 22-10-2026: «necesito que creemos también dentro de
 * operación la parte de servicios públicos»).
 *
 * Por mes: quién subió la factura pagada (al día), qué falta revisar, a quién le falta y los ajustes de EPM por
 * aprobar. En el cajón de cada contrato se aprueba o rechaza lo que subió el inquilino, se registra una factura, se ve
 * la liquidación de ENTRADA de la que cruza el inicio y se liquida la ENTREGA del inmueble.
 *
 * Reunión del 29-10-2026: «esas facturas llegan con un corte atrasado»; el tablero cuenta por el CORTE (el consumo),
 * no por el mes en que llega la factura; un contrato que no había empezado no pide factura (`SIN_INICIAR`); cada
 * factura dice su corte, cómo cae en el contrato, lo que es del propietario y lo que Servi leyó y propuso. Se ve por
 * CONTRATO o por INMUEBLE (la cuenta de EPM es del inmueble).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lightning } from '@phosphor-icons/react';
import { CrossFade, Presence, SearchInput, SegmentedControl, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable';
import { SelectorDeOrden } from '@/components/ui/selector-de-orden';
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { mesesParaElegir, nombreDelMes } from '@/lib/contratos/incrementos-del-periodo';
import { MoriRecuerdaLaFactura, fraseDeLosRecordatorios } from '@/components/servicios-publicos/MoriRecuerdaLaFactura';
import { CajonDelContrato } from '@/components/servicios-publicos/CajonDelContrato';
import { ComoCaeLaFactura, CorteDeLaFactura } from '@/components/servicios-publicos/FacturaDelContrato';
import { LiquidacionDeEntrada } from '@/components/servicios-publicos/LiquidacionDeEntrada';
import {
  comoCaeDe,
  conceptosDelPropietarioDe,
  diaCorto,
  estadoDeServi,
  revisionDeServiDe,
  totalDelPropietario,
} from '@/lib/servicios-publicos/corte-de-la-factura';
import {
  serviciosPublicosApi,
  type CuentaDeServiciosDelInmueble,
  type EstadoDelMes,
  type FilaDelTablero,
  type TableroDeServicios,
} from '@/lib/api/servicios-publicos.service';

const ESTADOS_DEL_MES: ReadonlyArray<{ clave: EstadoDelMes; rotulo: string; tono: 'success' | 'warning' | 'critical' | 'neutral' }> = [
  { clave: 'SIN_FACTURA', rotulo: 'Sin factura', tono: 'neutral' },
  { clave: 'POR_REVISAR', rotulo: 'Por revisar', tono: 'warning' },
  { clave: 'AL_DIA', rotulo: 'Al día', tono: 'success' },
  { clave: 'RECHAZADA', rotulo: 'Rechazada', tono: 'critical' },
  { clave: 'SIN_INICIAR', rotulo: 'Sin iniciar', tono: 'neutral' },
];

type Vista = 'contrato' | 'inmueble';
type QueTrae = 'todo' | 'servi' | 'propietario' | 'entrada' | 'antes';

const QUE_TRAE: ReadonlyArray<{ valor: QueTrae; rotulo: string }> = [
  { valor: 'todo', rotulo: 'Todas las facturas' },
  { valor: 'servi', rotulo: 'Servi propone, por decidir' },
  { valor: 'propietario', rotulo: 'Con cobros del propietario' },
  { valor: 'entrada', rotulo: 'De entrada: se parte por días' },
  { valor: 'antes', rotulo: 'Consumo de antes del contrato' },
];

function mesDeHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** ¿La última factura de la fila trae lo que pide el filtro? */
function traeLoQuePide(f: FilaDelTablero, que: QueTrae): boolean {
  const u = f.ultimaFactura;
  if (que === 'todo') return true;
  if (!u) return false;
  if (que === 'servi') return estadoDeServi(u) === 'POR_DECIDIR';
  if (que === 'propietario') return conceptosDelPropietarioDe(u).length > 0;
  const cae = comoCaeDe(u, f.inicio);
  return que === 'entrada' ? cae === 'CRUZA_EL_INICIO' || u.tipo === 'ENTRADA' : cae === 'ANTES_DEL_INICIO';
}

/** Los contratos de un mismo inmueble, juntos (la cuenta de EPM es del inmueble). */
interface GrupoDelInmueble {
  clave: string;
  inmueble: string;
  cuentas: CuentaDeServiciosDelInmueble[];
  filas: FilaDelTablero[];
}

function agruparPorInmueble(filas: readonly FilaDelTablero[]): GrupoDelInmueble[] {
  const grupos = new Map<string, GrupoDelInmueble>();
  for (const f of filas) {
    const clave = normalizar(f.inmueble ?? '') || `sin-inmueble-${f.contractId}`;
    const g = grupos.get(clave);
    if (g) {
      g.filas.push(f);
      for (const c of f.cuentas ?? []) if (!g.cuentas.some((x) => x.numero === c.numero && x.empresa === c.empresa)) g.cuentas.push(c);
    } else grupos.set(clave, { clave, inmueble: f.inmueble ?? 'Sin dirección', cuentas: [...(f.cuentas ?? [])], filas: [f] });
  }
  return [...grupos.values()];
}

export function ServiciosPublicos() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('operaciones', 'edit');
  const puedeCargar = canAccess('contratos', 'edit');
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const hoy = useMemo(() => new Date(), []);
  const meses = useMemo(() => mesesParaElegir(hoy), [hoy]);
  const mesUrl = params?.get('mes');
  const mes = mesUrl && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesUrl) ? mesUrl : mesDeHoy();
  const vista: Vista = params?.get('vista') === 'inmueble' ? 'inmueble' : 'contrato';

  const [datos, setDatos] = useState<TableroDeServicios | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [estado, setEstado] = useState<EstadoDelMes | 'todos'>('todos');
  const [queTrae, setQueTrae] = useState<QueTrae>('todo');
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState<FilaDelTablero | null>(null);
  const [simulando, setSimulando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await serviciosPublicosApi.tablero(mes));
    } catch (e) {
      setError(e);
    }
  }, [mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const enLaUrl = (clave: string, valor: string | null) => {
    const siguiente = new URLSearchParams(params?.toString() ?? '');
    if (valor) siguiente.set(clave, valor);
    else siguiente.delete(clave);
    router.replace(`${ruta}?${siguiente.toString()}`, { scroll: false });
  };

  const filas = useMemo(() => (datos?.mes === mes ? datos.contratos : []), [datos, mes]);
  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return filas.filter(
      (f) =>
        (estado === 'todos' || f.estadoDelMes === estado) &&
        traeLoQuePide(f, queTrae) &&
        (q === '' ||
          normalizar(
            [f.contrato, f.inquilino, f.documentoDelInquilino, f.inmueble, ...(f.cuentas ?? []).map((c) => `${c.empresa} ${c.numero}`)].filter(Boolean).join(' '),
          ).includes(q)),
    );
  }, [filas, estado, queTrae, busqueda]);
  const cargando = !error && datos?.mes !== mes;
  const hayFiltros = estado !== 'todos' || queTrae !== 'todo' || busqueda.trim() !== '';
  const limpiar = () => {
    setEstado('todos');
    setQueTrae('todo');
    setBusqueda('');
  };

  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas». Sin elegir, el orden de
  // trabajo de siempre (lo que pide revisión primero).
  const { ordenadas, orden, ordenarPor, setOrden } = useOrdenDeLaTabla(visibles, {
    contrato: (f) => f.contrato,
    inquilino: (f) => f.inquilino,
    inmueble: (f) => f.inmueble,
    estado: (f) => ['POR_REVISAR', 'RECHAZADA', 'SIN_FACTURA', 'AL_DIA', 'SIN_INICIAR'].indexOf(f.estadoDelMes),
    factura: (f) => f.ultimaFactura?.periodoHasta ?? null,
    valor: (f) => f.ultimaFactura?.valorCop ?? null,
  });
  // Por inmueble se agrupan en el orden elegido: el inmueble con lo más urgente va primero.
  const grupos = useMemo(() => agruparPorInmueble(ordenadas), [ordenadas]);
  const resetKey = `${mes}|${vista}|${estado}|${queTrae}|${busqueda}|${orden?.campo ?? ''}|${orden?.sentido ?? ''}`;
  const porContrato = useTablePagination(ordenadas, { resetKey });
  const porInmueble = useTablePagination(grupos, { resetKey });
  const pagina = vista === 'inmueble' ? porInmueble : porContrato;
  const gruposDeLaPagina: GrupoDelInmueble[] =
    vista === 'inmueble' ? porInmueble.pageItems : porContrato.pageItems.map((f) => ({ clave: f.contractId, inmueble: f.inmueble ?? '', cuentas: f.cuentas ?? [], filas: [f] }));

  /*
   * Glow up (23-10): lo que pide trabajo va primero —lo que subieron para revisar, lo rechazado y a quién le
   * falta— y lo que está al día, al final; lo que no había empezado (29-10), después de todo. Mientras carga, sin
   * números.
   */
  const ORDEN: EstadoDelMes[] = ['POR_REVISAR', 'RECHAZADA', 'SIN_FACTURA', 'AL_DIA', 'SIN_INICIAR'];
  const cuantos = (clave: EstadoDelMes) =>
    clave === 'SIN_INICIAR' && typeof datos?.resumen.sinIniciar === 'number' ? datos.resumen.sinIniciar : filas.filter((f) => f.estadoDelMes === clave).length;
  const pestanas = [
    { valor: 'todos' as const, etiqueta: 'Todos', cuantos: cargando ? null : filas.length, fija: true },
    ...ORDEN.map((clave) => ({
      valor: clave,
      etiqueta: ESTADOS_DEL_MES.find((e) => e.clave === clave)?.rotulo ?? clave,
      cuantos: cargando ? null : cuantos(clave),
      tono: clave === 'POR_REVISAR' ? ('aviso' as const) : undefined,
      testid: `estado-${clave}`,
    })),
  ];
  const ajustes = datos?.resumen.ajustesPorRevisar ?? 0;
  const sinIniciar = cargando ? 0 : cuantos('SIN_INICIAR');
  const nombreDelMesSolo = nombreDelMes(mes).split(' de ')[0];

  const abrir = (f: FilaDelTablero) => setAbierta(f);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Operación"
        titulo="Servicios públicos"
        descripcion="Quién está al día con la factura del mes, qué subieron los inquilinos para revisar y las liquidaciones de entrada y de entrega."
        acciones={
          <Button size="sm" variant="outline" hideArrow onClick={() => setSimulando(true)} data-testid="simular-entrada">
            Simular una entrada
          </Button>
        }
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: servicios públicos" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Cada mes el inquilino sube la factura pagada desde su portal. Aquí la revisas: al aprobarla, el contrato
                queda al día; al rechazarla, le dices por qué y la vuelve a subir.
              </p>
              <p>
                El mes cuenta por el CORTE, el consumo que cobra la factura, no por el mes en que llega: el consumo del 15
                de agosto al 15 de septiembre es de septiembre aunque se facture en octubre. Si el contrato no había
                empezado, ese mes sale «Sin iniciar» y no se le pide factura.
              </p>
              <p>
                La factura cuyo corte cruza el inicio es de entrada: se parte por días entre el anterior y el inquilino que
                llega. Al entregar el inmueble, la liquidación de la entrega suma los meses pendientes (los que no han
                llegado, estimados con el promedio de las facturas anteriores) más los trámites, menos el saldo a favor, y
                se carga al contrato como anticipo de servicios públicos.
              </p>
              <p>
                Los acuerdos de pago, las revisiones periódicas y la mora de antes que trae una factura no son del
                inquilino: se le descuentan al propietario. Lo que Servi propone de cada factura se decide en la Bandeja
                del Piloto.
              </p>
            </div>
          </ParaEntenderMas>
        }
      />

      {error ? (
        <FalloDeCarga error={error} queEs="los servicios públicos" onReintentar={cargar} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          {datos && !datos.disponible && (
            <p className="border-b border-border bg-warning-soft px-4 py-3 text-caption text-fg md:px-5">
              Falta una actualización de la base: se ven los contratos, pero todavía no se pueden registrar facturas.
            </p>
          )}
          {datos?.recordatorio && (
            <MoriRecuerdaLaFactura
              configuracion={datos.recordatorio}
              puedeEditar={puedeEditar}
              onCambio={(c) => setDatos((d) => (d ? { ...d, recordatorio: c } : d))}
            />
          )}

          {/* El control de la tarea a la vista: el mes, por contrato o por inmueble, y el buscador. */}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between md:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="mes-de-servicios" className="sr-only">
                Mes del corte
              </label>
              <Select value={mes} onValueChange={(v) => enLaUrl('mes', v)}>
                <SelectTrigger id="mes-de-servicios" className="h-9 w-full sm:w-[200px]" data-testid="mes-de-servicios">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>
                      {m.rotulo.charAt(0).toUpperCase() + m.rotulo.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SegmentedControl<Vista>
                aria-label="Ver por contrato o por inmueble"
                size="sm"
                value={vista}
                onChange={(v) => enLaUrl('vista', v === 'inmueble' ? 'inmueble' : null)}
                options={[
                  { value: 'contrato', label: 'Por contrato' },
                  { value: 'inmueble', label: 'Por inmueble' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              {/* El ancho va en una caja: la clase de SearchInput le cae al campo, no a su envoltorio. */}
              <div className="w-full md:w-72">
                <SearchInput
                  value={busqueda}
                  onChange={(x) => setBusqueda(x.target.value)}
                  onClear={() => setBusqueda('')}
                  placeholder="Contrato, inquilino, cédula, inmueble o cuenta"
                  aria-label="Buscar contratos"
                  inputSize="md"
                  data-testid="buscar-servicios"
                />
              </div>
              <Select value={queTrae} onValueChange={(v) => setQueTrae(v as QueTrae)}>
                <SelectTrigger className="h-9 w-full md:w-56" aria-label="Qué trae la factura" data-testid="que-trae">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUE_TRAE.map((q) => (
                    <SelectItem key={q.valor} value={q.valor}>
                      {q.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SelectorDeOrden
                orden={orden}
                onCambiar={setOrden}
                className="w-full md:w-52"
                formas={[
                  { campo: 'estado', sentido: 'asc', etiqueta: 'Lo que pide revisión' },
                  { campo: 'contrato', sentido: 'asc', etiqueta: 'Contrato (A–Z)' },
                  { campo: 'inmueble', sentido: 'asc', etiqueta: 'Inmueble (A–Z)' },
                  { campo: 'inquilino', sentido: 'asc', etiqueta: 'Inquilino (A–Z)' },
                  { campo: 'factura', sentido: 'desc', etiqueta: 'Corte más reciente' },
                  { campo: 'valor', sentido: 'desc', etiqueta: 'Valor más alto' },
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
            <PestanasDeEstado<EstadoDelMes | 'todos'>
              etiqueta="Filtrar por el estado de la factura del corte"
              pestanas={pestanas}
              valor={estado}
              onCambio={setEstado}
            />
            <div className="flex shrink-0 flex-col gap-1 md:items-end">
              {ajustes > 0 && (
                <span className="inline-flex items-center gap-2 text-caption text-fg-muted" data-testid="ajustes-por-revisar">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                  <span>
                    <span className="font-mono tabular-nums text-fg">{ajustes}</span> {ajustes === 1 ? 'ajuste' : 'ajustes'} de EPM
                    por revisar
                  </span>
                </span>
              )}
              {sinIniciar > 0 && (
                <span className="text-caption text-fg-muted" data-testid="sin-iniciar">
                  {sinIniciar === 1 ? '1 contrato no había empezado' : `${sinIniciar} contratos no habían empezado`} en el corte de {nombreDelMesSolo}: no se
                  les pide factura.
                </span>
              )}
            </div>
          </div>

          <Presence
            show={hayFiltros && !cargando}
            initial={false}
            distance="xs"
            as="p"
            className="border-b border-border px-4 py-2 text-caption text-fg-muted md:px-5"
          >
            <span className="font-mono tabular-nums">
              {visibles.length} de {filas.length}
            </span>{' '}
            en {nombreDelMes(mes)}.{' '}
            <button type="button" onClick={limpiar} className="text-primary underline-offset-4 hover:underline">
              Quitar los filtros
            </button>
          </Presence>

          <CrossFade swapKey={cargando ? 'cargando' : visibles.length === 0 ? 'vacio' : `lista-${mes}-${vista}`} mode="popLayout" direction="none">
            {cargando ? (
              <div className="p-4 md:p-5" aria-busy="true">
                <EsqueletoTabla columnas={4} filas={6} />
              </div>
            ) : visibles.length === 0 ? (
              <SinDatos
                hayFiltros={hayFiltros}
                queSon="contratos"
                icono={Lightning}
                ilustracion="bombillo"
                titulo={`Ningún contrato vigente en ${nombreDelMes(mes)}`}
                descripcion="Aquí salen los contratos vigentes con la factura de servicios de cada corte. Prueba con otro mes."
                onLimpiarFiltros={hayFiltros ? limpiar : undefined}
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {vista === 'inmueble' ? (
                          <EncabezadoOrdenable campo="inmueble" orden={orden} onOrdenar={ordenarPor} className="px-5">Inmueble</EncabezadoOrdenable>
                        ) : (
                          <EncabezadoOrdenable campo="contrato" orden={orden} onOrdenar={ordenarPor} className="px-5">Contrato</EncabezadoOrdenable>
                        )}
                        <EncabezadoOrdenable campo="estado" orden={orden} onOrdenar={ordenarPor}>Corte de {nombreDelMesSolo}</EncabezadoOrdenable>
                        <EncabezadoOrdenable campo="factura" orden={orden} onOrdenar={ordenarPor}>Última factura</EncabezadoOrdenable>
                        <TableHead>Entrada</TableHead>
                        <TableHead className="pr-5 text-right">
                          <span className="sr-only">Acción</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gruposDeLaPagina.map((g) => {
                        const agrupado = vista === 'inmueble' && g.filas.length > 1;
                        return [
                          agrupado ? (
                            <TableRow key={`grupo-${g.clave}`} className="bg-surface-muted/60 hover:bg-surface-muted/60" data-testid={`inmueble-${g.clave}`}>
                              <TableCell colSpan={5} className="px-5 py-3">
                                <p className="text-fg">{g.inmueble}</p>
                                <CuentasDelInmueble cuentas={g.cuentas} contractId={`grupo-${g.clave}`} />
                                <p className="text-caption text-fg-muted">
                                  <span className="font-mono tabular-nums">{g.filas.length}</span> contratos en este inmueble
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : null,
                          ...g.filas.map((f) => (
                            <FilaDelContrato key={f.contractId} fila={f} vista={vista} agrupada={agrupado} onAbrir={abrir} />
                          )),
                        ];
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-border md:hidden">
                  {gruposDeLaPagina.map((g) => {
                    const agrupado = vista === 'inmueble' && g.filas.length > 1;
                    return (
                      <li key={g.clave}>
                        {agrupado && (
                          <div className="space-y-0.5 bg-surface-muted/60 px-4 py-3">
                            <p className="text-fg">{g.inmueble}</p>
                            <CuentasDelInmueble cuentas={g.cuentas} contractId={`grupo-movil-${g.clave}`} />
                          </div>
                        )}
                        <ul className="divide-y divide-border">
                          {g.filas.map((f) => (
                            <TarjetaDelContrato key={f.contractId} fila={f} vista={vista} agrupada={agrupado} onAbrir={abrir} />
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CrossFade>

          {pagina.shouldPaginate && !cargando && (
            <div className="border-t border-border px-4 py-3 md:px-5">
              <TablePagination
                total={pagina.total}
                page={pagina.page}
                pageSize={pagina.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={pagina.setPage}
                onPageSizeChange={pagina.setPageSize}
              />
            </div>
          )}
        </section>
      )}

      <CajonDelContrato fila={abierta} onCerrar={() => setAbierta(null)} onCambio={cargar} puedeEditar={puedeEditar} puedeCargar={puedeCargar} />

      {/* El simulador de la liquidación de entrada: sin factura, con los datos que la persona tiene en la mano. */}
      <Cajon abierto={simulando} onOpenChange={setSimulando} tamano="lg" data-testid="simulador-de-entrada">
        <CajonCabecera
          titulo="Simular una liquidación de entrada"
          descripcion="Escribe el corte, el valor y el día de la entrega: la factura se parte por días entre el anterior y el inquilino que llega. No se guarda nada."
        />
        <CajonCuerpo>{simulando && <LiquidacionDeEntrada />}</CajonCuerpo>
      </Cajon>
    </div>
  );
}

const estadoDe = (f: FilaDelTablero) => ESTADOS_DEL_MES.find((x) => x.clave === f.estadoDelMes) ?? ESTADOS_DEL_MES[0];

/** Lo que pide atención en la última factura: cómo cae, lo del propietario y Servi. Una línea cada uno, si hay. */
function SenalesDeLaFactura({ fila }: { fila: FilaDelTablero }) {
  const u = fila.ultimaFactura;
  if (!u) return null;
  const cae = comoCaeDe(u, fila.inicio);
  const delPropietario = conceptosDelPropietarioDe(u);
  const servi = estadoDeServi(u);
  const revision = servi ? revisionDeServiDe(u) : null;
  return (
    <>
      <ComoCaeLaFactura cae={cae} testid={`cae-${fila.contractId}`} />
      {delPropietario.length > 0 && (
        <p className="text-caption text-fg-muted" data-testid={`del-propietario-${fila.contractId}`}>
          Trae <span className="font-mono tabular-nums text-fg">{formatCurrency(totalDelPropietario(delPropietario))}</span> del propietario
        </p>
      )}
      {servi === 'POR_DECIDIR' && revision && (
        <p className="text-caption text-fg-muted" data-testid={`servi-${fila.contractId}`}>
          Servi {revision.veredicto === 'NO_CUADRA' ? 'dice que no cuadra' : revision.veredicto === 'CUADRA' ? 'dice que cuadra' : 'la revisó'}: se decide en la
          Bandeja del Piloto
        </p>
      )}
    </>
  );
}

/** El estado del mes, y si no había empezado, desde cuándo. */
function EstadoDelMesDeLaFila({ fila }: { fila: FilaDelTablero }) {
  const e = estadoDe(fila);
  return (
    <div className="space-y-1">
      <StatusBadge tone={e.tono}>{e.rotulo}</StatusBadge>
      {fila.estadoDelMes === 'SIN_INICIAR' && fila.inicio && (
        <p className="text-caption text-fg-muted">Empezó el {diaCorto(fila.inicio, true)}: no se le pide factura</p>
      )}
    </div>
  );
}

function BotonDeLaFila({ fila, onAbrir }: { fila: FilaDelTablero; onAbrir: (f: FilaDelTablero) => void }) {
  // Una sola chispa por pantalla: lo que pide revisión va en arena con su número; lo demás, callado.
  return (
    <Button
      size="sm"
      variant={fila.porRevisar > 0 ? 'outline' : 'ghost'}
      hideArrow
      onClick={(e) => {
        e.stopPropagation();
        onAbrir(fila);
      }}
      data-testid={`abrir-${fila.contractId}`}
    >
      {fila.porRevisar > 0 ? `Revisar (${fila.porRevisar})` : 'Ver facturas'}
    </Button>
  );
}

/** Quién es la fila: el contrato (vista por contrato) o el inmueble con su cuenta (vista por inmueble). */
function QuienEs({ fila, vista, agrupada }: { fila: FilaDelTablero; vista: Vista; agrupada: boolean }) {
  const recordado = fraseDeLosRecordatorios(fila.recordatorios);
  const contrato = (
    <>
      <span className="font-mono">{fila.contrato}</span> · {fila.inquilino ?? 'Sin inquilino'}
    </>
  );
  return (
    <div className="min-w-0">
      {vista === 'inmueble' && !agrupada ? (
        <>
          <p className="truncate text-fg">{fila.inmueble ?? 'Sin dirección'}</p>
          <p className="text-caption text-fg-muted">{contrato}</p>
          <CuentasDelInmueble cuentas={fila.cuentas} contractId={fila.contractId} />
        </>
      ) : (
        <>
          <p className="text-fg">{contrato}</p>
          {!agrupada && <p className="truncate text-caption text-fg-muted">{fila.inmueble}</p>}
          {!agrupada && <CuentasDelInmueble cuentas={fila.cuentas} contractId={fila.contractId} />}
        </>
      )}
      {recordado && (
        <p className="text-caption text-fg-muted" data-testid={`recordado-${fila.contractId}`}>
          {recordado}
        </p>
      )}
    </div>
  );
}

function FilaDelContrato({ fila: f, vista, agrupada, onAbrir }: { fila: FilaDelTablero; vista: Vista; agrupada: boolean; onAbrir: (f: FilaDelTablero) => void }) {
  return (
    <TableRow className="cursor-pointer" onClick={() => onAbrir(f)} data-testid={`servicios-${f.contractId}`}>
      <TableCell className={cn('max-w-[320px] py-4', agrupada ? 'pl-9 pr-5' : 'px-5')}>
        <QuienEs fila={f} vista={vista} agrupada={agrupada} />
      </TableCell>
      <TableCell className="py-4 align-top">
        <EstadoDelMesDeLaFila fila={f} />
      </TableCell>
      <TableCell className="max-w-[340px] space-y-0.5 py-4 align-top text-body-sm">
        {f.ultimaFactura ? (
          <>
            <p className="text-fg">
              {f.ultimaFactura.nombreDelServicio} · <span className="font-mono tabular-nums">{formatCurrency(f.ultimaFactura.valorCop)}</span>
            </p>
            <CorteDeLaFactura factura={f.ultimaFactura} />
            <SenalesDeLaFactura fila={f} />
          </>
        ) : (
          <span className="text-fg-muted">—</span>
        )}
      </TableCell>
      <TableCell className="py-4 align-top text-body-sm">
        {f.entradaRegistrada ? <span className="text-fg">Liquidada</span> : <span className="text-fg-muted">Sin registrar</span>}
      </TableCell>
      <TableCell className="py-4 pr-5 text-right align-top">
        <BotonDeLaFila fila={f} onAbrir={onAbrir} />
      </TableCell>
    </TableRow>
  );
}

function TarjetaDelContrato({ fila: f, vista, agrupada, onAbrir }: { fila: FilaDelTablero; vista: Vista; agrupada: boolean; onAbrir: (f: FilaDelTablero) => void }) {
  return (
    <li className={cn('space-y-2 py-4 pr-4', agrupada ? 'pl-7' : 'pl-4')} data-testid={`tarjeta-${f.contractId}`}>
      <div className="flex items-start justify-between gap-3">
        <QuienEs fila={f} vista={vista} agrupada={agrupada} />
        <div className="shrink-0">
          <StatusBadge tone={estadoDe(f).tono}>{estadoDe(f).rotulo}</StatusBadge>
        </div>
      </div>
      {f.estadoDelMes === 'SIN_INICIAR' && f.inicio && <p className="text-caption text-fg-muted">Empezó el {diaCorto(f.inicio, true)}: no se le pide factura</p>}
      {f.ultimaFactura && (
        <div className="space-y-0.5">
          <p className="text-caption text-fg-muted">
            Última: {f.ultimaFactura.nombreDelServicio} ·{' '}
            <span className="font-mono tabular-nums text-fg">{formatCurrency(f.ultimaFactura.valorCop)}</span>
          </p>
          <CorteDeLaFactura factura={f.ultimaFactura} />
          <SenalesDeLaFactura fila={f} />
        </div>
      )}
      <BotonDeLaFila fila={f} onAbrir={onAbrir} />
    </li>
  );
}

/**
 * La cuenta de servicios del inmueble (Nico 29-10-2026): «EPM · 13249728», y si lleva tiempo sin el servicio, cuánto
 * («12 meses sin servicio de EPM»). Viene de la columna opcional de la migración de contratos.
 */
function CuentasDelInmueble({ cuentas, contractId }: { cuentas?: CuentaDeServiciosDelInmueble[]; contractId: string }) {
  if (!cuentas || cuentas.length === 0) return null;
  return (
    <ul className="space-y-0.5" data-testid={`cuentas-${contractId}`}>
      {cuentas.map((c) => (
        <li key={`${c.empresa}-${c.numero}`} className="text-caption text-fg-muted">
          <span className="font-mono tabular-nums">
            {c.empresa} · {c.numero}
          </span>
          {c.cobertura ? (
            <span className={c.conCobertura === false ? 'text-warning' : undefined}> · {c.cobertura}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
