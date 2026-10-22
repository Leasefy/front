'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AddressBook, Briefcase, CurrencyCircleDollar, HouseLine, List, Robot } from '@phosphor-icons/react';
import { NavItem, openPlanMobileSidebar } from '@/components/ui/plan/PlanSidebar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MobileNavSheet } from '@/components/layout/MobileNavSheet';
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

/**
 * Las secciones del menú que van en la barra (Nico, 22-10-2026: «abajo las
 * secciones, no los agentes»). Se toman las tres primeras que tengan filas para
 * la persona; si no ve Operación o Dinero (el asesor comercial), entra
 * Captación —ahí están Pipeline y Agenda, AG-14— o Directorio.
 */
const SECCIONES_DE_LA_BARRA = [
  { clave: 'agentes', texto: 'seccionAgentes', icono: Robot },
  { clave: 'operacion', texto: 'seccionOperacion', icono: Briefcase },
  { clave: 'dinero', texto: 'seccionDinero', icono: CurrencyCircleDollar },
  { clave: 'captacion', texto: 'seccionCaptacion', icono: HouseLine },
  { clave: 'directorio', texto: 'seccionDirectorio', icono: AddressBook },
] as const;
const CUANTAS_SECCIONES = 3;

/** Las filas sueltas (Inicio, Chat) y las de cada sección, en el orden del menú. */
export function agruparPorSeccion(navItems: NavItem[]): { sueltas: NavItem[]; porSeccion: Map<string, NavItem[]> } {
  const sueltas: NavItem[] = [];
  const porSeccion = new Map<string, NavItem[]>();
  let actual: string | null = null;
  for (const item of navItems) {
    if (item.kind === 'section') {
      actual = (item.href ?? '').replace(/^#sec-/, '') || null;
      continue;
    }
    if (item.disabled) continue;
    if (!actual) {
      sueltas.push(item);
      continue;
    }
    const filas = porSeccion.get(actual) ?? [];
    filas.push(item);
    porSeccion.set(actual, filas);
  }
  return { sueltas, porSeccion };
}

export function MobileNavBar({ navItems }: MobileNavBarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);

  // Section markers are desktop-sidebar-only labels; disabled items aren't tappable.
  const navigable = paraLaBarraDelCelular(
    navItems.filter((item) => item.kind !== 'section' && !item.disabled),
  );
  const { sueltas, porSeccion } = agruparPorSeccion(navItems);
  const inicio = sueltas[0];
  const secciones = SECCIONES_DE_LA_BARRA.filter((s) => (porSeccion.get(s.clave)?.length ?? 0) > 0).slice(
    0,
    CUANTAS_SECCIONES,
  );

  // Se calcula sobre TODAS las filas: la fila más específica manda.
  const hrefActivo = hrefDeLaFilaActiva(navigable, pathname);
  const filasDeLaAbierta = seccionAbierta ? porSeccion.get(seccionAbierta) ?? [] : [];
  const tituloDeLaAbierta = SECCIONES_DE_LA_BARRA.find((s) => s.clave === seccionAbierta);

  const claseDelBoton = (activo: boolean) =>
    cn(
      'min-h-[56px] min-w-[56px] flex flex-col items-center justify-center px-2 py-2 rounded-lg',
      // El azul de la fila activa del menú (globals.css): en oscuro,
      // apagado, no el índigo saturado de `primary-soft`.
      activo ? 'bg-[color:var(--menu-activa)] text-[color:var(--menu-activa-tinta)]' : 'text-fg-muted',
    );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border"
        // `--area-segura-abajo`: en la app de Android vieja el env() no trae la barra de gestos.
        style={{ paddingBottom: 'max(var(--area-segura-abajo), env(safe-area-inset-bottom), 0px)' }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around">
          {inicio && (() => {
            const activo = inicio.href === hrefActivo;
            const IconComponent = inicio.icon as React.ComponentType<{
              className?: string;
              weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
            }>;
            return (
              <Link
                href={inicio.href}
                aria-label={inicio.label}
                aria-current={activo ? 'page' : undefined}
                className={claseDelBoton(activo)}
              >
                <IconComponent className="w-5 h-5" weight={activo ? 'fill' : 'regular'} />
                <span className="text-[9px] font-mono uppercase tracking-wider mt-1">{inicio.label}</span>
              </Link>
            );
          })()}

          {/* Cada sección abre una hoja con SUS páginas (Nico, 22-10-2026). */}
          {secciones.map((s) => {
            const filas = porSeccion.get(s.clave) ?? [];
            const activo = filas.some((f) => f.href === hrefActivo);
            const Icono = s.icono;
            return (
              <button
                key={s.clave}
                type="button"
                onClick={() => setSeccionAbierta(s.clave)}
                aria-haspopup="dialog"
                aria-current={activo ? 'page' : undefined}
                data-testid={`barra-seccion-${s.clave}`}
                className={claseDelBoton(activo)}
              >
                <Icono className="w-5 h-5" weight={activo ? 'fill' : 'regular'} />
                <span className="text-[9px] font-mono uppercase tracking-wider mt-1">
                  {t(`inmobiliaria.mobileNav.${s.texto}`)}
                </span>
              </button>
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

      <MobileNavSheet
        open={seccionAbierta !== null}
        items={filasDeLaAbierta}
        hrefActivo={hrefActivo}
        titulo={tituloDeLaAbierta ? t(`inmobiliaria.mobileNav.${tituloDeLaAbierta.texto}Largo`) : undefined}
        onClose={() => setSeccionAbierta(null)}
      />
    </>
  );
}
