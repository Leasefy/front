'use client';

/**
 * Integraciones con servicios externos.
 *
 * El interruptor SÍ pega al back (`PATCH /inmobiliaria/agency/integrations/:id`).
 * La configuración por integración (llaves, webhooks) todavía no tiene endpoint:
 * el componente las muestra deshabilitadas (`INTEGRATIONS_DISABLED`) y acá sólo
 * se avisa qué falta, sin prometer que se guardó algo.
 */

import { toast } from 'sonner';
import { Plugs } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useI18n } from '@/lib/i18n';
import { ConfigIntegraciones } from '@/components/inmobiliaria';
import { useAgencyIntegrations, inmobiliariaConfigApi } from '@/lib/hooks/useInmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

export function SeccionIntegraciones() {
  const { t } = useI18n();
  const { integrations, isLoading, errorCrudo, refetch } = useAgencyIntegrations();

  const alternar = async (integrationId: string, enabled: boolean) => {
    try {
      await inmobiliariaConfigApi.toggleIntegration(integrationId, enabled);
      await refetch();
      toast.success(
        enabled
          ? t('inmobiliaria.config.toasts.integrationEnabled')
          : t('inmobiliaria.config.toasts.integrationDisabled'),
      );
    } catch (error) {
      toast.error('Error al actualizar integración', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const configurar = async (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info(t('inmobiliaria.config.toasts.configureIntegration'), {
      description: t('inmobiliaria.config.toasts.configureIntegrationDesc', {
        name: integration?.name || integrationId,
      }),
    });
  };

  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      vacio={integrations.length === 0}
      queEs="las integraciones"
      onReintentar={() => void refetch()}
      esqueleto={<EsqueletoDeSeccion filas={4} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Plugs}
          titulo="Todavía no hay integraciones disponibles"
          ayuda="Cuando conectemos un portal o un contable con tu cuenta, aparece acá para prenderlo o apagarlo."
        />
      }
    >
      <ConfigIntegraciones integrations={integrations} onToggle={alternar} onConfigure={configurar} />
    </EstadoDeDatos>
  );
}
