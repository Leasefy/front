'use client';

/**
 * QA-MIGRACION-95 — CA-04 (decisión de Nico (a), 06-10-2026): en «Mi arriendo»,
 * los contratos vigentes que la inmobiliaria cargó desde su sistema anterior y
 * que todavía no tienen arriendo en el portal. Se dice lo que se sabe del
 * contrato; lo que el archivo no trajo (el día de pago) dice «sin definir».
 * La deuda y los pagos viven en el estado de cuenta y en Pagos: se enlazan.
 */
import Link from 'next/link';
import { Calendar, CreditCard, House, MapPin } from '@phosphor-icons/react';

import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { useI18n } from '@/lib/i18n';
import type { ContratoDelPortal } from '@/lib/types/estado-de-cuenta';

export function ContratosSinArriendo({ contratos }: { contratos: ContratoDelPortal[] }) {
  const { formatCurrency } = useI18n();
  if (contratos.length === 0) return null;
  return (
    <div className="space-y-4" data-testid="contratos-sin-arriendo">
      {contratos.map((c) => {
        const lugar = [c.direccion, c.ciudad].filter(Boolean).join(', ');
        return (
          <article key={c.contratoId} className="rounded-xl border border-border bg-surface p-5" data-testid={`contrato-del-portal-${c.contratoId}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-fg">
                {c.numero ? `Contrato ${c.numero}` : 'Contrato'}
              </h3>
              <span className="text-sm text-fg-muted">con {c.inmobiliaria.nombre}</span>
            </div>
            {lugar ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {lugar}
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="flex items-center gap-1.5 text-fg-subtle"><Calendar className="h-4 w-4" aria-hidden />Vigencia</dt>
                <dd className="mt-0.5 text-fg">
                  {c.desde ? `Del ${fechaLarga(c.desde)}` : 'Desde una fecha sin definir'}
                  {c.hasta ? ` al ${fechaLarga(c.hasta)}` : ', sin fecha de fin'}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-fg-subtle"><House className="h-4 w-4" aria-hidden />Canon</dt>
                <dd className="mt-0.5 font-mono tabular-nums text-fg">{c.canonCop != null ? formatCurrency(c.canonCop) : 'Sin definir'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-fg-subtle"><CreditCard className="h-4 w-4" aria-hidden />Día de pago</dt>
                <dd className="mt-0.5 text-fg" data-testid={`dia-de-pago-${c.contratoId}`}>
                  {c.diaDePago != null ? `El ${c.diaDePago} de cada mes` : 'Día de pago sin definir'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-caption text-fg-muted">
              Tu inmobiliaria cargó este contrato desde su sistema anterior. Lo que debes y lo que pagaste está en tu estado de cuenta.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/inquilino/estado-de-cuenta" className="font-medium text-primary hover:underline">Ver mi estado de cuenta</Link>
              <Link href="/inquilino/pagos" className="font-medium text-primary hover:underline">Pagos</Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
