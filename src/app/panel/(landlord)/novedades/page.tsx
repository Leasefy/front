'use client';

import Link from 'next/link';
import { Bell, CaretRight, CheckCircle } from '@phosphor-icons/react';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { Card } from '@/components/ui';
import { EsqueletoDePagina } from '@/components/estado/EsqueletoDePagina';
import { useI18n } from '@/lib/i18n';
import { useOwnerNovedades } from '@/lib/hooks/useOwnerPortal';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { PortalPlaceholder } from '@/components/landlord/portal/PortalPlaceholder';
import { DamagesSection } from '@/components/landlord/portal/novedades/DamagesSection';

/**
 * Novedades (F5) — hub. Resumen mensual (digests) + daños fail-soft. Loading→Spinner;
 * portal no cableado→"Próximamente"; con data→secciones.
 */
export default function NovedadesPage() {
  const { formatDate, locale } = useI18n();
  const { digests, danos, isLoading, unavailable } = useOwnerNovedades();

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        {/* Dentro del panel va el esqueleto, no el logo (Nico, 01-10: «el logo sólo en cargas de pantalla completa»). */}
        <EsqueletoDePagina variante="list" className="max-w-4xl" />
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

  /*
   * Lo que está en curso primero (glow up, 21-10-2026): un daño en proceso es
   * algo que la persona sigue; el resumen del mes se consulta. Sin daños en
   * curso, el resumen va arriba como siempre.
   */
  const hayDanosEnCurso = Boolean(
    danos?.available && danos.tickets.some((t) => t.estadoDisplay === 'en_proceso'),
  );

  return (
    <div>
      <div className="max-w-4xl p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Solicitudes"
          titulo="Novedades"
          descripcion="Tu resumen mensual y el estado de los daños, sin tener que llamar."
        />

        {hayDanosEnCurso && <DamagesSection danos={danos} />}

        {/* Resumen mensual */}
        <Card className="p-4 sm:p-6 mt-6">
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
                      {/* El mes con su nombre («julio de 2026»), no «2026-07». */}
                      <p className="font-medium first-letter:uppercase">
                        {nombreDelMes(d.periodo, locale === 'en' ? 'en' : 'es')}
                      </p>
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
        {!hayDanosEnCurso && <DamagesSection danos={danos} />}
      </div>
    </div>
  );
}
