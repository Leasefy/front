'use client';

import Link from 'next/link';
import { Bell, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { PageHeader } from '@leasefy/cadence';
import { Card, Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useOwnerNovedades } from '@/lib/hooks/useOwnerPortal';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { DamagesSection } from '@/components/landlord/portal/novedades/DamagesSection';

/**
 * Novedades (F5) — hub. Resumen mensual (digests) + daños fail-soft. Loading→Spinner;
 * portal no cableado→"Próximamente"; con data→secciones.
 */
export default function NovedadesPage() {
  const { formatDate } = useI18n();
  const { digests, danos, isLoading, unavailable } = useOwnerNovedades();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (unavailable) {
    return (
      <PortalPlaceholder
        title="Novedades"
        subtitle="Tu resumen mensual y el estado de los daños, sin tener que llamar."
        icon={Bell}
        emptyDescription="Vas a recibir un resumen de fin de mes y a ver el estado de los daños de tu inmueble, con tus preferencias de aviso bajo control. Se activa cuando tu inmobiliaria habilite el Portal del Propietario."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="Novedades"
          subtitle="Tu resumen mensual y el estado de los daños, sin tener que llamar."
        />

        {/* Resumen mensual */}
        <Card className="p-4 sm:p-6 mt-8">
          <h2 className="text-base font-semibold mb-4">Resumen mensual</h2>
          {digests.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Todavía no hay resúmenes. Cuando cierre el mes vas a recibir uno acá con tu recaudo,
              ocupación y novedades.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {digests.map((d) => (
                <li key={d.periodo}>
                  <Link
                    href={`/panel/novedades/${d.periodo}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-surface-muted rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium font-mono tabular-nums">{d.periodo}</p>
                      <p className="text-xs text-fg-muted">
                        {d.deliveredAt ? `Enviado ${formatDate(d.deliveredAt)}` : `Generado ${formatDate(d.generatedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.deliveredAt && <CheckCircle className="w-4 h-4 text-primary" weight="fill" aria-hidden="true" />}
                      <CaretRight className="w-4 h-4 text-fg-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Daños (fail-soft) */}
        <DamagesSection danos={danos} />
      </div>
    </div>
  );
}
