'use client';

/**
 * Las cinco barras debajo del campo de contraseña.
 *
 * Nico (2026-09-07): «unas 5 líneas que le vayan dando color si la contraseña
 * es segura o no, que arranque en rojo, naranja y luego verde». Una o dos
 * barras son rojas, tres naranjas (el mínimo para crear la cuenta), cuatro y
 * cinco verdes. Al lado, la palabra; debajo, qué hacer para subirla. Sin
 * contraseña las barras están vacías y el consejo dice qué se espera, para
 * que la persona lo sepa ANTES de escribir y no después de fallar.
 *
 * El puntaje sale de `fortalezaDeContrasena`; acá sólo se pinta.
 */

import { cn } from '@/lib/utils';
import { fortalezaDeContrasena } from '@/lib/auth/fortaleza-de-contrasena';

interface MedidorDeContrasenaProps {
  contrasena: string;
  /** Para descontar si la contraseña trae el correo adentro. */
  correo?: string | null;
  className?: string;
}

const BARRAS = [1, 2, 3, 4, 5] as const;

export function MedidorDeContrasena({ contrasena, correo, className }: MedidorDeContrasenaProps) {
  const fortaleza = fortalezaDeContrasena(contrasena, { correo });
  const tono =
    fortaleza.puntaje === 0
      ? null
      : fortaleza.puntaje <= 2
        ? { barra: 'bg-danger', texto: 'text-danger' }
        : fortaleza.puntaje === 3
          ? { barra: 'bg-warning', texto: 'text-warning' }
          : { barra: 'bg-success', texto: 'text-success' };

  return (
    <div
      className={cn('space-y-1.5', className)}
      data-testid="medidor-de-contrasena"
      data-nivel={fortaleza.nivel}
    >
      <div className="flex items-center gap-3">
        <div
          role="meter"
          aria-label="Seguridad de la contraseña"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={fortaleza.puntaje}
          aria-valuetext={fortaleza.etiqueta || 'Sin contraseña'}
          className="flex flex-1 gap-1"
        >
          {BARRAS.map((barra) => (
            <span
              key={barra}
              data-testid="medidor-barra"
              data-encendida={tono !== null && barra <= fortaleza.puntaje ? 'si' : 'no'}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-200',
                tono !== null && barra <= fortaleza.puntaje ? tono.barra : 'bg-border',
              )}
            />
          ))}
        </div>
        {/* Ancho fijo para que las barras no se muevan cuando cambia la palabra. */}
        <span
          className={cn('w-[76px] text-right text-[11.5px] font-medium', tono?.texto ?? 'text-fg-subtle')}
          aria-hidden="true"
        >
          {fortaleza.etiqueta}
        </span>
      </div>
      {fortaleza.consejo && (
        <p className="text-[12px] leading-relaxed text-fg-subtle" data-testid="medidor-consejo">
          {fortaleza.consejo}
        </p>
      )}
    </div>
  );
}
