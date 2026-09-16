'use client';

import { LayoutDeConfiguracionDeCuenta } from '@/components/configuracion/LayoutDeConfiguracionDeCuenta';
import { CONFIGURACION_DEL_INQUILINO } from './secciones';

export default function ConfiguracionDelInquilinoLayout({ children }: { children: React.ReactNode }) {
  return <LayoutDeConfiguracionDeCuenta config={CONFIGURACION_DEL_INQUILINO}>{children}</LayoutDeConfiguracionDeCuenta>;
}
