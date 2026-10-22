'use client';

/**
 * Las pestañas de estado de una tabla, con su conteo, DENTRO de la tarjeta
 * (revisión de diseño de Operación, 21-10-2026, patrón «ResumenDeEstados»).
 *
 * Reemplaza las franjas de cinco a ocho cifras grandes —«Por firmar 0»,
 * «Borradores 0», «En cotización 0»…— que decían ceros con el mismo peso que
 * lo pendiente y repetían el total en tres lugares (Nico: «cosas que no escalan
 * en lectura»). Una pestaña:
 *   · filtra la tabla (aria-pressed, como las cifras de antes);
 *   · lleva su conteo en mono, con separador de miles;
 *   · no aparece en cero, salvo las `fija` (Activos, Todos);
 *   · con `tono: 'aviso'` lleva el punto ámbar: pide atención.
 * En el celular se desliza de lado dentro de su riel.
 */
import { cn } from '@/lib/utils';
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras';

export interface PestanaDeEstado<V extends string> {
  valor: V;
  etiqueta: string;
  /** `null` = no se pudo contar (se muestra la pestaña sin número). */
  cuantos: number | null;
  /** Aparece aunque esté en cero. */
  fija?: boolean;
  tono?: 'aviso';
  testid?: string;
}

interface PestanasDeEstadoProps<V extends string> {
  pestanas: readonly PestanaDeEstado<V>[];
  valor: V;
  onCambio: (valor: V) => void;
  /** El nombre del grupo para el lector de pantalla («Estado de los contratos»). */
  etiqueta: string;
  className?: string;
  'data-testid'?: string;
}

export function PestanasDeEstado<V extends string>({
  pestanas,
  valor,
  onCambio,
  etiqueta,
  className,
  'data-testid': testId,
}: PestanasDeEstadoProps<V>) {
  const visibles = pestanas.filter((p) => p.fija || p.valor === valor || p.cuantos === null || p.cuantos > 0);
  const cifra = (n: number) => n.toLocaleString(localeDeLasCifras());
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn('-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]', className)}
      data-testid={testId}
    >
      {visibles.map((p) => {
        const activa = p.valor === valor;
        return (
          <button
            key={p.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => onCambio(p.valor)}
            data-testid={p.testid}
            data-tono={p.tono}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-body-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--menu-activa-tinta)]',
              activa
                ? 'bg-[color:var(--menu-activa)] font-medium text-[color:var(--menu-activa-tinta)]'
                : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
            )}
          >
            {p.tono === 'aviso' ? <span className="h-1.5 w-1.5 rounded-full bg-warning-500" aria-hidden="true" /> : null}
            {p.etiqueta}
            {p.cuantos !== null ? (
              <span className={cn('font-mono text-caption tabular-nums', activa ? '' : 'text-fg-subtle')}>{cifra(p.cuantos)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
