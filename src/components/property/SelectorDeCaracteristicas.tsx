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
  DETALLES_DE_CARACTERISTICAS,
  conElDetalle,
  sinLaCaracteristica,
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
  /**
   * Cuántos parqueaderos (`Property.parkingSpaces`), al marcar «Parqueadero» (Nico, 28-10-2026: «falta si tiene
   * parqueadero (cuántos)»). Sin esta prop sólo se pregunta si es privado o comunal.
   */
  parqueaderos?: { valor: number | null | undefined; alCambiar: (n: number | undefined) => void };
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
        // Glow up 23-10: lo marcado lo dice la casilla (voltaje); el chip sólo se afirma, sin bloque azul.
        activa
          ? aviso
            ? 'border border-warning bg-warning-soft text-fg'
            : 'border border-primary/50 bg-surface text-fg'
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
  parqueaderos,
}: SelectorDeCaracteristicasProps) {
  const lleno = value.length >= CARACTERISTICAS_MAXIMAS;
  const alternar = (id: string) => {
    if (value.includes(id)) {
      onChange(sinLaCaracteristica(value, id));
      if (id === 'parking') parqueaderos?.alCambiar(undefined);
      return;
    }
    if (lleno) return;
    onChange([...value, id]);
    if (id === 'parking' && !parqueaderos?.valor) parqueaderos?.alCambiar(1);
  };
  const desconocidas = value.filter((id) => !esCaracteristica(id));

  return (
    <div className="space-y-4" data-testid={testId} role="group" aria-labelledby={tituloId} {...ariaDelError}>
      {caracteristicasPorGrupo().map(({ grupo, nombre, items }) => (
        <fieldset key={grupo} className="min-w-0" data-testid={`caracteristicas-${grupo}`}>
          <legend className="mb-2 text-label text-fg-subtle">{nombre}</legend>
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
          {/* El detalle va debajo de su grupo: el cuarto útil está en «Del inmueble», el parqueadero en «Del conjunto». */}
          {(['storage', 'parking'] as const)
            .filter((de) => items.some((c) => c.id === de) && value.includes(de))
            .map((de) => (
              <DetalleDeLaCaracteristica
                key={de}
                de={de}
                value={value}
                disabled={disabled}
                alCambiar={(id) => onChange(conElDetalle(value, de, id))}
                parqueaderos={de === 'parking' ? parqueaderos : undefined}
              />
            ))}
        </fieldset>
      ))}

      {desconocidas.length > 0 && (
        <fieldset className="min-w-0" data-testid="caracteristicas-desconocidas">
          <legend className="mb-1 text-label text-fg-subtle">
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

/** Privado o comunal (y, en el parqueadero, cuántos): sale al marcar la característica. */
function DetalleDeLaCaracteristica({
  de,
  value,
  disabled,
  alCambiar,
  parqueaderos,
}: {
  de: 'parking' | 'storage';
  value: string[];
  disabled?: boolean;
  alCambiar: (id: string | null) => void;
  parqueaderos?: SelectorDeCaracteristicasProps['parqueaderos'];
}) {
  const opciones = DETALLES_DE_CARACTERISTICAS[de];
  const elegido = opciones.find((o) => value.includes(o.id))?.id ?? null;
  const titulo = de === 'parking' ? 'Tu parqueadero' : 'Tu cuarto útil';
  const cuantos = parqueaderos?.valor ?? 1;
  return (
    <div
      className="mt-2 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary-soft/40 px-3.5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5"
      data-testid={`detalle-${de}`}
    >
      <span className="text-[13px] font-medium text-fg">{titulo}</span>
      {parqueaderos ? (
        <span className="inline-flex items-center gap-2 text-[13px] text-fg-muted">
          ¿Cuántos?
          <span className="inline-flex items-center rounded-full border border-border bg-surface">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-fg disabled:opacity-40"
              onClick={() => parqueaderos.alCambiar(Math.max(1, cuantos - 1))}
              disabled={disabled || cuantos <= 1}
              aria-label="Un parqueadero menos"
            >
              −
            </button>
            <span className="min-w-6 text-center font-mono text-[13px] tabular-nums text-fg" data-testid="cuantos-parqueaderos" aria-live="polite">
              {cuantos}
            </span>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full text-fg disabled:opacity-40"
              onClick={() => parqueaderos.alCambiar(Math.min(10, cuantos + 1))}
              disabled={disabled || cuantos >= 10}
              aria-label="Un parqueadero más"
            >
              +
            </button>
          </span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-2 text-[13px] text-fg-muted" role="group" aria-label={`${titulo}: privado o comunal`}>
        ¿Privado o comunal?
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={elegido === o.id}
            disabled={disabled}
            onClick={() => alCambiar(elegido === o.id ? null : o.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-caption transition-colors duration-base',
              elegido === o.id ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg-muted hover:bg-surface-muted',
            )}
            data-testid={`detalle-${o.id}`}
          >
            {o.corto}
          </button>
        ))}
      </span>
    </div>
  );
}
