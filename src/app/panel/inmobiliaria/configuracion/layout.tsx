'use client';

/**
 * El marco de Configuración: encabezado + navegación interna a la izquierda.
 *
 * Vive en el layout —y no en cada página— para que moverse entre secciones no
 * desmonte la nav: cambia sólo la columna de la derecha. Cada sección es una
 * ruta propia (`/configuracion/<slug>`), así que el enlace se puede compartir
 * y el botón atrás funciona.
 *
 * La ficha de un miembro (`/configuracion/equipo/<id>`) cuelga de esta carpeta
 * pero es una pantalla completa con su propia miga de pan: ahí el marco se
 * aparta.
 *
 * El dibujo es `MarcoDeConfiguracion`, compartido con la configuración del
 * inquilino y del propietario; acá sólo se arma el menú de la inmobiliaria.
 */

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { MarcoDeConfiguracion } from '@/components/configuracion/MarcoDeConfiguracion';
import { esFichaDeMiembro, hrefDeSeccion, menuDeConfiguracion, seccionDeLaRuta } from './secciones';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();
  const { isAdmin, canAccess, isLoading, agencyRole } = usePermissions();

  const menu = useMemo(
    () =>
      menuDeConfiguracion({ isAdmin, canAccess, agencyRole }).map(({ grupo, secciones }) => ({
        id: grupo.id,
        label: t(grupo.labelKey),
        entradas: secciones.map((s) => ({
          id: s.id,
          href: hrefDeSeccion(s.id),
          label: t(s.labelKey),
          desc: t(s.descKey),
          icon: s.icon,
        })),
      })),
    [isAdmin, canAccess, agencyRole, t],
  );

  if (esFichaDeMiembro(pathname)) return <>{children}</>;

  return (
    <MarcoDeConfiguracion
      titulo={t('inmobiliaria.config.title')}
      subtitulo={t('inmobiliaria.config.subtitle')}
      navAria={t('inmobiliaria.config.navAria')}
      menu={menu}
      activaId={seccionDeLaRuta(pathname)?.id ?? null}
      cargando={isLoading}
    >
      {children}
    </MarcoDeConfiguracion>
  );
}
