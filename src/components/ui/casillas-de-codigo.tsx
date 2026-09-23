'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Las casillas de un código de verificación: una por dígito.
 *
 * ── 🔴 22-09 · Por qué no es un `<input>` con `tracking` ──────────────────
 *
 * Porque el campo único tenía que fingir que era seis: se le ponía
 * `tracking-[0.5em]` para separar los dígitos y un marcador `000000` para
 * decir cuántos son. Y ese marcador **se lee como un valor ya escrito** — en
 * la captura de Nico el campo parecía tener un código puesto y el botón
 * apagado al lado, que es la contradicción que hace dudar a cualquiera.
 *
 * Seis casillas no necesitan marcador: la cantidad se VE. Y de paso se gana lo
 * que el campo único no podía dar: el cursor salta solo, el borrado retrocede,
 * y pegar el código desde la app de autenticación lo reparte entre las seis en
 * vez de meterlo todo en la primera.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────
 *
 * No verifica ni conoce el código: avisa el valor y avisa cuando está
 * completo. Quien la usa decide qué hacer — en `mfa-verify` es enviar solo,
 * porque a los seis dígitos ya no hay nada más que preguntar.
 */
export interface CasillasDeCodigoProps {
  value: string;
  onChange: (valor: string) => void;
  /** Se llama cuando el código llega a `cuantas` dígitos. */
  onCompleto?: (codigo: string) => void;
  cuantas?: number;
  disabled?: boolean;
  /** Pinta las casillas en rojo: el código no era. */
  hayError?: boolean;
  /** Lo que lee un lector de pantalla sobre el grupo. */
  'aria-label': string;
  autoFocus?: boolean;
  className?: string;
}

export function CasillasDeCodigo({
  value,
  onChange,
  onCompleto,
  cuantas = 6,
  disabled = false,
  hayError = false,
  autoFocus = false,
  className,
  ...resto
}: CasillasDeCodigoProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digitos = React.useMemo(
    () => Array.from({ length: cuantas }, (_, i) => value[i] ?? ''),
    [value, cuantas],
  );

  const poner = React.useCallback(
    (nuevo: string) => {
      const limpio = nuevo.replace(/\D/g, '').slice(0, cuantas);
      onChange(limpio);
      if (limpio.length === cuantas) onCompleto?.(limpio);
      return limpio;
    },
    [cuantas, onChange, onCompleto],
  );

  const alEscribir = (i: number, entrada: string) => {
    const digito = entrada.replace(/\D/g, '');
    if (digito === '') return;
    // Escribir sobre una casilla llena la reemplaza; el resto queda igual.
    const arriba = [...digitos];
    // Si llegan varios (teclado predictivo, pegado en la casilla), se reparten.
    for (let k = 0; k < digito.length && i + k < cuantas; k++) {
      arriba[i + k] = digito[k];
    }
    const armado = poner(arriba.join(''));
    const siguiente = Math.min(i + digito.length, cuantas - 1);
    if (armado.length < cuantas) refs.current[siguiente]?.focus();
  };

  const alTeclear = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arriba = [...digitos];
      // Sobre una casilla vacía, el borrado se lleva la anterior: es lo que
      // espera quien se equivocó en el dígito de antes.
      if (arriba[i] === '' && i > 0) {
        arriba[i - 1] = '';
        refs.current[i - 1]?.focus();
      } else {
        arriba[i] = '';
      }
      poner(arriba.join(''));
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && i < cuantas - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  };

  const alPegar = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pegado = e.clipboardData.getData('text');
    const armado = poner(pegado);
    refs.current[Math.min(armado.length, cuantas - 1)]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={resto['aria-label']}
      className={cn('flex items-center justify-center gap-2 sm:gap-2.5', className)}
    >
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          // 🔴 Sólo la primera lo lleva: con `one-time-code` en las seis, el
          // autorrelleno de iOS mete el código entero en cada una.
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${i + 1} de ${cuantas}`}
          maxLength={1}
          value={d}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => alEscribir(i, e.target.value)}
          onKeyDown={(e) => alTeclear(i, e)}
          onPaste={alPegar}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-14 w-11 rounded-md border bg-surface text-center font-mono text-xl tabular-nums text-fg',
            'transition-[border-color,box-shadow] outline-none sm:h-16 sm:w-12',
            'focus:border-primary focus:ring-2 focus:ring-primary/25',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-fg-subtle',
            hayError ? 'border-danger focus:border-danger focus:ring-danger/25' : 'border-border',
          )}
          data-testid={`casilla-${i}`}
        />
      ))}
    </div>
  );
}
