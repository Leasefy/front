'use client';

/**
 * La exógena anual de la DIAN: los seis formatos, sus bloqueos, el mapeo de
 * conceptos, el visto bueno del contador y el CSV (contrato del 18-09, §6).
 *
 * ── 🔴 Lo primero que dice esta pantalla: Leasefy NO transmite ──────────────
 *
 * El aviso del Prevalidador va ARRIBA, antes de cualquier botón de descarga, con
 * las palabras del contrato. La DIAN recibe XML que produce su Prevalidador; este
 * CSV es la plantilla que se carga ahí. Una pantalla que deja creer que ya se
 * presentó la exógena produce una sanción, y la sanción por no presentar
 * información exógena se calcula sobre el patrimonio.
 *
 * ── 🔴 Bloqueo y aviso se dibujan distinto ─────────────────────────────────
 *
 * Un BLOQUEO impide presentar —movimientos sin tercero, cuentas sin concepto— y
 * sale en rojo; el back devuelve 409 `EXOGENA_CON_BLOQUEOS` al intentar aprobar
 * así, y esta pantalla **no ofrece forzarlo**: no hay «aprobar igual». Un AVISO
 * es algo que hay que mirar y sale en amarillo. Pintarlos iguales hace que el
 * contador que ve seis renglones amarillos deje de leerlos, y el séptimo era el
 * que impedía presentar.
 *
 * ── 🔴 `paraElContador` es contenido, no un comentario del código ───────────
 *
 * Cada formato trae las preguntas que necesitan visto bueno: si los giros a
 * propietarios van en el 1001 como pago a tercero o sólo en el 1647 como ingreso
 * recibido para terceros, qué parte del gasto es deducible, qué tope de cuantías
 * menores fijó la resolución del año. Se listan enteras, con el tratamiento de
 * `PENDIENTE_DE_CONFIRMAR` — un asterisco al pie de una tabla de 128 filas no lo
 * lee nadie.
 *
 * ── La pestaña «Configuración» (contrato del 19-09, §2) ────────────────────
 *
 * Lo que decide la inmobiliaria vive aparte de lo que se presenta: los dos
 * interruptores (giros al 1001, saldo de 2815 en el 1009) y el tope de
 * cuantías menores. Es una PESTAÑA y no un bloque más al pie porque cambia lo
 * que los seis formatos de la otra pestaña calculan — mezclarlos haría que
 * alguien mueva un interruptor buscando un botón de descarga.
 *
 * ── Sin la migración 52 se calcula y se descarga, pero no se aprueba ───────
 *
 * Los formatos salen igual: lo que no se puede es guardar el mapeo de conceptos
 * ni dejar constancia de quién revisó. La pantalla lo dice en el botón, con su
 * motivo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadSimple, Prohibit, SealCheck, Table as TablaIcono } from '@phosphor-icons/react';

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
import { Avisos, TituloDeBloque } from '@/components/finanzas/piezas';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  AVISO_DEL_PREVALIDADOR,
  DE_DONDE_SALE,
  NOMBRE_DEL_ESTADO_DE_FORMATO,
  PENDIENTES_DEL_CONTADOR,
  exogenaApi,
  type FormatoArmado,
  type FormatoDeExogena,
  type ResumenDeExogena,
} from '@/lib/api/exogena.service';
import {
  aniosDeExogena,
  frasesDeCuantiasMenores,
  nombreDelArchivoDeExogena,
  sePuedeAprobar,
  totalesDelAnio,
} from '@/lib/contabilidad/exogena';
import { diaLegible } from '@/lib/contabilidad/fechas';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Monto } from '../Monto';
import { AccionConMotivo, Bloqueos, Nota, VistoBuenoDelContador } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';
import { ConceptosDeExogena } from './ConceptosDeExogena';
import { ConfiguracionDeExogena } from './ConfiguracionDeExogena';

/** Cuántas filas del formato se dibujan: un 1647 tiene 1.733. */
const FILAS_EN_PANTALLA = 50;

type ParteDeLaExogena = 'formatos' | 'configuracion';

export function Exogena({ anioInicial }: { anioInicial?: number } = {}) {
  const anios = useMemo(() => aniosDeExogena(new Date().getFullYear()), []);
  const [anio, setAnio] = useState(() => anioInicial ?? anios[0]);
  const [parte, setParte] = useState<ParteDeLaExogena>('formatos');

  const [resumen, setResumen] = useState<ResumenDeExogena | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  /** El formato abierto, con sus filas. `null` = sólo la lista. */
  const [abierto, setAbierto] = useState<FormatoArmado | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const [aprobando, setAprobando] = useState<FormatoDeExogena | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [anulando, setAnulando] = useState<FormatoDeExogena | null>(null);
  const [motivo, setMotivo] = useState('');

  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    setAbierto(null);
    try {
      setResumen(await exogenaApi.resumen(anio));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = async (formato: FormatoDeExogena) => {
    setOcupado(formato);
    try {
      setAbierto(await exogenaApi.formato(formato, anio));
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudieron armar las filas del formato.'));
    } finally {
      setOcupado(null);
    }
  };

  const descargar = async (formato: FormatoDeExogena) => {
    setOcupado(formato);
    try {
      const blob = await exogenaApi.archivo(formato, anio);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelArchivoDeExogena(formato, anio);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      toast.success(
        'Archivo descargado. Cargalo en el Prevalidador de la DIAN: Leasefy no lo transmite.',
      );
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo generar el archivo.'));
    } finally {
      setOcupado(null);
    }
  };

  const aprobar = async () => {
    if (!aprobando) return;
    setOcupado(aprobando);
    try {
      await exogenaApi.aprobar(aprobando, anio, observaciones.trim() || undefined);
      toast.success('Visto bueno guardado, con quién lo dio y cuándo.');
      setAprobando(null);
      setObservaciones('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar el visto bueno.'));
    } finally {
      setOcupado(null);
    }
  };

  const anular = async () => {
    if (!anulando) return;
    setOcupado(anulando);
    try {
      await exogenaApi.anular(anulando, anio, motivo.trim());
      toast.success('El formato volvió a quedar generado, sin visto bueno.');
      setAnulando(null);
      setMotivo('');
      await cargar();
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo anular el visto bueno.'));
    } finally {
      setOcupado(null);
    }
  };

  if (cargando && !resumen) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Armando los formatos de {anio}…</p>
      </div>
    );
  }
  if (error || !resumen) {
    return <FalloDeCarga error={error} queEs="la exógena" onReintentar={cargar} />;
  }

  const totales = totalesDelAnio(resumen);
  const cuantias = frasesDeCuantiasMenores(resumen.cuantiasMenores, formatCurrency);

  return (
    <div className="space-y-6" data-testid="exogena">
      {/* 🔴 ARRIBA, antes de cualquier botón de descarga. */}
      <div
        className="flex gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm text-fg"
        role="status"
        data-testid="aviso-del-prevalidador"
      >
        <TablaIcono className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <p>{AVISO_DEL_PREVALIDADOR}</p>
      </div>

      <section className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-surface p-4">
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <span>Año gravable</span>
          <select
            aria-label="Año gravable"
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            data-testid="selector-de-anio"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <p className="text-caption text-fg-muted" data-testid="totales-del-anio">
          {totales.filas.toLocaleString('es-CO')} filas en los seis formatos ·{' '}
          <Monto valor={totales.totalCop} className="text-caption" />
        </p>
      </section>

      <Tabs value={parte} onValueChange={(v) => setParte(v as ParteDeLaExogena)}>
        <TabsList variant="underline" className="justify-start">
          <TabsTrigger value="formatos" data-testid="parte-formatos">
            Los formatos
          </TabsTrigger>
          <TabsTrigger value="configuracion" data-testid="parte-configuracion">
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formatos" className="space-y-6 pt-5">
      {!resumen.disponible ? (
        <Nota testId="exogena-sin-migracion">
          <p>
            Los formatos se calculan y se descargan igual. Lo que todavía no se puede es guardar el
            mapeo de conceptos ni dejar constancia de quién dio el visto bueno: falta la migración
            que crea esas tablas, y la aplica Víctor.
          </p>
        </Nota>
      ) : null}

      {cuantias ? (
        <Nota testId="cuantias-menores">
          <p>{cuantias}</p>
        </Nota>
      ) : null}

      {/* 🔴 Lo que decide la resolución y el sistema no puede saber. */}
      <VistoBuenoDelContador
        introduccion="Estas cinco cosas las fija la resolución de la DIAN de cada año, o son decisiones de la inmobiliaria. Leasefy propone una respuesta y el contador la confirma: lo que está abajo se calculó con esas respuestas."
        puntos={PENDIENTES_DEL_CONTADOR}
        testId="pendientes-del-contador"
      />

      {/* ── Los seis formatos ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <TituloDeBloque
          titulo="Los seis formatos"
          explicacion="Cada uno sale del libro: de las cuentas de gasto por tercero, de las de ingreso, de los saldos al 31 de diciembre. El 1647 es el propio de una inmobiliaria — lo que se recaudó para los propietarios."
        />

        <ul className="space-y-4">
          {resumen.formatos.map((f) => {
            const permiso = sePuedeAprobar(f, resumen.disponible);
            const paraElContador = f.paraElContador ?? [];
            return (
              <li
                key={f.formato}
                className="space-y-3 rounded-lg border border-border bg-surface p-4"
                data-testid={`formato-${f.formato}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-fg">
                      <span className="font-mono">{f.formato}</span> · {f.nombre}
                    </p>
                    <p className="text-caption text-fg-muted">{DE_DONDE_SALE[f.formato]}</p>
                    <p className="text-caption text-fg-muted">
                      {f.filas.toLocaleString('es-CO')}{' '}
                      {f.filas === 1 ? 'fila' : 'filas'} ·{' '}
                      <Monto valor={f.totalCop} className="text-caption" />
                      {f.aprobadoAt ? ` · visto bueno el ${diaLegible(f.aprobadoAt)}` : ''}
                    </p>
                    {f.observaciones ? (
                      <p className="text-caption text-fg-muted">
                        Observaciones: {f.observaciones}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      f.estado === 'APROBADA'
                        ? 'secondary'
                        : f.estado === 'ANULADA'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {NOMBRE_DEL_ESTADO_DE_FORMATO[f.estado]}
                  </Badge>
                </div>

                {/* Rojo: impide. */}
                <Bloqueos
                  bloqueos={f.bloqueos}
                  titulo="Esto impide presentar el formato"
                  testId={`bloqueos-${f.formato}`}
                />

                {/* Amarillo: hay que mirarlo. */}
                <Avisos
                  avisos={f.avisos}
                  testId={`avisos-${f.formato}`}
                  titulo="Para mirar antes de presentar"
                />

                {/* 🔴 Las preguntas de ESTE formato, listadas enteras. */}
                {paraElContador.length > 0 ? (
                  <VistoBuenoDelContador
                    titulo={`Lo que el contador tiene que decidir en el ${f.formato}`}
                    puntos={paraElContador}
                    testId={`para-el-contador-${f.formato}`}
                  />
                ) : null}

                <div className="flex flex-wrap items-end gap-3">
                  <AccionConMotivo
                    puede={f.filas > 0}
                    motivo="Este formato no tiene filas: no hay nada que mirar."
                    ocupado={ocupado === f.formato}
                    textoOcupado="Armando…"
                    onClick={() => void abrir(f.formato)}
                    testId={`ver-${f.formato}`}
                  >
                    Ver las filas
                  </AccionConMotivo>

                  <AccionConMotivo
                    puede={f.filas > 0}
                    motivo="Este formato no tiene filas: el archivo saldría vacío."
                    ocupado={ocupado === f.formato}
                    textoOcupado="Generando…"
                    onClick={() => void descargar(f.formato)}
                    testId={`descargar-${f.formato}`}
                  >
                    <DownloadSimple className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Descargar el CSV
                  </AccionConMotivo>

                  {/* 🔴 Con bloqueos NO hay «aprobar igual»: el botón está
                      apagado con el bloqueo textual del back como motivo. */}
                  <AccionConMotivo
                    puede={escritura.puede && permiso.puede}
                    motivo={escritura.motivo ?? permiso.motivo}
                    onClick={() => {
                      setAprobando(f.formato);
                      setObservaciones('');
                    }}
                    variant="default"
                    testId={`aprobar-${f.formato}`}
                  >
                    <SealCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Visto bueno del contador
                  </AccionConMotivo>

                  <AccionConMotivo
                    puede={escritura.puede && f.estado === 'APROBADA'}
                    motivo={
                      escritura.motivo ?? 'Sólo se anula un formato que ya tiene el visto bueno.'
                    }
                    onClick={() => {
                      setAnulando(f.formato);
                      setMotivo('');
                    }}
                    testId={`anular-${f.formato}`}
                  >
                    <Prohibit className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Quitar el visto bueno
                  </AccionConMotivo>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Las filas del formato abierto ─────────────────────────────── */}
      {abierto ? (
        <section
          className="space-y-3 rounded-lg border border-border bg-surface p-4"
          data-testid="filas-del-formato"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">
              Formato {abierto.formato} · {abierto.filas.length.toLocaleString('es-CO')} filas
            </h3>
            <Button
              variant="link"
              size="sm"
              hideArrow
              className="h-auto p-0 text-caption"
              onClick={() => setAbierto(null)}
              data-testid="cerrar-filas"
            >
              Ocultar
            </Button>
          </div>

          {abierto.filas.length > FILAS_EN_PANTALLA ? (
            <p className="text-caption text-fg-muted" data-testid="tope-de-filas">
              Se muestran las primeras {FILAS_EN_PANTALLA} de{' '}
              {abierto.filas.length.toLocaleString('es-CO')}. El CSV lleva todas.
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* El orden de columnas es el del CSV, tal como lo manda el
                      back: si acá fuera otro, el archivo y la pantalla dirían
                      cosas distintas de la misma fila. */}
                  {abierto.columnas.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {abierto.filas.slice(0, FILAS_EN_PANTALLA).map((fila, i) => (
                  <TableRow key={i}>
                    {abierto.columnas.map((_, j) => {
                      const valores = Object.values(fila);
                      const valor = valores[j];
                      return (
                        <TableCell key={j} className="whitespace-nowrap text-caption">
                          {valor === null || valor === undefined || valor === ''
                            ? '—'
                            : String(valor)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {/* ── El mapeo cuenta → concepto ────────────────────────────────── */}
      <ConceptosDeExogena anio={anio} onGuardado={cargar} />
        </TabsContent>

        {/* 🔴 Lo que la inmobiliaria DECIDE, separado de lo que presenta. */}
        <TabsContent value="configuracion" className="pt-5">
          <ConfiguracionDeExogena anio={anio} />
        </TabsContent>
      </Tabs>

      {/* ── Diálogos ─────────────────────────────────────────────────── */}
      <AlertDialog
        open={aprobando !== null}
        onOpenChange={(a) => {
          if (!a && ocupado === null) setAprobando(null);
        }}
      >
        <AlertDialogContent data-testid="dialogo-de-visto-bueno">
          <AlertDialogHeader>
            <AlertDialogTitle>Visto bueno del formato {aprobando}</AlertDialogTitle>
            <AlertDialogDescription>
              Queda guardado quién lo dio, cuándo, y la foto de los totales de este momento. Esto NO
              presenta la exógena: el archivo se carga en el Prevalidador de la DIAN.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="observaciones-del-visto-bueno">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones-del-visto-bueno"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Conceptos revisados contra la Resolución 000162 y sus modificaciones."
              rows={3}
              data-testid="observaciones-del-visto-bueno"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void aprobar();
              }}
              disabled={ocupado !== null}
              data-testid="confirmar-visto-bueno"
            >
              {ocupado !== null ? 'Guardando…' : 'Dar el visto bueno'}
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
            <AlertDialogTitle>¿Quitar el visto bueno del {anulando}?</AlertDialogTitle>
            <AlertDialogDescription>
              El formato vuelve a quedar generado y hay que revisarlo de nuevo. El motivo se guarda
              con la anulación.
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
              Quitar el visto bueno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
