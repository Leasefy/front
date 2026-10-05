'use client';

import { LayoutDeConfiguracionDeCuenta } from '@/components/configuracion/LayoutDeConfiguracionDeCuenta';
import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { CONFIGURACION_DEL_PROPIETARIO, CONFIGURACION_DEL_PROPIETARIO_DE_INMOBILIARIA } from './secciones';

export default function ConfiguracionDelPropietarioLayout({ children }: { children: React.ReactNode }) {
  // QA-PROP-95: el propietario de inmobiliaria no ve «Tu plan», «Equipo» ni «Cuentas de recaudo».
  const administrados = useContratosAdministrados();
  const deInmobiliaria = administrados.cargando || administrados.doc !== null;
  return (
    <LayoutDeConfiguracionDeCuenta config={deInmobiliaria ? CONFIGURACION_DEL_PROPIETARIO_DE_INMOBILIARIA : CONFIGURACION_DEL_PROPIETARIO}>
      {children}
    </LayoutDeConfiguracionDeCuenta>
  );
}
