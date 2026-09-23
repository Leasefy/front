'use client';

/**
 * El mapeo contable: qué cuenta del PUC usa cada asiento automático.
 *
 * Cada fila se guarda sola al elegir la cuenta (un PUT por fila): el contador
 * ajusta una y sigue; no hay un «guardar todo» que se pueda olvidar. La
 * escritura la decide el back (ADMIN o CONTADOR) y el 403 se muestra en
 * palabras, igual que en el resto de la contabilidad.
 *
 * ── Dos partes, no una tabla larga (contrato del 18-09, §1 y §2) ────────────
 *
 * «Asientos automáticos» son los movimientos que el sistema ya asienta solo
 * —recaudos, giros— y, debajo, los siete EVENTOS DE GASTO que hacen falta para
 * causar una factura de proveedor. Los de gasto van en su propio bloque con su
 * propio estado: el mapeo de recaudo puede estar completo mientras el de gasto
 * está vacío, y mezclarlos haría que un paso 5 ya hecho pareciera incompleto de
 * un día para otro (ver el encabezado de `EventosDeGasto.tsx`).
 *
 * «Rubros del P&G» es otra cosa: no dice cómo se asienta algo, dice cómo se LEE
 * el libro para comparar contra el presupuesto. Va en una pestaña aparte porque
 * el trabajo es distinto, se hace una vez y lo hace el contador — y porque
 * `onEstado` (de lo que depende el pie del paso 5) sigue siendo sólo de los
 * eventos de recaudo: un rubro sin mapear no impide asentar nada.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { CheckCircle, Sparkle, Warning } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type AsientosFaltantes,
  type EventoContable,
  type MapeoContable as Mapeo,
} from '@/lib/api/contabilidad.service';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';
import { usePuedeEscribir } from '../use-puede-escribir';
import { EventosDeGasto } from './EventosDeGasto';
import { RubrosDelPyg } from './RubrosDelPyg';
import { NOMBRE_DEL_LADO, eventosSembrables, eventosSinCuenta, loQueNoSeAsienta } from './mapeo';

/** Cómo va el mapeo, para quien lo tiene adentro. Ver `onEstado`. */
export interface EstadoDelMapeo {
  completo: boolean;
  /** Eventos sin cuenta: lo que falta para que el paso 5 quede hecho. */
  faltan: number;
  /** Cuántos eventos hay en total, para poder decir «6 de 9». */
  total: number;
}

/** Las dos partes de la pantalla, tal como viajan en `?parte=`. */
export type ParteDelMapeo = 'asientos' | 'rubros';

export const PARTES_DEL_MAPEO: readonly ParteDelMapeo[] = ['asientos', 'rubros'];

/**
 * `?parte=rubros` abre esa pestaña. Lo usa la alerta de la portada («N rubros
 * del P&G sin cuenta»): mandar a «Mapeo» a secas obligaría a buscar la pestaña.
 *
 * Un valor que no está en la lista cae a `asientos`, que es el default: un
 * `value` que el `Tabs` de Radix no conoce deja la pantalla sin ningún panel
 * montado, o sea en blanco.
 */
export function parteDe(valor: string | null | undefined): ParteDelMapeo {
  return PARTES_DEL_MAPEO.find((p) => p === valor) ?? 'asientos';
}

export function MapeoContable({
  inicial = 'asientos',
  onEstado,
}: {
  /** Qué pestaña abrir. Viene de `?parte=` por `parteDe()`. */
  inicial?: ParteDelMapeo;
  /**
   * 🔴 Se avisa hacia afuera porque el PASO depende de esto, no sólo la tabla.
   *
   * El muro da el paso 5 por hecho cuando hay cuentas Y cada asiento
   * automático tiene la suya. El bloque de «Continuar al paso 6» miraba sólo
   * lo primero, así que con 2.790 cuentas y 6 eventos sin asignar ofrecía
   * seguir — y el paso 6 contestaba «primero termina Cuentas del PUC». Nico,
   * 2026-09-12: «le di continuar al paso 6 y no pasa al paso 6, se queda ahí».
   */
  onEstado?: (estado: EstadoDelMapeo) => void;
} = {}) {
  const [parte, setParte] = useState<ParteDelMapeo>(inicial);
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState<ReadonlySet<EventoContable>>(new Set());
  const [sembrando, setSembrando] = useState(false);
  /*
   * Lo que pasó sin asiento por falta de mapeo (2026-09-02). Antes esto era
   * un `warn` en el log del back y la pantalla decía «se asienta a mano»;
   * ahora se cuenta y se reprocesa con un botón. `null` = no se pudo leer:
   * la tabla de mapeo sigue sirviendo igual.
   */
  const [faltantes, setFaltantes] = useState<AsientosFaltantes | null>(null);
  const [reprocesando, setReprocesando] = useState(false);
  const { cuentas, cargando: cuentasCargando } = useCuentas();
  const escritura = usePuedeEscribir();

  const cargarFaltantes = useCallback(async () => {
    try {
      setFaltantes(await contabilidadApi.asientos.faltantes());
    } catch {
      setFaltantes(null);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMapeo(await contabilidadApi.mapeo.obtener());
      void cargarFaltantes();
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [cargarFaltantes]);

  const reprocesar = async () => {
    setReprocesando(true);
    try {
      const r = await contabilidadApi.asientos.reprocesar();
      if (r.asentados > 0) {
        toast.success(`${r.asentados} asiento${r.asentados === 1 ? '' : 's'} generado${r.asentados === 1 ? '' : 's'}.`);
      }
      if (r.sinResolver > 0) {
        toast.warning(
          `${r.sinResolver} sigue${r.sinResolver === 1 ? '' : 'n'} sin asiento${r.motivos[0] ? `: ${r.motivos[0]}` : '.'}`,
        );
      }
      if (r.asentados === 0 && r.sinResolver === 0) toast.success('No había nada pendiente de asentar.');
      await cargarFaltantes();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo reprocesar.'));
    } finally {
      setReprocesando(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sembrables = useMemo(() => (mapeo ? eventosSembrables(mapeo) : []), [mapeo]);
  const apagados = useMemo(() => (mapeo ? loQueNoSeAsienta(mapeo.faltantes) : []), [mapeo]);
  const sinCuenta = useMemo(() => (mapeo ? eventosSinCuenta(mapeo) : []), [mapeo]);

  // Cada vez que el mapeo cambia —al cargar, al guardar una fila, al sembrar—
  // el de afuera se entera. Sin esto, el bloque de «Continuar» de la pantalla
  // del PUC sólo se enteraría al recargar.
  useEffect(() => {
    if (!mapeo) return;
    onEstado?.({
      completo: mapeo.completo,
      faltan: sinCuenta.length,
      total: mapeo.eventos.length,
    });
  }, [mapeo, sinCuenta, onEstado]);

  // Los eventos son pocos y fijos, pero el pie va igual: dice cuántos son y
  // deja elegir cuántos ver, que es lo que hace que una tabla se lea como
  // tabla. El hook se llama SIEMPRE —antes de los returns tempranos de carga
  // y de fallo— porque un hook condicional rompe el orden entre renders.
  const eventos = useMemo(() => mapeo?.eventos ?? [], [mapeo]);
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(eventos);

  const marcar = (evento: EventoContable, activo: boolean) =>
    setGuardando((prev) => {
      const next = new Set(prev);
      if (activo) next.add(evento);
      else next.delete(evento);
      return next;
    });

  const asignar = async (evento: EventoContable, cuentaId: string, nombre: string) => {
    if (!cuentaId) return;
    marcar(evento, true);
    try {
      setMapeo(await contabilidadApi.mapeo.guardar([{ evento, cuentaId }]));
      toast.success(`«${nombre}» quedó en la cuenta elegida.`);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar la cuenta.'));
    } finally {
      marcar(evento, false);
    }
  };

  /**
   * 🔴 Los de gasto van por SU ruta (`PUT /mapeo/gastos`). No viven en el enum
   * `EventoContable` sino en una tabla con CHECK —agregar un valor a un enum de
   * Postgres es irreversible—, así que mandarlos por `PUT /mapeo` es 400
   * `EVENTO_DESCONOCIDO`. Y como la respuesta es OTRA forma (`MapeoDeGastos`,
   * sólo los siete), se pega dentro del mapeo que ya está en pantalla en vez de
   * reemplazarlo: reemplazarlo borraría los diez del recaudo de la tabla de
   * arriba.
   */
  const asignarGasto = async (evento: EventoContable, cuentaId: string, nombre: string) => {
    if (!cuentaId) return;
    marcar(evento, true);
    try {
      const gastos = await contabilidadApi.mapeo.guardarGastos([{ evento, cuentaId }]);
      setMapeo((previo) =>
        previo
          ? {
              ...previo,
              eventosDeGasto: gastos.eventos,
              completoGastos: gastos.completo,
              faltantesGastos: gastos.faltantes,
              hayEventosDeGasto: gastos.disponible,
              motivoDeLosGastos: gastos.motivo,
            }
          : previo,
      );
      toast.success(`«${nombre}» quedó en la cuenta elegida.`);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar la cuenta del gasto.'));
    } finally {
      marcar(evento, false);
    }
  };

  const sembrar = async () => {
    setSembrando(true);
    try {
      const r = await contabilidadApi.mapeo.sembrar();
      setMapeo(r.mapeo);
      if (r.asignados.length > 0) {
        toast.success(
          `${r.asignados.length} evento${r.asignados.length === 1 ? '' : 's'} con la cuenta propuesta.`,
        );
      }
      if (r.sinCuenta.length > 0) {
        toast.warning(
          `Sin cuenta propuesta para ${r.sinCuenta.length}: el PUC no tiene ${r.sinCuenta
            .map((s) => s.codigo)
            .join(', ')}.`,
        );
      }
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudieron asignar las cuentas propuestas.'));
    } finally {
      setSembrando(false);
    }
  };

  if (cargando || cuentasCargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando el mapeo…</p>
      </div>
    );
  }
  if (error || !mapeo) {
    return <FalloDeCarga error={error} queEs="el mapeo contable" onReintentar={cargar} />;
  }

  /*
   * La tabla de siempre, en una variable y no en su propio componente: usa siete
   * piezas del estado de acá (mapeo, sembrables, apagados, paginación,
   * guardando…) y extraerla significaría pasar siete props o partir el estado en
   * dos. La pestaña de rubros SÍ es un componente aparte porque no comparte nada
   * — tiene su propia consulta.
   */
  const cuerpoDeAsientos = (
    <div className="space-y-5" data-testid="mapeo-contable">
      {mapeo.completo ? (
        <Banner variant="success" title="Todos los eventos tienen cuenta">
          Los cobros se causan al emitirse, y los recibos de caja, sus anulaciones y los lotes
          pagados se asientan solos.
        </Banner>
      ) : (
        <Banner
          variant="warning"
          title={
            /* 🔴 «Hay que dar feedback porque no se entiende nada» (Nico,
               2026-09-12). El título decía la consecuencia y nunca el trabajo:
               cuántas faltan, de cuántas, y que de eso depende seguir. */
            `Faltan ${sinCuenta.length} de ${mapeo.eventos.length}: sin cuenta, ese asiento no se genera`
          }
        >
          <div className="space-y-3">
            <p data-testid="mapeo-que-hacer">
              Elige una cuenta en cada fila que diga «Sin cuenta». Mientras
              quede una sin asignar, el paso no queda hecho y los registros
              contables siguen en espera.
            </p>
            {apagados.length > 0 && (
              <p>
                Hoy quedan sin asiento automático: {apagados.join('; ')}. Lo que se quede sin
                asentar se recupera con «Reprocesar» cuando el mapeo esté completo.
              </p>
            )}
            {sembrables.length > 0 && (
              <div className="space-y-1">
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => void sembrar()}
                  disabled={sembrando || !escritura.puede}
                  title={escritura.motivo ?? undefined}
                  data-testid="usar-propuestas"
                >
                  <Sparkle className="h-4 w-4" aria-hidden="true" />
                  {sembrando
                    ? 'Asignando…'
                    : `Usar las cuentas propuestas (${sembrables.length})`}
                </Button>
                {/* El 403 del back, dicho antes del clic y con las mismas
                    palabras que después (`mensajeDeContabilidad`). */}
                {!escritura.puede && escritura.motivo ? (
                  <p className="text-caption text-fg-muted" data-testid="sin-escritura-mapeo">
                    {escritura.motivo}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </Banner>
      )}

      {faltantes && faltantes.total > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
          data-testid="asientos-faltantes"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-fg">
              {faltantes.total === 1 ? '1 movimiento sin asiento' : `${faltantes.total} movimientos sin asiento`}
            </p>
            <p className="text-caption text-fg-muted">
              {[
                faltantes.cobros > 0 ? `${faltantes.cobros} cobro${faltantes.cobros === 1 ? '' : 's'} sin causar` : null,
                faltantes.recibos > 0 ? `${faltantes.recibos} recibo${faltantes.recibos === 1 ? '' : 's'} de caja` : null,
                faltantes.lotes > 0 ? `${faltantes.lotes} lote${faltantes.lotes === 1 ? '' : 's'} de giros` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              {faltantes.mapeoCompleto
                ? '. Con el mapeo completo, se asientan con la fecha de su documento.'
                : '. Completa el mapeo y reprocesa.'}
            </p>
          </div>
          <Button
            size="sm"
            hideArrow
            onClick={() => void reprocesar()}
            disabled={reprocesando || !escritura.puede}
            title={escritura.motivo ?? undefined}
            data-testid="reprocesar-asientos"
          >
            {reprocesando ? 'Reprocesando…' : 'Reprocesar'}
          </Button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Lado</TableHead>
              <TableHead className="min-w-[280px]">Cuenta del PUC</TableHead>
              <TableHead>Propuesta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((e) => (
              <TableRow key={e.evento} data-testid={`evento-${e.evento}`}>
                <TableCell className="max-w-[320px]">
                  {/* La explicación en UNA línea, con el texto entero en el
                      `title`: nueve filas de tres renglones eran media
                      pantalla de párrafos (Nico, 2026-09-03). */}
                  <p className="font-medium text-fg">
                    {e.nombre}
                    {e.opcional && (
                      <span className="ml-2 text-caption font-normal text-fg-muted" data-testid={`evento-opcional-${e.evento}`}>
                        Opcional
                      </span>
                    )}
                  </p>
                  <p className="truncate text-caption text-fg-muted" title={e.explicacion}>
                    {e.explicacion}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={e.lado === 'DEBE' ? 'secondary' : 'outline'}>{NOMBRE_DEL_LADO[e.lado]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SelectorDeCuenta
                      cuentas={cuentas}
                      value={e.cuenta?.id ?? ''}
                      onChange={(cuentaId) => void asignar(e.evento, cuentaId, e.nombre)}
                      soloImputables
                      disabled={guardando.has(e.evento) || !escritura.puede}
                      placeholder="Sin cuenta: este asiento no se genera"
                      className="w-full"
                    />
                    {/* El estado de la fila se dice SIEMPRE, no sólo cuando
                        está bien: nueve filas donde el único indicio de lo que
                        falta era la ausencia de un check verde se leían como
                        nueve filas iguales. */}
                    {e.cuenta ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-success" aria-label="Con cuenta" />
                    ) : (
                      <Warning
                        className="h-4 w-4 shrink-0 text-warning"
                        aria-label="Falta la cuenta"
                        data-testid={`falta-${e.evento}`}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {e.propuesta ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-caption text-fg-muted">
                        {e.propuesta.codigo} · {e.propuesta.nombre}
                      </span>
                      {!e.cuenta && e.propuesta.activa && e.propuesta.imputable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          hideArrow
                          onClick={() => void asignar(e.evento, e.propuesta!.id, e.nombre)}
                          disabled={guardando.has(e.evento) || !escritura.puede}
                          title={escritura.motivo ?? undefined}
                        >
                          Usar
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="font-mono text-caption text-fg-subtle" title="Créala en el plan de cuentas con ese código, o elige otra">
                      {e.codigoPropuesto} no está en el PUC
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {shouldPaginate ? (
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
        ) : null}
      </section>
    </div>
  );

  return (
    <Tabs value={parte} onValueChange={(v) => setParte(v as ParteDelMapeo)}>
      <TabsList variant="underline" className="justify-start">
        <TabsTrigger value="asientos" data-testid="parte-asientos">
          Asientos automáticos
        </TabsTrigger>
        <TabsTrigger value="rubros" data-testid="parte-rubros">
          Rubros del P&G
        </TabsTrigger>
      </TabsList>

      <TabsContent value="asientos" className="pt-5">
        {parte === 'asientos' ? (
          <div className="space-y-8">
            {cuerpoDeAsientos}
            {/* Los siete del §2, con su propio estado: el de recaudo puede estar
                completo mientras éste está vacío. */}
            <EventosDeGasto
              eventos={mapeo.eventosDeGasto}
              hay={mapeo.hayEventosDeGasto}
              motivo={mapeo.motivoDeLosGastos}
              completo={mapeo.completoGastos}
              cuentas={cuentas}
              onAsignar={asignarGasto}
              guardando={guardando}
              puedeEscribir={escritura.puede}
              motivoSinEscritura={escritura.motivo}
            />
          </div>
        ) : null}
      </TabsContent>

      {/* Se monta al abrirla: `GET /mapeo/rubros` es otra consulta y no tiene
          por qué salir cuando nadie va a mirar esa pestaña. */}
      <TabsContent value="rubros" className="pt-5">
        {parte === 'rubros' ? <RubrosDelPyg /> : null}
      </TabsContent>
    </Tabs>
  );
}
