'use client';

/**
 * El recibo de caja se le hace a un CLIENTE, y la plata va a la deuda más vieja.
 *
 * Reemplaza a `ElegirCobroParaRecibo`, que empezaba por el INMUEBLE y ofrecía
 * dos caminos: elegir un cobro con saldo, o crear el cobro de un mes que
 * todavía no se había cobrado. Nico lo bajó el 2026-09-12, con estas palabras:
 *
 *   «El recibo de caja se le hace es a inquilinos. Al elegirlo quiero ver SU
 *    cartera: lo que me debe en ese momento. Tener que scrollear para elegir
 *    qué día entró me parece lento. Los campos son: qué día entró, cómo pagó,
 *    cuánto va a pagar, emitir recibo y los saludos.»
 *
 *   «Si Nico me debe 3 meses y este mes me ingresó 1 millón, ese ingreso va a
 *    la deuda vieja, no a la nueva. Es más: ni siquiera me debe permitir
 *    abonarle al mes actual.»
 *
 * ── Cómo se lee esta pantalla ───────────────────────────────────────────────
 *   1. `ElegirCliente` — el combobox sobre los inquilinos de la inmobiliaria.
 *      Cuando el recibo se abre desde la fila de un cobro, este paso no se ve:
 *      la persona sale del cobro (`cartera-por-cobro/:cobroId`).
 *   2. `CarteraDelClientePanel` — lo que debe AHORA, del mes más viejo al más
 *      nuevo, con el inmueble de cada deuda y el total. Un cliente con varios
 *      inmuebles la ve JUNTA: es una sola cartera, y el pago se imputa por
 *      antigüedad sin importar de qué inmueble sea cada mes.
 *   3. `PlanDeImputacion` — a qué meses y conceptos va a ir el dinero, ANTES de
 *      emitir. Se calcula acá para no ir al servidor en cada tecla, con una
 *      copia de la regla (`@/lib/recibos/imputar-pago`); la AUTORIDAD es el
 *      back, y lo que quede escrito es lo que él devuelve.
 *
 * ── Lo que NO está, y por qué ───────────────────────────────────────────────
 * No hay selector de mes ni botón de «crear el cobro de este mes». Elegir el
 * mes es justamente lo que la regla de imputación no permite, y crear un cobro
 * para poder recibir contra él era el atajo que Nico quiere sacar.
 */

import * as React from 'react';
import { Buildings, CalendarBlank, Receipt, User, Warning } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { inquilinosApi, type Inquilino } from '@/lib/api/inquilinos.service';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type { CarteraDelCliente, CobroEnCartera } from '@/lib/api/recibos-de-caja.types';
import {
  deudasDeLaCartera,
  imputarPago,
  type Imputacion,
} from '@/lib/recibos/imputar-pago';
import { mesEnTitulo } from '@/lib/utils/mes';

// ── Reglas puras (probadas solas en ReciboPorCliente.test.tsx) ───────────────

/**
 * Los clientes entre los que se elige, ordenados por nombre.
 *
 * Entran TODOS los que la inmobiliaria conoce, con arriendo vigente o sin él:
 * la deuda no se termina cuando se termina el contrato, y esconder a quien ya
 * se fue es esconder justo la cartera que cuesta cobrar.
 */
export function clientesParaRecibo(inquilinos: readonly Inquilino[]): Inquilino[] {
  return [...inquilinos].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * El nombre, el documento y el correo juntos: el filtro del Combobox mira sólo
 * `label`, así que todo lo que se quiera buscar va acá.
 */
export function etiquetaDeCliente(i: Inquilino): string {
  const extras = [i.documento?.trim(), i.email?.trim()].filter(Boolean);
  return extras.length > 0 ? `${i.nombre} · ${extras.join(' · ')}` : i.nombre;
}

/**
 * Los conceptos de un período, en una línea, para decir a QUÉ va la plata.
 *
 * Los que RESTAN (prorrateo, retenciones) no se nombran: no son algo que el
 * inquilino esté pagando, y ponerlos al lado del canon en la misma lista hace
 * pensar que se le están cobrando.
 */
export function conceptosDelPeriodo(cobro: CobroEnCartera): string[] {
  return (cobro.conceptos ?? []).filter((c) => !c.resta).map((c) => c.nombre);
}

/** ¿Algún período del plan tiene plata sin recibo? El back frena el pago ahí. */
export function periodosSinConciliar(
  cartera: CarteraDelCliente | null,
  plan: Imputacion,
): CobroEnCartera[] {
  if (!cartera) return [];
  const tocados = new Set(plan.partes.map((p) => p.id));
  return cartera.cobros.filter((c) => tocados.has(c.id) && c.sinRespaldo > 0);
}

const VARIANTE_DEL_ESTADO: Record<string, 'warning' | 'default' | 'destructive' | 'success'> = {
  pending: 'warning',
  partial: 'default',
  late: 'destructive',
  defaulted: 'destructive',
  paid: 'success',
};

/** El back manda los estados en mayúscula; la tabla los pinta en minúscula. */
function estadoLegible(status: string): string {
  return status.toLowerCase();
}

// ── 1. Elegir al cliente ────────────────────────────────────────────────────

export interface ElegirClienteProps {
  value: string | null;
  onChange: (tenantId: string | null) => void;
}

export function ElegirCliente({ value, onChange }: ElegirClienteProps) {
  const { t } = useI18n();
  const k = (s: string) => `recibos.form.cliente.${s}`;

  const [clientes, setClientes] = React.useState<Inquilino[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setError(null);
    try {
      // `estado: 'todos'` y no sólo los activos: ver `clientesParaRecibo`.
      const lista = await inquilinosApi.listar({ estado: 'todos' });
      setClientes(clientesParaRecibo(lista));
    } catch (e) {
      setClientes([]);
      setError(e instanceof Error && e.message ? e.message : '');
    }
  }, []);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const opciones = React.useMemo<ComboboxOption[]>(
    () => (clientes ?? []).map((c) => ({ value: c.tenantId, label: etiquetaDeCliente(c) })),
    [clientes],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">{t(k('label'))}</p>

      {clientes === null ? (
        <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="clientes-cargando">
          <Spinner size="sm" variant="muted" />
          {t(k('cargando'))}
        </div>
      ) : error !== null ? (
        <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
          <p className="text-destructive">{error || t(k('fallo'))}</p>
          <Button variant="secondary" size="sm" hideArrow onClick={() => void cargar()}>
            {t(k('reintentar'))}
          </Button>
        </div>
      ) : opciones.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted"
          data-testid="sin-clientes"
        >
          {t(k('sinClientes'))}
        </div>
      ) : (
        <div data-testid="cliente-recibo">
          <Combobox
            value={value ?? undefined}
            onChange={(id) => onChange(id ?? null)}
            options={opciones}
            placeholder={t(k('placeholder'))}
            searchPlaceholder={t(k('buscar'))}
            // El Dialog vive en z-[300]; la lista del DS abre en z-50 y quedaba
            // DETRÁS del modal — se veía como si no abriera.
            contentClassName="z-[400]"
          />
        </div>
      )}
    </div>
  );
}

// ── 2. Su cartera ───────────────────────────────────────────────────────────

export interface CarteraDelClientePanelProps {
  cartera: CarteraDelCliente;
}

export function CarteraDelClientePanel({ cartera }: CarteraDelClientePanelProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const k = (s: string) => `recibos.form.cartera.${s}`;

  return (
    <div className="space-y-2" data-testid="cartera-del-cliente">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <User className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          {cartera.nombre}
        </p>
        {cartera.inmuebles > 1 && (
          <span className="text-xs text-fg-muted" data-testid="cartera-varios-inmuebles">
            {t(k('variosInmuebles'), { count: cartera.inmuebles })}
          </span>
        )}
      </div>

      <div
        className="max-h-56 space-y-2 overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        {cartera.cobros.map((c, i) => (
          <div
            key={c.id}
            data-testid={`cartera-periodo-${c.month}`}
            className={cn(
              'rounded-lg border border-border bg-surface p-3',
              // El más viejo es el que va a recibir la plata: se marca.
              i === 0 && 'border-fg/30',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
                  <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
                  {mesEnTitulo(c.month, idioma)}
                  {i === 0 && (
                    <Badge variant="warning" data-testid="cartera-mas-vieja">
                      {t(k('masVieja'))}
                    </Badge>
                  )}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-fg-muted">
                  <Buildings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {c.propertyTitle}
                </p>
                {conceptosDelPeriodo(c).length > 0 && (
                  <p className="truncate text-xs text-fg-muted">
                    {conceptosDelPeriodo(c).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="font-mono text-sm font-semibold tabular-nums text-warning">
                  {formatCurrency(c.pendingAmount)}
                </p>
                <Badge variant={VARIANTE_DEL_ESTADO[estadoLegible(c.status)] ?? 'default'}>
                  {t(`inmobiliaria.cobros.status.${estadoLegible(c.status)}`)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2">
        <span className="text-sm font-medium text-fg">{t(k('total'))}</span>
        <span
          className="font-mono text-base font-semibold tabular-nums text-fg"
          data-testid="cartera-total"
        >
          {formatCurrency(cartera.total)}
        </span>
      </div>
    </div>
  );
}

// ── 3. A dónde va la plata ──────────────────────────────────────────────────

export interface PlanDeImputacionProps {
  cartera: CarteraDelCliente;
  plan: Imputacion;
}

export function PlanDeImputacion({ cartera, plan }: PlanDeImputacionProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const k = (s: string) => `recibos.form.plan.${s}`;

  if (plan.partes.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="plan-de-imputacion">
      <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
        <Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        {t(k('titulo'))}
      </p>
      <p className="text-xs text-fg-muted">{t(k('ayuda'))}</p>

      <ul className="space-y-2">
        {plan.partes.map((parte) => {
          const periodo = cartera.cobros.find((c) => c.id === parte.id);
          const conceptos = periodo ? conceptosDelPeriodo(periodo) : [];
          return (
            <li key={parte.id} className="space-y-0.5" data-testid={`plan-parte-${parte.month}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-fg">
                  {mesEnTitulo(parte.month, idioma)}
                  {periodo ? ` · ${periodo.propertyTitle}` : ''}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-fg">
                  {formatCurrency(parte.valorCop)}
                </span>
              </div>
              {/* Art. 1653: dentro del mes, primero los intereses. Decirlo acá
                  es lo que evita la llamada «¿por qué no bajó el canon?». */}
              {parte.aIntereses > 0 && (
                <p className="text-xs text-fg-muted">
                  {t(k('intereses'), {
                    intereses: formatCurrency(parte.aIntereses),
                    capital: formatCurrency(parte.aCapital),
                  })}
                </p>
              )}
              {conceptos.length > 0 && (
                <p className="truncate text-xs text-fg-muted">{conceptos.join(' · ')}</p>
              )}
              {parte.quedaPendiente > 0 && (
                <p className="text-xs text-warning" data-testid={`plan-queda-${parte.month}`}>
                  {t(k('queda'), { monto: formatCurrency(parte.quedaPendiente) })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-fg-muted">{t(k('despues'))}</span>
        <span className="font-mono font-semibold tabular-nums text-fg" data-testid="plan-deuda-restante">
          {formatCurrency(plan.deudaRestante)}
        </span>
      </div>
    </div>
  );
}

// ── El pegamento: cargar la cartera ─────────────────────────────────────────

/**
 * La cartera de la persona, resuelta por su id o por un cobro suyo.
 *
 * `cobroId` gana sobre `tenantId`: es la entrada desde la fila de un cobro, y
 * ahí la persona la resuelve el back (un cobro migrado puede no tener cuenta).
 */
export function useCarteraDelCliente(
  tenantId: string | null,
  cobroId: string | null,
  activo: boolean,
) {
  const [cartera, setCartera] = React.useState<CarteraDelCliente | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Se cambia de cliente antes de que conteste el anterior: la vieja no pisa. */
  const peticion = React.useRef(0);

  const cargar = React.useCallback(async () => {
    if (!activo || (!tenantId && !cobroId)) {
      peticion.current += 1;
      setCartera(null);
      setError(null);
      setCargando(false);
      return;
    }
    const mia = ++peticion.current;
    setCargando(true);
    setError(null);
    try {
      const res = cobroId
        ? await recibosDeCajaApi.carteraPorCobro(cobroId)
        : await recibosDeCajaApi.cartera(tenantId!);
      if (mia !== peticion.current) return;
      setCartera(res);
    } catch (e) {
      if (mia !== peticion.current) return;
      setCartera(null);
      setError(e instanceof Error && e.message ? e.message : '');
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  }, [activo, cobroId, tenantId]);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  return { cartera, cargando, error, recargar: cargar };
}

/** El plan que se muestra antes de emitir. Memoizado: se recalcula al teclear. */
export function usePlanDeImputacion(
  cartera: CarteraDelCliente | null,
  monto: number,
): Imputacion {
  return React.useMemo(
    () => imputarPago(cartera ? deudasDeLaCartera(cartera.cobros) : [], Math.round(monto)),
    [cartera, monto],
  );
}

// ── El aviso de que hay plata sin conciliar ─────────────────────────────────

export interface AvisoSinConciliarProps {
  periodos: readonly CobroEnCartera[];
}

export function AvisoSinConciliar({ periodos }: AvisoSinConciliarProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  if (periodos.length === 0) return null;

  return (
    <div
      className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3"
      data-testid="aviso-sin-conciliar"
    >
      <Warning className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1 text-xs text-fg">
        <p>{t('recibos.form.plan.sinConciliar')}</p>
        <ul className="space-y-0.5">
          {periodos.map((p) => (
            <li key={p.id} className="text-fg-muted">
              {mesEnTitulo(p.month, idioma)} · {p.propertyTitle} · {formatCurrency(p.sinRespaldo)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ElegirCliente;
