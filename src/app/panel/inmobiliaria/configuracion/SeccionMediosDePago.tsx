'use client';

/**
 * Medios de pago: lo que el inquilino ve en «Cómo pagar» y lo que ofrece el
 * selector del recibo de caja. El componente trae y guarda lo suyo; acá sólo
 * se le pasa la agencia (de ahí saca el titular de las cuentas).
 */

import { Wallet } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { MediosDePago } from '@/components/inmobiliaria/medios-de-pago/MediosDePago';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { EsqueletoDeSeccion, VacioDeSeccion } from './piezas';

export function SeccionMediosDePago() {
  const { config, isLoading, errorCrudo, refetch } = useInmobiliariaConfig();
  const agency = config?.agency ?? null;

  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      vacio={!agency}
      queEs="los medios de pago"
      onReintentar={refetch}
      esqueleto={<EsqueletoDeSeccion filas={3} />}
      cuandoVacio={
        <VacioDeSeccion
          icono={Wallet}
          titulo="Todavía no pudimos leer tu inmobiliaria"
          ayuda="Volvé a intentar en un momento: las cuentas y los enlaces de pago cuelgan de la agencia."
        />
      }
    >
      <MediosDePago agencia={agency} />
    </EstadoDeDatos>
  );
}
