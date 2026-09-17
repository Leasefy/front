'use client';

/**
 * La cuenta de cobro al PROPIETARIO — el documento con que la inmobiliaria le
 * cobra lo que ya no se le puede descontar de ninguna liquidación.
 *
 * Nico y Juan Camilo (2026-09-16): «propietario con deducción o saldo en contra
 * que ya no tiene más liquidaciones: se le cobra», con una cuenta de cobro. Es
 * el hermano de `CuentaDeCobro` (la del inquilino) y comparte su hoja de
 * impresión: mismo papel, otro destinatario.
 *
 * Presentacional: recibe la cuenta ya cargada. Los números vienen del back
 * (`totalCop` sólo suma los renglones VIGENTES); acá no se suma nada.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { CuentaDeCobroDelPropietario as Cuenta } from '@/lib/types/deducciones';
import { CSS_DE_IMPRESION } from './CuentaDeCobro';
import { fechaEnPalabras } from './lineas';

export interface CuentaDeCobroDelPropietarioProps {
  cuenta: Cuenta;
  className?: string;
}

export function CuentaDeCobroDelPropietario({
  cuenta,
  className,
}: CuentaDeCobroDelPropietarioProps) {
  const { t, locale, formatCurrency } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.cuentaDeCobro.${s}`;
  const idioma: 'es' | 'en' = locale === 'en' ? 'en' : 'es';

  const agencia = cuenta.agencia;
  const ubicacion = [agencia?.direccion, agencia?.ciudad].filter(Boolean).join(', ');
  const contacto = [agencia?.telefono, agencia?.correo].filter(Boolean).join(' · ');
  const ubicacionDelPropietario = [cuenta.propietario.direccion, cuenta.propietario.ciudad]
    .filter(Boolean)
    .join(', ');

  return (
    <article
      data-cuenta-hoja
      data-testid="cuenta-de-cobro-del-propietario"
      className={cn(
        'mx-auto w-full max-w-[800px] rounded-lg border border-border bg-surface px-8 py-10 shadow-sm sm:px-12 sm:py-12',
        className,
      )}
      aria-label={t(k('titulo'))}
    >
      <style>{CSS_DE_IMPRESION}</style>

      <div className="flex items-start justify-between gap-6 border-b border-border pb-6">
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{t(k('de'))}</p>
          <p className="text-base font-semibold text-fg">{agencia?.nombre ?? '—'}</p>
          {agencia?.nit ? (
            <p className="font-mono text-xs tabular-nums text-fg-muted">NIT {agencia.nit}</p>
          ) : null}
          {ubicacion ? <p className="text-xs text-fg-muted">{ubicacion}</p> : null}
          {contacto ? <p className="text-xs text-fg-muted">{contacto}</p> : null}
        </div>
        <div className="shrink-0 space-y-1.5 text-right">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t(k('titulo'))}</h1>
          <p className="font-mono text-sm tabular-nums text-fg" data-testid="numero-de-la-cuenta">
            {t(k('numero'), { numero: cuenta.numero })}
          </p>
          <p className="text-xs text-fg-muted">
            {t(k('emitida'), { fecha: fechaEnPalabras(cuenta.emitidaAt, idioma) })}
          </p>
        </div>
      </div>

      <section className="space-y-0.5 border-b border-border py-6">
        <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{t(k('a'))}</p>
        <p className="text-sm font-medium text-fg">{cuenta.propietario.nombre}</p>
        <p className="font-mono text-xs tabular-nums text-fg-muted">
          {cuenta.propietario.tipoDeDocumento} {cuenta.propietario.documento}
        </p>
        {ubicacionDelPropietario ? (
          <p className="text-xs text-fg-muted">{ubicacionDelPropietario}</p>
        ) : null}
        {cuenta.propietario.correo ? (
          <p className="text-xs text-fg-muted">{cuenta.propietario.correo}</p>
        ) : null}
      </section>

      <section className="py-6">
        <p className="mb-4 text-sm text-fg-muted">{cuenta.porQue}</p>
        <table className="w-full border-collapse text-sm" data-testid="renglones-de-la-cuenta">
          <thead>
            <tr className="border-b border-border-strong">
              <th
                scope="col"
                className="pb-2 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
              >
                {t(k('concepto'))}
              </th>
              <th
                scope="col"
                className="pb-2 text-right font-mono text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
              >
                {t(k('valor'))}
              </th>
            </tr>
          </thead>
          <tbody>
            {cuenta.renglones.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border-faint"
                data-testid="renglon"
                data-estado={r.estado}
              >
                <td className="py-2.5 pr-4 text-fg">
                  <span className={cn(r.estado !== 'VIGENTE' && 'text-fg-muted line-through')}>
                    {t(`inmobiliaria.deducciones.origen.${r.origen}`)}
                    {r.origen !== 'SALDO_ANTERIOR' && `: ${r.motivo}`}
                  </span>
                  <span className="ml-2 font-mono text-[11px] tabular-nums text-fg-subtle">
                    {fechaEnPalabras(r.fecha, idioma)}
                  </span>
                  {r.estado !== 'VIGENTE' ? (
                    <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-fg-subtle">
                      ({t(k(`estado.${r.estado}`))})
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-right font-mono tabular-nums text-fg">
                  {formatCurrency(r.valorCop)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex items-baseline justify-between gap-4 rounded-md bg-surface-muted px-4 py-3">
          <span className="text-sm font-semibold text-fg">{t(k('total'))}</span>
          <span
            className="font-mono text-2xl font-semibold tabular-nums text-fg"
            data-testid="total-de-la-cuenta-del-propietario"
          >
            {formatCurrency(cuenta.totalCop)}
          </span>
        </div>
      </section>

      <div className="mt-8 border-t border-border-faint pt-4 text-[11px] text-fg-subtle">
        {t(k('noEsFactura'))}
      </div>
    </article>
  );
}

export default CuentaDeCobroDelPropietario;
