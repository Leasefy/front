/**
 * Las vistas de UNA pestaña del portal (revisora r25, C3): cuando una pestaña
 * agrupa dos pantallas —«Contrato y documentos» = el contrato + los documentos;
 * «Solicitudes» = lo que está en curso + lo radicado—, las dos llevan el mismo
 * título (el de la pestaña) y este control debajo del encabezado para pasar de
 * una a la otra. Antes, Documentos quedaba huérfana: nada llevaba a ella.
 *
 * Es navegación: enlaces (cada vista sigue en su URL), con el aspecto del
 * SegmentedControl de Cadence (riel gris, la vista actual en una píldora clara).
 */
import Link from 'next/link';
import { cn } from '@leasefy/cadence';

export interface VistaDeLaPestana {
  href: string;
  etiqueta: string;
}

export function VistasDeLaPestana({
  vistas,
  actual,
  etiqueta,
  className,
}: {
  vistas: readonly VistaDeLaPestana[];
  /** El `href` de la vista que se está viendo. */
  actual: string;
  /** Nombre accesible del grupo. */
  etiqueta: string;
  className?: string;
}) {
  return (
    <nav aria-label={etiqueta} className={cn('max-w-full overflow-x-auto', className)} data-testid="vistas-de-la-pestana">
      <ul className="inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1">
        {vistas.map((v) => {
          const esta = v.href === actual;
          return (
            <li key={v.href}>
              <Link
                href={v.href}
                aria-current={esta ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  esta ? 'bg-surface font-medium text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                )}
              >
                {v.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** «Contrato y documentos» (Mi arriendo): el contrato y los documentos. */
export const VISTAS_DE_CONTRATO_Y_DOCUMENTOS = (es: boolean): VistaDeLaPestana[] => [
  { href: '/inquilino/contratos', etiqueta: es ? 'Contrato' : 'Contract' },
  { href: '/inquilino/documentos', etiqueta: es ? 'Documentos' : 'Documents' },
];

/** «Solicitudes» (Mi arriendo): lo que está en curso y lo radicado. */
export const VISTAS_DE_SOLICITUDES = (es: boolean): VistaDeLaPestana[] => [
  { href: '/inquilino/casos', etiqueta: es ? 'En curso' : 'In progress' },
  { href: '/inquilino/solicitudes', etiqueta: es ? 'Radicadas' : 'Filed' },
];
