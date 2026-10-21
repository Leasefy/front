'use client';

/**
 * Las características del inmueble, en sus tres grupos (Juan y Nico,
 * 21-10-2026: «agregar esas características extra, porque yo estaba creando
 * un inmueble»). Lo usan el asistente de crear inmueble del panel, el cajón
 * de editarlo y el asistente de publicar del propietario: la misma lista
 * (`lib/inmuebles/caracteristicas.ts`) en todos lados.
 *
 * Cada una es la casilla de la casa dentro de un chip que entero es
 * clickeable. Una característica guardada que ya no está en la lista (un dato
 * viejo o de un archivo) se ve marcada aparte y se puede quitar: el back no
 * deja guardar el inmueble con ella, y sin verla no habría cómo saber por qué.
 */

import { Checkbox } from '@/components/ui';
import {
  CARACTERISTICAS_MAXIMAS,
  caracteristicasPorGrupo,
  esCaracteristica,
} from '@/lib/inmuebles/caracteristicas';
import { cn } from '@/lib/utils';

interface SelectorDeCaracteristicasProps {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  /** El `data-testid` del contenedor (el cajón de editar usa `editar-amenidades`). */
  testId?: string;
  /** Para `aria-labelledby` del grupo entero. */
  tituloId?: string;
  /** `aria-invalid` y `aria-describedby` cuando el back rechazó la lista (asistente de publicar). */
  ariaDelError?: { 'aria-invalid'?: boolean; 'aria-describedby'?: string };
}

function Chip({
  id,
  nombre,
  activa,
  disabled,
  alAlternar,
  aviso,
}: {
  id: string;
  nombre: string;
  activa: boolean;
  disabled?: boolean;
  alAlternar: () => void;
  aviso?: boolean;
}) {
  return (
    <label
      data-testid={`amenidad-${id}`}
      data-activa={activa ? 'si' : 'no'}
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13.5px] transition-colors duration-fast sm:px-3 sm:text-sm',
        disabled && 'cursor-not-allowed opacity-50',
        activa
          ? aviso
            ? 'border border-warning bg-warning-soft font-medium text-fg'
            : 'border border-primary bg-primary-soft font-medium text-fg'
          : 'border border-border bg-surface text-fg-muted hover:border-border-strong',
      )}
    >
      <Checkbox checked={activa} disabled={disabled} onCheckedChange={alAlternar} aria-label={nombre} />
      {/* Sin `truncate`: en el celular van dos por fila y «Acceso para silla de ruedas» se parte en dos líneas antes que cortarse. */}
      <span className="min-w-0 break-words leading-snug">{nombre}</span>
    </label>
  );
}

export function SelectorDeCaracteristicas({
  value,
  onChange,
  disabled,
  testId,
  tituloId,
  ariaDelError,
}: SelectorDeCaracteristicasProps) {
  const lleno = value.length >= CARACTERISTICAS_MAXIMAS;
  const alternar = (id: string) =>
    onChange(value.includes(id) ? value.filter((a) => a !== id) : lleno ? value : [...value, id]);
  const desconocidas = value.filter((id) => !esCaracteristica(id));

  return (
    <div className="space-y-4" data-testid={testId} role="group" aria-labelledby={tituloId} {...ariaDelError}>
      {caracteristicasPorGrupo().map(({ grupo, nombre, items }) => (
        <fieldset key={grupo} className="min-w-0" data-testid={`caracteristicas-${grupo}`}>
          <legend className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-fg-subtle">{nombre}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((c) => {
              const activa = value.includes(c.id);
              return (
                <Chip
                  key={c.id}
                  id={c.id}
                  nombre={c.nombre}
                  activa={activa}
                  disabled={disabled || (!activa && lleno)}
                  alAlternar={() => alternar(c.id)}
                />
              );
            })}
          </div>
        </fieldset>
      ))}

      {desconocidas.length > 0 && (
        <fieldset className="min-w-0" data-testid="caracteristicas-desconocidas">
          <legend className="mb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Guardadas que ya no están en la lista
          </legend>
          <p className="mb-2 text-[13px] text-fg-muted">
            Quítalas para poder guardar. Si importan, escríbelas en la descripción.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {desconocidas.map((id) => (
              <Chip key={id} id={id} nombre={id} activa aviso disabled={disabled} alAlternar={() => alternar(id)} />
            ))}
          </div>
        </fieldset>
      )}

      <p className="text-[13px] text-fg-muted" aria-live="polite" data-testid="cuantas-caracteristicas">
        {value.length === 0
          ? 'Ninguna marcada todavía.'
          : `${value.length.toLocaleString('es-CO')} ${value.length === 1 ? 'marcada' : 'marcadas'}${
              lleno ? `: es el máximo (${CARACTERISTICAS_MAXIMAS}).` : '.'
            }`}
      </p>
    </div>
  );
}
