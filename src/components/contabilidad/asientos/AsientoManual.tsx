'use client';

/**
 * El asiento manual: N líneas cuenta / débito / crédito, y la diferencia a la
 * vista mientras se escribe.
 *
 * 🔴 CB-16 (QA de Contabilidad, 03-10-2026): era un modal centrado; los
 * formularios de crear van en CAJÓN (decisión de Nico para «Hacer recibo de
 * caja» y «Nuevo propietario»): cabecera fija, las líneas en el cuerpo que
 * scrollea y «Crear asiento» en el pie, siempre a la vista. Y una línea con
 * débito Y crédito a la vez lo dice EN la línea apenas pasa — antes el botón
 * quedaba apagado sin decir por qué.
 *
 * La validación es la de `partida-doble.ts` (la misma regla que el back); el
 * botón de enviar no se prende hasta que cuadre. 🔴 Los montos entran por
 * `CurrencyInput` de cadence: un `<input>` con «1.500.000» parseado a mano es
 * cómo un pago de 500.000 se registró como 500 en este mismo panel.
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { generarIdempotencyKey } from '@/lib/contratos/idempotencia';
import { toast } from '@/components/ui/toast';
import { Plus, Trash } from '@phosphor-icons/react';
import { Banner, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence';
import { CampoDePlata } from '@/components/ui/campo-de-plata';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { ApiError } from '@/lib/api/client';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  MAX_LINEAS_POR_ASIENTO,
  MENSAJES_DE_CONTABILIDAD,
} from '@/lib/contabilidad/limites-de-contabilidad';
import {
  contabilidadApi,
  LARGO_MAXIMO_DE_DESCRIPCION,
  type AsientoContable,
  type CuentaPuc,
  type MovimientoNuevo,
} from '@/lib/api/contabilidad.service';
import {
  lineaVacia,
  textoDeErrorDeLinea,
  validarPartidaDoble,
  type LineaDelFormulario,
} from '@/lib/contabilidad/partida-doble';
import { diaDe, diaLegible, hoy } from '@/lib/contabilidad/fechas';
import { plata } from '@/lib/contabilidad/plata';
import { cn } from '@/lib/utils';
import { CampoDeDia } from '../CampoDeDia';
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

/**
 * Los códigos de negocio del back que son de la FECHA: van bajo el campo de la
 * fecha, no en el banner de abajo. El texto sigue siendo el de
 * `mensajeDeContabilidad`.
 */
const CODIGOS_DE_LA_FECHA = new Set(['FECHA_INVALIDA', 'PERIODO_CERRADO']);

/** Los errores que mandó el back, repartidos por campo. */
interface ErroresDelServidor {
  fecha?: string;
  descripcion?: string;
  /** Por `clave` de la línea. */
  lineas: Record<string, string>;
}

const SIN_ERRORES: ErroresDelServidor = { lineas: {} };

/** La plata del asiento es de la contabilidad (`MovimientoDto` del back). */
const AREA_DE_LA_CONTABILIDAD = 'contabilidad_facturacion_y_exogena' as const;

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
  const [delServidor, setDelServidor] = useState<ErroresDelServidor>(SIN_ERRORES);
  /**
   * El campo que hay que enfocar cuando el envío termine. No se enfoca dentro
   * del `catch`: ahí los controles siguen `disabled` (`enviando`) y un control
   * deshabilitado no recibe el foco.
   */
  const [porEnfocar, setPorEnfocar] = useState<string | null>(null);
  useEffect(() => {
    if (enviando || !porEnfocar) return;
    document.getElementById(porEnfocar)?.focus();
    setPorEnfocar(null);
  }, [enviando, porEnfocar]);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (abierto) {
      setFecha(hoy());
      setDescripcion('');
      setLineas(lineasIniciales());
      setError(null);
      setDelServidor(SIN_ERRORES);
      setIntentado(false);
    }
  }, [abierto]);

  // «Centavos en todo» (C3-FRONT): con la llave de la contabilidad los montos
  // llevan centavos y la diferencia se cuenta exacta al centavo.
  const conCentavos = usePlataConCentavos(AREA_DE_LA_CONTABILIDAD);
  const veredicto = useMemo(() => validarPartidaDoble(lineas, { conCentavos }), [lineas, conCentavos]);
  const fechaCerrada = Boolean(cerradaHasta && diaDe(fecha) && fecha <= cerradaHasta);
  const listo =
    veredicto.valido && descripcion.trim().length > 0 && Boolean(diaDe(fecha)) && !fechaCerrada;

  const cambiar = useCallback((clave: string, cambio: Partial<LineaDelFormulario>) => {
    // El error que puso el back en esta línea ya no habla de lo que hay.
    setDelServidor((d) => {
      if (!d.lineas[clave]) return d;
      const resto = { ...d.lineas };
      delete resto[clave];
      return { ...d, lineas: resto };
    });
    setLineas((prev) => prev.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));
  }, []);

  const quitar = useCallback((clave: string) => {
    setLineas((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.clave !== clave)));
  }, []);

  // 🔁 El tope de líneas del back (`MAX_LINEAS_POR_ASIENTO`): no se ofrece una
  // línea que el back rechazaría.
  const lleno = lineas.length >= MAX_LINEAS_POR_ASIENTO;
  const agregar = useCallback(() => {
    setLineas((prev) =>
      prev.length >= MAX_LINEAS_POR_ASIENTO ? prev : [...prev, lineaVacia(claveNueva())],
    );
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
    setDelServidor(SIN_ERRORES);
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
      // El mismo 201 sirve para «lo acabo de crear» y para «esta llave ya tenía
      // asiento»: `yaExistia` es lo único que los distingue, y sin mirarlo el
      // aviso celebra una creación que no ocurrió.
      if (creado.yaExistia) {
        toast.success(`El asiento n.º ${creado.numero} ya estaba registrado`, {
          description: 'No se creó ninguno nuevo: este envío devolvió el que ya había quedado.',
        });
      } else {
        toast.success(`Asiento n.º ${creado.numero} creado`, {
          description: `${lineas.length} líneas por ${plata(veredicto.totales.debitos)}.`,
        });
      }
      onCreado(creado);
      onCerrar();
    } catch (e) {
      /*
       * Un 400 con `campos` va a su campo: `movimientos.2.debitoCop` → la línea
       * 3, `fecha` → la fecha. Un código de la fecha (período cerrado, día que
       * no existe) también va bajo la fecha. Al banner va sólo lo que no tiene
       * dónde ir, con la regla de oro de `mensajeDeContabilidad`.
       */
      const mapa: Record<string, string> = {};
      lineas.forEach((l, i) => {
        for (const sub of ['cuentaId', 'debitoCop', 'creditoCop', 'descripcion', 'terceroTipo', 'terceroId']) {
          mapa[`movimientos.${i}.${sub}`] = `linea:${l.clave}`;
        }
      });
      const reparto = repartirErroresDelServidor(e, {
        mapa,
        campos: ['fecha', 'descripcion', ...lineas.map((l) => `linea:${l.clave}`)],
      });
      const siguientes: ErroresDelServidor = { lineas: {} };
      for (const campo of reparto.orden) {
        const mensaje = reparto.porCampo[campo];
        if (!mensaje) continue;
        if (campo === 'fecha') siguientes.fecha = mensaje;
        else if (campo === 'descripcion') siguientes.descripcion = mensaje;
        else siguientes.lineas[campo.slice('linea:'.length)] = mensaje;
      }
      const codigo = e instanceof ApiError ? e.code : undefined;
      if (reparto.delServidor.length === 0 && codigo && CODIGOS_DE_LA_FECHA.has(codigo)) {
        siguientes.fecha = mensajeDeContabilidad(e, 'No se pudo crear el asiento.');
      } else if (reparto.delServidor.length === 0) {
        setError(mensajeDeContabilidad(e, 'No se pudo crear el asiento.'));
      } else if (reparto.sueltos.length > 0) {
        setError(reparto.sueltos.join(' · '));
      }
      setDelServidor(siguientes);
      const primero = siguientes.fecha
        ? `${id}-fecha`
        : siguientes.descripcion
          ? `${id}-descripcion`
          : Object.keys(siguientes.lineas)[0]
            ? `${id}-linea-${Object.keys(siguientes.lineas)[0]}-debito`
            : null;
      setPorEnfocar(primero);
    } finally {
      setEnviando(false);
    }
  }, [listo, lineas, fecha, descripcion, veredicto.totales.debitos, onCreado, onCerrar, claveIdempotencia, id]);

  const errorDeFecha = fechaCerrada
    ? `La contabilidad está cerrada hasta el ${diaLegible(cerradaHasta)}. Usa una fecha posterior.`
    : delServidor.fecha;

  const { diferencia } = veredicto.totales;

  return (
    // `xl` (880): la tabla de líneas cabe sin correrse de lado en escritorio.
    <Cajon
      abierto={abierto}
      onOpenChange={(open) => !open && cerrar()}
      tamano="xl"
      data-testid="asiento-manual"
    >
      <CajonCabecera
        titulo="Asiento manual"
        descripcion="Mínimo dos líneas, y la suma de débitos igual a la de créditos. Una vez creado no se edita: se reversa."
      />

      <CajonCuerpo className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-fecha`}>Fecha</Label>
              {/* CB-04: el selector de fecha del DS, no el del navegador. */}
              <CampoDeDia
                id={`${id}-fecha`}
                value={fecha}
                onChange={(valor) => {
                  setDelServidor((d) => (d.fecha ? { ...d, fecha: undefined } : d));
                  setFecha(valor);
                }}
                disabled={enviando}
                invalido={Boolean(errorDeFecha)}
                describedBy={errorDeFecha ? `${id}-fecha-error` : undefined}
                testid="asiento-fecha"
              />
              <ErrorDelCampo id={`${id}-fecha-error`} mensaje={errorDeFecha} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-descripcion`}>Descripción</Label>
              <Input
                id={`${id}-descripcion`}
                value={descripcion}
                maxLength={LARGO_MAXIMO_DE_DESCRIPCION}
                placeholder="Causación del canon de febrero"
                onChange={(e) => {
                  setDelServidor((d) => (d.descripcion ? { ...d, descripcion: undefined } : d));
                  setDescripcion(e.target.value);
                }}
                disabled={enviando}
                aria-invalid={(intentado && !descripcion.trim()) || Boolean(delServidor.descripcion) || undefined}
                aria-describedby={delServidor.descripcion ? `${id}-descripcion-error` : undefined}
                data-testid="asiento-descripcion"
              />
              <ErrorDelCampo id={`${id}-descripcion-error`} mensaje={delServidor.descripcion} />
            </div>
          </div>

          {/* 🔴 QA-CONTA (COLA-FRONT, 04-10): a 390 px las líneas se corrían de
              lado. Bajo `md` cada línea es una tarjeta (cuenta arriba, débito y
              crédito lado a lado, el detalle abajo); desde `md`, la grilla. */}
          <div className="md:overflow-x-auto">
            <div className="space-y-2 md:min-w-[640px]">
              <div className="hidden grid-cols-[minmax(220px,2fr)_150px_150px_minmax(140px,1.4fr)_40px] gap-2 px-1 font-mono text-[11px] uppercase tracking-wide text-fg-muted md:grid">
                <span>Cuenta</span>
                <span className="text-right">Débito</span>
                <span className="text-right">Crédito</span>
                <span>Detalle (opcional)</span>
                <span />
              </div>

              {/* La línea que se agrega entra y la que se quita SALE (las de
                  abajo suben), con el escalonado del sistema. */}
              <Stagger className="space-y-2">
              {lineas.map((l, i) => {
                // Débito Y crédito en la misma línea se dice apenas pasa (CB-16):
                // no es un campo por llenar, es una contradicción. Lo demás
                // (falta la cuenta, falta el monto) espera al intento.
                // (Aunque todavía no tenga cuenta: el regaño es por los montos.)
                const dosLados = Boolean(l.debitoCop) && Boolean(l.creditoCop);
                const errorDeLinea = intentado
                  ? veredicto.porLinea[l.clave]
                  : dosLados
                    ? ('DOS_LADOS' as const)
                    : undefined;
                const mensajeDeLinea = errorDeLinea
                  ? textoDeErrorDeLinea(errorDeLinea, conCentavos)
                  : delServidor.lineas[l.clave];
                const idDelError = `${id}-linea-${l.clave}-error`;
                const describe = mensajeDeLinea ? idDelError : undefined;
                return (
                  <StaggerItem key={l.clave} className="space-y-1" data-testid="linea-de-asiento">
                    <div
                      className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 md:grid-cols-[minmax(220px,2fr)_150px_150px_minmax(140px,1.4fr)_40px] md:items-center md:rounded-none md:border-0 md:p-0"
                      data-testid="linea-de-asiento-campos"
                    >
                      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                        <span className="w-6 shrink-0 font-mono text-caption text-fg-subtle md:hidden" aria-hidden="true">
                          {i + 1}
                        </span>
                        <SelectorDeCuenta
                          cuentas={cuentas}
                          value={l.cuentaId}
                          onChange={(cuentaId) => cambiar(l.clave, { cuentaId })}
                          soloImputables
                          invalid={errorDeLinea === 'SIN_CUENTA'}
                          disabled={enviando}
                          className="w-full min-w-0"
                        />
                      </div>
                      <label className="space-y-1 md:contents">
                        <span className="block text-caption text-fg-muted md:hidden">Débito</span>
                      <CampoDePlata
                        areas={AREA_DE_LA_CONTABILIDAD}
                        id={`${id}-linea-${l.clave}-debito`}
                        aria-label={`Débito de la línea ${i + 1}`}
                        aria-describedby={describe}
                        value={l.debitoCop ?? undefined}
                        onChange={(v) => cambiar(l.clave, { debitoCop: aMonto(v) })}
                        invalid={Boolean(
                          (errorDeLinea && errorDeLinea !== 'SIN_CUENTA') || delServidor.lineas[l.clave],
                        )}
                        disabled={enviando}
                        className="text-right"
                        data-testid="linea-debito"
                      />
                      </label>
                      <label className="space-y-1 md:contents">
                        <span className="block text-caption text-fg-muted md:hidden">Crédito</span>
                      <CampoDePlata
                        areas={AREA_DE_LA_CONTABILIDAD}
                        aria-label={`Crédito de la línea ${i + 1}`}
                        aria-describedby={describe}
                        value={l.creditoCop ?? undefined}
                        onChange={(v) => cambiar(l.clave, { creditoCop: aMonto(v) })}
                        invalid={Boolean(
                          (errorDeLinea && errorDeLinea !== 'SIN_CUENTA') || delServidor.lineas[l.clave],
                        )}
                        disabled={enviando}
                        className="text-right"
                        data-testid="linea-credito"
                      />
                      </label>
                      <Input
                        aria-label={`Detalle de la línea ${i + 1}`}
                        placeholder="Detalle (opcional)"
                        value={l.descripcion}
                        maxLength={LARGO_MAXIMO_DE_DESCRIPCION}
                        onChange={(e) => cambiar(l.clave, { descripcion: e.target.value })}
                        disabled={enviando}
                        className="col-span-2 md:col-span-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        hideArrow
                        aria-label={`Quitar la línea ${i + 1}`}
                        onClick={() => quitar(l.clave)}
                        disabled={enviando || lineas.length <= 2}
                        className="col-span-2 justify-self-end md:col-span-1"
                      >
                        <Trash className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <ErrorDelCampo
                      id={idDelError}
                      mensaje={mensajeDeLinea}
                      className="px-1"
                    />
                  </StaggerItem>
                );
              })}
              </Stagger>

              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                onClick={agregar}
                disabled={enviando || lleno}
                title={lleno ? MENSAJES_DE_CONTABILIDAD.demasiadasLineas : undefined}
                data-testid="agregar-linea"
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Agregar línea
              </Button>
              {lleno ? (
                <p className="px-1 text-caption text-fg-muted">
                  {MENSAJES_DE_CONTABILIDAD.demasiadasLineas}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-md border p-3',
              diferencia === 0 && veredicto.totales.debitos > 0
                ? 'border-border bg-success-soft'
                : 'border-border',
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
              {/* «Cuadra» ⇄ «Faltan…» se cruzan en su lugar. Las cifras no
                  cuentan: están en una región `aria-live` y cada paso del
                  conteo se leería en voz alta. */}
              <CrossFade
                as="span"
                swapKey={diferencia === 0 ? (veredicto.totales.debitos > 0 ? 'cuadra' : 'vacio') : diferencia > 0 ? 'faltan-creditos' : 'faltan-debitos'}
                mode="popLayout"
                className="inline-block"
              >
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
              </CrossFade>
            </p>
          </div>

          {error ? (
            <Banner variant="danger" role="alert">
              {error}
            </Banner>
          ) : null}
      </CajonCuerpo>

      <CajonPie>
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
      </CajonPie>
    </Cajon>
  );
}
