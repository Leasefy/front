'use client';

/**
 * Integraciones con servicios externos.
 *
 * El interruptor SÍ pega al back (`PUT /inmobiliaria/agency/integrations/:id`)
 * y el aviso sale DESPUÉS de que el back contesta — se da acá, que es donde se
 * sabe si salió bien.
 *
 * La configuración por integración (llaves, webhooks) NO tiene endpoint. Acá
 * había un `onConfigure` que tiraba un `toast.info` diciendo «Abriendo
 * configuración de X» sin abrir nada, y del otro lado un formulario de API Key
 * que contestaba «guardada» tras un `setTimeout`. Los dos se fueron: el detalle
 * de la integración dice qué falta en vez de fingir que lo guardó.
 */

import { toast } from '@/components/ui/toast';
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
      <ConfigIntegraciones integrations={integrations} onToggle={alternar} />
    </EstadoDeDatos>
  );
}
