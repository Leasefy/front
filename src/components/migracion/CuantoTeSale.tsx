'use client';

/**
 * Cuánto le saldría Leasefy con lo que trae (Nico, 31-10-2026: «en la migración sabríamos cuántos inmuebles tendrían y
 * podríamos saber cuánto cobrar ahí»). Con los inmuebles del paso «Inmuebles» y las tarifas de `GET /config/tarifas`
 * (la misma fuente del cobro). Dice «hasta» porque se cobra sólo cada inmueble ACTIVO (mandato vigente, sin
 * borradores). Sin tarifas, sin inmuebles o con el cobro por inmueble apagado, no dice nada.
 */
import { useEffect, useState } from 'react';
import { Presence } from '@leasefy/cadence';

import { tarifasApi, type TarifasDeLeasefy } from '@/lib/api/tarifas.service';
import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';
import { precioDelMes } from '@/lib/conversion/acceso';
import { useI18n } from '@/lib/i18n';

/** El mes con `n` inmuebles activos (antes de IVA, sin usuarios de más). Puro: se prueba solo. */
export function cuentaDeLaMigracion(n: number, plan: TarifasDeLeasefy['tarifas']['plan']): { total: number; enElMinimo: boolean } {
  const porInmuebles = Math.max(0, Math.floor(n)) * plan.porInmueble;
  return { total: Math.max(plan.minimoMensual, porInmuebles), enElMinimo: porInmuebles < plan.minimoMensual };
}

export function CuantoTeSale({ pasos, className }: { pasos: PasoDeMigracion[]; className?: string }) {
  const { t } = useI18n();
  const [tarifas, setTarifas] = useState<TarifasDeLeasefy | null>(null);
  const n = pasos.find((p) => p.id === 'propiedades')?.conteo ?? 0;
  const hayInmuebles = n > 0;
  useEffect(() => {
    if (!hayInmuebles) return;
    let vivo = true;
    tarifasApi
      .ver()
      .then((r) => {
        if (vivo) setTarifas(r);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [hayInmuebles]);

  const plan = tarifas && tarifas.vigente !== false ? tarifas.tarifas.plan : null;
  const cuenta = plan && n > 0 ? cuentaDeLaMigracion(n, plan) : null;

  return (
    <Presence show={cuenta !== null}>
      {cuenta && plan ? (
        <p className={className ?? 'mt-2 text-caption text-fg-muted'} data-testid="muro-cuanto-te-sale">
          {cuenta.enElMinimo
            ? t('migracion.muro.cuantoTeSaleMinimo', {
                n: n.toLocaleString('es-CO'),
                minimo: precioDelMes(plan.minimoMensual),
                porInmueble: precioDelMes(plan.porInmueble),
              })
            : t('migracion.muro.cuantoTeSale', {
                n: n.toLocaleString('es-CO'),
                total: precioDelMes(cuenta.total),
                porInmueble: precioDelMes(plan.porInmueble),
              })}
        </p>
      ) : null}
    </Presence>
  );
}
