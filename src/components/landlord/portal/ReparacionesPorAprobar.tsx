'use client';

/**
 * 🔴 SO-10 (QA 04-10): «nadie le avisa a la propietaria que tiene una
 * reparación por aprobar: su campana no tiene nada y su Inicio no lo
 * menciona». La campana la llena el back (aviso en la app al pedirle la
 * aprobación); esto es el aviso del Inicio: cuántas esperan su respuesta, por
 * cuánto y el enlace para decidir. Sin pendientes no se pinta nada.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wrench } from '@phosphor-icons/react';
import { Presence } from '@leasefy/cadence';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { AprobacionEnElPortal } from '@/lib/types/deducciones';
import { formatCurrency } from '@/lib/format';

export function ReparacionesPorAprobar() {
  const [pendientes, setPendientes] = useState<AprobacionEnElPortal[]>([]);

  useEffect(() => {
    let vivo = true;
    aprobacionesDeReparacionApi
      .delPortal()
      .then((r) => {
        if (vivo) setPendientes(Array.isArray(r?.pendientes) ? r.pendientes : []);
      })
      // Sin respuesta no se afirma nada: el enlace de «Aprobar reparaciones» sigue abajo.
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const total = pendientes.reduce((suma, a) => suma + (a.valorCop ?? 0), 0);
  const n = pendientes.length;

  return (
    <Presence show={n > 0}>
      <Link
        href="/panel/aprobaciones"
        data-testid="reparaciones-por-aprobar"
        className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 transition-colors hover:border-warning"
      >
        <Wrench className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-body-sm font-medium text-fg">
            {n === 1
              ? `Tienes una reparación por aprobar (${formatCurrency(total)})`
              : `Tienes ${n} reparaciones por aprobar (${formatCurrency(total)})`}
          </span>
          <span className="mt-0.5 block text-body-sm text-fg-muted">
            {n === 1 && pendientes[0]?.reparacion?.titulo
              ? `«${pendientes[0].reparacion.titulo}». `
              : ''}
            Si la apruebas, se descuenta de tu próximo giro. Revísala y decide.
          </span>
        </span>
      </Link>
    </Presence>
  );
}
