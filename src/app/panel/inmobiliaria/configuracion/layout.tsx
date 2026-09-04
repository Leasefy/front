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
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  esFichaDeMiembro,
  hrefDeSeccion,
  menuDeConfiguracion,
  seccionDeLaRuta,
  seccionPorSlug,
  type SeccionDeConfiguracion,
} from './secciones';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { t } = useI18n();
  const { isAdmin, canAccess, isLoading } = usePermissions();

  const menu = useMemo(() => menuDeConfiguracion({ isAdmin, canAccess }), [isAdmin, canAccess]);
  const activa = seccionDeLaRuta(pathname);

  if (esFichaDeMiembro(pathname)) return <>{children}</>;

  const irA = (slug: string) => {
    const seccion = seccionPorSlug(slug);
    if (seccion) router.push(hrefDeSeccion(seccion.id));
  };

  return (
    <div className="p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-h2 text-fg">{t('inmobiliaria.config.title')}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">{t('inmobiliaria.config.subtitle')}</p>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <nav aria-label={t('inmobiliaria.config.navAria')} className="lg:w-60 lg:shrink-0">
          {/* Celular: la misma lista, en un selector. */}
          <div className="lg:hidden">
            <Select value={activa?.slug ?? ''} onValueChange={irA}>
              <SelectTrigger aria-label={t('inmobiliaria.config.navAria')}>
                <SelectValue placeholder={t('inmobiliaria.config.title')} />
              </SelectTrigger>
              <SelectContent>
                {menu.map(({ grupo, secciones }) => (
                  <SelectGroup key={grupo.id}>
                    <SelectLabel>{t(grupo.labelKey)}</SelectLabel>
                    {secciones.map((s) => (
                      <SelectItem key={s.id} value={s.slug}>
                        {t(s.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Escritorio: nav vertical agrupada, pegada al scroll. */}
          <div className="hidden lg:sticky lg:top-20 lg:block lg:space-y-5">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="mx-2 h-8 animate-pulse rounded-md bg-surface-muted" />
                ))
              : menu.map(({ grupo, secciones }) => (
                  <div key={grupo.id} className="space-y-0.5">
                    <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                      {t(grupo.labelKey)}
                    </p>
                    {secciones.map((s) => (
                      <EnlaceDeSeccion key={s.id} seccion={s} activa={activa?.id === s.id} label={t(s.labelKey)} />
                    ))}
                  </div>
                ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {activa && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">{t(activa.labelKey)}</h2>
              <p className="text-sm text-fg-muted">{t(activa.descKey)}</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function EnlaceDeSeccion({
  seccion,
  activa,
  label,
}: {
  seccion: SeccionDeConfiguracion;
  activa: boolean;
  label: string;
}) {
  const Icono = seccion.icon;
  return (
    <Link
      href={hrefDeSeccion(seccion.id)}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        activa ? 'bg-surface-muted font-medium text-fg' : 'text-fg-muted hover:bg-surface-muted/60 hover:text-fg',
      )}
    >
      <Icono className="h-4 w-4 shrink-0" weight={activa ? 'fill' : 'regular'} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
