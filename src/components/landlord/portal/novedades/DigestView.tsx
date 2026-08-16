'use client';

import Link from 'next/link';
import { CaretLeft } from '@phosphor-icons/react';
import { Card } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { Digest } from '@/lib/api/owner-novedades.types';

/**
 * Detalle de un digest mensual (F5). Render informativo del `DigestPayload` — numerales mono,
 * montos verbatim, sin alarmismo. El payload ya viene PII-minimizado por el back.
 */
export function DigestView({ digest }: { digest: Digest }) {
  const { formatCurrency, formatDate } = useI18n();
  const p = digest.payload;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/panel/novedades"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <CaretLeft className="w-4 h-4" /> Novedades
        </Link>

        <h1 className="text-2xl font-semibold font-mono tabular-nums">{p.periodo}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {digest.deliveredAt ? `Enviado el ${formatDate(digest.deliveredAt)}` : `Generado el ${formatDate(digest.generatedAt)}`}
        </p>

        {/* Recaudo + ocupación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Card className="p-4 sm:p-6">
            <p className="text-sm text-fg-muted">Recaudo del mes</p>
            <p className="text-2xl font-semibold font-mono tabular-nums mt-1">{formatCurrency(p.recaudo.totalCop)}</p>
            {p.recaudo.porInmueble.length > 0 && (
              <ul className="divide-y divide-border mt-3">
                {p.recaudo.porInmueble.map((r) => (
                  <li key={r.propertyRef} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{r.label}</span>
                    <span className="font-mono tabular-nums shrink-0">{formatCurrency(r.amountCop)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 sm:p-6">
            <p className="text-sm text-fg-muted">Ocupación</p>
            <p className="text-2xl font-semibold font-mono tabular-nums mt-1">{Math.round(p.ocupacion.occupancyPct)}%</p>
            <p className="text-sm text-fg-muted mt-2">
              <span className="font-mono tabular-nums text-fg">{p.ocupacion.occupied}</span> ocupados ·{' '}
              <span className="font-mono tabular-nums text-fg">{p.ocupacion.vacant}</span> vacantes ·{' '}
              <span className="font-mono tabular-nums text-fg">{p.ocupacion.totalProperties}</span> en total
            </p>
          </Card>
        </div>

        {/* Solicitudes */}
        <Card className="p-4 sm:p-6 mt-4">
          <h2 className="text-base font-semibold mb-3">Solicitudes</h2>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-fg-muted">Creadas</p>
              <p className="font-medium font-mono tabular-nums">{p.solicitudes.creadas}</p>
            </div>
            <div>
              <p className="text-fg-muted">Resueltas</p>
              <p className="font-medium font-mono tabular-nums">{p.solicitudes.resueltas}</p>
            </div>
            <div>
              <p className="text-fg-muted">Abiertas</p>
              <p className="font-medium font-mono tabular-nums">{p.solicitudes.abiertas}</p>
            </div>
          </div>
          {p.solicitudes.nota && <p className="text-xs text-fg-muted mt-3">{p.solicitudes.nota}</p>}
        </Card>

        {/* Daños resueltos */}
        {p.danos.available && p.danos.resueltosCount > 0 && (
          <Card className="p-4 sm:p-6 mt-4">
            <h2 className="text-base font-semibold mb-3">
              Daños resueltos (<span className="font-mono tabular-nums">{p.danos.resueltosCount}</span>)
            </h2>
            <ul className="divide-y divide-border">
              {p.danos.resueltos.map((d, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="capitalize truncate">
                    {d.category ?? 'Daño'}
                    {d.severity ? <span className="text-fg-muted"> · {d.severity}</span> : null}
                  </span>
                  {d.costoFinalCop != null && (
                    <span className="font-mono tabular-nums shrink-0">{formatCurrency(d.costoFinalCop)}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Contratos por vencer */}
        {p.contratosPorVencer.length > 0 && (
          <Card className="p-4 sm:p-6 mt-4">
            <h2 className="text-base font-semibold mb-3">Contratos por vencer</h2>
            <ul className="divide-y divide-border">
              {p.contratosPorVencer.map((c) => (
                <li key={c.propertyRef} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{c.propertyLabel}</span>
                  <span className="text-fg-muted shrink-0">
                    Vence {formatDate(c.endDate)} · <span className="font-mono tabular-nums">{c.daysLeft}</span> días
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Acciones pendientes */}
        {(p.actionItems.decisionesPendientes.length > 0 || p.actionItems.preavisos.length > 0) && (
          <Card className="p-4 sm:p-6 mt-4">
            <h2 className="text-base font-semibold mb-3">Acciones que te esperan</h2>
            <ul className="space-y-2 text-sm">
              {p.actionItems.decisionesPendientes.map((d) => (
                <li key={d.processId} className="flex items-center justify-between gap-3">
                  <span className="truncate">Elegir inquilino · {d.label}</span>
                  <Link href="/panel/seleccion" className="text-primary shrink-0">Ver</Link>
                </li>
              ))}
              {p.actionItems.preavisos.map((pv) => (
                <li key={pv.propertyRef} className="flex items-center justify-between gap-3">
                  <span className="truncate">Preaviso · {pv.label}</span>
                  <span className="text-fg-muted shrink-0">
                    <span className="font-mono tabular-nums">{pv.daysToDeadline}</span> días
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
