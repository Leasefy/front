'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List } from '@phosphor-icons/react';
import { NavItem, openPlanMobileSidebar } from '@/components/ui/plan/PlanSidebar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { hrefDeLaFilaActiva } from '@/lib/nav/fila-activa-del-menu';

interface MobileNavBarProps {
  navItems: NavItem[];
}

/**
 * AG-14 (QA del 04-10-2026): la barra de abajo del ASESOR comercial no traía
 * Agenda ni Pipeline (Inicio, Chat, Avalúos, Matching, Asegurabilidad…), que
 * es justo con lo que trabaja en la calle. Para quien no ve la operación (sin
 * Contratos en su menú) se suben Pipeline y Agenda después de Inicio. Quien
 * ve la operación conserva el orden de siempre.
 */
export function paraLaBarraDelCelular<T extends { href?: string }>(items: T[]): T[] {
  const esDe = (sufijo: string) => (i: T) => (i.href ?? '').replace(/\/$/, '').endsWith(sufijo);
  const veLaOperacion = items.some(esDe('/panel/inmobiliaria/contratos'));
  if (veLaOperacion) return items;
  const pipeline = items.find(esDe('/panel/inmobiliaria/pipeline'));
  const agenda = items.find(esDe('/panel/inmobiliaria/agenda'));
  if (!pipeline && !agenda) return items;
  const resto = items.filter((i) => i !== pipeline && i !== agenda);
  const [primero, ...demas] = resto;
  return [primero, pipeline, agenda, ...demas].filter((i): i is T => Boolean(i));
}

export function MobileNavBar({ navItems }: MobileNavBarProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  // Section markers are desktop-sidebar-only labels; disabled items aren't tappable.
  const navigable = paraLaBarraDelCelular(
    navItems.filter((item) => item.kind !== 'section' && !item.disabled),
  );
  const topItems = navigable.slice(0, 5);

  // Se calcula sobre TODAS las filas, no sólo las cinco de la barra: si la
  // más específica quedó en el «más», ninguna de arriba se marca por prefijo.
  const hrefActivo = hrefDeLaFilaActiva(navigable, pathname);
  function isActive(item: NavItem): boolean {
    return item.href === hrefActivo;
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border"
        // `--area-segura-abajo`: en la app de Android vieja el env() no trae la barra de gestos.
        style={{ paddingBottom: 'max(var(--area-segura-abajo), env(safe-area-inset-bottom), 0px)' }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around">
          {topItems.map((item) => {
            const active = isActive(item);
            const IconComponent = item.icon as React.ComponentType<{
              className?: string;
              weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
            }>;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'min-h-[56px] min-w-[56px] flex flex-col items-center justify-center px-2 py-2 rounded-lg',
                  // El azul de la fila activa del menú (globals.css): en oscuro,
                  // apagado, no el índigo saturado de `primary-soft`.
                  active
                    ? 'bg-[color:var(--menu-activa)] text-[color:var(--menu-activa-tinta)]'
                    : 'text-fg-muted'
                )}
              >
                <IconComponent
                  className="w-5 h-5"
                  weight={active ? 'fill' : 'regular'}
                />
                <span className="text-[9px] font-mono uppercase tracking-wider mt-1">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* «Menú» (Nico, 22-10-2026): como la pestaña de menú de una app. Abre el
              menú completo de la barra lateral a pantalla completa y desde ahí se
              va a cualquier parte. */}
          <button
            type="button"
            onClick={(e) => openPlanMobileSidebar(e, { comoSeccion: true })}
            aria-label={t('inmobiliaria.mobileNav.menuAriaLabel')}
            aria-haspopup="dialog"
            data-testid="barra-menu"
            className="min-h-[56px] min-w-[56px] flex flex-col items-center justify-center px-2 py-2 text-fg-muted"
          >
            <List className="w-5 h-5" weight="bold" />
            <span className="text-[9px] font-mono uppercase tracking-wider mt-1">
              {t('inmobiliaria.mobileNav.menuButton')}
            </span>
          </button>
        </div>
      </nav>

    </>
  );
}
