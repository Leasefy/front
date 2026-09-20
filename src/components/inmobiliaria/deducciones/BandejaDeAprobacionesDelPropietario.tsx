'use client';

/**
 * 🔴 D12 — lo que se le pidió al propietario y todavía no se resolvió.
 *
 * Nico y Juan Camilo (17-09-2026): la reparación a cargo del propietario la
 * aprueba el propietario. Si la rechaza, «la inmobiliaria lo ve y decide qué
 * sigue»: esta bandeja es donde lo ve. Las que esperan al propietario salen
 * también, para que nadie las pierda de vista. Tocar una abre la solicitud.
 *
 * Sin la migración el back responde 503 y la bandeja no se dibuja: no hay nada
 * que esperar si no se puede pedir.
 */

import { useCallback, useEffect, useState } from 'react';
import { Hourglass, XCircle } from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { AprobacionEnLaBandeja } from '@/lib/types/deducciones';

export function BandejaDeAprobacionesDelPropietario({
  version = 0,
  onAbrir,
}: {
  /** Sube cuando algo cambió (una aprobación, un rechazo): la bandeja se relee. */
  version?: number;
  onAbrir?: (solicitudId: string) => void;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.aprobacionDelPropietario.${s}`;
  const [filas, setFilas] = useState<AprobacionEnLaBandeja[] | null>(null);

  const cargar = useCallback(async () => {
    try {
      setFilas(await aprobacionesDeReparacionApi.bandeja());
    } catch {
      // 503 sin la migración, o un rol sin operaciones: no se dibuja.
      setFilas(null);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (filas === null || filas.length === 0) return null;

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 space-y-3"
      data-testid="bandeja-de-aprobaciones"
      aria-label={t(k('bandejaTitulo'))}
    >
      <h2 className="text-sm font-semibold text-fg">{t(k('bandejaTitulo'))}</h2>
      <ul className="divide-y divide-border">
        {filas.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-surface-muted rounded-md px-2"
              onClick={() => onAbrir?.(a.solicitudId)}
              data-testid={`bandeja-${a.estado}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg">
                  {a.reparacion} · {a.inmueble}
                </span>
                <span className="block truncate text-xs text-fg-muted">
                  {a.propietario}
                  {a.motivoDeRechazo ? ` — «${a.motivoDeRechazo}»` : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                <span className="font-mono tabular-nums text-fg">{formatCurrency(a.valorCop)}</span>
                {a.estado === 'RECHAZADA' ? (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(k('bandejaRechazada'))}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-fg-muted">
                    <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(k('bandejaPendiente'))}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
