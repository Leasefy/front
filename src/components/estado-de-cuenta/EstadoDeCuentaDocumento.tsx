'use client';

/**
 * El estado de cuenta como documento: el membrete de la inmobiliaria, el
 * resumen del cliente, un bloque por contrato y el total general.
 *
 * Presentacional a propósito: recibe el documento ya cargado. Lo usan las tres
 * pantallas que lo muestran —la del panel, la página pública del enlace y los
 * dos portales— para que el inquilino vea EXACTAMENTE lo mismo que ve la
 * inmobiliaria.
 *
 * El membrete es chico a propósito. En la primera versión la razón social iba
 * del tamaño de un título y «victor inmobiliaria8» se leía como si fuera el
 * cliente; el documento es DEL cliente, la inmobiliaria firma en la esquina,
 * como en cualquier extracto.
 *
 * El `<style>` de impresión vive acá y no en la página porque el documento es
 * lo que se imprime: quien lo monte en otra pantalla se lleva el print.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { ContratoDelEstado } from './ContratoDelEstado';
import { ResumenDelEstado } from './ResumenDelEstado';
import { fechaLegible } from './filas';
import { useTextoDelEstado } from './textos';

/**
 * Reglas de impresión. Selectores REALES del shell del panel
 * (`src/app/panel/inmobiliaria/layout.tsx`), los mismos que usa
 * `CuentaDeCobro`:
 *   - `aside`   → `PlanSidebar`
 *   - `header`  → `PlanHeader`
 *   - `nav[aria-label="Mobile navigation"]` → `MobileNavBar`
 *   - `div:has(> #main-content)` → el envoltorio con `lg:pl-[240px]`; sin esto
 *     la hoja sale corrida a la derecha.
 *
 * A4 HORIZONTAL: el documento tiene once columnas. En vertical el concepto
 * ocupa tres renglones y el papel se dobla al triple de hojas — el formato de
 * Nui es horizontal por la misma razón.
 *
 * Un contrato por hoja (`break-before: page` desde el segundo): un contrato
 * partido entre dos hojas por la mitad de sus totales no se puede archivar.
 *
 * El bloque `.dark { … }` copia la paleta CLARA de `globals.css`: el papel no
 * tiene modo oscuro, y sin esto quien imprima desde el tema oscuro se lleva
 * texto gris claro sobre blanco.
 */
const CSS_DE_IMPRESION = `
@media print {
  @page { size: A4 landscape; margin: 12mm; }
  aside,
  header,
  nav[aria-label="Mobile navigation"],
  [data-estado-barra],
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
  [data-estado-pagina] { padding: 0 !important; max-width: none !important; }
  [data-estado-marco] {
    border: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: visible !important;
  }
  [data-estado-hoja] {
    max-width: none !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  [data-estado-hoja] * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* La tabla manda en papel; las tarjetas del móvil, nunca. Las clases \`md:\`
     dependen del ancho reportado de la hoja y ése cambia con el zoom. */
  [data-estado-hoja] [data-tabla] { display: block !important; border: 0 !important; }
  [data-estado-hoja] [data-tarjetas] { display: none !important; }
  [data-estado-hoja] section.estado-contrato { break-inside: auto; }
  [data-estado-hoja] section.estado-contrato + section.estado-contrato {
    break-before: page;
  }
  [data-estado-hoja] table { break-inside: auto; }
  /* El navegador repite el <thead> solo en cada hoja nueva. */
  [data-estado-hoja] thead { display: table-header-group; }
  [data-estado-hoja] tr { break-inside: avoid; }
}
`;

export interface EstadoDeCuentaDocumentoProps {
  doc: EstadoDeCuenta;
  /** `YYYY-MM-DD` local. Inyectable para que las pruebas no dependan del reloj. */
  hoy: string;
  /** Apaga la paginación de las tablas: se prende al imprimir. */
  sinPaginar?: boolean;
  /** Qué filtros hay puestos, en palabras. Sale bajo el título. */
  nota?: string;
  className?: string;
}

export function EstadoDeCuentaDocumento({
  doc,
  hoy,
  sinPaginar = false,
  nota,
  className,
}: EstadoDeCuentaDocumentoProps) {
  const t = useTextoDelEstado();
  const emisor = doc.inmobiliaria;

  return (
    <article
      data-estado-hoja
      data-testid="estado-de-cuenta"
      className={cn(
        'mx-auto w-full max-w-[1200px] rounded-lg border border-border bg-surface px-6 py-7 shadow-sm sm:px-10 sm:py-9',
        className,
      )}
      aria-label={t('estadoDeCuenta.titulo')}
    >
      <style>{CSS_DE_IMPRESION}</style>

      {/* Es un <div> a propósito: el print esconde todo <header> (el del
          shell), y un <header> propio se iría con él. */}
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-b border-border pb-5">
        <div className="flex min-w-0 items-center gap-3">
          {emisor.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emisor.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-subtitle text-fg">
              {emisor.razonSocial || t('estadoDeCuenta.sinEmisor')}
            </p>
            <p className="mt-0.5 font-mono text-caption tabular-nums text-fg-muted">
              {[
                emisor.nit ? `${t('estadoDeCuenta.nit')} ${emisor.nit}` : null,
                emisor.matricula
                  ? `${t('estadoDeCuenta.matricula')} ${emisor.matricula}`
                  : null,
                emisor.telefono
                  ? `${t('estadoDeCuenta.telefono')} ${emisor.telefono}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.titulo')}
          </p>
          <p className="mt-1 font-mono text-body-sm tabular-nums text-fg">
            {emisor.ciudad
              ? t('estadoDeCuenta.ciudadYFecha', {
                  ciudad: emisor.ciudad,
                  fecha: fechaLegible(doc.fecha),
                })
              : fechaLegible(doc.fecha)}
          </p>
          {nota && (
            <p
              data-testid="estado-nota"
              className="mt-2 inline-block max-w-[30ch] rounded-md bg-warning-soft px-2.5 py-1 text-left text-caption text-warning"
            >
              {nota}
            </p>
          )}
        </div>
      </div>

      <ResumenDelEstado doc={doc} hoy={hoy} className="mt-6" />

      {doc.contratos.length === 0 ? (
        <p
          data-testid="estado-sin-contratos"
          className="mt-10 border-t border-border pt-10 text-center text-body text-fg-muted"
        >
          {t('estadoDeCuenta.sinContratos')}
          <br />
          <span className="text-body-sm text-fg-subtle">
            {t('estadoDeCuenta.sinContratosDetalle')}
          </span>
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {doc.contratos.map((c) => (
            <ContratoDelEstado
              key={c.numero}
              contrato={c}
              hoy={hoy}
              sinPaginar={sinPaginar}
            />
          ))}
        </div>
      )}

      {/* El total general no existe en Nui: cada contrato cerraba por su lado y
          nadie sumaba. Es el número que el CEO dijo de memoria. */}
      {doc.contratos.length > 1 && (
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t-2 border-fg pt-4">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.totalGeneral')}
          </p>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
            <div className="text-right">
              <p className="text-label uppercase tracking-wide text-fg-subtle">
                {t('estadoDeCuenta.cancelado')}
              </p>
              <p className="font-mono text-body tabular-nums text-fg-muted">
                {formatCurrency(doc.totales.cancelado)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-label uppercase tracking-wide text-fg-subtle">
                {t('estadoDeCuenta.restaPorPagar')}
              </p>
              <p
                data-testid="total-general"
                className="font-mono text-2xl font-medium tabular-nums text-fg"
              >
                {formatCurrency(doc.totales.restaPorPagar)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-caption text-fg-subtle">
        {t('estadoDeCuenta.pie', { fecha: fechaLegible(hoy) })}
      </p>
    </article>
  );
}
