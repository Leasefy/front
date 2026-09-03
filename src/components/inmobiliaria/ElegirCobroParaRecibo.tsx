'use client';

/**
 * Elegir contra cuál cobro va el recibo de caja — empezando por el INMUEBLE.
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
 * El diálogo anterior arrancaba con la lista plana de los cobros del MES que
 * la tabla tenía filtrado. Si el mes no tenía cobros generados, o la plata era
 * de un mes viejo, el camino terminaba en «No hay cobros con saldo pendiente
 * para este mes» — un callejón sin salida. Quien recibe plata sabe DE QUÉ
 * INMUEBLE (o de qué inquilino) es; el mes lo sabe después. Entonces:
 *
 *   1. El inmueble: el Combobox de cadence sobre los mandatos activos de la
 *      inmobiliaria, buscable por código, título, dirección o inquilino.
 *   2. Los cobros con saldo de ESE mandato, de todos los meses
 *      (`GET /inmobiliaria/cobros?consignacionId=…`, sin `month`), del más
 *      reciente al más viejo: período, total, saldo.
 *   3. Elegir uno → el formulario del recibo de siempre.
 *
 * Si el mandato no tiene ningún cobro con saldo se dice tal cual, y se ofrece
 * generar los cobros del mes en curso (`POST /inmobiliaria/cobros/generate`,
 * el mismo que usa «Generar cobros» en Pagos — es masivo: genera los del mes
 * para TODOS los mandatos arrendados, no sólo éste, y eso se dice).
 */

import * as React from 'react';
import { ArrowsClockwise, Buildings, CalendarBlank } from '@phosphor-icons/react';

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

const VARIANTE_DEL_ESTADO: Record<Cobro['status'], 'warning' | 'default' | 'destructive' | 'success'> = {
  pending: 'warning',
  partial: 'default',
  late: 'destructive',
  defaulted: 'destructive',
  paid: 'success',
};

// ── Componente ───────────────────────────────────────────────────────────────

export interface ElegirCobroParaReciboProps {
  /** Los mandatos de la inmobiliaria (la pantalla ya los tiene para sus filtros). */
  consignaciones: readonly Consignacion[];
  /** 'YYYY-MM' del mes en curso: el que se ofrece generar cuando no hay cobros. */
  mesActual: string;
  onElegir: (cobro: Cobro) => void;
  /** Se generaron cobros desde acá: la tabla de atrás tiene que enterarse. */
  onCobrosGenerados?: () => void;
}

export function ElegirCobroParaRecibo({
  consignaciones,
  mesActual,
  onElegir,
  onCobrosGenerados,
}: ElegirCobroParaReciboProps) {
  const { t, formatCurrency, locale } = useI18n();

  const [consignacionId, setConsignacionId] = React.useState<string>('');
  const [cobros, setCobros] = React.useState<Cobro[] | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [generando, setGenerando] = React.useState(false);
  const [errorAlGenerar, setErrorAlGenerar] = React.useState<string | null>(null);

  /** Se cambia de inmueble antes de que conteste el anterior: la vieja no pisa. */
  const peticion = React.useRef(0);

  const inmuebles = React.useMemo(() => inmueblesParaRecibo(consignaciones), [consignaciones]);
  const opciones = React.useMemo<ComboboxOption[]>(
    () => inmuebles.map((c) => ({ value: c.id, label: etiquetaParaRecibo(c) })),
    [inmuebles],
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

  /**
   * ¿El mes en curso ya tiene cobro para este mandato? Si lo tiene y está
   * pagado, generar no va a producir nada nuevo — no se ofrece un botón que no
   * puede cumplir.
   */
  const mesActualYaGenerado = React.useMemo(
    () => (cobros ?? []).some((c) => c.consignacionId === consignacionId && c.month === mesActual),
    [cobros, consignacionId, mesActual],
  );

  const generar = React.useCallback(async () => {
    setGenerando(true);
    setErrorAlGenerar(null);
    try {
      await cobrosApi.generate(mesActual);
      onCobrosGenerados?.();
      await cargar(consignacionId);
    } catch (e) {
      // El error se queda acá: cerrar o vaciar escondería que no se generó.
      setErrorAlGenerar(e instanceof Error && e.message ? e.message : '');
    } finally {
      setGenerando(false);
    }
  }, [cargar, consignacionId, mesActual, onCobrosGenerados]);

  const mesTitulo = mesEnTitulo(mesActual, locale === 'en' ? 'en' : 'es');

  return (
    <div className="space-y-4" data-testid="elegir-cobro-para-recibo">
      {/* 1. El inmueble */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">{t('recibos.form.elegir.inmueble')}</p>
        {opciones.length === 0 ? (
          <div
            className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted"
            data-testid="sin-inmuebles"
          >
            {t('recibos.form.elegir.sinInmuebles')}
          </div>
        ) : (
          <div data-testid="inmueble-recibo">
          <Combobox
            value={consignacionId || undefined}
            onChange={(id) => setConsignacionId(id ?? '')}
            options={opciones}
            placeholder={t('recibos.form.elegir.inmueblePlaceholder')}
            searchPlaceholder={t('recibos.form.elegir.buscar')}
            // El Dialog vive en z-[300]; la lista del DS abre en z-50 y quedaba
            // DETRÁS del modal — se veía como si no abriera.
            contentClassName="z-[400]"
          />
          </div>
        )}
      </div>

      {/* 2. Los cobros con saldo de ese inmueble, de todos los meses */}
      {consignacionId ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">{t('recibos.form.elegir.cobro')}</p>

          {cargando || cobros === null ? (
            <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="cobros-cargando">
              <Spinner size="sm" variant="muted" />
              {t('recibos.form.elegir.cargandoCobros')}
            </div>
          ) : error !== null ? (
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <p className="text-destructive">{error || t('recibos.form.elegir.falloCobros')}</p>
              <Button variant="secondary" size="sm" hideArrow onClick={() => void cargar(consignacionId)}>
                {t('recibos.form.elegir.reintentar')}
              </Button>
            </div>
          ) : pendientes.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-center"
              data-testid="sin-cobros-pendientes"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Buildings className="h-5 w-5 text-fg-muted" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-fg">{t('recibos.form.elegir.sinCobros')}</p>
                <p className="text-xs text-fg-muted">
                  {mesActualYaGenerado
                    ? t('recibos.form.elegir.sinCobrosMesGenerado', { mes: mesTitulo })
                    : t('recibos.form.elegir.sinCobrosAyuda', { mes: mesTitulo })}
                </p>
              </div>
              {!mesActualYaGenerado && (
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => void generar()}
                  disabled={generando}
                  isLoading={generando}
                  data-testid="generar-cobros-del-mes"
                >
                  <ArrowsClockwise className="h-4 w-4" />
                  {generando
                    ? t('recibos.form.elegir.generando')
                    : t('recibos.form.elegir.generar', { mes: mesTitulo })}
                </Button>
              )}
              {errorAlGenerar !== null && (
                <p className="text-xs text-destructive">
                  {errorAlGenerar || t('recibos.form.elegir.falloGenerar')}
                </p>
              )}
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
                        {mesEnTitulo(c.month, locale === 'en' ? 'en' : 'es')}
                      </p>
                      <p className="text-xs text-fg-muted tabular-nums">
                        {t('recibos.form.elegir.total')} {formatCurrency(c.totalWithFees)}
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
          )}
        </div>
      ) : null}
    </div>
  );
}

export default ElegirCobroParaRecibo;
