'use client';

/**
 * El celular con el indicativo aparte y TODOS los países (Nico, 28-10-2026: «¿por qué no dejamos crear cuenta a una
 * persona del mundo, y el listado los tiene todos?»). Mismo aspecto que el `PhoneInput` de Cadence (que trae 8 países
 * fijos y, en /publica, ni cambiaba de país); la lista tiene buscador por nombre o indicativo. El valor es el número
 * nacional; el país, aparte. Para guardar: `celularEnE164(numero, pais)`.
 */

import * as React from 'react';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buscarPaises, paisDelMundo } from '@/lib/phone/paises-del-mundo';
import { cn } from '@/lib/utils';

export interface CampoDeCelularDelMundoProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  pais: string;
  alCambiarPais: (iso: string) => void;
  value: string;
  onChange: (numero: string) => void;
  invalid?: boolean;
}

export const CampoDeCelularDelMundo = React.forwardRef<HTMLInputElement, CampoDeCelularDelMundoProps>(
  ({ pais, alCambiarPais, value, onChange, invalid, disabled, className, placeholder, ...props }, ref) => {
    const [abierto, setAbierto] = React.useState(false);
    const [buscar, setBuscar] = React.useState('');
    const elegido = paisDelMundo(pais);
    const lista = React.useMemo(() => buscarPaises(buscar), [buscar]);
    const campo = React.useRef<HTMLInputElement | null>(null);

    return (
      <div
        data-invalid={invalid || undefined}
        className={cn(
          'relative flex h-12 w-full rounded-[12px] border border-border bg-surface transition-[color,border-color,box-shadow] duration-150',
          'focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(26,64,255,0.12)]',
          'data-[invalid]:border-danger data-[invalid]:focus-within:shadow-[0_0_0_3px_rgba(192,57,43,0.12)]',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <Popover
          open={abierto}
          onOpenChange={(v) => {
            setAbierto(v);
            if (!v) setBuscar('');
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Indicativo: ${elegido.nombre} +${elegido.indicativo}. Cambiar país`}
              className="flex h-full shrink-0 items-center gap-1.5 rounded-l-[12px] border-r border-border px-3 text-body-sm text-fg transition-colors duration-150 hover:bg-surface-muted focus:outline-none"
              data-testid="celular-pais"
            >
              <span className="text-base leading-none">{elegido.bandera}</span>
              <span className="font-mono text-caption tabular-nums text-fg-muted">+{elegido.indicativo}</span>
              <CaretDown className={cn('h-3 w-3 text-fg-subtle transition-transform duration-150', abierto && 'rotate-180')} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-[300px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <MagnifyingGlass size={15} className="shrink-0 text-fg-subtle" aria-hidden="true" />
              <input
                autoFocus
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Busca tu país o indicativo"
                aria-label="Buscar país"
                className="h-11 w-full bg-transparent text-body-sm text-fg outline-none placeholder:text-fg-placeholder"
                data-testid="celular-buscar-pais"
              />
            </div>
            <div role="listbox" aria-label="Países" className="max-h-[300px] overflow-y-auto py-1" data-lenis-prevent>
              {lista.map((p) => (
                <button
                  key={p.iso}
                  type="button"
                  role="option"
                  aria-selected={p.iso === elegido.iso}
                  onClick={() => {
                    alCambiarPais(p.iso);
                    setAbierto(false);
                    setBuscar('');
                    requestAnimationFrame(() => campo.current?.focus());
                  }}
                  className={cn(
                    'flex min-h-9 w-full items-center gap-2.5 px-3 py-1.5 text-left text-body-sm text-fg outline-none transition-colors duration-100 hover:bg-surface-muted focus-visible:bg-surface-muted',
                    p.iso === elegido.iso && 'bg-primary-soft font-medium text-primary',
                  )}
                  data-testid={`celular-pais-${p.iso}`}
                >
                  <span className="text-base leading-none">{p.bandera}</span>
                  <span className="min-w-0 flex-1">{p.nombre}</span>
                  <span className={cn('font-mono text-caption tabular-nums', p.iso === elegido.iso ? 'text-primary' : 'text-fg-subtle')}>
                    +{p.indicativo}
                  </span>
                </button>
              ))}
              {lista.length === 0 && <p className="px-3 py-4 text-center text-body-sm text-fg-subtle">Ningún país con ese nombre.</p>}
            </div>
          </PopoverContent>
        </Popover>
        <input
          ref={(el) => {
            campo.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? (elegido.iso === 'CO' ? '300 123 4567' : 'Tu número sin el indicativo')}
          disabled={disabled}
          className="flex-1 rounded-r-[12px] bg-transparent px-3.5 font-mono text-[15px] tabular-nums text-fg outline-none placeholder:text-fg-placeholder disabled:cursor-not-allowed"
          {...props}
        />
      </div>
    );
  },
);
CampoDeCelularDelMundo.displayName = 'CampoDeCelularDelMundo';
