'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AddressBook, DotsThree, FileText, Key, Wallet, type Icon } from '@phosphor-icons/react';
import { NavItem } from '@/components/ui/plan/PlanSidebar';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MobileNavSheet, type GrupoDeLaHoja } from '@/components/layout/MobileNavSheet';
import { hrefDeLaFilaActiva } from '@/lib/nav/fila-activa-del-menu';
import {
  armarLaBarraDelCelular,
  casillaActiva,
  type CasillaDeLaBarra,
  type SeccionDeLaBarra,
} from '@/lib/nav/barra-del-celular';

interface MobileNavBarProps {
  navItems: NavItem[];
}

/**
 * AG-14 (QA del 04-10-2026): la barra de abajo del ASESOR comercial no traía
 * Agenda ni Pipeline (Inicio, Chat, Avalúos, Matching, Asegurabilidad…), que
 * es justo con lo que trabaja en la calle. Para quien no ve la operación (sin
 * Contratos en su menú) se suben Pipeline y Agenda después de Inicio. Quien
 * ve la operación conserva el orden de siempre.
 *
 * Desde el 21-10-2026 esto sólo aplica a la barra PLANA (un menú sin las
 * secciones del panel): con secciones, Pipeline y Agenda son las dos primeras
 * pantallas de la hoja de «Captación».
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

/** El ícono de cada sección en la barra: lo que se hace en ella, no su primera pantalla. */
const ICONO_DE_LA_SECCION: Record<SeccionDeLaBarra, Icon> = {
  'sec-captacion': Key,
  'sec-operacion': FileText,
  'sec-dinero': Wallet,
  'sec-directorio': AddressBook,
};

type IconoDeFila = React.ComponentType<{
  className?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
}>;

/** Lo que está abierto: la hoja de una sección o la de «Más». */
type HojaAbierta = { tipo: 'seccion'; clave: SeccionDeLaBarra } | { tipo: 'mas' } | null;

const CASILLA =
  'relative min-h-[56px] min-w-0 flex-1 flex flex-col items-center justify-center px-1 py-2 rounded-lg';
// El azul de la fila activa del menú (globals.css): en oscuro, apagado, no el
// índigo saturado de `primary-soft`.
const CASILLA_ACTIVA = 'bg-[color:var(--menu-activa)] text-[color:var(--menu-activa-tinta)]';
// Sin el `tracking-wider` de antes: con seis casillas a 390 px, «DIRECTORIO» se cortaba.
const ROTULO = 'mt-1 max-w-full truncate text-[9px] font-mono uppercase tracking-[0.02em]';

function Contador({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      className="absolute right-1/2 top-1.5 translate-x-[18px] min-w-[16px] rounded-full bg-primary px-1 text-center font-mono text-[10px] leading-4 tabular-nums text-primary-fg"
      aria-hidden="true"
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function MobileNavBar({ navItems }: MobileNavBarProps) {
  const [abierta, setAbierta] = useState<HojaAbierta>(null);
  const pathname = usePathname();
  const { t } = useI18n();

  const barra = useMemo(() => armarLaBarraDelCelular(navItems), [navItems]);

  // Section markers are desktop-sidebar-only labels; disabled items aren't tappable.
  const navigable = useMemo(
    () => navItems.filter((item) => item.kind !== 'section' && !item.disabled),
    [navItems],
  );
  // Se calcula sobre TODAS las filas: si la más específica quedó en una hoja,
  // ninguna casilla de arriba se marca por prefijo.
  const hrefActivo = hrefDeLaFilaActiva(navigable, pathname);
  const cerrar = () => setAbierta(null);

  // ── Barra plana (un menú sin las secciones del panel) ──────────────────────
  if (!barra) {
    const plana = paraLaBarraDelCelular(navigable);
    const topItems = plana.slice(0, 5);
    const overflowItems = plana.slice(5);
    return (
      <>
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
          aria-label="Mobile navigation"
        >
          <div className="flex items-stretch justify-around">
            {topItems.map((item) => (
              <EnlaceDeLaBarra key={item.href} fila={item} activa={item.href === hrefActivo} />
            ))}
            {overflowItems.length > 0 && (
              <BotonDeHoja
                etiqueta={t('inmobiliaria.mobileNav.moreButton')}
                ariaLabel={t('inmobiliaria.mobileNav.moreAriaLabel')}
                icono={DotsThree}
                abierta={abierta?.tipo === 'mas'}
                onClick={() => setAbierta({ tipo: 'mas' })}
              />
            )}
          </div>
        </nav>
        {overflowItems.length > 0 && (
          <MobileNavSheet
            open={abierta?.tipo === 'mas'}
            items={overflowItems}
            hrefActivo={hrefActivo}
            onClose={cerrar}
          />
        )}
      </>
    );
  }

  // ── Barra por secciones ───────────────────────────────────────────────────
  const hayMas = barra.mas.some((g) => g.filas.length > 0);
  const masActiva = barra.mas.some((g) => g.filas.some((f) => f.href === hrefActivo));
  const seccionAbierta =
    abierta?.tipo === 'seccion'
      ? (barra.casillas.find((c) => c.tipo === 'seccion' && c.clave === abierta.clave) as
          | Extract<CasillaDeLaBarra<NavItem>, { tipo: 'seccion' }>
          | undefined)
      : undefined;
  const gruposDeMas: GrupoDeLaHoja[] = barra.mas.map((g) => ({ titulo: g.titulo, items: g.filas }));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        aria-label="Mobile navigation"
        data-testid="barra-del-celular"
      >
        <div className="flex items-stretch justify-around gap-0.5 px-1">
          {barra.casillas.map((casilla) => {
            const activa = casillaActiva(casilla, hrefActivo);
            if (casilla.tipo === 'fila') {
              return (
                <EnlaceDeLaBarra
                  key={casilla.fila.href}
                  fila={casilla.fila}
                  activa={activa}
                  etiqueta={casilla.seccion ? t(`inmobiliaria.mobileNav.secciones.${casilla.seccion}`) : undefined}
                  icono={casilla.seccion ? ICONO_DE_LA_SECCION[casilla.seccion] : undefined}
                />
              );
            }
            return (
              <BotonDeHoja
                key={casilla.clave}
                etiqueta={t(`inmobiliaria.mobileNav.secciones.${casilla.clave}`)}
                ariaLabel={casilla.titulo}
                icono={ICONO_DE_LA_SECCION[casilla.clave]}
                activa={activa}
                abierta={abierta?.tipo === 'seccion' && abierta.clave === casilla.clave}
                pendientes={casilla.pendientes}
                testId={`barra-${casilla.clave}`}
                onClick={() => setAbierta({ tipo: 'seccion', clave: casilla.clave })}
              />
            );
          })}
          {hayMas && (
            <BotonDeHoja
              etiqueta={t('inmobiliaria.mobileNav.moreButton')}
              ariaLabel={t('inmobiliaria.mobileNav.moreAriaLabel')}
              icono={DotsThree}
              activa={masActiva}
              abierta={abierta?.tipo === 'mas'}
              testId="barra-mas"
              onClick={() => setAbierta({ tipo: 'mas' })}
            />
          )}
        </div>
      </nav>

      <MobileNavSheet
        open={Boolean(seccionAbierta)}
        titulo={seccionAbierta?.titulo}
        items={seccionAbierta?.filas ?? []}
        hrefActivo={hrefActivo}
        onClose={cerrar}
      />
      {hayMas && (
        <MobileNavSheet
          open={abierta?.tipo === 'mas'}
          grupos={gruposDeMas}
          items={[]}
          hrefActivo={hrefActivo}
          onClose={cerrar}
        />
      )}
    </>
  );
}

function EnlaceDeLaBarra({
  fila,
  activa,
  etiqueta,
  icono,
}: {
  fila: NavItem;
  activa: boolean;
  etiqueta?: string;
  icono?: Icon;
}) {
  const IconComponent = (icono ?? fila.icon) as IconoDeFila;
  return (
    <Link
      href={fila.href}
      aria-label={fila.label}
      aria-current={activa ? 'page' : undefined}
      className={cn(CASILLA, activa ? CASILLA_ACTIVA : 'text-fg-muted')}
    >
      <IconComponent className="w-5 h-5" weight={activa ? 'fill' : 'regular'} />
      <span className={ROTULO}>{etiqueta ?? fila.label}</span>
      <Contador n={fila.badge ?? 0} />
    </Link>
  );
}

function BotonDeHoja({
  etiqueta,
  ariaLabel,
  icono,
  activa = false,
  abierta,
  pendientes = 0,
  testId,
  onClick,
}: {
  etiqueta: string;
  ariaLabel: string;
  icono: Icon;
  activa?: boolean;
  abierta: boolean;
  pendientes?: number;
  testId?: string;
  onClick: () => void;
}) {
  const IconComponent = icono as IconoDeFila;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={abierta}
      data-testid={testId}
      className={cn(CASILLA, activa ? CASILLA_ACTIVA : 'text-fg-muted')}
    >
      <IconComponent className="w-5 h-5" weight={activa ? 'fill' : 'regular'} />
      <span className={ROTULO}>{etiqueta}</span>
      <Contador n={pendientes} />
    </button>
  );
}
