'use client';

/**
 * CuentaDeCobro — el documento del período que se le manda al inquilino.
 *
 * Es «cuenta de cobro» y no «factura» a propósito: no hay facturación
 * electrónica conectada (el módulo Facturación del sidebar es un cascarón sin
 * back), y llamarle factura a un PDF sin CUFE sería mentirle al inquilino y
 * a la DIAN. Lo que sí es verdad y sale acá: canon, administración, lo que el
 * contrato agrega, IVA y retenciones, intereses y gasto administrativo de
 * mora, lo abonado (recibos de caja vivos) y el saldo.
 *
 * Presentacional a propósito: recibe el cobro y la agencia ya cargados. El
 * `<style>` de impresión vive acá y no en la página porque el documento es
 * lo que se imprime — quien lo monte en otra pantalla se lleva el print.
 */

import * as React from 'react';
import { Warning } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { AgencyProfile, CobroStatus } from '@/lib/types/inmobiliaria';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';
import {
  fechaEnPalabras,
  lineasDeLaCuenta,
  periodoEnPalabras,
  type LineaDeLaCuenta,
} from './lineas';

export interface CuentaDeCobroProps {
  cobro: CobroConDesglose;
  /** `null` mientras no llega o si falló: el documento sale sin emisor. */
  agencia: AgencyProfile | null;
  /** Para el pie «Generada el …». Inyectable para que el test no dependa del reloj. */
  hoy?: Date;
  className?: string;
}

/**
 * Reglas de impresión. Selectores REALES del shell del panel
 * (`src/app/panel/inmobiliaria/layout.tsx`):
 *   - `aside`   → `PlanSidebar` (el sidebar de escritorio es un `<aside>`)
 *   - `header`  → `PlanHeader` (barra superior, `<header class="sticky …">`)
 *   - `nav[aria-label="Mobile navigation"]` → `MobileNavBar`
 *   - `div:has(> #main-content)` → el envoltorio con `lg:pl-[240px]` que
 *     deja el hueco del sidebar; sin esto la hoja sale corrida a la derecha.
 *   - `[data-cuenta-barra]` → la barra de acciones de esta pantalla.
 *
 * El bloque `.dark { … }` copia la paleta CLARA de `:root` (globals.css):
 * el papel no tiene modo oscuro, y sin esto quien imprima desde el tema
 * oscuro se lleva texto gris claro sobre blanco.
 */
const CSS_DE_IMPRESION = `
@media print {
  @page { size: A4 portrait; margin: 14mm; }
  aside,
  header,
  nav[aria-label="Mobile navigation"],
  [data-cuenta-barra],
  [data-radix-popper-content-wrapper] { display: none !important; }
  div:has(> #main-content) { padding-left: 0 !important; padding-bottom: 0 !important; }
  #main-content { padding: 0 !important; }
  html, body { background: #fff !important; }
  .dark {
    color-scheme: light;
    --bg: #fbfaf9;
    --surface: #ffffff;
    --surface-muted: #f4f2ef;
    --fg: #14130f;
    --fg-muted: #6e6a63;
    --fg-subtle: #726e68;
    --border: 40 16% 88%;
    --border-faint: #eceae6;
    --border-strong: #d5d1ca;
  }
  [data-cuenta-pagina] { padding: 0 !important; }
  [data-cuenta-hoja] {
    max-width: none !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  [data-cuenta-hoja] * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  [data-cuenta-hoja] table { page-break-inside: auto; }
  [data-cuenta-hoja] tr { page-break-inside: avoid; }
}
`;

type Tono = 'neutral' | 'success' | 'warning' | 'danger';

function estadoDelCobro(
  status: CobroStatus,
  daysLate: number,
  t: (k: string, p?: Record<string, string | number>) => string,
): { texto: string; tono: Tono } {
  switch (status) {
    case 'paid':
      return { texto: t('cuentaDeCobro.estado.pagada'), tono: 'success' };
    case 'partial':
      return { texto: t('cuentaDeCobro.estado.parcial'), tono: 'warning' };
    case 'late':
    case 'defaulted':
      return {
        texto:
          daysLate > 0
            ? t('cuentaDeCobro.estado.enMoraDias', { dias: daysLate })
            : t('cuentaDeCobro.estado.enMora'),
        tono: 'danger',
      };
    default:
      return { texto: t('cuentaDeCobro.estado.pendiente'), tono: 'neutral' };
  }
}

const CLASE_DE_TONO: Record<Tono, string> = {
  neutral: 'bg-surface-muted text-fg',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/**
 * Las claves de i18n de esta pantalla NO están en los JSON de locales (este
 * componente sólo puede tocar su carpeta). `t()` devuelve la clave cuando no
 * la encuentra; acá está el texto real para que el documento salga en
 * castellano igual. Cuando alguien las agregue a `es.json`/`en.json`, ganan
 * las de ahí.
 */
const TEXTO: Record<string, string> = {
  'cuentaDeCobro.titulo': 'Cuenta de cobro',
  'cuentaDeCobro.periodo': 'Período',
  'cuentaDeCobro.vence': 'Vence el {{fecha}}',
  'cuentaDeCobro.a': 'A',
  'cuentaDeCobro.por': 'Por',
  'cuentaDeCobro.nit': 'NIT',
  'cuentaDeCobro.sinEmisor': 'Inmobiliaria sin datos de contacto cargados',
  'cuentaDeCobro.concepto': 'Concepto',
  'cuentaDeCobro.valor': 'Valor',
  'cuentaDeCobro.resta': 'resta',
  'cuentaDeCobro.mora': 'mora',
  'cuentaDeCobro.subtotal': 'Suma de conceptos',
  'cuentaDeCobro.descuentos': 'Menos descuentos y retenciones',
  'cuentaDeCobro.total': 'Total',
  'cuentaDeCobro.abonos': 'Abonos',
  'cuentaDeCobro.sinAbonos': 'Sin abonos registrados.',
  'cuentaDeCobro.recibo': 'Recibo',
  'cuentaDeCobro.fecha': 'Fecha',
  'cuentaDeCobro.medio': 'Medio',
  'cuentaDeCobro.referencia': 'Referencia',
  'cuentaDeCobro.abonado': 'Total abonado',
  'cuentaDeCobro.saldo': 'Saldo',
  'cuentaDeCobro.saldoEnCero': 'Sin saldo pendiente',
  'cuentaDeCobro.sinDetalle':
    'Esta inmobiliaria no tiene el desglose por concepto: se separa lo que el cobro ya trae suelto.',
  'cuentaDeCobro.descuadre':
    'Las líneas suman {{lineas}} y el cobro dice {{cobro}}. Revisalo antes de mandar este documento.',
  'cuentaDeCobro.generada': 'Generada por Leasefy el {{fecha}}',
  'cuentaDeCobro.noEsFactura': 'Este documento no es factura electrónica.',
  'cuentaDeCobro.estado.pendiente': 'Pendiente',
  'cuentaDeCobro.estado.parcial': 'Abono parcial',
  'cuentaDeCobro.estado.enMora': 'En mora',
  'cuentaDeCobro.estado.enMoraDias': 'En mora · {{dias}} días',
  'cuentaDeCobro.estado.pagada': 'Pagada',
};

function aFechaLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function interpolar(texto: string, params?: Record<string, string | number>): string {
  if (!params) return texto;
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    params[k] === undefined ? `{{${k}}}` : String(params[k]),
  );
}

export function CuentaDeCobro({ cobro, agencia, hoy, className }: CuentaDeCobroProps) {
  const { t: tDelPanel, locale, formatCurrency } = useI18n();
  const idioma: 'es' | 'en' = locale === 'en' ? 'en' : 'es';

  const t = React.useCallback(
    (k: string, params?: Record<string, string | number>): string => {
      const delPanel = tDelPanel(k, params);
      if (delPanel !== k) return delPanel;
      const propio = TEXTO[k];
      return propio ? interpolar(propio, params) : k;
    },
    [tDelPanel],
  );

  const nombreDeLinea = React.useCallback(
    (l: LineaDeLaCuenta): string => {
      if (l.nombre) return l.nombre;
      const delCatalogo = tDelPanel(`recibos.desglose.tipos.${l.tipo}`);
      return delCatalogo === `recibos.desglose.tipos.${l.tipo}` ? l.tipo : delCatalogo;
    },
    [tDelPanel],
  );

  const cuenta = React.useMemo(() => lineasDeLaCuenta(cobro, cobro.conceptos), [cobro]);
  const recibos = cobro.recibosDeCaja ?? [];
  const estado = estadoDelCobro(cobro.status, cobro.daysLate, t);
  // Fecha LOCAL: `toISOString()` va en UTC y en Colombia, de noche, ya es mañana.
  const fechaDeHoy = aFechaLocal(hoy ?? new Date());

  const emisor = agencia?.razonSocial?.trim() || agencia?.name?.trim() || '';
  const ubicacion = [agencia?.address, agencia?.city].filter(Boolean).join(', ');
  const contacto = [agencia?.phone, agencia?.email].filter(Boolean).join(' · ');

  return (
    <article
      data-cuenta-hoja
      className={cn(
        'mx-auto w-full max-w-[800px] rounded-lg border border-border bg-surface px-8 py-10 shadow-sm sm:px-12 sm:py-12',
        className,
      )}
      aria-label={t('cuentaDeCobro.titulo')}
    >
      <style>{CSS_DE_IMPRESION}</style>

      {/* Emisor. Es un <div> a propósito: el print esconde todo <header>
          (el del shell), y un <header> propio se iría con él. */}
      <div className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <div className="flex min-w-0 items-start gap-4">
          {agencia?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agencia.logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <div className="min-w-0 space-y-0.5">
            {emisor ? (
              <p className="text-base font-semibold text-fg">{emisor}</p>
            ) : (
              <p className="text-sm text-fg-muted">{t('cuentaDeCobro.sinEmisor')}</p>
            )}
            {agencia?.nit ? (
              <p className="font-mono text-xs tabular-nums text-fg-muted">
                {t('cuentaDeCobro.nit')} {agencia.nit}
              </p>
            ) : null}
            {ubicacion ? <p className="text-xs text-fg-muted">{ubicacion}</p> : null}
            {contacto ? <p className="text-xs text-fg-muted">{contacto}</p> : null}
          </div>
        </div>

        <div className="shrink-0 space-y-1.5 text-right">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('cuentaDeCobro.titulo')}
          </h1>
          <p className="font-mono text-sm tabular-nums text-fg">
            {periodoEnPalabras(cobro.month, idioma)}
          </p>
          <p className="text-xs text-fg-muted">
            {t('cuentaDeCobro.vence', { fecha: fechaEnPalabras(cobro.dueDate, idioma) })}
          </p>
          <span
            data-testid="estado-de-la-cuenta"
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide',
              CLASE_DE_TONO[estado.tono],
            )}
          >
            {estado.texto}
          </span>
        </div>
      </div>

      {/* A quién y por qué inmueble */}
      <section className="grid gap-6 border-b border-border py-6 sm:grid-cols-2">
        <div className="space-y-0.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
            {t('cuentaDeCobro.a')}
          </p>
          <p className="text-sm font-medium text-fg">{cobro.tenantName || '—'}</p>
          {cobro.tenantEmail ? (
            <p className="text-xs text-fg-muted">{cobro.tenantEmail}</p>
          ) : null}
        </div>
        <div className="space-y-0.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
            {t('cuentaDeCobro.por')}
          </p>
          <p className="text-sm font-medium text-fg">{cobro.propertyTitle || '—'}</p>
          {cobro.propertyAddress ? (
            <p className="text-xs text-fg-muted">{cobro.propertyAddress}</p>
          ) : null}
        </div>
      </section>

      {/* Líneas */}
      <section className="py-6">
        {!cuenta.detallada ? (
          <p className="mb-3 flex items-start gap-1.5 text-xs text-fg-muted">
            <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('cuentaDeCobro.sinDetalle')}
          </p>
        ) : null}

        <table className="w-full border-collapse text-sm" data-testid="lineas-de-la-cuenta">
          <thead>
            <tr className="border-b border-border-strong">
              <th
                scope="col"
                className="pb-2 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
              >
                {t('cuentaDeCobro.concepto')}
              </th>
              <th
                scope="col"
                className="pb-2 text-right font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
              >
                {t('cuentaDeCobro.valor')}
              </th>
            </tr>
          </thead>
          <tbody>
            {cuenta.lineas.map((l) => (
              <tr key={l.id} className="border-b border-border-faint" data-testid="linea">
                <td className="py-2.5 pr-4 text-fg">
                  <span>{nombreDeLinea(l)}</span>
                  {l.resta ? (
                    <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                      ({t('cuentaDeCobro.resta')})
                    </span>
                  ) : null}
                  {l.esDeMora ? (
                    <span className="ml-2 rounded-full bg-warning-soft px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-warning">
                      {t('cuentaDeCobro.mora')}
                    </span>
                  ) : null}
                </td>
                <td
                  className={cn(
                    'py-2.5 text-right font-mono tabular-nums',
                    l.resta ? 'text-fg-muted' : l.esDeMora ? 'text-warning' : 'text-fg',
                  )}
                >
                  {l.resta ? `− ${formatCurrency(-l.valorCop)}` : formatCurrency(l.valorCop)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {cuenta.descuentosCop > 0 ? (
              <>
                <tr>
                  <td className="pt-3 text-xs text-fg-muted">{t('cuentaDeCobro.subtotal')}</td>
                  <td className="pt-3 text-right font-mono text-xs tabular-nums text-fg-muted">
                    {formatCurrency(cuenta.subtotalCop)}
                  </td>
                </tr>
                <tr>
                  <td className="pb-1 text-xs text-fg-muted">{t('cuentaDeCobro.descuentos')}</td>
                  <td className="pb-1 text-right font-mono text-xs tabular-nums text-fg-muted">
                    − {formatCurrency(cuenta.descuentosCop)}
                  </td>
                </tr>
              </>
            ) : null}
            <tr className="border-t border-border-strong">
              <td className="pt-3 text-sm font-semibold text-fg">{t('cuentaDeCobro.total')}</td>
              <td
                className="pt-3 text-right font-mono text-base font-semibold tabular-nums text-fg"
                data-testid="total-de-la-cuenta"
              >
                {formatCurrency(cuenta.totalCop)}
              </td>
            </tr>
          </tfoot>
        </table>

        {cuenta.descuadra ? (
          <p
            className="mt-3 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger"
            role="alert"
          >
            <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('cuentaDeCobro.descuadre', {
              lineas: formatCurrency(cuenta.totalCop),
              cobro: formatCurrency(cobro.totalWithFees),
            })}
          </p>
        ) : null}
      </section>

      {/* Abonos y saldo */}
      <section className="border-t border-border pt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
          {t('cuentaDeCobro.abonos')}
        </p>
        {recibos.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('cuentaDeCobro.sinAbonos')}</p>
        ) : (
          <table className="w-full border-collapse text-sm" data-testid="abonos">
            <thead>
              <tr className="border-b border-border-faint">
                <th scope="col" className="pb-1.5 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('cuentaDeCobro.recibo')}
                </th>
                <th scope="col" className="pb-1.5 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('cuentaDeCobro.fecha')}
                </th>
                <th scope="col" className="pb-1.5 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('cuentaDeCobro.medio')}
                </th>
                <th scope="col" className="pb-1.5 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('cuentaDeCobro.referencia')}
                </th>
                <th scope="col" className="pb-1.5 text-right font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t('cuentaDeCobro.valor')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recibos.map((r) => (
                <tr key={r.id} className="border-b border-border-faint" data-testid="abono">
                  <td className="py-2 pr-3 font-mono text-xs tabular-nums text-fg">{String(r.numero)}</td>
                  <td className="py-2 pr-3 font-mono text-xs tabular-nums text-fg-muted">
                    {fechaEnPalabras(r.fecha, idioma)}
                  </td>
                  <td className="py-2 pr-3 text-xs text-fg-muted">{r.medio || '—'}</td>
                  <td className="py-2 pr-3 font-mono text-xs tabular-nums text-fg-muted">
                    {r.referencia || '—'}
                  </td>
                  <td className="py-2 text-right font-mono text-xs tabular-nums text-success">
                    {formatCurrency(r.valorCop)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <dl className="mt-5 space-y-2">
          {cuenta.abonadoCop > 0 ? (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-fg-muted">{t('cuentaDeCobro.abonado')}</dt>
              <dd className="font-mono text-sm tabular-nums text-success">
                {formatCurrency(cuenta.abonadoCop)}
              </dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 rounded-md bg-surface-muted px-4 py-3">
            <dt className="text-sm font-semibold text-fg">
              {cuenta.saldoCop > 0 ? t('cuentaDeCobro.saldo') : t('cuentaDeCobro.saldoEnCero')}
            </dt>
            <dd
              className={cn(
                'font-mono text-2xl font-semibold tabular-nums',
                cuenta.saldoCop > 0 ? 'text-fg' : 'text-success',
              )}
              data-testid="saldo-de-la-cuenta"
            >
              {formatCurrency(cuenta.saldoCop)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-1 border-t border-border-faint pt-4 text-[11px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <span>{t('cuentaDeCobro.generada', { fecha: fechaEnPalabras(fechaDeHoy, idioma) })}</span>
        <span>{t('cuentaDeCobro.noEsFactura')}</span>
      </div>
    </article>
  );
}

export default CuentaDeCobro;
