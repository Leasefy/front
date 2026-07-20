'use client';

import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { Card } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { FinanzasInmuebleDetalle, FinanzasPagos } from '@/lib/api/owner-finanzas.types';

interface InmuebleDetalleViewProps {
  detalle: FinanzasInmuebleDetalle;
  pagos: FinanzasPagos | null;
}

/**
 * Detalle de un inmueble (F3). Montos VERBATIM del back (`formatCurrency`), sin recomputar.
 * El `payload` de novedades ya viene restringido a claves no-PII por el back (barrera anti-PII);
 * el front lo muestra tal cual, sin exponer campos extra.
 */
export function InmuebleDetalleView({ detalle, pagos }: InmuebleDetalleViewProps) {
  const { formatCurrency, formatDate } = useI18n();
  const { property, contract, novedades } = detalle;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/panel/portafolio"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <CaretLeft className="w-4 h-4" /> Mi plata
        </Link>

        <h1 className="text-2xl font-semibold">{property.label}</h1>
        <p className="text-sm text-fg-muted mt-1 capitalize">
          {property.occupancyStatus}
          {property.vacantSince ? ` · vacante desde ${formatDate(property.vacantSince)}` : ''}
        </p>

        {/* Contrato */}
        {contract ? (
          <Card className="p-4 sm:p-6 mt-6">
            <h2 className="text-base font-semibold mb-4">Contrato</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-fg-muted">Canon</dt>
                <dd className="font-medium font-mono tabular-nums">{formatCurrency(contract.canonCop)}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Inquilino</dt>
                <dd className="font-medium">{contract.tenantDisplayName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Vigencia</dt>
                <dd className="font-medium">
                  {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-fg-muted">Días restantes</dt>
                <dd className="font-medium font-mono tabular-nums">{contract.daysRemaining}</dd>
              </div>
            </dl>

            {contract.preaviso.options.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-sm font-medium mb-1">Opciones de preaviso</p>
                <p className="text-xs text-fg-muted mb-3">
                  Informativo. La decisión de terminar o renovar es tuya y de tu inmobiliaria.
                </p>
                <ul className="space-y-2">
                  {contract.preaviso.options.map((opt) => (
                    <li key={opt.tipo} className="text-sm">
                      <span className={opt.disponible ? 'font-medium' : 'text-fg-muted'}>
                        {opt.fundamento}
                      </span>
                      {opt.costoCop != null && (
                        <span className="text-fg-muted font-mono tabular-nums"> · {formatCurrency(opt.costoCop)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-4 sm:p-6 mt-6">
            <p className="text-sm text-fg-muted">Este inmueble no tiene un contrato activo.</p>
          </Card>
        )}

        {/* Novedades */}
        {novedades.length > 0 && (
          <Card className="p-4 sm:p-6 mt-6">
            <h2 className="text-base font-semibold mb-4">Novedades</h2>
            <ul className="space-y-3">
              {novedades.map((n) => (
                <li key={n.eventRef} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{n.tipo.replace(/_/g, ' ')}</p>
                    {n.payload?.detalle && (
                      <p className="text-sm text-fg-muted">{n.payload.detalle}</p>
                    )}
                  </div>
                  <span className="text-xs text-fg-muted shrink-0">{formatDate(n.occurredAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Historial de pagos */}
        <Card className="p-4 sm:p-6 mt-6">
          <h2 className="text-base font-semibold mb-4">Historial de pagos</h2>
          {!pagos || pagos.items.length === 0 ? (
            <p className="text-sm text-fg-muted">Todavía no hay pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pagos.items.map((p) => (
                <li key={p.paymentRef} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{p.concepto}</p>
                    <p className="text-xs text-fg-muted">
                      {formatDate(p.paidAt)}
                      {p.periodo ? ` · ${p.periodo}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium font-mono tabular-nums shrink-0">{formatCurrency(p.amountCop)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
