'use client';

/**
 * Lo que el validador rechazó, COMPLETO y en su lenguaje.
 *
 * 🔴 Cada motivo dice qué cláusula es ilegal y por qué artículo: «el depósito en
 * dinero está prohibido en vivienda urbana — Ley 820 de 2003, art. 16». Eso es
 * lo más valioso que devuelve el backend y es exactamente lo que se pierde al
 * resumirlo en «hubo un error, revisá los datos». Se muestran todos, con su
 * norma a la vista, sin recortar y sin traducir.
 *
 * Se usa en los dos lugares donde el validador habla: el `400
 * CONTRATO_NO_VALIDO` de generar, y los `motivos` que ya vienen con la
 * propuesta de la IA.
 */

import { Warning, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { MotivoDeRechazo } from '@/lib/api/contratos-plantilla.service';

interface Props {
  motivos: readonly MotivoDeRechazo[];
  /**
   * `rechazo` = ilegal, no se emite. `pendiente` = falta completar.
   *
   * Van separados porque mezclarlos escondería un depósito prohibido entre diez
   * avisos de campos vacíos — la misma razón por la que el backend los devuelve
   * en dos listas.
   */
  tono?: 'rechazo' | 'pendiente';
  titulo: string;
  'data-testid'?: string;
}

export function MotivosDelValidador({
  motivos,
  tono = 'rechazo',
  titulo,
  'data-testid': testId,
}: Props) {
  if (motivos.length === 0) return null;

  const esRechazo = tono === 'rechazo';
  const Icono = esRechazo ? Warning : Info;

  return (
    <div
      data-testid={testId}
      role={esRechazo ? 'alert' : undefined}
      className={cn(
        'rounded-lg border border-border p-4',
        esRechazo ? 'bg-danger-soft' : 'bg-surface-muted',
      )}
    >
      <div className="flex items-start gap-2">
        <Icono
          weight="fill"
          aria-hidden="true"
          className={cn(
            'mt-0.5 h-4 w-4 flex-shrink-0',
            esRechazo ? 'text-danger' : 'text-fg-muted',
          )}
        />
        <p
          className={cn(
            'text-body-sm font-medium',
            esRechazo ? 'text-danger' : 'text-fg',
          )}
        >
          {titulo}
        </p>
      </div>

      <ul className="mt-3 space-y-3">
        {motivos.map((motivo, i) => (
          // El `codigo` se repite cuando dos cláusulas violan la misma norma
          // (dos depósitos disfrazados, por ejemplo), así que la llave lleva
          // también el `donde` y la posición.
          <li
            key={`${motivo.codigo}-${motivo.donde}-${i}`}
            data-testid="motivo-del-validador"
            className="border-l-2 border-border pl-3"
          >
            <p className={cn('text-body-sm', esRechazo ? 'text-danger' : 'text-fg')}>
              {motivo.mensaje}
            </p>
            <p className="text-caption text-fg-muted mt-0.5">
              {motivo.norma}
              {motivo.donde ? ` · ${motivo.donde}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
