'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { useI18n } from '@/lib/i18n';
import { MarcoDeConfiguracion } from './MarcoDeConfiguracion';
import { idiomaDe, menuDeCuenta, seccionDeLaRuta, type ConfiguracionDeCuenta } from './configuracion-de-cuenta';

/**
 * El layout de `/…/configuracion` de un panel de persona: el marco de la
 * inmobiliaria con el menú de ese panel. Vive en el layout para que moverse
 * entre secciones no desmonte la nav.
 */
export function LayoutDeConfiguracionDeCuenta<Id extends string>({
  config,
  children,
}: {
  config: ConfiguracionDeCuenta<Id>;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const { locale } = useI18n();
  const l = idiomaDe(locale);
  const menu = useMemo(() => menuDeCuenta(config, locale), [config, locale]);

  return (
    <MarcoDeConfiguracion
      titulo={config.titulo[l]}
      subtitulo={config.subtitulo[l]}
      navAria={l === 'es' ? 'Secciones de configuración' : 'Settings sections'}
      menu={menu}
      activaId={seccionDeLaRuta(config, pathname)?.id ?? null}
    >
      {children}
    </MarcoDeConfiguracion>
  );
}
