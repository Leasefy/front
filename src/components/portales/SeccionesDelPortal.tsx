'use client';

/**
 * Las pestañas de la sección en la que estás, en un portal (inquilino o
 * propietario) — GLOW UP 21-10-2026, Nico eligió «secciones con pestañas
 * horizontales» en lugar del menú vertical de 14 filas.
 *
 * Es la MISMA barra del panel de la inmobiliaria (`BarraDePestanas`, nivel
 * «secciones»): se siente la misma plataforma. Se monta una vez en el layout,
 * debajo del header, y no pinta nada fuera de una sección.
 */
import { usePathname } from 'next/navigation';

import { BarraDePestanas, type PestanaDeBarra } from '@/components/inmobiliaria/BarraDePestanas';
import { useOptionalI18n } from '@/lib/i18n';
import { esLaPestana, type PestanaDelPortal } from '@/lib/nav/portal-del-inquilino';

export interface SeccionConPestanas {
  es: string;
  en: string;
  pestanas: readonly PestanaDelPortal[];
}

export function SeccionesDelPortal({ seccion }: { seccion: SeccionConPestanas | null }) {
  const pathname = usePathname() ?? '';
  const en = useOptionalI18n()?.locale === 'en';
  if (!seccion) return null;

  // La pestaña activa es UNA: la primera que reclama la ruta.
  const activa = seccion.pestanas.find((p) => esLaPestana(p, pathname));
  const items: PestanaDeBarra[] = seccion.pestanas.map((p) => ({
    href: p.href,
    label: en ? p.en : p.es,
    icon: p.icon,
    active: activa?.href === p.href,
    current: pathname === p.href,
  }));

  return (
    <BarraDePestanas
      items={items}
      ariaLabel={en ? `Sections of ${seccion.en}` : `Secciones de ${seccion.es}`}
      cssVar="--secciones-h"
      topClass="top-16"
      nivel="secciones"
      pathname={pathname}
    />
  );
}
