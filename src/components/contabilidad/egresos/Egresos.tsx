'use client';

/**
 * Egresos propios y sus lotes (contrato del 18-09, §4).
 *
 * ── 🔴 Esto NO es el giro al propietario ───────────────────────────────────
 *
 * El lote de dispersión (`lotes-de-dispersion.service.ts`) gira el canon: baja
 * un pasivo (2815) con plata que nunca fue de la inmobiliaria. Estos egresos son
 * los PROPIOS —proveedores, abogados, técnicos, empleados— y sí son gasto.
 * Mezclarlos en la misma pantalla haría que alguien girara canon desde acá, o
 * que el gasto del mes incluyera trece mil millones que son de otros.
 *
 * ── 🔴 La doble firma es el punto de toda esta pantalla ────────────────────
 *
 * Un lote aprobado se convierte en un archivo que alguien sube al banco, y el
 * banco gira. Por eso lo aprueba OTRA persona: el back devuelve 409
 * `APROBADOR_ES_EL_MISMO` a quien intenta aprobar lo que él mismo armó, y la
 * pantalla lo dice antes del clic cuando puede saberlo (`permisosDelLote` con el
 * id del usuario) y después si el 409 llega igual. Las dos cosas: la primera es
 * cortesía, la segunda es la que nunca miente.
 *
 * ── El orden de los pasos no es decorativo ─────────────────────────────────
 *
 * Armar → aprobar → bajar el archivo → marcar pagado. «Marcar pagado» desde
 * APROBADO está deshabilitado a propósito: asentaría una salida de banco que no
 * ocurrió, porque nadie subió el archivo todavía. La tabla de qué se puede hacer
 * en cada estado vive en `lib/contabilidad/egresos.ts`, con su prueba.
 *
 * ── Un asiento POR EGRESO, no uno por lote ─────────────────────────────────
 *
 * Al marcar pagado el back devuelve `asientos[]`, uno por egreso. Con un asiento
 * compartido, anular UN egreso reversaba el pago de los otros ocho —a los que el
 * banco ya les había girado—. Por eso la pantalla anuncia cuántos comprobantes
 * quedaron y no «el asiento N.º X»: no hay uno.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  DownloadSimple,
  LinkSimple,
  Printer,
  Prohibit,
  Stack,
} from '@phosphor-icons/react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { TituloDeBloque } from '@/components/finanzas/piezas';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { ApiError } from '@/lib/api/client';
import {
  APROBADOR_ES_EL_MISMO,
  FORMATOS_DEL_ARCHIVO,
  NOMBRE_DEL_BENEFICIARIO,
  NOMBRE_DEL_ESTADO_DEL_LOTE,
  NOMBRE_DEL_ESTADO_DE_EGRESO,
  NOMBRE_DEL_FORMATO,
  gastosApi,
  type ComprobanteDeEgreso,
  type Egreso,
  type EstadoDeEgreso,
  type FormatoDelArchivo,
  type LoteDeEgreso,
} from '@/lib/api/gastos.service';
import {
  MOTIVO_DEL_MISMO_APROBADOR,
  egresosArmables,
  faltaParaGirar,
  nombreDelArchivoDelLote,
  permisosDelLote,
  retencionesDelLote,
  sinConciliar,
  totalDelLote,
} from '@/lib/contabilidad/egresos';
import { diaLegible, hoy } from '@/lib/contabilidad/fechas';
import { Monto } from '../Monto';
import { AccionConMotivo, FaltaLaMigracion, Nota } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';

const TONO_DEL_ESTADO: Record<EstadoDeEgreso, 'secondary' | 'outline' | 'destructive' | 'default'> =
  {
    PENDIENTE: 'outline',
    EN_LOTE: 'secondary',
    PAGADO: 'default',
    ANULADO: 'destructive',
  };

export type ParteDeEgresos = 'egresos' | 'lotes';

export const PARTES_DE_EGRESOS: readonly ParteDeEgresos[] = ['egresos', 'lotes'];

/** `?parte=lotes` abre esa pestaña; lo que no existe cae a «egresos». */
export function parteDeEgresos(valor: string | null | undefined): ParteDeEgresos {
  return PARTES_DE_EGRESOS.find((p) => p === valor) ?? 'egresos';
}

export function Egresos({ inicial = 'egresos' }: { inicial?: ParteDeEgresos } = {}) {
  const [parte, setParte] = useState<ParteDeEgresos>(inicial);

  const [egresos, setEgresos] = useState<Egreso[] | null>(null);
  const [lotes, setLotes] = useState<LoteDeEgreso[] | null>(null);
  const [disponible, setDisponible] = useState(true);
  const [motivoSinMigracion, setMotivoSinMigracion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** Los egresos marcados para el lote nuevo. */
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set());
  const [conceptoDelLote, setConceptoDelLote] = useState('');
  const [armando, setArmando] = useState(false);

  const [ocupado, setOcupado] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<ComprobanteDeEgreso | null>(null);
  const [formato, setFormato] = useState<FormatoDelArchivo>('BANCOLOMBIA_PAB');

  /** El lote que se está marcando pagado, y sus datos. */
  const [pagando, setPagando] = useState<LoteDeEgreso | null>(null);
  const [fechaDelPago, setFechaDelPago] = useState(() => hoy());
  const [referencia, setReferencia] = useState('');

  /** Lo que se está anulando: un lote o un egreso. */
  const [anulando, setAnulando] = useState<
    { tipo: 'lote'; lote: LoteDeEgreso } | { tipo: 'egreso'; egreso: Egreso } | null
  >(null);
  const [motivo, setMotivo] = useState('');

  /** El egreso que se está conciliando contra el extracto. */
  const [conciliando, setConciliando] = useState<Egreso | null>(null);
  const [movimientoBancarioId, setMovimientoBancarioId] = useState('');

  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [e, l] = await Promise.all([gastosApi.egresos.listar(), gastosApi.lotes.listar()]);
      setEgresos(e.egresos);
      setLotes(l.lotes);
      setDisponible(e.disponible && l.disponible);
      setMotivoSinMigracion(e.motivo ?? l.motivo ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const armables = useMemo(() => egresosArmables(egresos ?? []), [egresos]);
  const marcados = useMemo(
    () => armables.filter((e) => elegidos.has(e.id)),
    [armables, elegidos],
  );

  const alternar = (id: string) =>
    setElegidos((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const armarLote = async () => {
    setArmando(true);
    try {
      await gastosApi.lotes.crear({
        concepto: conceptoDelLote.trim(),
        egresoIds: marcados.map((e) => e.id),
      });
      toast.success(
        `Lote armado con ${marcados.length} ${marcados.length === 1 ? 'egreso' : 'egresos'}. Lo tiene que aprobar otra persona.`,
      );
      setElegidos(new Set());
      setConceptoDelLote('');
      setParte('lotes');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo armar el lote.'));
    } finally {
      setArmando(false);
    }
  };

  const aprobar = async (lote: LoteDeEgreso) => {
    setOcupado(lote.id);
    try {
      await gastosApi.lotes.aprobar(lote.id);
      toast.success('Lote aprobado. Ya se puede bajar el archivo para el banco.');
      await cargar();
    } catch (e) {
      /*
       * 🔴 El 409 de doble firma, en palabras. Llega aunque la pantalla creyera
       * que se podía: el back sabe quién armó el lote y la pantalla puede no
       * saberlo (sin `creadoPorUserId`, o sin sesión resuelta).
       */
      if (e instanceof ApiError && e.code === APROBADOR_ES_EL_MISMO) {
        toast.error(MOTIVO_DEL_MISMO_APROBADOR);
      } else {
        toast.error(mensajeDeContabilidad(e, 'No se pudo aprobar el lote.'));
      }
    } finally {
      setOcupado(null);
    }
  };

  const bajarArchivo = async (lote: LoteDeEgreso) => {
    setOcupado(lote.id);
    try {
      const blob = await gastosApi.lotes.archivo(lote.id, formato);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelArchivoDelLote(lote.id, lote.formatoArchivo ?? formato);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success('Archivo descargado. Súbelo al banco y después marca el lote como pagado.');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo generar el archivo.'));
    } finally {
      setOcupado(null);
    }
  };

  const marcarPagado = async () => {
    if (!pagando) return;
    setOcupado(pagando.id);
    try {
      const r = await gastosApi.lotes.pagado(pagando.id, {
        fecha: fechaDelPago,
        ...(referencia.trim() ? { referenciaBanco: referencia.trim() } : {}),
      });
      /*
       * 🔴 Un asiento POR EGRESO, no uno por lote: se anuncia el conteo. Decir
       * «asiento N.º X» acá sería nombrar uno de nueve como si fuera el del lote.
       */
      const cuantos = r.asientos?.length ?? 0;
      toast.success(
        cuantos === 1
          ? 'Lote pagado: 1 comprobante de egreso numerado, con su asiento.'
          : `Lote pagado: ${r.comprobantes ?? cuantos} comprobantes de egreso numerados, cada uno con su asiento.`,
      );
      setPagando(null);
      setReferencia('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo marcar el lote como pagado.'));
    } finally {
      setOcupado(null);
    }
  };

  const anular = async () => {
    if (!anulando) return;
    const id = anulando.tipo === 'lote' ? anulando.lote.id : anulando.egreso.id;
    setOcupado(id);
    try {
      if (anulando.tipo === 'lote') {
        await gastosApi.lotes.anular(id, motivo.trim());
        toast.success('Lote anulado. Sus egresos volvieron a quedar pendientes.');
      } else {
        await gastosApi.egresos.anular(id, motivo.trim());
        toast.success('Egreso anulado. Si estaba pagado, su asiento quedó reversado.');
      }
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo anular.'));
    } finally {
      setOcupado(null);
    }
  };

  const conciliar = async () => {
    if (!conciliando) return;
    setOcupado(conciliando.id);
    try {
      await gastosApi.egresos.conciliar(conciliando.id, movimientoBancarioId.trim());
      toast.success('Egreso conciliado con la salida del extracto.');
      setConciliando(null);
      setMovimientoBancarioId('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo conciliar.'));
    } finally {
      setOcupado(null);
    }
  };

  const verComprobante = async (egreso: Egreso) => {
    setOcupado(egreso.id);
    try {
      setComprobante(await gastosApi.egresos.comprobante(egreso.id));
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo abrir el comprobante.'));
    } finally {
      setOcupado(null);
    }
  };

  if (cargando && egresos === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando los egresos…</p>
      </div>
    );
  }
  if (error || egresos === null || lotes === null) {
    return <FalloDeCarga error={error} queEs="los egresos" onReintentar={cargar} />;
  }

  if (!disponible) {
    return (
      <FaltaLaMigracion
        motivo={motivoSinMigracion}
        queSeEspera="registrar egresos y armar lotes de pago a proveedores"
        mientrasTanto="Mientras no esté, pagarle a un proveedor sigue siendo manual: se hace en el banco y se registra con un asiento a mano."
        testId="egresos-sin-migracion"
      />
    );
  }

  const pendientesSinDatos = armables.filter((e) => faltaParaGirar(e).length > 0);

  return (
    <div className="space-y-6" data-testid="egresos">
      <Tabs value={parte} onValueChange={(v) => setParte(v as ParteDeEgresos)}>
        <TabsList variant="underline" className="justify-start">
          <TabsTrigger value="egresos" data-testid="parte-egresos">
            Egresos ({egresos.length})
          </TabsTrigger>
          <TabsTrigger value="lotes" data-testid="parte-lotes">
            Lotes ({lotes.length})
          </TabsTrigger>
        </TabsList>

        {/* ══ Egresos ═══════════════════════════════════════════════════ */}
        <TabsContent value="egresos" className="space-y-5 pt-5">
          <TituloDeBloque
            titulo="Egresos"
            explicacion="Lo que la inmobiliaria le paga a sus proveedores, abogados, técnicos y empleados. No es el giro al propietario: ese baja un pasivo con plata que nunca fue de la inmobiliaria y se hace desde Dispersiones."
          />

          {armables.length > 0 ? (
            <section
              className="space-y-3 rounded-lg border border-border bg-surface p-4"
              data-testid="armar-lote"
            >
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-fg">Armar un lote</h3>
                <p className="text-caption text-fg-muted">
                  Marca los pendientes que van juntos al banco. El lote queda en borrador y lo tiene
                  que aprobar otra persona antes de que salga el archivo.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="concepto-del-lote">Concepto del lote</Label>
                <Input
                  id="concepto-del-lote"
                  value={conceptoDelLote}
                  onChange={(e) => setConceptoDelLote(e.target.value)}
                  placeholder="Proveedores segunda quincena de septiembre"
                  data-testid="concepto-del-lote"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-fg" data-testid="resumen-del-lote">
                  {marcados.length === 0
                    ? 'Ninguno marcado.'
                    : `${marcados.length} ${marcados.length === 1 ? 'egreso' : 'egresos'} · `}
                  {marcados.length > 0 ? <Monto valor={totalDelLote(marcados)} /> : null}
                </p>
                <AccionConMotivo
                  puede={
                    escritura.puede && marcados.length > 0 && conceptoDelLote.trim().length > 0
                  }
                  motivo={
                    escritura.motivo ??
                    (marcados.length === 0
                      ? 'Marca al menos un egreso pendiente.'
                      : 'Escribe el concepto del lote: es lo que se lee en el banco y en el libro.')
                  }
                  ocupado={armando}
                  textoOcupado="Armando…"
                  onClick={() => void armarLote()}
                  variant="default"
                  testId="crear-lote"
                  enLinea
                >
                  <Stack className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Armar el lote
                </AccionConMotivo>
              </div>

              {pendientesSinDatos.length > 0 ? (
                <Nota testId="pendientes-sin-datos">
                  <p>
                    {pendientesSinDatos.length === 1
                      ? 'Un egreso pendiente no tiene todo lo que el banco necesita'
                      : `${pendientesSinDatos.length} egresos pendientes no tienen todo lo que el banco necesita`}
                    : {faltaParaGirar(pendientesSinDatos[0]).join(', ')}
                    {pendientesSinDatos.length > 1 ? ' (y otros)' : ''}. Se pueden meter igual, pero
                    el archivo saldría corto y el lote no cuadraría con la plata que salió.
                  </p>
                </Nota>
              ) : null}
            </section>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            {egresos.length === 0 ? (
              <p className="p-8 text-center text-sm text-fg-muted">
                Todavía no hay egresos. Se crean desde una factura de proveedor causada, o sueltos
                para un anticipo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Beneficiario</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Se le paga</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {egresos.map((e) => {
                      const falta = faltaParaGirar(e);
                      return (
                        <TableRow key={e.id} data-testid={`egreso-${e.id}`}>
                          <TableCell>
                            {e.estado === 'PENDIENTE' ? (
                              <Checkbox
                                checked={elegidos.has(e.id)}
                                onCheckedChange={() => alternar(e.id)}
                                disabled={!escritura.puede}
                                aria-label={`Meter ${e.beneficiarioNombre} en el lote`}
                                data-testid={`marcar-${e.id}`}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[16rem]">
                            <p className="truncate text-sm text-fg" title={e.beneficiarioNombre}>
                              {e.beneficiarioNombre}
                            </p>
                            <p className="text-caption text-fg-muted">
                              {NOMBRE_DEL_BENEFICIARIO[e.beneficiarioTipo]}
                              {e.beneficiarioDocumento ? ` · ${e.beneficiarioDocumento}` : ''}
                            </p>
                            {falta.length > 0 ? (
                              <p
                                className="text-caption text-warning"
                                data-testid={`falta-${e.id}`}
                              >
                                Falta {falta.join(', ')} para girarle.
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[18rem]">
                            <p className="truncate text-sm text-fg" title={e.concepto}>
                              {e.concepto}
                            </p>
                            {e.numero !== null ? (
                              <p className="text-caption text-fg-muted">
                                Comprobante N.º {e.numero}
                                {e.asientoNumero ? ` · asiento N.º ${e.asientoNumero}` : ''}
                              </p>
                            ) : null}
                            {e.motivoDeLaAnulacion ? (
                              <p className="text-caption text-danger">
                                Anulado: {e.motivoDeLaAnulacion}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Monto valor={e.valorCop} className="text-sm" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Monto valor={e.netoCop} className="text-sm" />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={TONO_DEL_ESTADO[e.estado]}>
                              {NOMBRE_DEL_ESTADO_DE_EGRESO[e.estado]}
                            </Badge>
                            {e.estado === 'PAGADO' ? (
                              <p
                                className="mt-1 text-caption text-fg-muted"
                                data-testid={`conciliacion-${e.id}`}
                              >
                                {e.movimientoBancarioId
                                  ? 'Conciliado con el extracto'
                                  : 'Sin conciliar con el extracto'}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <AccionConMotivo
                                puede={e.numero !== null}
                                motivo="El comprobante se numera cuando el lote se marca pagado."
                                ocupado={ocupado === e.id}
                                onClick={() => void verComprobante(e)}
                                testId={`comprobante-${e.id}`}
                              >
                                <Printer className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Comprobante
                              </AccionConMotivo>
                              <AccionConMotivo
                                puede={escritura.puede && e.estado === 'PAGADO'}
                                motivo={
                                  escritura.motivo ??
                                  'Sólo un egreso pagado se concilia: antes no hay salida en el extracto que amarrar.'
                                }
                                onClick={() => {
                                  setConciliando(e);
                                  setMovimientoBancarioId(e.movimientoBancarioId ?? '');
                                }}
                                testId={`conciliar-${e.id}`}
                              >
                                <LinkSimple className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Conciliar
                              </AccionConMotivo>
                              <AccionConMotivo
                                puede={escritura.puede && e.estado !== 'ANULADO'}
                                motivo={escritura.motivo ?? 'Este egreso ya está anulado.'}
                                onClick={() => {
                                  setAnulando({ tipo: 'egreso', egreso: e });
                                  setMotivo('');
                                }}
                                testId={`anular-egreso-${e.id}`}
                              >
                                <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                Anular
                              </AccionConMotivo>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ══ Lotes ═════════════════════════════════════════════════════ */}
        <TabsContent value="lotes" className="space-y-5 pt-5">
          <TituloDeBloque
            titulo="Lotes de egreso"
            explicacion="Un lote se arma, lo aprueba otra persona, sale el archivo para el banco, se marca pagado y ahí se numeran los comprobantes. Ese orden no es decorativo: marcar pagado sin haber subido el archivo asienta una salida de banco que no ocurrió."
          />

          {lotes.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-fg-muted">
              Todavía no hay lotes. Armá el primero desde la pestaña de egresos.
            </p>
          ) : (
            <ul className="space-y-4">
              {lotes.map((lote) => {
                const permisos = permisosDelLote(lote, escritura.usuarioId);
                const sinFirma = escritura.puede ? null : escritura.motivo;
                const pendientesDeConciliar = sinConciliar(lote.egresos ?? []);
                return (
                  <li
                    key={lote.id}
                    className="space-y-3 rounded-lg border border-border bg-surface p-4"
                    data-testid={`lote-${lote.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-fg">{lote.concepto}</p>
                        <p className="text-caption text-fg-muted">
                          {lote.cantidad} {lote.cantidad === 1 ? 'egreso' : 'egresos'} ·{' '}
                          <Monto valor={lote.totalCop} className="text-caption" /> ·{' '}
                          {retencionesDelLote(lote.egresos ?? []) > 0 ? (
                            <>
                              retenciones{' '}
                              <Monto
                                valor={retencionesDelLote(lote.egresos ?? [])}
                                className="text-caption"
                              />
                            </>
                          ) : (
                            'sin retenciones'
                          )}
                        </p>
                        {lote.pagadoAt ? (
                          <p className="text-caption text-fg-muted">
                            Pagado el {diaLegible(lote.pagadoAt)}
                            {lote.referenciaBanco ? ` · ref. ${lote.referenciaBanco}` : ''}
                          </p>
                        ) : null}
                        {lote.motivoDeLaAnulacion ? (
                          <p className="text-caption text-danger">
                            Anulado: {lote.motivoDeLaAnulacion}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={lote.estado === 'ANULADO' ? 'destructive' : 'secondary'}>
                        {NOMBRE_DEL_ESTADO_DEL_LOTE[lote.estado]}
                      </Badge>
                    </div>

                    {pendientesDeConciliar > 0 ? (
                      <Nota testId={`sin-conciliar-${lote.id}`}>
                        <p>
                          {pendientesDeConciliar === 1
                            ? '1 egreso pagado sigue sin conciliar contra el extracto.'
                            : `${pendientesDeConciliar} egresos pagados siguen sin conciliar contra el extracto.`}{' '}
                          Hasta que se concilien, la salida del banco está asentada pero nadie
                          verificó que el banco la haya hecho.
                        </p>
                      </Nota>
                    ) : null}

                    <div className="flex flex-wrap items-end gap-3">
                      <AccionConMotivo
                        puede={escritura.puede && permisos.aprobar.puede}
                        motivo={sinFirma ?? permisos.aprobar.motivo}
                        ocupado={ocupado === lote.id}
                        textoOcupado="Aprobando…"
                        onClick={() => void aprobar(lote)}
                        variant="default"
                        testId={`aprobar-${lote.id}`}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Aprobar
                      </AccionConMotivo>

                      <div className="space-y-1">
                        <Label htmlFor={`formato-${lote.id}`} className="text-caption">
                          Formato del banco
                        </Label>
                        <select
                          id={`formato-${lote.id}`}
                          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg"
                          value={lote.formatoArchivo ?? formato}
                          onChange={(e) => setFormato(e.target.value as FormatoDelArchivo)}
                          disabled={!permisos.archivo.puede}
                          data-testid={`formato-${lote.id}`}
                        >
                          {FORMATOS_DEL_ARCHIVO.map((f) => (
                            <option key={f} value={f}>
                              {NOMBRE_DEL_FORMATO[f]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <AccionConMotivo
                        puede={permisos.archivo.puede}
                        motivo={permisos.archivo.motivo}
                        ocupado={ocupado === lote.id}
                        textoOcupado="Generando…"
                        onClick={() => void bajarArchivo(lote)}
                        testId={`archivo-${lote.id}`}
                      >
                        <DownloadSimple className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Archivo para el banco
                      </AccionConMotivo>

                      <AccionConMotivo
                        puede={escritura.puede && permisos.pagado.puede}
                        motivo={sinFirma ?? permisos.pagado.motivo}
                        onClick={() => {
                          setPagando(lote);
                          setFechaDelPago(hoy());
                          setReferencia(lote.referenciaBanco ?? '');
                        }}
                        testId={`pagado-${lote.id}`}
                      >
                        Marcar pagado
                      </AccionConMotivo>

                      <AccionConMotivo
                        puede={escritura.puede && permisos.anular.puede}
                        motivo={sinFirma ?? permisos.anular.motivo}
                        onClick={() => {
                          setAnulando({ tipo: 'lote', lote });
                          setMotivo('');
                        }}
                        testId={`anular-lote-${lote.id}`}
                      >
                        <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Anular
                      </AccionConMotivo>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {/* ══ Diálogos ══════════════════════════════════════════════════ */}

      <AlertDialog
        open={pagando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) setPagando(null);
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-pago">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar el lote como pagado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto numera {pagando?.cantidad ?? 0}{' '}
              {pagando?.cantidad === 1 ? 'comprobante de egreso' : 'comprobantes de egreso'} y
              asienta la salida del banco: <strong>un asiento por egreso</strong>, para que anular
              uno no reverse el pago de los demás. Hacelo sólo después de haber subido el archivo al
              banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha-del-pago">Fecha del pago</Label>
              <Input
                id="fecha-del-pago"
                type="date"
                value={fechaDelPago}
                onChange={(e) => setFechaDelPago(e.target.value)}
                data-testid="fecha-del-pago"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia-del-banco">Referencia del banco</Label>
              <Input
                id="referencia-del-banco"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="PAB-771"
                data-testid="referencia-del-banco"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void marcarPagado();
              }}
              disabled={ocupado !== null || !fechaDelPago}
              data-testid="confirmar-pago"
            >
              {ocupado !== null ? 'Asentando…' : 'Marcar pagado'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={anulando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) {
            setAnulando(null);
            setMotivo('');
          }
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-anulacion">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {anulando?.tipo === 'lote' ? '¿Anular el lote?' : '¿Anular el egreso?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {anulando?.tipo === 'lote'
                ? 'Sus egresos vuelven a quedar pendientes y se pueden meter en otro lote.'
                : 'Si el egreso ya estaba pagado, su asiento se REVERSA con un asiento espejo: no se borra.'}{' '}
              El motivo se guarda y lo va a leer el contador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-de-la-anulacion">Motivo</Label>
            <Textarea
              id="motivo-de-la-anulacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              data-testid="motivo-de-la-anulacion"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void anular();
              }}
              disabled={ocupado !== null || motivo.trim().length === 0}
              data-testid="confirmar-anulacion"
            >
              {ocupado !== null ? 'Anulando…' : 'Anular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={conciliando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) setConciliando(null);
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-conciliacion">
          <AlertDialogHeader>
            <AlertDialogTitle>Conciliar contra el extracto</AlertDialogTitle>
            <AlertDialogDescription>
              Amarra este egreso a la salida del extracto bancario, para que el saldo del banco en el
              libro y el del banco de verdad digan lo mismo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="movimiento-bancario">Id del movimiento del extracto</Label>
            <Input
              id="movimiento-bancario"
              value={movimientoBancarioId}
              onChange={(e) => setMovimientoBancarioId(e.target.value)}
              data-testid="movimiento-bancario"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void conciliar();
              }}
              disabled={ocupado !== null || movimientoBancarioId.trim().length === 0}
              data-testid="confirmar-conciliacion"
            >
              Conciliar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/*
        El comprobante, tal como lo arma el BACK. Su forma no es el egreso crudo:
        trae `numero` ya formateado («CE-87»), los datos de la inmobiliaria, el
        beneficiario, los `valores`, y la factura / el lote / el asiento de los
        que salió.

        🔴 El back responde 409 `EGRESO_SIN_COMPROBANTE` mientras el egreso no
        esté pagado, con estas palabras: «se numera cuando la plata sale del
        banco. Un comprobante numerado de un pago que no salió es un documento
        falso». Por eso el botón sólo se ofrece con `numero !== null`.
      */}
      <AlertDialog open={comprobante !== null} onOpenChange={(a) => !a && setComprobante(null)}>
        <AlertDialogContent className="max-w-2xl" data-testid="comprobante-de-egreso">
          <AlertDialogHeader>
            <AlertDialogTitle>Comprobante de egreso {comprobante?.numero}</AlertDialogTitle>
            <AlertDialogDescription>
              {comprobante?.inmobiliaria?.name ?? 'La inmobiliaria'}
              {comprobante?.inmobiliaria?.nit ? ` · NIT ${comprobante.inmobiliaria.nit}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {comprobante ? (
            <div className="space-y-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-caption text-fg-muted">Beneficiario</dt>
                  <dd>
                    {comprobante.beneficiario.nombre}
                    {comprobante.beneficiario.documento
                      ? ` · ${comprobante.beneficiario.tipoDocumento ?? ''} ${comprobante.beneficiario.documento}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Fecha</dt>
                  <dd>{comprobante.fecha ? diaLegible(comprobante.fecha) : '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption text-fg-muted">Concepto</dt>
                  <dd>{comprobante.concepto}</dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Cuenta a la que se pagó</dt>
                  <dd>
                    {comprobante.beneficiario.banco ? (
                      <>
                        {comprobante.beneficiario.banco}
                        {comprobante.beneficiario.tipoDeCuenta
                          ? ` · ${comprobante.beneficiario.tipoDeCuenta}`
                          : ''}
                        {comprobante.beneficiario.numeroDeCuenta
                          ? ` · ${comprobante.beneficiario.numeroDeCuenta}`
                          : ''}
                      </>
                    ) : (
                      <span className="text-fg-subtle">Sin cuenta registrada</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Asiento</dt>
                  <dd>
                    {comprobante.asiento ? (
                      `N.º ${comprobante.asiento.numero} · ${diaLegible(comprobante.asiento.fecha)}`
                    ) : (
                      <span className="text-fg-subtle">Sin asiento</span>
                    )}
                  </dd>
                </div>
              </dl>

              {/* Los valores, con las retenciones desglosadas: es lo que el
                  proveedor tiene que poder cotejar contra su propia factura. */}
              <dl
                className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:grid-cols-5"
                data-testid="valores-del-comprobante"
              >
                <div>
                  <dt className="text-caption text-fg-muted">Valor</dt>
                  <dd>
                    <Monto valor={comprobante.valores.valorCop} className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Retefuente</dt>
                  <dd>
                    <Monto valor={comprobante.valores.retefuenteCop} vacioSiCero className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">ReteIVA</dt>
                  <dd>
                    <Monto valor={comprobante.valores.reteivaCop} vacioSiCero className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">ReteICA</dt>
                  <dd>
                    <Monto valor={comprobante.valores.reteicaCop} vacioSiCero className="text-sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-muted">Pagado</dt>
                  <dd>
                    <Monto valor={comprobante.valores.netoCop} className="text-sm font-medium" />
                  </dd>
                </div>
              </dl>

              {comprobante.factura ? (
                <p className="text-caption text-fg-muted" data-testid="factura-del-comprobante">
                  Paga la factura {comprobante.factura.prefijoDelProveedor ?? ''}
                  {comprobante.factura.numeroDelProveedor} del{' '}
                  {diaLegible(comprobante.factura.fecha)} por{' '}
                  <Monto valor={comprobante.factura.totalCop} className="text-caption" /> ·{' '}
                  {comprobante.factura.concepto}
                </p>
              ) : (
                <p className="text-caption text-fg-muted" data-testid="sin-factura">
                  Este egreso no sale de una factura de proveedor: causa el gasto y el pago en el
                  mismo asiento.
                </p>
              )}

              {comprobante.lote ? (
                <p className="text-caption text-fg-muted">
                  Salió en el lote «{comprobante.lote.concepto}»
                  {comprobante.lote.referenciaBanco
                    ? ` · ref. ${comprobante.lote.referenciaBanco}`
                    : ''}
                </p>
              ) : null}

              {/* 🔴 Conciliado o no: un comprobante de un pago que el extracto
                  todavía no confirma es una promesa, no un hecho. */}
              <p
                className={comprobante.conciliado ? 'text-caption text-fg-muted' : 'text-caption text-warning'}
                data-testid="conciliacion-del-comprobante"
              >
                {comprobante.conciliado
                  ? 'Conciliado contra el extracto bancario.'
                  : 'Todavía sin conciliar contra el extracto: el asiento dice que la plata salió, pero nadie lo verificó contra el banco.'}
              </p>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                window.print();
              }}
              data-testid="imprimir-comprobante"
            >
              Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
