'use client';

/**
 * Branding: el logo y los colores que ven tus clientes. El componente guarda
 * solo (`PUT /inmobiliaria/agency`, clave `branding`) y acá sólo se refresca la
 * config para que el resto de las secciones vea lo nuevo.
 */

import { toast } from 'sonner';
import { Palette } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { ConfigBranding } from '@/components/inmobiliaria';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

export function SeccionBranding() {
  const { config, isLoading, errorCrudo, refetch } = useInmobiliariaConfig();
  const agency = config?.agency ?? null;

  /**
   * `refetch` devuelve null cuando falla (el error queda en el hook), así que
   * hay que mirarlo: si no, cambiar de sección remonta el componente desde el
   * `logoUrl` viejo y parece que la subida no funcionó.
   */
  const refrescar = async (aviso: string) => {
    const refrescado = await refetch();
    if (refrescado === null) toast.warning(aviso);
  };

  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      vacio={!agency}
      queEs="el branding de tu inmobiliaria"
      onReintentar={() => void refetch()}
      esqueleto={<EsqueletoDeSeccion filas={4} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Palette}
          titulo="Todavía no pudimos leer tu inmobiliaria"
          ayuda="Volvé a intentar en un momento: sin los datos de la agencia no hay logo ni colores que mostrar."
        />
      }
    >
      {agency && (
        <ConfigBranding
          agency={agency}
          onLogoUpdated={() => refrescar('El logo se guardó, pero no pudimos actualizar la vista. Recargá la página.')}
          onBrandingUpdated={() =>
            refrescar('Los colores se guardaron, pero no pudimos actualizar la vista. Recargá la página.')
          }
          canEdit={agency.memberRole === 'ADMIN'}
        />
      )}
    </EstadoDeDatos>
  );
}
