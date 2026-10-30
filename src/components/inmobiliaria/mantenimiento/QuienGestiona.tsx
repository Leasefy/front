'use client';

/**
 * «Gestionado por» (reunión con Portofino, Nico 29-10-2026): quién gestiona la
 * reparación — la inmobiliaria (por defecto), el propietario, la administración
 * de la copropiedad o el inquilino. Selección única y a la vista (§12.9: el
 * control del caso de uso se ve de una), con lo que significa cada opción.
 *
 * Tres piezas: el selector (formulario y «Cambiar» del detalle), la sección del
 * formulario de «Nueva solicitud» y la marca discreta de la tarjeta del
 * tablero y de la lista («Gestiona: el propietario»; la inmobiliaria no lleva).
 */

import { Buildings, Storefront, User, UserCircle, UsersThree } from '@phosphor-icons/react';
import { Collapse, RadioCard, RadioCardGroup } from '@leasefy/cadence';

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useTr } from '@/lib/i18n/use-tr';
import {
  MARCA_DE_LA_GESTION,
  OPCIONES_DE_GESTION,
  esGestionadoPor,
  gestionDeLaSolicitud,
} from '@/lib/mantenimiento/gestionado-por';
import { cn } from '@/lib/utils';
import type { GestionadoPor, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

export const ICONO_DE_LA_GESTION: Record<GestionadoPor, React.ElementType> = {
  inmobiliaria: Storefront,
  propietario: UserCircle,
  administracion: Buildings,
  inquilino: User,
};

/** Las cuatro opciones como tarjetas de radio (dos columnas desde `sm`). */
export function SelectorDeGestion({
  valor,
  onCambiar,
  deshabilitadas = [],
  className,
}: {
  valor: GestionadoPor;
  onCambiar: (g: GestionadoPor) => void;
  /** Las que no se pueden elegir (p. ej. pasarla a otro con una cotización aprobada). */
  deshabilitadas?: readonly GestionadoPor[];
  className?: string;
}) {
  const tr = useTr();
  return (
    <RadioCardGroup
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}
      value={valor}
      onValueChange={(v) => {
        if (esGestionadoPor(v)) onCambiar(v);
      }}
      aria-label={tr('¿Quién gestiona la reparación?')}
      data-testid="selector-de-gestion"
    >
      {OPCIONES_DE_GESTION.map((o) => {
        const Icono = ICONO_DE_LA_GESTION[o.valor];
        return (
          <RadioCard
            key={o.valor}
            value={o.valor}
            disabled={deshabilitadas.includes(o.valor)}
            data-testid={`gestion-${o.valor}`}
            label={
              <span className="flex items-center gap-2 font-medium">
                <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                {tr(o.etiqueta)}
              </span>
            }
            description={tr(o.ayuda)}
          />
        );
      })}
    </RadioCardGroup>
  );
}

/**
 * La sección del formulario de «Nueva solicitud». Por defecto, la inmobiliaria;
 * con otra, dice en una línea qué cambia (sin cotizaciones, descuentos ni
 * cobros: el seguimiento por avisos).
 */
export function SeccionQuienGestiona({
  valor,
  onCambiar,
  error,
}: {
  valor: GestionadoPor;
  onCambiar: (g: GestionadoPor) => void;
  /** Lo que rechazó el back para este campo. */
  error?: string;
}) {
  const tr = useTr();
  return (
    <div
      className="space-y-4 border-t border-border-faint pt-6 dark:border-border-strong"
      data-campo="gestionadoPor"
      data-testid="seccion-quien-gestiona"
    >
      <h3 className="flex items-center gap-2 text-sm font-medium text-fg">
        <UsersThree className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        {tr('¿Quién gestiona la reparación?')}
      </h3>
      <SelectorDeGestion valor={valor} onCambiar={onCambiar} />
      <Collapse open={valor !== 'inmobiliaria'}>
        <p className="text-caption text-fg-muted" data-testid="gestion-de-otro-que-cambia">
          {tr(
            'Sin cotizaciones, ni descuentos al propietario, ni cobros: llevas el seguimiento por avisos (visita, en arreglo y terminado) desde el detalle.',
          )}
        </p>
      </Collapse>
      <ErrorDelCampo id="mantenimiento-gestionadoPor-error" mensaje={error} />
    </div>
  );
}

/**
 * La marca discreta de la tarjeta: «Gestiona: el propietario». La inmobiliaria
 * no lleva marca (es lo de siempre). Reemplaza a la de «La hace el propietario»
 * (22-10), que es el mismo caso.
 */
export function MarcaDeLaGestion({
  solicitud,
  className,
}: {
  solicitud: Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario'>;
  className?: string;
}) {
  const tr = useTr();
  const g = gestionDeLaSolicitud(solicitud);
  if (g === 'inmobiliaria') return null;
  const Icono = ICONO_DE_LA_GESTION[g];
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-1 text-caption text-fg-muted', className)}
      data-testid="marca-de-la-gestion"
      data-gestion={g}
    >
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{tr(MARCA_DE_LA_GESTION[g])}</span>
    </span>
  );
}
