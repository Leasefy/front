'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Buildings } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { BackButton } from '@leasefy/cadence';
import { ConsignacionWizard } from '@/components/inmobiliaria/ConsignacionWizard';
import { usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';
import { lugarDeRegreso, rutaDeRegreso } from '@/lib/nav/ruta-de-regreso';

const PORTAFOLIO = '/panel/inmobiliaria/inmuebles';

function NuevaConsignacionContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { propietarios } = usePropietarios();
  const { agentes } = useAgentes();

  // Desde la ficha de un propietario se llega con `?propietarioId=` (para
  // quién es) y `?volver=` (a dónde regresar). Desde el portafolio, sin nada.
  const propietarioInicial = searchParams.get('propietarioId') ?? undefined;
  const volverA = rutaDeRegreso(searchParams.get('volver'), PORTAFOLIO);
  const etiquetaDeRegreso =
    lugarDeRegreso(volverA) === 'propietario'
      ? t('inmobiliaria.portafolio.new.backToOwner')
      : t('inmobiliaria.portafolio.detail.backToPortfolio');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back Link */}
        <BackButton href={volverA} label={etiquetaDeRegreso} />

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
            <Buildings className="w-6 h-6 text-primary" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {t('inmobiliaria.portafolio.new.title')}
            </h1>
            <p className="text-sm text-fg-muted">
              {t('inmobiliaria.portafolio.new.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <ConsignacionWizard
        propietarios={propietarios}
        agentes={agentes}
        propietarioInicial={propietarioInicial}
        volverA={volverA}
      />
    </div>
  );
}

export default function NuevaConsignacionPage() {
  return (
    <PageGuard module="portafolio">
      {/* `useSearchParams` obliga a un límite de Suspense: sin él, `next build`
          falla al prerenderizar la ruta. */}
      <Suspense fallback={null}>
        <NuevaConsignacionContent />
      </Suspense>
    </PageGuard>
  );
}
