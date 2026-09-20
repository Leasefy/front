'use client';

/**
 * Perfil de la inmobiliaria: los datos de la empresa, cómo mide su tasa de
 * recaudo, el extracto mensual al propietario y la renovación automática.
 * Todos guardan por el MISMO endpoint (`PUT /inmobiliaria/agency`) y con el
 * mismo `guardar`, que sólo manda los campos cambiados.
 */

import { ConfigPenalidadDeTerminacion } from '@/components/inmobiliaria/ConfigPenalidadDeTerminacion';
import { ConfigCicloDeVidaDelContrato } from '@/components/inmobiliaria/ConfigCicloDeVidaDelContrato';
import { toast } from '@/components/ui/toast';
import { Buildings, Info } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useI18n } from '@/lib/i18n';
import {
  ConfigPerfilAgencia,
  ConfigExtractoMensual,
  ConfigRenovacionAutomatica,
  ConfigTasaDeRecaudo,
} from '@/components/inmobiliaria';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

/**
 * Los datos de la empresa que se imprimen en un contrato o en una cuenta de
 * cobro. Sin ellos la ficha se llena de «—» y nadie sabe cuáles faltan: acá se
 * nombran, y «Editar» (abajo, en la tarjeta) es la salida.
 */
const DATOS_DE_LA_EMPRESA: Array<{ campo: keyof AgencyProfile; label: string }> = [
  { campo: 'nit', label: 'NIT' },
  { campo: 'razonSocial', label: 'razón social' },
  { campo: 'address', label: 'dirección' },
  { campo: 'city', label: 'ciudad' },
  { campo: 'phone', label: 'teléfono' },
  { campo: 'email', label: 'correo' },
];

export function datosQueFaltan(agency: AgencyProfile): string[] {
  return DATOS_DE_LA_EMPRESA.filter(({ campo }) => {
    const v = agency[campo];
    return v === null || v === undefined || String(v).trim() === '';
  }).map((d) => d.label);
}

export function SeccionPerfil() {
  const { t } = useI18n();
  const { config, isLoading, errorCrudo, refetch } = useInmobiliariaConfig();
  const agency = config?.agency ?? null;
  const isAgencyAdmin = agency?.memberRole === 'ADMIN';

  /**
   * Guarda sólo los campos cambiados (`UpdateAgencyDto` del back). Relanza el
   * error para que el formulario se quede en modo edición y no se pierda lo
   * escrito.
   */
  const guardar = async (payload: UpdateAgencyPayload) => {
    try {
      await agencyApi.updateAgency(payload);
      await refetch();
      toast.success(t('inmobiliaria.config.toasts.configSaved'), {
        description: t('inmobiliaria.config.toasts.configSavedDesc'),
      });
    } catch (error) {
      toast.error('Error al guardar configuración', {
        description: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const faltan = agency ? datosQueFaltan(agency) : [];

  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      vacio={!agency}
      queEs="los datos de tu inmobiliaria"
      onReintentar={refetch}
      esqueleto={<EsqueletoDeSeccion filas={5} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Buildings}
          titulo="Todavía no pudimos leer tu inmobiliaria"
          ayuda="Vuelve a intentar en un momento. Si sigue igual, escríbenos: la cuenta puede no tener una agencia asociada."
        />
      }
    >
      {agency && (
        <div className="space-y-6">
          {faltan.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
              <p className="text-sm text-fg-muted">
                Faltan datos de la empresa: {faltan.join(', ')}. Toca «Editar» y complétalos: se imprimen en los
                contratos y en las cuentas de cobro.
              </p>
            </div>
          )}
          <ConfigPerfilAgencia agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
          {/* Justo después de los datos de la empresa: es una decisión del
              negocio que cambia un número de todas las pantallas. */}
          <ConfigTasaDeRecaudo agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
          <ConfigPenalidadDeTerminacion agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
          <ConfigCicloDeVidaDelContrato agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
          <ConfigExtractoMensual agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
          <ConfigRenovacionAutomatica agency={agency} onSave={guardar} canEdit={isAgencyAdmin} />
        </div>
      )}
    </EstadoDeDatos>
  );
}
