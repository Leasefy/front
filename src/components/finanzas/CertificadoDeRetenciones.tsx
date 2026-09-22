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
import { CaretDown, CaretRight, SealCheck } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, Cifra, TituloDeBloque } from '@/components/finanzas/piezas';
import { explicar } from '@/components/finanzas/TasasDeUsura';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/types/inmobiliaria';

const NUMERO = new Intl.NumberFormat('es-CO');

/** Qué mide cada criterio, escrito. Va al lado del selector, no en un tooltip. */
export const QUE_MIDE_EL_CRITERIO: Record<CriterioDeRetencion, string> = {
  CAUSADO:
    'Entran las cuotas del año, se hayan pagado o no. Es lo que se alinea con cómo se factura acá: la factura del canon nace el día 1, así que hay abono en cuenta desde ese día (art. 392 del E.T.).',
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

  async function emitir(fila: FilaDelCertificado) {
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
    <div className="space-y-5" data-testid="certificado-de-retenciones">
      {/* ── Año y criterio ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-fg-muted">
          <span>Año gravable</span>
          <select
            aria-label="Año gravable"
            data-testid="selector-de-anio"
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={String(anio)}
            onChange={(e) => setAnio(Number(e.target.value))}
          >
            {aniosDisponibles().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-fg-muted">
          <span>Criterio</span>
          <select
            aria-label="Criterio"
            data-testid="selector-de-criterio"
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg"
            value={criterio}
            onChange={(e) => setCriterio(e.target.value as CriterioDeRetencion)}
          >
            <option value="CAUSADO">Por causación</option>
            <option value="PAGADO">Por caja (pagado)</option>
          </select>
        </label>
        <p className="max-w-xl text-caption leading-relaxed text-fg-muted" data-testid="que-mide-el-criterio">
          {QUE_MIDE_EL_CRITERIO[criterio]}
        </p>
        {/* 🔴 (18-09) Antes esto sólo se podía emitir de a uno: una inmobiliaria
            con 300 propietarios necesitaba 300 clics, y quien se olvidara no se
            enteraba hasta que el propietario reclamara en abril. */}
        <Button
          hideArrow
          data-testid="emitir-todos-los-certificados"
          isLoading={emitiendoTodos}
          onClick={() => void emitirTodos()}
        >
          Emitir el de todos
        </Button>
      </div>
      <p className="max-w-2xl text-caption leading-relaxed text-fg-muted">
        Al cerrar el año esto se hace SOLO para todos tus propietarios y queda disponible en su
        portal. El botón está acá para el año que el cierre automático no alcanzó, o para la
        historia que acabas de migrar: se salta a quien ya lo tiene, así que apretarlo dos veces no
        duplica ningún documento.
      </p>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={error}
        queEs="el certificado de retenciones"
        onReintentar={cargar}
        conservarContenido={Boolean(datos)}
      >
        {datos ? (
          <div className="space-y-5">
            <Avisos
              avisos={datos.avisos}
              testId="avisos-del-certificado"
              titulo="Lo que hay que mirar antes de entregarlo"
            />

            <section className="space-y-3">
              <TituloDeBloque
                titulo={`Retenciones del ${datos.anio}`}
                explicacion="Lo que los inquilinos le retuvieron a cada propietario. La cuota quedó saldada con el canon completo; lo retenido se le descontó en su liquidación, porque es su impuesto."
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Cifra
                  id="base"
                  etiqueta="Base"
                  valor={datos.totales.baseCop}
                  definicion="El canon bruto de los períodos sobre los que se retuvo."
                />
                <Cifra
                  id="retefuente"
                  etiqueta="Retefuente"
                  valor={datos.totales.retefuenteCop}
                  definicion="Retención en la fuente practicada por los inquilinos."
                />
                <Cifra
                  id="total-retenido"
                  etiqueta="Total retenido"
                  valor={datos.totales.totalRetenidoCop}
                  definicion="Retefuente + ReteIVA + ReteICA. Es lo que va en los certificados."
                />
                <Cifra
                  id="propietarios"
                  etiqueta="Propietarios"
                  valor={datos.totales.propietarios}
                  definicion="Cuántos propietarios tienen algo que certificar este año."
                />
              </div>
            </section>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propietario</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">Retefuente</TableHead>
                      <TableHead className="text-right">ReteIVA</TableHead>
                      <TableHead className="text-right">ReteICA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Certificado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datos.filas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-fg-muted">
                          A ningún propietario le retuvieron nada en {datos.anio} con este criterio.
                          No hay certificados que emitir.
                        </TableCell>
                      </TableRow>
                    ) : (
                      datos.filas.map((f) => {
                        const emitido = emitidos.get(f.propietarioId);
                        const abierto = abierta === f.propietarioId;
                        return [
                          <TableRow key={f.propietarioId} data-testid={`fila-${f.propietarioId}`}>
                            <TableCell className="font-medium text-fg">
                              <button
                                type="button"
                                className="flex items-center gap-1.5 text-left"
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
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-caption">
                              {f.documento || (
                                <span className="text-warning">Sin documento</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(f.baseCop)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(f.retefuenteCop)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(f.reteIvaCop)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCurrency(f.reteIcaCop)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums font-medium">
                              {formatCurrency(f.totalRetenidoCop)}
                            </TableCell>
                            <TableCell>
                              {emitido ? (
                                <span className="flex flex-col items-start gap-1">
                                  <span
                                    className="inline-flex items-center gap-1 text-caption text-success"
                                    data-testid={`emitido-${f.propietarioId}`}
                                  >
                                    <SealCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                    {emitido.numero} · {emitido.emitidoAt.slice(0, 10)}
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
                                  onClick={() => void emitir(f)}
                                >
                                  Emitir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>,
                          abierto ? (
                            <TableRow key={`${f.propietarioId}-detalle`}>
                              <TableCell colSpan={8} className="bg-surface-muted p-0">
                                <DetalleMesAMes fila={f} />
                              </TableCell>
                            </TableRow>
                          ) : null,
                        ];
                      })
                    )}
                  </TableBody>
                  {datos.filas.length > 0 ? (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-medium">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.baseCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.retefuenteCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.reteIvaCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(datos.totales.reteIcaCop)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium">
                          {formatCurrency(datos.totales.totalRetenidoCop)}
                        </TableCell>
                        <TableCell>&nbsp;</TableCell>
                      </TableRow>
                    </TableFooter>
                  ) : null}
                </Table>
              </div>
            </div>

            <p className="text-caption leading-relaxed text-fg-muted">
              Emitir FIJA el número y la fecha del certificado: es el acto de entregarlo, no el
              cálculo. El cálculo sale de las cuotas y se puede volver a mirar cuando quieras — por
              eso no se guarda una segunda copia de la plata.
            </p>
          </div>
        ) : null}
      </EstadoDeDatos>
    </div>
  );
}

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
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(m.baseCop)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(m.retefuenteCop)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(m.reteIvaCop)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatCurrency(m.reteIcaCop)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
