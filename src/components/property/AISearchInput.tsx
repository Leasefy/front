'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Sparkle, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  enterTransition,
  exitTransition,
  motionEase,
  motionScale,
  usePrefersReducedMotion,
} from '@leasefy/cadence';

import { cn } from '@/lib/utils';

interface AISearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onMagnifyingGlass: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  isMagnifyingGlassing?: boolean;
}

/**
 * El campo de búsqueda en lenguaje natural del catálogo.
 *
 * Rediseñado el 2026-09-06 (Nico: «hay que hacer un glow up de esta sección
 * de buscar inmueble»). Antes era una caja de 260 px con un textarea de dos
 * filas, el aviso «Pulsa Enter» y el botón flotando en blanco: leía como un
 * formulario vacío. Ahora es la barra de una sola fila del sistema de diseño
 * (DESIGN.md §15): la teja con la chispa —la firma de lo que es IA—, el campo
 * y el botón redondo. El foco lo marca el contenedor, una sola vez.
 *
 * El panel de resultados que traía adentro (`results`/`showResults`) nunca
 * lo pasaba nadie: la búsqueda filtra la grilla de abajo, que es la única
 * fuente. Se fue.
 */
export function AISearchInput({
  value,
  onChange,
  onMagnifyingGlass,
  onClear,
  placeholder = 'Describe el inmueble que buscas…',
  className,
  isMagnifyingGlassing = false,
}: AISearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [conFoco, setConFoco] = useState(false);

  const enviar = useCallback(() => {
    const consulta = value.trim();
    if (consulta && !isMagnifyingGlassing) onMagnifyingGlass(consulta);
  }, [value, onMagnifyingGlass, isMagnifyingGlassing]);

  const alTeclear = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        enviar();
      }
    },
    [enviar],
  );

  const limpiar = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  // Con movimiento reducido, el ✕ y la línea de progreso quedan en fundidos cortos.
  const reducido = usePrefersReducedMotion();

  return (
    <div className={cn('w-full', className)}>
      <div
        data-testid="ai-search"
        className={cn(
          'relative flex items-center gap-3 rounded-full border bg-surface p-2 pl-2.5 transition-[border-color,box-shadow] duration-base',
          conFoco
            ? 'border-primary/40 shadow-[0_0_0_4px_rgba(26,64,255,0.10)]'
            : 'border-border shadow-sm hover:border-border-strong',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          {isMagnifyingGlassing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}>
              <Sparkle className="h-5 w-5 text-primary" weight="fill" aria-hidden="true" />
            </motion.div>
          ) : (
            <Sparkle className="h-5 w-5 text-primary" weight="fill" aria-hidden="true" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={alTeclear}
          onFocus={() => setConFoco(true)}
          onBlur={() => setConFoco(false)}
          placeholder={placeholder}
          aria-label="Búsqueda inteligente de propiedades"
          disabled={isMagnifyingGlassing}
          enterKeyHint="search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-placeholder disabled:cursor-not-allowed"
        />

        {/* El ✕ nace al escribir (desde el 96 %, como un flotante) y sale al
            vaciar el campo; antes aparecía y desaparecía de golpe. */}
        <AnimatePresence initial={false}>
          {value.trim() && !isMagnifyingGlassing && (
            <motion.button
              key="limpiar"
              type="button"
              onClick={limpiar}
              aria-label="Limpiar búsqueda"
              initial={{ opacity: 0, scale: motionScale.pop }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: motionScale.pop, transition: exitTransition(reducido) }}
              transition={enterTransition(reducido, { duration: 'fast' })}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={enviar}
          disabled={!value.trim() || isMagnifyingGlassing}
          aria-label="Buscar"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
            value.trim() && !isMagnifyingGlassing
              ? 'bg-primary text-primary-fg hover:opacity-90'
              : 'bg-surface-muted text-fg-subtle',
          )}
        >
          <ArrowUp className="h-5 w-5" weight="bold" aria-hidden="true" />
        </button>

        {/* La línea de progreso vive en el borde inferior del campo: no abre
            un panel ni mueve nada de abajo mientras el back interpreta.
            `initial={false}`: si ya viene puesta en el HTML del servidor (la
            primera interpretación de /propiedades), se pinta visible — nada
            invisible arriba del pliegue; sólo entra con fundido cuando aparece
            DESPUÉS, al buscar. */}
        <AnimatePresence initial={false}>
          {isMagnifyingGlassing && (
            // Sólo existe MIENTRAS interpreta (nunca en el HTML del servidor):
            // entra y sale con los tokens; el barrido es un indicador de trabajo,
            // no un adorno, y se apaga en cuanto llega la respuesta.
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: exitTransition(reducido) }}
              transition={enterTransition(reducido)}
              className="pointer-events-none absolute inset-x-6 bottom-0 h-0.5 overflow-hidden rounded-full bg-primary-soft"
            >
              <motion.span
                className="block h-full w-1/3 rounded-full bg-primary"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: motionEase.standard }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-2 pl-4 text-xs text-fg-subtle" aria-live="polite">
        {isMagnifyingGlassing ? 'Interpretando lo que escribiste…' : 'Pulsa Enter para buscar'}
      </p>
    </div>
  );
}
