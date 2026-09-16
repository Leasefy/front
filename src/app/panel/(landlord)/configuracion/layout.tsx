'use client';

import { LayoutDeConfiguracionDeCuenta } from '@/components/configuracion/LayoutDeConfiguracionDeCuenta';
import { CONFIGURACION_DEL_PROPIETARIO } from './secciones';

export default function ConfiguracionDelPropietarioLayout({ children }: { children: React.ReactNode }) {
  return <LayoutDeConfiguracionDeCuenta config={CONFIGURACION_DEL_PROPIETARIO}>{children}</LayoutDeConfiguracionDeCuenta>;
}
