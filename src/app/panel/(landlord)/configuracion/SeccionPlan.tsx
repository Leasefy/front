'use client';

/**
 * Tu plan: cuál tienes, cuánto cuesta, qué límites trae y la salida a mejorarlo.
 * Con las filas de Configuración de la inmobiliaria.
 *
 * Mientras carga NO dice «Starter»: antes el plan por defecto se pintaba como si
 * fuera el tuyo hasta que llegaba la respuesta.
 */

import { useRouter } from 'next/navigation';
import { ArrowUpRight, Crown, FileText, House } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { useMySubscription } from '@/lib/hooks/useSubscription';
import { precioLegible } from '@/lib/planes/precio-del-plan-del-propietario';
import { usePlanesDelPropietario } from '@/lib/planes/use-planes-del-propietario';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoDeSeccion, FilaDeAjuste, TarjetaDeAjustes } from '@/components/configuracion/piezas';

export function SeccionPlan() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const es = locale !== 'en';
  const { subscription, isLoading, error, refetch } = useMySubscription();
  // El precio lo dice el back (QA 23-09), no `PLANS`.
  const { planDe } = usePlanesDelPropietario();

  if (isLoading) return <EsqueletoDeSeccion filas={3} />;
  if (error) return <FalloDeCarga error={error} queEs="tu plan" onReintentar={refetch} />;

  const planId = subscription?.planId ?? 'starter';
  const plan = planDe(planId);
  const limite = (featureId: string) => {
    const l = plan.features.find((f) => f.id === featureId)?.limit;
    if (l === 'unlimited') return es ? 'Sin límite' : 'Unlimited';
    return String(l ?? 1);
  };

  return (
    <TarjetaDeAjustes>
      <FilaDeAjuste
        icono={Crown}
        titulo={plan.name}
        descripcion={
          planId === 'starter'
            ? t('landlordSettings.subscription.freePlan')
            : `${precioLegible(plan.price.monthly)}/${t('landlordSettings.subscription.month')}`
        }
      >
        {planId !== 'flex' && (
          <Button size="sm" hideArrow onClick={() => router.push('/panel/upgrade')} data-testid="mejorar-plan">
            {t('landlordSettings.subscription.upgradePlan')}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        )}
      </FilaDeAjuste>
      <FilaDeAjuste
        icono={House}
        titulo={t('landlordSettings.subscription.properties')}
        descripcion={es ? 'Cuántas puedes publicar con tu plan' : 'How many you can list on your plan'}
      >
        <span className="text-sm font-semibold tabular-nums text-fg">{limite('property_listing')}</span>
      </FilaDeAjuste>
      <FilaDeAjuste
        icono={FileText}
        titulo={t('landlordSettings.subscription.contracts')}
        descripcion={es ? 'Cuántos puedes tener activos con tu plan' : 'How many you can have active on your plan'}
      >
        <span className="text-sm font-semibold tabular-nums text-fg">{limite('unlimited_contracts')}</span>
      </FilaDeAjuste>
    </TarjetaDeAjustes>
  );
}
