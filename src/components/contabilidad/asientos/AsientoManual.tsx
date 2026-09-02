'use client';

/**
 * El asiento manual: N líneas cuenta / débito / crédito, y la diferencia a la
 * vista mientras se escribe.
 *
 * La validación es la de `partida-doble.ts` (la misma regla que el back); el
 * botón de enviar no se prende hasta que cuadre. 🔴 Los montos entran por
 * `CurrencyInput` de cadence: un `<input>` con «1.500.000» parseado a mano es
 * cómo un pago de 500.000 se registró como 500 en este mismo panel.
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { generarIdempotencyKey } from '@/lib/contratos/idempotencia';
import { toast } from 'sonner';
import { Plus, Trash } from '@phosphor-icons/react';
import { Banner, CurrencyInput } from '@leasefy/cadence';

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
import { Label } from '@/components/ui/label';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_DESCRIPCION,
  type AsientoContable,
  type CuentaPuc,
  type MovimientoNuevo,
} from '@/lib/api/contabilidad.service';
import {
  lineaVacia,
  TEXTO_DE_ERROR_DE_LINEA,
  validarPartidaDoble,
  type LineaDelFormulario,
} from '@/lib/contabilidad/partida-doble';
import { diaDe, hoy } from '@/lib/contabilidad/fechas';
import { cn } from '@/lib/utils';
import { Monto } from '../Monto';
import { SelectorDeCuenta } from '../SelectorDeCuenta';

export interface AsientoManualProps {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (asiento: AsientoContable) => void;
  cuentas: readonly CuentaPuc[];
  /** Último día cerrado: la fecha tiene que ser posterior. */
  cerradaHasta?: string | null;
}

let contador = 0;
function claveNueva(): string {
  contador += 1;
  return `l${contador}`;
}

function lineasIniciales(): LineaDelFormulario[] {
  return [lineaVacia(claveNueva()), lineaVacia(claveNueva())];
}

/** `NaN` (campo vacío en `CurrencyInput`) → `null`. */
function aMonto(v: number): number | null {
  return Number.isNaN(v) ? null : v;
}

export function AsientoManual({ abierto, onCerrar, onCreado, cuentas, cerradaHasta }: AsientoManualProps) {
  const id = useId();
  const [fecha, setFecha] = useState(hoy());
  const [descripcion, setDescripcion] = useState('');
  // Una por apertura del formulario (ver el `crear` de abajo).
  const [claveIdempotencia] = useState(() => generarIdempotencyKey());
  const [lineas, setLineas] = useState<LineaDelFormulario[]>(lineasIniciales);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (abierto) {
      setFecha(hoy());
      setDescripcion('');
      setLineas(lineasIniciales());
      setError(null);
      setIntentado(false);
    }
  }, [abierto]);

  const veredicto = useMemo(() => validarPartidaDoble(lineas), [lineas]);
  const fechaCerrada = Boolean(cerradaHasta && diaDe(fecha) && fecha <= cerradaHasta);
  const listo =
    veredicto.valido && descripcion.trim().length > 0 && Boolean(diaDe(fecha)) && !fechaCerrada;

  const cambiar = useCallback((clave: string, cambio: Partial<LineaDelFormulario>) => {
    setLineas((prev) => prev.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  }, []);

  const quitar = useCallback((clave: string) => {
    setLineas((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.clave !== clave)));
  }, []);

  const agregar = useCallback(() => {
    setLineas((prev) => [...prev, lineaVacia(claveNueva())]);
  }, []);

  const cerrar = useCallback(() => {
    if (enviando) return;
    onCerrar();
  }, [enviando, onCerrar]);

  const enviar = useCallback(async () => {
    setIntentado(true);
    if (!listo) return;
    setEnviando(true);
    setError(null);
    try {
      const movimientos: MovimientoNuevo[] = lineas.map((l) => {
        const m: MovimientoNuevo = { cuentaId: l.cuentaId };
        if (l.debitoCop) m.debitoCop = l.debitoCop;
        if (l.creditoCop) m.creditoCop = l.creditoCop;
        if (l.descripcion.trim()) m.descripcion = l.descripcion.trim();
        return m;
      });
      const creado = await contabilidadApi.asientos.crear({
        fecha,
        descripcion: descripcion.trim(),
        movimientos,
        // Una llave por formulario abierto: si la red se corta después de
        // que el back escribió y la persona reintenta, el back devuelve el
        // MISMO asiento en vez de crear un duplicado. `AsientoDeApertura` ya
        // la mandaba; acá faltaba (auditoría 2026-09-01).
        claveIdempotencia,
      });
      toast.success(`Asiento n.º ${creado.numero} creado`, {
        description: `${lineas.length} líneas por ${veredicto.totales.debitos.toLocaleString('es-CO')} COP.`,
      });
      onCreado(creado);
      onCerrar();
    } catch (e) {
      setError(mensajeDeContabilidad(e, 'No se pudo crear el asiento.'));
    } finally {
      setEnviando(false);
    }
  }, [listo, lineas, fecha, descripcion, veredicto.totales.debitos, onCreado, onCerrar, claveIdempotencia]);

  const { diferencia } = veredicto.totales;

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && cerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="asiento-manual">
        <DialogHeader>
          <DialogTitle>Asiento manual</DialogTitle>
          <DialogDescription>
            Mínimo dos líneas, y la suma de débitos igual a la de créditos. Una vez creado no se
            edita: se reversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-fecha`}>Fecha</Label>
              <Input
                id={`${id}-fecha`}
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={enviando}
                aria-invalid={fechaCerrada || undefined}
                data-testid="asiento-fecha"
              />
              {fechaCerrada ? (
                <p className="text-xs text-danger" role="alert">
                  La contabilidad está cerrada hasta el {cerradaHasta}. Usá una fecha posterior.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-descripcion`}>Descripción</Label>
              <Input
                id={`${id}-descripcion`}
                value={descripcion}
                maxLength={LARGO_MAXIMO_DE_DESCRIPCION}
                placeholder="Causación del canon de febrero"
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={enviando}
                aria-invalid={(intentado && !descripcion.trim()) || undefined}
                data-testid="asiento-descripcion"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px] space-y-2">
              <div className="grid grid-cols-[minmax(220px,2fr)_150px_150px_minmax(140px,1.4fr)_40px] gap-2 px-1 font-mono text-[11px] uppercase tracking-wide text-fg-muted">
                <span>Cuenta</span>
                <span className="text-right">Débito</span>
                <span className="text-right">Crédito</span>
                <span>Detalle (opcional)</span>
                <span />
              </div>

              {lineas.map((l, i) => {
                const errorDeLinea = intentado ? veredicto.porLinea[l.clave] : undefined;
                return (
                  <div key={l.clave} className="space-y-1" data-testid="linea-de-asiento">
                    <div className="grid grid-cols-[minmax(220px,2fr)_150px_150px_minmax(140px,1.4fr)_40px] items-center gap-2">
                      <SelectorDeCuenta
                        cuentas={cuentas}
                        value={l.cuentaId}
                        onChange={(cuentaId) => cambiar(l.clave, { cuentaId })}
                        soloImputables
                        invalid={errorDeLinea === 'SIN_CUENTA'}
                        disabled={enviando}
                        className="w-full"
                      />
                      <CurrencyInput
                        aria-label={`Débito de la línea ${i + 1}`}
                        value={l.debitoCop ?? undefined}
                        onChange={(v) => cambiar(l.clave, { debitoCop: aMonto(v) })}
                        invalid={Boolean(errorDeLinea && errorDeLinea !== 'SIN_CUENTA')}
                        disabled={enviando}
                        className="text-right"
                        data-testid="linea-debito"
                      />
                      <CurrencyInput
                        aria-label={`Crédito de la línea ${i + 1}`}
                        value={l.creditoCop ?? undefined}
                        onChange={(v) => cambiar(l.clave, { creditoCop: aMonto(v) })}
                        invalid={Boolean(errorDeLinea && errorDeLinea !== 'SIN_CUENTA')}
                        disabled={enviando}
                        className="text-right"
                        data-testid="linea-credito"
                      />
                      <Input
                        aria-label={`Detalle de la línea ${i + 1}`}
                        value={l.descripcion}
                        maxLength={LARGO_MAXIMO_DE_DESCRIPCION}
                        onChange={(e) => cambiar(l.clave, { descripcion: e.target.value })}
                        disabled={enviando}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        hideArrow
                        aria-label={`Quitar la línea ${i + 1}`}
                        onClick={() => quitar(l.clave)}
                        disabled={enviando || lineas.length <= 2}
                      >
                        <Trash className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    {errorDeLinea ? (
                      <p className="px-1 text-xs text-danger" role="alert">
                        {TEXTO_DE_ERROR_DE_LINEA[errorDeLinea]}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                onClick={agregar}
                disabled={enviando}
                data-testid="agregar-linea"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Agregar línea
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-md border p-3',
              diferencia === 0 && veredicto.totales.debitos > 0
                ? 'border-border bg-success-soft'
                : 'border-border bg-surface-muted',
            )}
            aria-live="polite"
            data-testid="totales-del-asiento"
          >
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex items-baseline gap-2">
                <dt className="text-fg-muted">Débitos</dt>
                <dd>
                  <Monto valor={veredicto.totales.debitos} />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-fg-muted">Créditos</dt>
                <dd>
                  <Monto valor={veredicto.totales.creditos} />
                </dd>
              </div>
            </dl>
            <p className="text-sm" data-testid="diferencia">
              {diferencia === 0 ? (
                veredicto.totales.debitos > 0 ? (
                  <span className="font-medium text-success">Cuadra</span>
                ) : (
                  <span className="text-fg-muted">Sin montos todavía</span>
                )
              ) : diferencia > 0 ? (
                <span className="text-danger">
                  Faltan <Monto valor={diferencia} /> en créditos
                </span>
              ) : (
                <span className="text-danger">
                  Faltan <Monto valor={-diferencia} /> en débitos
                </span>
              )}
            </p>
          </div>

          {error ? (
            <Banner variant="danger" role="alert">
              {error}
            </Banner>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void enviar()}
            isLoading={enviando}
            disabled={enviando || !listo}
            data-testid="crear-asiento"
          >
            Crear asiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
