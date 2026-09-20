'use client';

/**
 * EL ANTICIPO DEL CONTRATO en el estado de cuenta (Juan Camilo, 2026-09-16).
 *
 * Plata que el inquilino pagó por adelantado y que la caja dejó «como
 * anticipo»: todavía no abona a ninguna cuota. Es un pasivo del contrato, y
 * el día de pago de cada mes sale un recibo de caja que la descuenta. Acá se
 * ve cuánto entró, cuánto se ha descontado (mes por mes, con su recibo) y
 * cuánto queda.
 *
 * Sólo en el PANEL: lo lee un endpoint de la inmobiliaria, no el enlace que se
 * comparte con el cliente. No dice nada cuando no hay anticipo, ni cuando la
 * base no tiene la migración (ahí el anticipo no puede existir). Si la lectura
 * falla, lo dice: callarse haría creer que no hay saldo.
 */

import * as React from 'react';

import { formatCurrency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type { AnticipoDelContrato } from '@/lib/api/recibos-de-caja.types';
import { mesEnTitulo } from '@/lib/utils/mes';

type Lectura =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; anticipo: AnticipoDelContrato };

/** ¿Hay algo que mostrar? Sin migración o sin movimientos, no. */
export function hayAnticipoQueMostrar(a: AnticipoDelContrato): boolean {
  return a.disponible && a.movimientos.length > 0;
}

export function AnticipoDelContratoSeccion({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  const k = (s: string) => `recibos.anticipoDelContrato.${s}`;
  const [lectura, setLectura] = React.useState<Lectura>({ estado: 'cargando' });

  React.useEffect(() => {
    let vigente = true;
    setLectura({ estado: 'cargando' });
    recibosDeCajaApi
      .anticipoDelContrato(contractId)
      .then((anticipo) => {
        if (vigente) setLectura({ estado: 'listo', anticipo });
      })
      .catch(() => {
        if (vigente) setLectura({ estado: 'error' });
      });
    return () => {
      vigente = false;
    };
  }, [contractId]);

  if (lectura.estado === 'cargando') return null;
  if (lectura.estado === 'error') {
    return (
      <p role="alert" className="text-caption text-danger" data-testid="anticipo-del-contrato-error">
        {t(k('errorAlLeer'))}
      </p>
    );
  }
  const { anticipo } = lectura;
  if (!hayAnticipoQueMostrar(anticipo)) return null;

  return (
    <section
      className="space-y-3 rounded-md border border-border px-4 py-3"
      data-testid="anticipo-del-contrato"
      aria-label={t(k('titulo'))}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg">{t(k('titulo'))}</h3>
        <p className="text-caption text-fg-muted">{t(k('ayuda'))}</p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <dt className="text-caption text-fg-subtle">{t(k('saldo'))}</dt>
          <dd className="font-semibold tabular-nums text-fg" data-testid="anticipo-saldo">
            {formatCurrency(anticipo.saldoCop)}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-fg-subtle">{t(k('recibido'))}</dt>
          <dd className="tabular-nums text-fg-muted">{formatCurrency(anticipo.recibidoCop)}</dd>
        </div>
        <div>
          <dt className="text-caption text-fg-subtle">{t(k('descontado'))}</dt>
          <dd className="tabular-nums text-fg-muted">{formatCurrency(anticipo.descontadoCop)}</dd>
        </div>
      </dl>
      <ul className="divide-y divide-border text-sm">
        {anticipo.movimientos.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5"
            data-testid={`anticipo-movimiento-${m.id}`}
          >
            <span className={m.anulado ? 'text-fg-subtle line-through' : 'text-fg'}>
              {m.fecha} ·{' '}
              {m.tipo === 'ENTRADA'
                ? t(k('entrada'))
                : t(k('descuento'), { mes: m.mes ? mesEnTitulo(m.mes) : '' })}
              {m.reciboNumero !== null && <> · {t(k('recibo'), { numero: m.reciboNumero })}</>}
              {m.anulado && <> · {t(k('anulado'))}</>}
            </span>
            <span className="tabular-nums text-fg-muted">{formatCurrency(m.valorCop)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
