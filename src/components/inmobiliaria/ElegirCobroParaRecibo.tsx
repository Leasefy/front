'use client';

/**
 * Elegir contra cuál cobro va el recibo de caja — empezando por el INMUEBLE,
 * y con DOS caminos después.
 *
 * ── Qué es un recibo de caja, en este sistema ────────────────────────────────
 * El recibo (`POST /inmobiliaria/recibos-de-caja`) deja constancia de que entró
 * plata contra UN cobro. El cobro es el cargo mensual que cuelga del mandato
 * del inmueble (`Cobro.consignacionId`) para el arriendo vigente
 * (`Cobro.leaseId`/`contractId`): canon + administración + conceptos +
 * impuestos + mora, con `pendingAmount` como saldo. El back valida que el
 * abono no pase del saldo (400 con el máximo) y que el cobro no tenga plata
 * vieja sin recibo (409 → conciliar). Nada de eso cambia acá.
 *
 * ── Por qué se empieza por el inmueble ───────────────────────────────────────
 * Quien recibe plata sabe DE QUÉ INMUEBLE (o de qué inquilino) es; el mes lo
 * sabe después. El Combobox de cadence sobre los mandatos activos de la
 * inmobiliaria, buscable por código, título, dirección o inquilino.
 *
 * ── Los dos caminos (Nico, 2026-09-03) ───────────────────────────────────────
 * «Deberíamos tener dos opciones: hacer recibo de caja si el inmueble tiene
 * cobros pendientes o no. La idea es dejar a la inmobiliaria hacer esto.»
 *
 *   A. «Contra un cobro pendiente»: los cobros con saldo de ESE mandato, de
 *      todos los meses (`GET /inmobiliaria/cobros?consignacionId=…`, sin
 *      `month`), del más reciente al más viejo. Elegir uno → el formulario.
 *
 *   B. «De un mes sin cobro»: la plata es de un mes que todavía no se cobró
 *      (el inquilino vino el 3 y la corrida sale el 5) o de un mes por
 *      adelantado. Se elige el mes y se crea el cobro de ESE inmueble para
 *      ESE mes (`POST /inmobiliaria/cobros/generate-one`), con el canon y
 *      los conceptos de su contrato; el cobro vuelve entero y se sigue con
 *      el recibo. Antes la única salida acá era `POST /cobros/generate`, la
 *      corrida masiva: crear cien cobros para emitir uno.
 *
 * Se arranca en A si hay saldo pendiente y en B si no; el usuario cambia de
 * camino cuando quiere. Un recibo sin cobro NO existe —la contabilidad, la
 * conciliación bancaria y la liquidación del propietario cuelgan del cobro—,
 * así que B no lo inventa: crea el cobro y recibe contra él.
 */

import * as React from 'react';
import { Buildings, CalendarBlank, Plus } from '@phosphor-icons/react';
import { SegmentedControl } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble';
import { cobrosApi } from '@/lib/api/inmobiliaria.service';
import type { Cobro, Consignacion } from '@/lib/types/inmobiliaria';
import { mesEnTitulo } from '@/lib/utils/mes';

// ── Reglas puras (probadas solas en ElegirCobroParaRecibo.test.tsx) ──────────

/**
 * Los mandatos entre los que se elige: los ACTIVOS con inmueble. Los
 * arrendados van primero porque casi siempre son los que reciben plata; los
 * demás no se esconden — un mandato con la disponibilidad desactualizada
 * puede tener cobros con saldo igual, y esconderlo era otro callejón.
 */
export function inmueblesParaRecibo(consignaciones: readonly Consignacion[]): Consignacion[] {
  return consignaciones
    .filter((c) => c.status === 'active' && Boolean(c.propertyId))
    .sort((a, b) => {
      const ra = a.availability === 'rented' ? 0 : 1;
      const rb = b.availability === 'rented' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.propertyTitle.localeCompare(b.propertyTitle);
    });
}

/**
 * El código, el título, la dirección y el inquilino, juntos: el filtro del
 * Combobox mira sólo `label`, así que todo lo que se quiera buscar va acá.
 */
export function etiquetaParaRecibo(c: Consignacion): string {
  const inquilino = c.currentTenantName?.trim();
  return inquilino ? `${etiquetaDeInmueble(c)} · ${inquilino}` : etiquetaDeInmueble(c);
}

/**
 * Los cobros de UN mandato que todavía tienen saldo, del más reciente al más
 * viejo. `month` es 'YYYY-MM', así que ordena bien como texto; a igual mes,
 * el que vence después primero.
 */
export function cobrosPendientesDe(cobros: readonly Cobro[], consignacionId: string): Cobro[] {
  return cobros
    .filter((c) => c.consignacionId === consignacionId && c.status !== 'paid' && c.pendingAmount > 0)
    .sort((a, b) => {
      if (a.month !== b.month) return a.month < b.month ? 1 : -1;
      return (b.dueDate ?? '').localeCompare(a.dueDate ?? '');
    });
}

/** 'YYYY-MM' más `n` meses (negativo para atrás), cruzando el año. */
export function sumarMeses(mes: string, n: number): string {
  const [anio, numero] = mes.split('-').map(Number);
  const total = anio * 12 + (numero - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/**
 * Los meses que se pueden cobrar a mano para un mandato: una ventana corta
 * alrededor del mes en curso (`atras` hacia atrás, `adelante` hacia adelante),
 * SIN los que ya tienen cobro — con saldo o sin él: un cobro por mandato y
 * mes es una restricción de la base, y el que tiene saldo ya está en el
 * camino A.
 */
export function mesesParaCobroNuevo(
  cobros: readonly Cobro[],
  consignacionId: string,
  mesActual: string,
  atras = 2,
  adelante = 3,
): string[] {
  const ocupados = new Set(cobros.filter((c) => c.consignacionId === consignacionId).map((c) => c.month));
  const meses: string[] = [];
  for (let n = -atras; n <= adelante; n += 1) {
    const mes = sumarMeses(mesActual, n);
    if (!ocupados.has(mes)) meses.push(mes);
  }
  return meses;
}

/**
 * El mes que se propone: el mes en curso si está libre, si no el primero
 * libre hacia adelante; y si todo lo de adelante ya se cobró, el más
 * reciente hacia atrás. Vacío si no queda ninguno.
 */
export function mesSugerido(meses: readonly string[], mesActual: string): string {
  return meses.find((m) => m >= mesActual) ?? meses[meses.length - 1] ?? '';
}

const VARIANTE_DEL_ESTADO: Record<Cobro['status'], 'warning' | 'default' | 'destructive' | 'success'> = {
  pending: 'warning',
  partial: 'default',
  late: 'destructive',
  defaulted: 'destructive',
  paid: 'success',
};

type Camino = 'pendiente' | 'nuevo';

// ── Componente ───────────────────────────────────────────────────────────────

export interface ElegirCobroParaReciboProps {
  /** Los mandatos de la inmobiliaria (la pantalla ya los tiene para sus filtros). */
  consignaciones: readonly Consignacion[];
  /** 'YYYY-MM' del mes en curso: el centro de la ventana de meses del camino B. */
  mesActual: string;
  onElegir: (cobro: Cobro) => void;
  /** Se creó un cobro desde acá: la tabla de atrás tiene que enterarse. */
  onCobrosGenerados?: () => void;
}

export function ElegirCobroParaRecibo({
  consignaciones,
  mesActual,
  onElegir,
  onCobrosGenerados,
}: ElegirCobroParaReciboProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const k = (s: string) => `recibos.form.elegir.${s}`;

  const [consignacionId, setConsignacionId] = React.useState<string>('');
  const [cobros, setCobros] = React.useState<Cobro[] | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // El camino lo elige el usuario; mientras no lo toque, se deriva del saldo.
  const [caminoElegido, setCaminoElegido] = React.useState<Camino | null>(null);
  const [mesElegido, setMesElegido] = React.useState('');
  const [creando, setCreando] = React.useState(false);
  const [errorAlCrear, setErrorAlCrear] = React.useState<string | null>(null);
  /** El mes que se pidió y ya existía pagado: no hay contra qué recibir. */
  const [mesYaPagado, setMesYaPagado] = React.useState<string | null>(null);

  /** Se cambia de inmueble antes de que conteste el anterior: la vieja no pisa. */
  const peticion = React.useRef(0);

  const inmuebles = React.useMemo(() => inmueblesParaRecibo(consignaciones), [consignaciones]);
  const opciones = React.useMemo<ComboboxOption[]>(
    () => inmuebles.map((c) => ({ value: c.id, label: etiquetaParaRecibo(c) })),
    [inmuebles],
  );
  const inmueble = React.useMemo(
    () => inmuebles.find((c) => c.id === consignacionId) ?? null,
    [inmuebles, consignacionId],
  );

  /**
   * Sin `t` entre las dependencias a propósito: `cargar` alimenta un efecto,
   * y un `t` que cambie de identidad por render lo convertiría en un bucle de
   * peticiones. Los mensajes se traducen al pintar; acá se guarda '' cuando
   * el error no trae texto.
   */
  const cargar = React.useCallback(async (id: string) => {
    const mia = ++peticion.current;
    setCargando(true);
    setError(null);
    try {
      const lista = await cobrosApi.getAll({ consignacionId: id });
      if (mia !== peticion.current) return;
      setCobros(lista);
    } catch (e) {
      if (mia !== peticion.current) return;
      setCobros([]);
      setError(e instanceof Error && e.message ? e.message : '');
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  }, []);

  React.useEffect(() => {
    // Otro inmueble: el camino, el mes y los avisos son del anterior.
    setCaminoElegido(null);
    setMesElegido('');
    setErrorAlCrear(null);
    setMesYaPagado(null);
    if (!consignacionId) {
      peticion.current += 1;
      setCobros(null);
      setError(null);
      setCargando(false);
      return;
    }
    void cargar(consignacionId);
  }, [consignacionId, cargar]);

  const pendientes = React.useMemo(
    () => (cobros && consignacionId ? cobrosPendientesDe(cobros, consignacionId) : []),
    [cobros, consignacionId],
  );
  const camino: Camino = caminoElegido ?? (pendientes.length > 0 ? 'pendiente' : 'nuevo');

  const meses = React.useMemo(
    () => (cobros && consignacionId ? mesesParaCobroNuevo(cobros, consignacionId, mesActual) : []),
    [cobros, consignacionId, mesActual],
  );
  // Derivado, no efecto: si el mes elegido dejó de estar libre, cae al sugerido.
  const mes = meses.includes(mesElegido) ? mesElegido : mesSugerido(meses, mesActual);
  const arrendado = inmueble?.availability === 'rented';

  const crear = React.useCallback(async () => {
    if (!consignacionId || !mes) return;
    setCreando(true);
    setErrorAlCrear(null);
    setMesYaPagado(null);
    try {
      const { cobro, creado } = await cobrosApi.generateOne(consignacionId, mes);
      if (creado) onCobrosGenerados?.();
      if (cobro.pendingAmount <= 0) {
        // Ya existía y está pagado: no hay contra qué recibir. Se vuelve a
        // buscar para que ese mes salga de la lista.
        setMesYaPagado(mes);
        await cargar(consignacionId);
        return;
      }
      onElegir(cobro);
    } catch (e) {
      // El error se queda acá: cerrar o vaciar escondería que no se creó.
      setErrorAlCrear(e instanceof Error && e.message ? e.message : '');
    } finally {
      setCreando(false);
    }
  }, [cargar, consignacionId, mes, onCobrosGenerados, onElegir]);

  return (
    <div className="space-y-4" data-testid="elegir-cobro-para-recibo">
      {/* 1. El inmueble */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">{t(k('inmueble'))}</p>
        {opciones.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted"
            data-testid="sin-inmuebles"
          >
            {t(k('sinInmuebles'))}
          </div>
        ) : (
          <div data-testid="inmueble-recibo">
            <Combobox
              value={consignacionId || undefined}
              onChange={(id) => setConsignacionId(id ?? '')}
              options={opciones}
              placeholder={t(k('inmueblePlaceholder'))}
              searchPlaceholder={t(k('buscar'))}
              // El Dialog vive en z-[300]; la lista del DS abre en z-50 y quedaba
              // DETRÁS del modal — se veía como si no abriera.
              contentClassName="z-[400]"
            />
          </div>
        )}
      </div>

      {/* 2. Los dos caminos */}
      {consignacionId ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-fg">{t(k('cobro'))}</p>
          <SegmentedControl<Camino>
            fullWidth
            size="sm"
            value={camino}
            onChange={setCaminoElegido}
            aria-label={t(k('cobro'))}
            options={[
              { value: 'pendiente', label: t(k('opcionPendiente')) },
              { value: 'nuevo', label: t(k('opcionNuevo')) },
            ]}
          />

          {cargando || cobros === null ? (
            <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="cobros-cargando">
              <Spinner size="sm" variant="muted" />
              {t(k('cargandoCobros'))}
            </div>
          ) : error !== null ? (
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <p className="text-destructive">{error || t(k('falloCobros'))}</p>
              <Button variant="secondary" size="sm" hideArrow onClick={() => void cargar(consignacionId)}>
                {t(k('reintentar'))}
              </Button>
            </div>
          ) : camino === 'pendiente' ? (
            pendientes.length === 0 ? (
              <div
                className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-center"
                data-testid="sin-cobros-pendientes"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Buildings className="h-5 w-5 text-fg-muted" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-fg">{t(k('sinCobros'))}</p>
                  <p className="text-xs text-fg-muted">{t(k('sinCobrosPasar'))}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => setCaminoElegido('nuevo')}
                  data-testid="pasar-a-mes-nuevo"
                >
                  <Plus className="h-4 w-4" />
                  {t(k('pasarANuevo'))}
                </Button>
              </div>
            ) : (
              <div
                className="max-h-64 space-y-2 overflow-y-auto"
                data-lenis-prevent
                style={{ overscrollBehavior: 'contain' }}
                data-testid="cobros-pendientes"
              >
                {pendientes.map((c) => (
                  // allowlist: fila de lista rica (período + total + saldo + estado)
                  // como UN solo objetivo de clic — Button no puede hospedarla.
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onElegir(c)}
                    data-testid={`cobro-pendiente-${c.month}`}
                    className={cn(
                      'w-full rounded-lg border border-border bg-background p-3 text-left transition-all',
                      'hover:border-fg/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                          <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                          {mesEnTitulo(c.month, idioma)}
                        </p>
                        <p className="text-xs text-fg-muted tabular-nums">
                          {t(k('total'))} {formatCurrency(c.totalWithFees)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="font-mono text-sm font-semibold tabular-nums text-warning">
                          {formatCurrency(c.pendingAmount)}
                        </p>
                        <Badge variant={VARIANTE_DEL_ESTADO[c.status] ?? 'default'}>
                          {t(`inmobiliaria.cobros.status.${c.status}`)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3 rounded-lg border border-border p-4" data-testid="mes-sin-cobro">
              {!arrendado ? (
                <p className="text-sm text-fg-muted" data-testid="nuevo-no-arrendado">
                  {t(k('nuevoNoArrendado'))}
                </p>
              ) : meses.length === 0 ? (
                <p className="text-sm text-fg-muted" data-testid="nuevo-sin-meses">
                  {t(k('nuevoSinMeses'))}
                </p>
              ) : (
                <>
                  <p className="text-xs text-fg-muted">{t(k('nuevoAyuda'))}</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-fg">{t(k('nuevoMes'))}</p>
                    <div data-testid="mes-para-cobro">
                      <Combobox
                        value={mes || undefined}
                        onChange={(v) => setMesElegido(v ?? '')}
                        options={meses.map((m) => ({ value: m, label: mesEnTitulo(m, idioma) }))}
                        placeholder={t(k('nuevoMesPlaceholder'))}
                        searchPlaceholder={t(k('nuevoBuscarMes'))}
                        disabled={creando}
                        contentClassName="z-[400]"
                      />
                    </div>
                  </div>
                  {mesYaPagado !== null && (
                    <p className="text-xs text-warning" data-testid="aviso-mes-pagado">
                      {t(k('yaExistePagado'), { mes: mesEnTitulo(mesYaPagado, idioma) })}
                    </p>
                  )}
                  {errorAlCrear !== null && (
                    <p className="text-xs text-destructive">{errorAlCrear || t(k('falloCrear'))}</p>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    hideArrow
                    onClick={() => void crear()}
                    disabled={creando || !mes}
                    isLoading={creando}
                    data-testid="crear-cobro-del-mes"
                  >
                    <Plus className="h-4 w-4" />
                    {creando ? t(k('creando')) : t(k('crear'), { mes: mesEnTitulo(mes, idioma) })}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ElegirCobroParaRecibo;
