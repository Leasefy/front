'use client';

/**
 * El certificado anual de retenciones que le practicaron al propietario.
 *
 * ── La regla, con las palabras de Nico (17-09) ──────────────────────────────
 *
 * «Retención practicada por el inquilino (ej. 3,5 % sobre el canon): la cuota
 * queda saldada con el canon completo; la parte retenida se registra como
 * retención practicada, se le descuenta al propietario en su liquidación (es
 * su impuesto) y se le emite el certificado anual.»
 *
 * Las dos primeras mitades ya funcionaban. Esta pantalla es la tercera.
 *
 * ── 🔴 CAUSADO o PAGADO: la pregunta que decide el contador ─────────────────
 *
 * El art. 392 del Estatuto Tributario dice que la retención se practica «en el
 * momento del pago o abono en cuenta, lo que ocurra primero». Acá la factura
 * del canon nace el día 1, así que hay abono en cuenta desde ese día y CAUSADO
 * es el valor por defecto. PAGADO cuenta sólo las cuotas saldadas, y el año es
 * el de la plata. Los dos caminos están construidos; cuál se usa lo dice el
 * contador — y por eso el selector está arriba y no escondido.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Repartir a ojo lo que no tiene propietario resuelto.** El back lo deja
 *    fuera y lo cuenta en `avisos`; acá se muestra. Un certificado con plata
 *    mal atribuida lo firma la inmobiliaria y lo usa el propietario para
 *    declarar.
 * 2. **Esconder a quién le falta el documento.** Un certificado sin NIT o
 *    cédula no sirve para declarar, y eso sale en los avisos del back.
 * 3. **Emitir sin decir qué significa.** Emitir FIJA número y fecha: es el
 *    acto, no el cálculo. El cálculo sale de las cuotas y se puede volver a
 *    mirar cuando se quiera.
 */

import { useCallback, useEffect, useState } from 'react';
import { CaretDown, CaretRight, DownloadSimple, SealCheck } from '@phosphor-icons/react';

import { AccionConMotivo } from '@/components/contabilidad/piezas';
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
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos } from '@/components/finanzas/piezas';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type {
  CertificadoDeRetenciones,
  CriterioDeRetencion,
  FilaDelCertificado,
} from '@/lib/api/finanzas.types';
import { nombreDelMes } from '@/lib/recaudo/meses';
// CB-17: la plata de Contabilidad con UN formato («$ 1.234.567», «−$ 119.100»).
import { plata as formatCurrency, textoDelBack } from '@/lib/contabilidad/plata';
import { cifrasDeLaPantalla, localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

/** CB-R17: por qué «Descargar PDF» está apagado: sin documento el certificado no sirve. */
export const MOTIVO_SIN_PDF =
  'Sin el documento del propietario en su ficha, el certificado no sirve para declarar: complétalo primero.';

const NUMERO = cifrasDeLaPantalla();

/**
 * CB-32: «N.º 1» si el número es sólo la cifra; si trae prefijo, tal cual. El
 * back lo manda como NÚMERO aunque el tipo diga texto (visto en el laboratorio):
 * se aceptan los dos.
 */
export function numeroDelCertificado(numero: string | number): string {
  const texto = String(numero ?? '').trim();
  return /^\d+$/.test(texto) ? `N.º ${Number(texto)}` : texto;
}

/** Qué mide cada criterio, escrito. Va al lado del selector, no en un tooltip. */
export const QUE_MIDE_EL_CRITERIO: Record<CriterioDeRetencion, string> = {
  CAUSADO:
    'Entran las cuotas del año, se hayan pagado o no. Es lo que se alinea con cómo se factura aquí: la factura del canon nace el día 1, así que hay abono en cuenta desde ese día (art. 392 del E.T.).',
  PAGADO:
    'Entran sólo las cuotas SALDADAS, y el año es el del pago, no el del período. Es la lectura por caja.',
};

/** El año de hoy en Bogotá — no el del huso del navegador. */
export function anioActual(ahora: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric' }).format(ahora),
  );
}

/** Los años que se pueden mirar: el actual y los cuatro anteriores. */
export function aniosDisponibles(hasta: number = anioActual()): number[] {
  return [0, 1, 2, 3, 4].map((n) => hasta - n);
}

export function CertificadoDeRetencionesPanel() {
  const [anio, setAnio] = useState(() => anioActual());
  const [criterio, setCriterio] = useState<CriterioDeRetencion>('CAUSADO');
  const [emitiendoTodos, setEmitiendoTodos] = useState(false);
  const [datos, setDatos] = useState<CertificadoDeRetenciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [emitiendo, setEmitiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await finanzasApi.certificado(anio, criterio));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [anio, criterio]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    setAbierta(null);
    finanzasApi
      .certificado(anio, criterio)
      .then((r) => {
        if (vivo) setDatos(r);
      })
      .catch((e) => {
        if (vivo) setError(e);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [anio, criterio]);

  const emitidos = new Map((datos?.emitidos ?? []).map((e) => [e.propietarioId, e]));

  // GLOW UP 3.ª vuelta · las filas por lo que le falta a cada una: el certificado ya entregado,
  // el que falta emitir y el que no se puede emitir porque el propietario no tiene documento.
  const [vista, setVista] = useState<VistaDelCertificado>('todos');
  const filas = datos?.filas ?? [];
  const grupoDe = (f: FilaDelCertificado): Exclude<VistaDelCertificado, 'todos'> =>
    emitidos.has(f.propietarioId) ? 'emitidos' : f.documento ? 'por-emitir' : 'sin-documento';
  const deGrupo = (g: Exclude<VistaDelCertificado, 'todos'>) => filas.filter((f) => grupoDe(f) === g);
  const sumaDe = (fs: readonly FilaDelCertificado[]) => fs.reduce((t, f) => t + f.totalRetenidoCop, 0);
  const porEmitir = deGrupo('por-emitir');
  const yaEmitidos = deGrupo('emitidos');
  const sinDocumento = deGrupo('sin-documento');
  /** Cuántos grupos (entregados, falta emitir, sin documento) tienen filas: con uno solo no hay pestañas ni leyenda. */
  const gruposConFilas = [porEmitir, yaEmitidos, sinDocumento].filter((g) => g.length > 0).length;
  /** Una columna de retención toda en cero no informa (r25). */
  const conReteIva = filas.some((f) => f.reteIvaCop !== 0);
  const conReteIca = filas.some((f) => f.reteIcaCop !== 0);
  // Propietario, Documento, Base, Retefuente, Total y Certificado, más las de retención con algo.
  const columnas = 6 + (conReteIva ? 1 : 0) + (conReteIca ? 1 : 0);
  // Sin pestañas (un solo grupo), se ve todo: un filtro de antes no deja la tabla escondida.
  const vistaEfectiva = gruposConFilas > 1 ? vista : 'todos';
  const filasVisibles = vistaEfectiva === 'todos' ? filas : filas.filter((f) => grupoDe(f) === vistaEfectiva);

  /**
   * 🔴 CB-32 (QA de Contabilidad, 03-10-2026): «Emitir» fijaba número y fecha al
   * primer clic. Ahora se confirma antes: a quién, qué año, cuánto se le retuvo
   * y que el número queda fijo.
   */
  const [confirmandoEmision, setConfirmandoEmision] = useState<FilaDelCertificado | null>(null);
  /** CB-R17: el PDF que se está preparando (por propietario). */
  const [bajando, setBajando] = useState<string | null>(null);

  async function bajarPdf(fila: FilaDelCertificado) {
    setBajando(fila.propietarioId);
    try {
      const blob = await finanzasApi.pdfDelCertificado(anio, fila.propietarioId, criterio);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-de-retenciones-${anio}-${fila.nombre.replace(/[^\p{L}\p{N}]+/gu, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('No se pudo bajar el PDF del certificado.', {
        description: explicar(e, 'No se pudo bajar el PDF del certificado.'),
      });
    } finally {
      setBajando(null);
    }
  }

  async function emitir(fila: FilaDelCertificado) {
    setConfirmandoEmision(null);
    setEmitiendo(fila.propietarioId);
    try {
      const e = await finanzasApi.emitirCertificado(anio, fila.propietarioId, criterio);
      toast.success(`Certificado ${e.numero} emitido.`, {
        description: `Quedó con número y fecha a nombre de ${fila.nombre}.`,
      });
      await cargar();
    } catch (e) {
      toast.error('No se pudo emitir el certificado.', {
        description: explicar(e, 'No se pudo emitir el certificado.'),
      });
    } finally {
      setEmitiendo(null);
    }
  }

  /**
   * 🔴 (18-09-2026) EMITE EL DE TODOS. Nico: «el certificado anual se genera SOLO
   * para todos los propietarios, sin pedirlo». Lo hace el cron de enero; este
   * botón es para el año que el cron no alcanzó o para la inmobiliaria que acaba
   * de migrar su historia.
   *
   * Es idempotente: se salta a quien ya lo tiene. Y lo que NO se pudo emitir se
   * dice con NOMBRE —un propietario sin documento en su ficha no puede recibir
   * certificado—, porque «3 quedaron fuera» no le permite a nadie arreglarlo.
   */
  async function emitirTodos() {
    setEmitiendoTodos(true);
    try {
      const r = await finanzasApi.emitirTodosLosCertificados(anio, criterio);
      if (!r.disponible) {
        toast.error('Todavía no se pueden emitir certificados.', {
          description: r.motivo ?? undefined,
        });
        return;
      }
      toast.success(`${r.emitidos} certificado(s) emitido(s).`, {
        description:
          `${r.yaEstaban} ya estaban emitidos y no se tocaron.` +
          (r.sinDocumento.length > 0
            ? ` SIN documento en su ficha (no se les puede emitir): ${r.sinDocumento.map((x) => x.nombre).join(', ')}.`
            : ''),
      });
      for (const e of r.errores) {
        toast.error('Un certificado no se pudo emitir.', { description: e.mensaje });
      }
      await cargar();
    } catch (e) {
      toast.error('No se pudieron emitir los certificados.', {
        description: explicar(e, 'No se pudieron emitir los certificados.'),
      });
    } finally {
      setEmitiendoTodos(false);
    }
  }

  /** REGENERA el de un propietario: anula el anterior con motivo y emite otro. */
  async function reemitir(fila: FilaDelCertificado) {
    setEmitiendo(fila.propietarioId);
    try {
      const e = await finanzasApi.reemitirCertificado(anio, fila.propietarioId, criterio);
      toast.success(`Certificado ${e.numero} regenerado.`, {
        description: `El anterior quedó anulado con su motivo. El de ${fila.nombre} ya está al día.`,
      });
      await cargar();
    } catch (e) {
      toast.error('No se pudo regenerar el certificado.', {
        description: explicar(e, 'No se pudo regenerar el certificado.'),
      });
    } finally {
      setEmitiendo(null);
    }
  }

  return (
    <div className="space-y-6" data-testid="certificado-de-retenciones">
      <AlertDialog
        open={confirmandoEmision !== null}
        onOpenChange={(abierto) => !abierto && emitiendo === null && setConfirmandoEmision(null)}
      >
        <AlertDialogContent variant="confirm" icon={<SealCheck weight="bold" />} data-testid="confirmar-emision-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Emitir el certificado de {anio} de {confirmandoEmision?.nombre}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le retuvieron{' '}
              <span className="font-mono tabular-nums">
                {formatCurrency(confirmandoEmision?.totalRetenidoCop ?? 0)}
              </span>{' '}
              en {NUMERO.format(confirmandoEmision?.periodos ?? 0)}{' '}
              {confirmandoEmision?.periodos === 1 ? 'período' : 'períodos'}. Al emitirlo queda con su
              número y la fecha de hoy: es el acto de entregarlo. Para corregirlo después hay que
              regenerarlo, y el anterior queda anulado con su motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={emitiendo !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmandoEmision) void emitir(confirmandoEmision);
              }}
              loading={emitiendo !== null}
              data-testid="confirmar-emision"
            >
              Emitir el certificado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── El año y el criterio: definen la pregunta, por eso van antes de la respuesta ── */}
      {/* Ronda 30 (revisora r27): los rótulos al lado de su campo, en una barra, y lo que mide el criterio
          plegado (antes la etiqueta encima y la explicación suelta a la derecha). */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* 🔴 CB-17 (QA de Contabilidad, 03-10-2026): el `Select` del DS, no
            el `<select>` del navegador. */}
        <div className="flex items-center gap-2 text-caption text-fg-muted">
          <span id="certificado-anio">Año gravable</span>
          <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
            <SelectTrigger
              aria-labelledby="certificado-anio"
              data-testid="selector-de-anio"
              className="w-32 bg-surface"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aniosDisponibles().map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-caption text-fg-muted">
          <span id="certificado-criterio">Criterio</span>
          <Select value={criterio} onValueChange={(v) => setCriterio(v as CriterioDeRetencion)}>
            <SelectTrigger
              aria-labelledby="certificado-criterio"
              data-testid="selector-de-criterio"
              className="w-52 bg-surface"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CAUSADO">Por causación</SelectItem>
              <SelectItem value="PAGADO">Por caja (pagado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <MasDetalles etiqueta="Qué mide el criterio" etiquetaAbierto="Ocultar" montadoSiempre className="text-caption">
          <p className="max-w-xl text-caption leading-relaxed text-fg-muted" data-testid="que-mide-el-criterio">
            {QUE_MIDE_EL_CRITERIO[criterio]}
          </p>
        </MasDetalles>
      </div>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        queEs="el certificado de retenciones"
        onReintentar={cargar}
        conservarContenido={Boolean(datos)}
      >
        {datos ? (
          <div className="space-y-6">
            {/* LA RESPUESTA: cuánto se retuvo en el año y cuánto de eso ya tiene su certificado. */}
            <CifraHeroe
              rotulo={`Retenido en ${datos.anio}`}
              cifra={formatCurrency(datos.totales.totalRetenidoCop)}
              contexto={
                <>
                  a <span data-testid="valor-propietarios">{NUMERO.format(datos.totales.propietarios)}</span>{' '}
                  {datos.totales.propietarios === 1 ? 'propietario' : 'propietarios'}, sobre una base de{' '}
                  <span className="font-mono tabular-nums" data-testid="valor-base">{formatCurrency(datos.totales.baseCop)}</span>
                </>
              }
              total={datos.totales.totalRetenidoCop}
              // Revisora r25 (Certificados #1): con un solo tramo con plata, sin leyenda (repetía la cifra).
              tramos={gruposConFilas > 1 ? [
                { clave: 'emitidos', etiqueta: `Ya entregado · ${NUMERO.format(yaEmitidos.length)}`, monto: sumaDe(yaEmitidos), tono: 'exito', cifra: formatCurrency(sumaDe(yaEmitidos)) },
                { clave: 'por-emitir', etiqueta: `Falta emitir · ${NUMERO.format(porEmitir.length)}`, monto: sumaDe(porEmitir), tono: 'neutro', cifra: formatCurrency(sumaDe(porEmitir)) },
                { clave: 'sin-documento', etiqueta: `Sin documento · ${NUMERO.format(sinDocumento.length)}`, monto: sumaDe(sinDocumento), tono: 'aviso', cifra: formatCurrency(sumaDe(sinDocumento)) },
              ] : undefined}
              data-testid="cifra-del-certificado"
            />

            <Avisos
              avisos={datos.avisos.map(textoDelBack)}
              testId="avisos-del-certificado"
              titulo="Lo que hay que mirar antes de entregarlo"
            />

            <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label={`Retenciones del ${datos.anio}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                {/* Revisora r25 (#1): «Todos 10 · Falta emitir 10» decía lo mismo: pestañas sólo con dos grupos o más. */}
                {gruposConFilas > 1 ? (
                <PestanasDeEstado
                  etiqueta="Estado de los certificados"
                  valor={vista}
                  onCambio={setVista}
                  pestanas={[
                    { valor: 'todos', etiqueta: 'Todos', cuantos: filas.length, fija: true },
                    { valor: 'por-emitir', etiqueta: 'Falta emitir', cuantos: porEmitir.length },
                    { valor: 'sin-documento', etiqueta: 'Sin documento', cuantos: sinDocumento.length, tono: 'aviso' },
                    { valor: 'emitidos', etiqueta: 'Entregados', cuantos: yaEmitidos.length },
                  ]}
                  data-testid="pestanas-del-certificado"
                />
                ) : <span />}
                {/* 🔴 (18-09) Antes esto sólo se podía emitir de a uno: una inmobiliaria
                    con 300 propietarios necesitaba 300 clics, y quien se olvidara no se
                    enteraba hasta que el propietario reclamara en abril. */}
                <Button
                  size="sm"
                  hideArrow
                  data-testid="emitir-todos-los-certificados"
                  isLoading={emitiendoTodos}
                  onClick={() => void emitirTodos()}
                >
                  Emitir el de todos
                </Button>
              </div>
              <Table className="max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Retefuente</TableHead>
                    {/* Revisora r25 (Certificados, UI): una columna toda en $ 0 no informa: fuera. */}
                    {conReteIva ? <TableHead className="text-right">ReteIVA</TableHead> : null}
                    {conReteIca ? <TableHead className="text-right">ReteICA</TableHead> : null}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Certificado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {filasVisibles.length === 0 ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={columnas} className="py-10 text-center text-body-sm text-fg-muted max-md:block">
                        {filas.length === 0 ? (
                          <>
                            A ningún propietario le retuvieron nada en {datos.anio} con este criterio.
                            No hay certificados que emitir.
                          </>
                        ) : (
                          <>
                            Ningún propietario en esta pestaña.{' '}
                            <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={() => setVista('todos')}>
                              Ver todos
                            </button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filasVisibles.map((f) => {
                      const emitido = emitidos.get(f.propietarioId);
                      const abierto = abierta === f.propietarioId;
                      return [
                        <TableRow
                          key={f.propietarioId}
                          data-testid={`fila-${f.propietarioId}`}
                          className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4"
                        >
                          <TableCell className="text-fg max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-left font-medium"
                              aria-expanded={abierto}
                              data-testid={`abrir-${f.propietarioId}`}
                              onClick={() => setAbierta(abierto ? null : f.propietarioId)}
                            >
                              {abierto ? (
                                <CaretDown className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <CaretRight className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {f.nombre}
                            </button>
                            <span className="block pl-5 text-caption text-fg-muted">
                              {NUMERO.format(f.periodos)}{' '}
                              {f.periodos === 1 ? 'período' : 'períodos'}
                              {/* CB-R17: con copropietarios, cada uno con su parte. */}
                              {typeof f.participacionPct === 'number' && f.participacionPct < 100 ? (
                                <span data-testid={`parte-${f.propietarioId}`}>
                                  {' · '}su parte: {f.participacionPct.toLocaleString(localeDeLasCifras())} %
                                </span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-caption max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:pl-5">
                            {f.documento || (
                              <span className="text-warning">Sin documento</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums max-md:hidden">
                            {formatCurrency(f.baseCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums max-md:hidden">
                            {formatCurrency(f.retefuenteCop)}
                          </TableCell>
                          {conReteIva ? (
                            <TableCell className="whitespace-nowrap text-right font-mono tabular-nums max-md:hidden">
                              {f.reteIvaCop === 0 ? <span className="text-fg-subtle">—</span> : formatCurrency(f.reteIvaCop)}
                            </TableCell>
                          ) : null}
                          {conReteIca ? (
                            <TableCell className="whitespace-nowrap text-right font-mono tabular-nums max-md:hidden">
                              {f.reteIcaCop === 0 ? <span className="text-fg-subtle">—</span> : formatCurrency(f.reteIcaCop)}
                            </TableCell>
                          ) : null}
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:block max-md:p-0">
                            {formatCurrency(f.totalRetenidoCop)}
                          </TableCell>
                          <TableCell className="max-md:col-span-2 max-md:row-start-3 max-md:block max-md:p-0 max-md:pl-5">
                            <div className="flex flex-wrap items-start gap-2">
                            {emitido ? (
                              <span className="flex flex-col items-start gap-1">
                                <span
                                  className="inline-flex items-center gap-1 text-caption text-success"
                                  data-testid={`emitido-${f.propietarioId}`}
                                >
                                  <SealCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                  {/* CB-32: «N.º 1 · 4 de octubre de 2026», no la fecha en ISO. */}
                                  {numeroDelCertificado(emitido.numero)} ·{' '}
                                  {fechaLarga(diaEnColombia(emitido.emitidoAt))}
                                </span>
                                {/* «Se puede regenerar» (Nico, 17-09): anula el
                                    anterior con motivo y emite otro. El viejo no
                                    se borra — el propietario puede tenerlo. */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  hideArrow
                                  data-testid={`regenerar-${f.propietarioId}`}
                                  isLoading={emitiendo === f.propietarioId}
                                  onClick={() => void reemitir(f)}
                                >
                                  Regenerar
                                </Button>
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                hideArrow
                                data-testid={`emitir-${f.propietarioId}`}
                                isLoading={emitiendo === f.propietarioId}
                                onClick={() => setConfirmandoEmision(f)}
                              >
                                Emitir
                              </Button>
                            )}
                            {/* 🔴 CB-R17 (Nico): el PDF del certificado, por fila
                                (back 26beefbc: `retenciones/certificado/pdf`). Sólo
                                con documento: sin él no sirve para declarar. */}
                            <AccionConMotivo
                              puede={Boolean(f.documento)}
                              motivo={MOTIVO_SIN_PDF}
                              ocupado={bajando === f.propietarioId}
                              textoOcupado="Preparando…"
                              onClick={() => void bajarPdf(f)}
                              testId={`pdf-${f.propietarioId}`}
                              motivoVisible={false}
                            >
                              <DownloadSimple className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                              Descargar PDF
                            </AccionConMotivo>
                            </div>
                          </TableCell>
                        </TableRow>,
                        abierto ? (
                          <TableRow key={`${f.propietarioId}-detalle`} className="max-md:block">
                            <TableCell colSpan={columnas} className="bg-surface-muted p-0 max-md:block">
                              <DetalleMesAMes fila={f} />
                            </TableCell>
                          </TableRow>
                        ) : null,
                      ];
                    })
                  )}
                </TableBody>
                {filas.length > 0 && vistaEfectiva === 'todos' ? (
                  <TableFooter className="max-md:hidden">
                    <TableRow>
                      <TableCell colSpan={2} className="font-medium">
                        Total
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {formatCurrency(datos.totales.baseCop)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {formatCurrency(datos.totales.retefuenteCop)}
                      </TableCell>
                      {/* Revisora r27 (B-B): el pie lleva las mismas columnas que el encabezado;
                          si no, el total cae bajo «Certificado» y bajo «Total» se lee un $ 0 falso. */}
                      {conReteIva ? (
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.reteIvaCop)}
                        </TableCell>
                      ) : null}
                      {conReteIca ? (
                        <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.reteIcaCop)}
                        </TableCell>
                      ) : null}
                      <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                        {formatCurrency(datos.totales.totalRetenidoCop)}
                      </TableCell>
                      <TableCell>&nbsp;</TableCell>
                    </TableRow>
                  </TableFooter>
                ) : null}
              </Table>
            </section>

            {/* Lo que se consulta: cómo se emite y qué es cada columna. */}
            <MasDetalles etiqueta="Cómo se emiten los certificados" etiquetaAbierto="Ocultar cómo se emiten">
              <div className="max-w-2xl space-y-2 text-body-sm leading-relaxed text-fg-muted">
                <p>
                  Al cerrar el año esto se hace solo para todos tus propietarios y queda disponible en
                  su portal. «Emitir el de todos» es para el año que el cierre automático no alcanzó, o
                  para la historia que acabas de migrar: se salta a quien ya lo tiene, así que apretarlo
                  dos veces no duplica ningún documento.
                </p>
                <p>
                  Emitir fija el número y la fecha del certificado: es el acto de entregarlo, no el
                  cálculo. El cálculo sale de las cuotas y se puede volver a mirar cuando quieras; por
                  eso no se guarda una segunda copia de la plata.
                </p>
                <p>
                  <strong className="font-medium text-fg">Base</strong>: el canon bruto de los períodos
                  sobre los que se retuvo. <strong className="font-medium text-fg">Total</strong>:
                  retefuente + ReteIVA + ReteICA, lo que va en el certificado.
                </p>
              </div>
            </MasDetalles>
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}

type VistaDelCertificado = 'todos' | 'por-emitir' | 'sin-documento' | 'emitidos';

/** El detalle mes a mes, que es como se imprime el certificado. */
function DetalleMesAMes({ fila }: { fila: FilaDelCertificado }) {
  return (
    <div className="p-4" data-testid={`detalle-${fila.propietarioId}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Retefuente</TableHead>
            <TableHead className="text-right">ReteIVA</TableHead>
            <TableHead className="text-right">ReteICA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fila.porMes.map((m) => (
            <TableRow key={m.mes}>
              <TableCell>{nombreDelMes(m.mes)}</TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                {formatCurrency(m.baseCop)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                {formatCurrency(m.retefuenteCop)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                {formatCurrency(m.reteIvaCop)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                {formatCurrency(m.reteIcaCop)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
