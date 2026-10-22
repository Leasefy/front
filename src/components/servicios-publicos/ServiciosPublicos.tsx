'use client';

/**
 * 🔴 Operación → Servicios públicos (reunión con Portofino, Nico 22-10-2026:
 * «necesito que creemos también dentro de operación la parte de servicios
 * públicos»).
 *
 * Por mes: quién subió la factura pagada (al día), qué falta revisar, a quién
 * le falta y los ajustes de EPM por aprobar. En el cajón de cada contrato se
 * aprueba o rechaza lo que subió el inquilino y se registra la factura de
 * entrada (partida por días), la de salida (con la garantía) o un ajuste.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Lightning, MagnifyingGlass } from '@phosphor-icons/react';
import { Chip, CrossFade, Eyebrow, Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatCurrency } from '@/lib/format';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { camposDelError } from '@/lib/errores/traductor-de-errores';
import { fechaCorta } from '@/components/contratos/BandejaDeCartasDelIncremento';
import { mesesParaElegir, nombreDelMes } from '@/lib/contratos/incrementos-del-periodo';
import { FormularioDeFactura, type ErroresDeLaFactura } from '@/components/servicios-publicos/FormularioDeFactura';
import { MoriRecuerdaLaFactura, fraseDeLosRecordatorios } from '@/components/servicios-publicos/MoriRecuerdaLaFactura';
import {
  serviciosPublicosApi,
  type EstadoDelMes,
  type FacturaDeServicio,
  type FacturaQueSeRegistra,
  type FilaDelTablero,
  type ServiciosDelContrato,
  type TableroDeServicios,
} from '@/lib/api/servicios-publicos.service';

const ESTADOS_DEL_MES: ReadonlyArray<{ clave: EstadoDelMes; rotulo: string; tono: 'success' | 'warning' | 'critical' | 'neutral' }> = [
  { clave: 'SIN_FACTURA', rotulo: 'Sin factura', tono: 'neutral' },
  { clave: 'POR_REVISAR', rotulo: 'Por revisar', tono: 'warning' },
  { clave: 'AL_DIA', rotulo: 'Al día', tono: 'success' },
  { clave: 'RECHAZADA', rotulo: 'Rechazada', tono: 'critical' },
];

const ESTADO_DE_LA_FACTURA: Record<FacturaDeServicio['estado'], { rotulo: string; tono: 'success' | 'warning' | 'critical' | 'neutral' | 'info' }> = {
  POR_REVISAR: { rotulo: 'Por revisar', tono: 'warning' },
  AL_DIA: { rotulo: 'Al día', tono: 'success' },
  PENDIENTE: { rotulo: 'Por pagar con la garantía', tono: 'info' },
  LIQUIDADA: { rotulo: 'Aplicada', tono: 'success' },
  RECHAZADA: { rotulo: 'Rechazada', tono: 'critical' },
};

const TIPO: Record<FacturaDeServicio['tipo'], string> = {
  MENSUAL: 'Del mes',
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
};

function mesDeHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** El cajón de un contrato: sus facturas, revisarlas y registrar una. */
function FacturasDelContrato({
  fila,
  onCerrar,
  onCambio,
  puedeEditar,
}: {
  fila: FilaDelTablero | null;
  onCerrar: () => void;
  onCambio: () => void;
  puedeEditar: boolean;
}) {
  const [datos, setDatos] = useState<ServiciosDelContrato | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [nueva, setNueva] = useState<FacturaQueSeRegistra | null>(null);
  const [errores, setErrores] = useState<ErroresDeLaFactura>({});
  const [guardando, setGuardando] = useState(false);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [registrando, setRegistrando] = useState(false);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(async () => {
    if (!fila) return;
    setError(null);
    try {
      setDatos(await serviciosPublicosApi.delContrato(fila.contractId));
    } catch (e) {
      setError(e);
    }
  }, [fila]);

  useEffect(() => {
    setDatos(null);
    setRegistrando(false);
    setRechazando(null);
    void cargar();
  }, [cargar]);

  const despues = async (hacer: () => Promise<unknown>, exito: string) => {
    setGuardando(true);
    try {
      await hacer();
      toast.success(exito);
      await cargar();
      onCambio();
      return true;
    } catch (e) {
      toast.error('No se pudo', { description: mensajeParaLaPersona(e, { accion: 'guardar la factura' }) });
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const verSoporte = async (f: FacturaDeServicio) => {
    try {
      const { url } = await serviciosPublicosApi.soporte(f.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('No pudimos abrir el soporte', { description: mensajeParaLaPersona(e) });
    }
  };

  const registrar = async () => {
    if (!fila || !nueva) return;
    setErrores({});
    setGuardando(true);
    try {
      await serviciosPublicosApi.registrar(fila.contractId, nueva);
      toast.success(
        nueva.tipo === 'ENTRADA'
          ? 'Registramos la factura de entrada y repartimos los días.'
          : nueva.tipo === 'SALIDA'
            ? 'Registramos la factura de salida.'
            : 'Registramos la factura.',
      );
      setRegistrando(false);
      setVersion((v) => v + 1);
      await cargar();
      onCambio();
    } catch (e) {
      const campos = camposDelError(e);
      if (campos.length > 0) setErrores(Object.fromEntries(campos.map((c) => [c.campo, c.mensaje])));
      else toast.error('No se pudo registrar', { description: mensajeParaLaPersona(e, { accion: 'registrar la factura' }) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={!!fila} onOpenChange={(v) => !v && onCerrar()} tamano="xl" data-testid="facturas-del-contrato">
      <CajonCabecera
        titulo={fila ? `${fila.contrato ?? 'Contrato'} · ${fila.inquilino ?? 'Sin inquilino'}` : ''}
        descripcion={fila?.inmueble ?? undefined}
      />
      <CajonCuerpo className="space-y-6">
        {error ? (
          <FalloDeCarga error={error} queEs="las facturas del contrato" onReintentar={cargar} />
        ) : !datos ? (
          <EsqueletoTabla columnas={3} filas={3} />
        ) : (
          <>
            {!datos.disponible && (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-fg">
                Falta una actualización de la base: todavía no se pueden registrar facturas.
              </p>
            )}
            {datos.garantia && (
              <p className="text-sm text-fg-muted" data-testid="saldo-de-la-garantia">
                Garantía de servicios: queda {formatCurrency(datos.garantia.saldoCop)} del inquilino.
              </p>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-fg">Facturas</h3>
              {datos.facturas.length === 0 ? (
                <p className="text-sm text-fg-muted">Este contrato todavía no tiene facturas de servicios.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {datos.facturas.map((f) => (
                    <li key={f.id} className="space-y-2 p-3 text-sm" data-testid={`factura-${f.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-fg">
                            {f.nombreDelServicio} · {TIPO[f.tipo]}
                            {f.empresa ? ` · ${f.empresa}` : ''}
                          </p>
                          <p className="text-xs text-fg-muted">
                            Del {fechaCorta(f.periodoDesde)} al {fechaCorta(f.periodoHasta)} · {formatCurrency(f.valorCop)} ·{' '}
                            {f.subidaPor === 'INQUILINO' ? 'la subió el inquilino' : 'la registró la inmobiliaria'}
                          </p>
                        </div>
                        <StatusBadge tone={ESTADO_DE_LA_FACTURA[f.estado].tono}>{ESTADO_DE_LA_FACTURA[f.estado].rotulo}</StatusBadge>
                      </div>
                      {typeof f.liquidacion?.frase === 'string' && <p className="text-xs text-fg-muted">{f.liquidacion.frase}</p>}
                      {f.motivoDeLaRevision && <p className="text-xs text-danger">Motivo: {f.motivoDeLaRevision}</p>}
                      <div className="flex flex-wrap gap-2">
                        {f.tieneSoporte && (
                          <Button size="sm" variant="ghost" hideArrow onClick={() => void verSoporte(f)}>
                            Ver la factura
                          </Button>
                        )}
                        {puedeEditar && f.estado === 'POR_REVISAR' && (
                          <>
                            <Button
                              size="sm"
                              hideArrow
                              disabled={guardando}
                              onClick={() =>
                                void despues(
                                  () => serviciosPublicosApi.aprobar(f.id),
                                  f.tipo === 'AJUSTE' ? 'Aprobamos el ajuste: queda a favor del inquilino.' : 'La factura quedó al día.',
                                )
                              }
                              data-testid={`aprobar-${f.id}`}
                            >
                              Aprobar
                            </Button>
                            <Button size="sm" variant="outline" hideArrow onClick={() => setRechazando(f.id)} data-testid={`rechazar-${f.id}`}>
                              Rechazar
                            </Button>
                          </>
                        )}
                        {puedeEditar && f.estado === 'PENDIENTE' && f.tipo === 'SALIDA' && (
                          <Button
                            size="sm"
                            hideArrow
                            disabled={guardando}
                            onClick={() =>
                              void despues(() => serviciosPublicosApi.pagarConLaGarantia(f.id), 'Pagamos la parte del inquilino con su garantía.')
                            }
                          >
                            Pagar con la garantía
                          </Button>
                        )}
                      </div>
                      <Presence show={rechazando === f.id} distance="xs">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Por qué se rechaza (lo ve el inquilino)"
                            value={motivo}
                            maxLength={500}
                            onChange={(x) => setMotivo(x.target.value)}
                            aria-label="Motivo del rechazo"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            hideArrow
                            disabled={motivo.trim().length < 5 || guardando}
                            onClick={async () => {
                              if (await despues(() => serviciosPublicosApi.rechazar(f.id, motivo.trim()), 'Rechazamos la factura y le avisamos al inquilino.')) {
                                setRechazando(null);
                                setMotivo('');
                              }
                            }}
                          >
                            Rechazar la factura
                          </Button>
                        </div>
                      </Presence>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {puedeEditar && datos.disponible && (
              <section className="space-y-3">
                {registrando ? (
                  <FormularioDeFactura
                    key={version}
                    modo="inmobiliaria"
                    entrega={datos.entrega}
                    devolucion={datos.devolucion}
                    errores={errores}
                    revisarEntrada={(d) => serviciosPublicosApi.revisarEntrada(datos.contractId, d)}
                    onCambio={setNueva}
                  />
                ) : (
                  <Button variant="outline" hideArrow onClick={() => setRegistrando(true)} data-testid="registrar-factura">
                    Registrar una factura
                  </Button>
                )}
              </section>
            )}
          </>
        )}
      </CajonCuerpo>
      {registrando && (
        <CajonPie>
          <Button variant="ghost" hideArrow onClick={() => setRegistrando(false)}>
            Cancelar
          </Button>
          <Button hideArrow disabled={!nueva || guardando} isLoading={guardando} onClick={() => void registrar()} data-testid="guardar-factura">
            Guardar la factura
          </Button>
        </CajonPie>
      )}
    </Cajon>
  );
}

export function ServiciosPublicos() {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('operaciones', 'edit');
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const hoy = useMemo(() => new Date(), []);
  const meses = useMemo(() => mesesParaElegir(hoy), [hoy]);
  const mesUrl = params?.get('mes');
  const mes = mesUrl && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesUrl) ? mesUrl : mesDeHoy();

  const [datos, setDatos] = useState<TableroDeServicios | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [estado, setEstado] = useState<EstadoDelMes | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState<FilaDelTablero | null>(null);

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

  const elegirMes = (valor: string) => {
    const siguiente = new URLSearchParams(params?.toString() ?? '');
    siguiente.set('mes', valor);
    router.replace(`${ruta}?${siguiente.toString()}`, { scroll: false });
  };

  const filas = useMemo(() => (datos?.mes === mes ? datos.contratos : []), [datos, mes]);
  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    return filas.filter(
      (f) =>
        (estado === 'todos' || f.estadoDelMes === estado) &&
        (q === '' || normalizar([f.contrato, f.inquilino, f.documentoDelInquilino, f.inmueble].filter(Boolean).join(' ')).includes(q)),
    );
  }, [filas, estado, busqueda]);
  const cargando = !error && datos?.mes !== mes;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="space-y-1">
        <Eyebrow>Operación</Eyebrow>
        <h1 className="flex items-center gap-2 text-h2 text-fg">
          <Lightning className="h-6 w-6 text-primary" weight="duotone" aria-hidden="true" />
          Servicios públicos
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">
          Quién está al día con sus facturas, qué subieron los inquilinos para revisar y los ajustes de la empresa de servicios.
          La primera factura se parte por días y la última se paga con la garantía.
        </p>
      </header>

      {error ? (
        <FalloDeCarga error={error} queEs="los servicios públicos" onReintentar={cargar} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          {datos && !datos.disponible && (
            <p className="border-b border-border bg-warning-soft px-4 py-3 text-xs text-fg md:px-5">
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
          <div className="space-y-3 border-b border-border px-4 py-3 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="mes-de-servicios" className="shrink-0 text-sm text-fg-muted">
                  Mes
                </label>
                <Select value={mes} onValueChange={elegirMes}>
                  <SelectTrigger id="mes-de-servicios" className="w-[200px]" data-testid="mes-de-servicios">
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
              </div>
              <div className="relative w-full md:max-w-xs">
                <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                <Input
                  className="pl-9"
                  placeholder="Contrato, inquilino, cédula o inmueble"
                  aria-label="Buscar contratos"
                  value={busqueda}
                  onChange={(x) => setBusqueda(x.target.value)}
                  data-testid="buscar-servicios"
                />
              </div>
            </div>
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <div className="flex w-max items-center gap-2 md:w-auto md:flex-wrap">
                <Chip selected={estado === 'todos'} onClick={() => setEstado('todos')}>
                  Todos <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">{filas.length}</span>
                </Chip>
                {ESTADOS_DEL_MES.map((e) => (
                  <Chip key={e.clave} selected={estado === e.clave} onClick={() => setEstado(e.clave)} data-testid={`estado-${e.clave}`}>
                    {e.rotulo}{' '}
                    <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                      {filas.filter((f) => f.estadoDelMes === e.clave).length}
                    </span>
                  </Chip>
                ))}
                {(datos?.resumen.ajustesPorRevisar ?? 0) > 0 && (
                  <span className="text-xs text-warning-700 dark:text-warning-100" data-testid="ajustes-por-revisar">
                    {datos?.resumen.ajustesPorRevisar} {datos?.resumen.ajustesPorRevisar === 1 ? 'ajuste' : 'ajustes'} de EPM por revisar
                  </span>
                )}
              </div>
            </div>
          </div>

          <CrossFade swapKey={cargando ? 'cargando' : visibles.length === 0 ? 'vacio' : `lista-${mes}`} mode="popLayout" direction="none">
            {cargando ? (
              <div className="p-4 md:p-5">
                <EsqueletoTabla columnas={4} filas={6} />
              </div>
            ) : visibles.length === 0 ? (
              <SinDatos
                hayFiltros={estado !== 'todos' || busqueda.trim() !== ''}
                queSon="contratos"
                icono={Lightning}
                titulo="Ningún contrato en esta vista"
                descripcion={`Prueba con otro estado o con otro mes que no sea ${nombreDelMes(mes)}.`}
                onLimpiarFiltros={() => {
                  setEstado('todos');
                  setBusqueda('');
                }}
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">Contrato</TableHead>
                        <TableHead>En {nombreDelMes(mes).split(' de ')[0]}</TableHead>
                        <TableHead>Última factura</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead className="pr-5 text-right">
                          <span className="sr-only">Acción</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibles.map((f) => {
                        const e = ESTADOS_DEL_MES.find((x) => x.clave === f.estadoDelMes)!;
                        return (
                          <TableRow key={f.contractId} data-testid={`servicios-${f.contractId}`}>
                            <TableCell className="max-w-[320px] px-5 py-4">
                              <p className="font-medium text-fg">
                                {f.contrato} · {f.inquilino ?? 'Sin inquilino'}
                              </p>
                              <p className="truncate text-xs text-fg-muted">{f.inmueble}</p>
                              {fraseDeLosRecordatorios(f.recordatorios) && (
                                <p className="text-xs text-fg-muted" data-testid={`recordado-${f.contractId}`}>
                                  {fraseDeLosRecordatorios(f.recordatorios)}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <StatusBadge tone={e.tono}>{e.rotulo}</StatusBadge>
                            </TableCell>
                            <TableCell className="py-4 text-sm">
                              {f.ultimaFactura ? (
                                <>
                                  <p className="text-fg">
                                    {f.ultimaFactura.nombreDelServicio} · {formatCurrency(f.ultimaFactura.valorCop)}
                                  </p>
                                  <p className="text-xs text-fg-muted">Hasta el {fechaCorta(f.ultimaFactura.periodoHasta)}</p>
                                </>
                              ) : (
                                <span className="text-fg-muted">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 text-xs">
                              {f.entradaRegistrada ? <span className="text-fg">Liquidada</span> : <span className="text-fg-muted">Sin registrar</span>}
                            </TableCell>
                            <TableCell className="py-4 pr-5 text-right">
                              <Button size="sm" variant={f.porRevisar > 0 ? 'default' : 'outline'} hideArrow onClick={() => setAbierta(f)} data-testid={`abrir-${f.contractId}`}>
                                {f.porRevisar > 0 ? `Revisar (${f.porRevisar})` : 'Ver facturas'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <ul className="divide-y divide-border md:hidden">
                  {visibles.map((f) => {
                    const e = ESTADOS_DEL_MES.find((x) => x.clave === f.estadoDelMes)!;
                    return (
                      <li key={f.contractId} className="space-y-2 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-fg">
                              {f.contrato} · {f.inquilino ?? 'Sin inquilino'}
                            </p>
                            <p className="truncate text-xs text-fg-muted">{f.inmueble}</p>
                            {fraseDeLosRecordatorios(f.recordatorios) && (
                              <p className="text-xs text-fg-muted" data-testid={`recordado-${f.contractId}`}>
                                {fraseDeLosRecordatorios(f.recordatorios)}
                              </p>
                            )}
                          </div>
                          <StatusBadge tone={e.tono}>{e.rotulo}</StatusBadge>
                        </div>
                        {f.ultimaFactura && (
                          <p className="text-xs text-fg-muted">
                            Última: {f.ultimaFactura.nombreDelServicio} · {formatCurrency(f.ultimaFactura.valorCop)} · hasta el{' '}
                            {fechaCorta(f.ultimaFactura.periodoHasta)}
                          </p>
                        )}
                        <Button size="sm" variant={f.porRevisar > 0 ? 'default' : 'outline'} hideArrow onClick={() => setAbierta(f)}>
                          {f.porRevisar > 0 ? `Revisar (${f.porRevisar})` : 'Ver facturas'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </CrossFade>
        </section>
      )}

      <FacturasDelContrato fila={abierta} onCerrar={() => setAbierta(null)} onCambio={cargar} puedeEditar={puedeEditar} />
    </div>
  );
}
