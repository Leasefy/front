'use client';

/**
 * CopropietariosField — sumarle más dueños a un mandato, con su porcentaje.
 *
 * ── Por qué existe (Nico, 2026-09-03) ─────────────────────────────────────
 * «Un inmueble puede llegar a tener más de un propietario.»
 *
 * ── La decisión de diseño que importa ─────────────────────────────────────
 * El porcentaje del dueño PRINCIPAL no se escribe: es el resto. Quien carga
 * sólo dice cuánto le toca a cada copropietario y el principal absorbe la
 * diferencia. Así «tienen que sumar 100 %» deja de ser una validación que se
 * puede violar y pasa a ser cierto por construcción — no hay forma de guardar
 * un 99 % y que la plata quede sin dueño.
 *
 * Se trabaja en puntos básicos (100 % = 10000) de punta a punta, igual que el
 * back: con decimales, tres dueños en partes iguales no suman 100 nunca.
 */

import { useMemo } from 'react';
import { Plus, Trash, Warning } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BPS_TOTAL, formatParticipacion } from '@/lib/types/inmobiliaria';
import type { Propietario } from '@/lib/types/inmobiliaria';

/** Un copropietario en edición: puede estar a medio llenar. */
export interface FilaCopropietario {
  propietarioId: string | null;
  participacionBps: number;
}

/**
 * Lo que le queda al principal: 100 % menos lo repartido.
 *
 * Puede dar negativo — y en ese caso el formulario NO se puede enviar. Se
 * devuelve el número crudo en vez de topearlo en 0 justamente para poder
 * decirle a la persona por cuánto se pasó.
 */
export function bpsDelPrincipal(filas: readonly FilaCopropietario[]): number {
  return BPS_TOTAL - filas.reduce((acc, f) => acc + (f.participacionBps || 0), 0);
}

/**
 * Por qué no se puede guardar todavía, o `null` si está listo.
 *
 * Devuelve el motivo en español y no un booleano: un botón gris que no dice
 * por qué está gris obliga a adivinar.
 */
export function motivoInvalido(
  filas: readonly FilaCopropietario[],
  principalId: string | null,
): string | null {
  if (filas.length === 0) return null;
  if (filas.some((f) => !f.propietarioId)) return 'Falta elegir un copropietario.';
  if (filas.some((f) => (f.participacionBps || 0) <= 0))
    return 'Cada copropietario necesita un porcentaje mayor a 0.';

  const ids = filas.map((f) => f.propietarioId!);
  if (principalId) ids.push(principalId);
  const repetido = ids.find((id, i) => ids.indexOf(id) !== i);
  if (repetido) return 'Hay un propietario repetido: cada dueño va una sola vez.';

  const resto = bpsDelPrincipal(filas);
  if (resto <= 0) {
    return `Los copropietarios ya se llevan ${formatParticipacion(BPS_TOTAL - resto)}. Al propietario principal tiene que quedarle algo.`;
  }
  return null;
}

/**
 * La lista completa lista para el cable, principal incluido y de mayor a menor.
 * Devuelve `null` cuando no hay copropietarios: en ese caso se manda la forma
 * vieja (`propietarioId` suelto) y no se toca nada.
 */
export function aListaDelCable(
  filas: readonly FilaCopropietario[],
  principalId: string,
): { propietarioId: string; participacionBps: number }[] | null {
  if (filas.length === 0) return null;
  return [
    { propietarioId: principalId, participacionBps: bpsDelPrincipal(filas) },
    ...filas.map((f) => ({
      propietarioId: f.propietarioId!,
      participacionBps: f.participacionBps,
    })),
  ].sort(
    (a, b) =>
      b.participacionBps - a.participacionBps ||
      a.propietarioId.localeCompare(b.propietarioId),
  );
}

/** `"33,5"` o `"33.5"` → `3350` bps. Vacío → `0`. */
export function porcentajeABps(texto: string): number {
  const n = Number.parseFloat(texto.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

interface CopropietariosFieldProps {
  /** Todos los propietarios de la agencia, para elegir. */
  propietarios: Propietario[];
  /** El dueño principal ya elegido arriba. Su porcentaje es el resto. */
  principalId: string | null;
  /** El nombre del principal, para poder mostrar cuánto le queda. */
  principalNombre?: string;
  filas: FilaCopropietario[];
  onChange: (filas: FilaCopropietario[]) => void;
  className?: string;
}

export function CopropietariosField({
  propietarios,
  principalId,
  principalNombre,
  filas,
  onChange,
  className,
}: CopropietariosFieldProps) {
  const resto = bpsDelPrincipal(filas);
  const problema = useMemo(
    () => motivoInvalido(filas, principalId),
    [filas, principalId],
  );

  // El principal no se ofrece de nuevo en el desplegable: elegirlo dos veces es
  // justamente lo que el back rechaza.
  const elegibles = propietarios.filter((p) => p.id !== principalId);

  const agregar = () =>
    onChange([...filas, { propietarioId: null, participacionBps: 0 }]);
  const quitar = (i: number) => onChange(filas.filter((_, j) => j !== i));
  const editar = (i: number, parche: Partial<FilaCopropietario>) =>
    onChange(filas.map((f, j) => (j === i ? { ...f, ...parche } : f)));

  return (
    <div className={cn('space-y-3', className)} data-testid="copropietarios-field">
      {filas.length === 0 ? (
        <button
          type="button"
          onClick={agregar}
          disabled={!principalId}
          className="flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline disabled:opacity-50 disabled:no-underline"
          data-testid="copropietarios-agregar"
        >
          <Plus className="h-4 w-4" />
          Este inmueble tiene más de un dueño
        </button>
      ) : (
        <>
          {/* El principal, en solo lectura: su porcentaje es lo que sobra. */}
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2"
            data-testid="copropietario-principal"
          >
            <span className="min-w-0 truncate text-sm text-fg">
              <span className="text-fg-muted">Principal: </span>
              <span className="font-medium">{principalNombre ?? '—'}</span>
            </span>
            <span
              className={cn(
                'shrink-0 font-mono text-sm tabular-nums',
                resto > 0 ? 'text-fg' : 'text-danger',
              )}
              data-testid="copropietario-principal-pct"
            >
              {formatParticipacion(resto)}
            </span>
          </div>

          {filas.map((fila, i) => (
            <div key={i} className="flex items-center gap-2" data-testid="copropietario-fila">
              <select
                value={fila.propietarioId ?? ''}
                onChange={(e) =>
                  editar(i, { propietarioId: e.target.value || null })
                }
                aria-label={`Copropietario ${i + 1}`}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                <option value="">Elegí un propietario…</option>
                {elegibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="relative w-28 shrink-0">
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Participación del copropietario ${i + 1}`}
                  value={
                    fila.participacionBps
                      ? String(fila.participacionBps / 100).replace('.', ',')
                      : ''
                  }
                  onChange={(e) =>
                    editar(i, { participacionBps: porcentajeABps(e.target.value) })
                  }
                  placeholder="0"
                  className="pr-7 text-right font-mono tabular-nums"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-fg-muted">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar copropietario ${i + 1}`}
                className="shrink-0 rounded-lg p-2 text-fg-muted hover:bg-surface-muted hover:text-danger"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={agregar}
            className="flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
            data-testid="copropietarios-agregar"
          >
            <Plus className="h-4 w-4" />
            Sumar otro propietario
          </button>

          {problema && (
            <p
              role="alert"
              className="flex items-start gap-1.5 text-sm text-danger"
              data-testid="copropietarios-error"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0" />
              {problema}
            </p>
          )}
        </>
      )}
    </div>
  );
}
