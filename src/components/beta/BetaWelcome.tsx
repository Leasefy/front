'use client';

import { Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const SUGGESTED_PROMPTS = [
  { id: 'cobros', text: '\u00bfComo van mis cobros este mes?' },
  { id: 'propiedades', text: 'Resume el estado de mis propiedades' },
  { id: 'decisiones', text: '\u00bfHay decisiones pendientes?' },
  { id: 'reporte', text: 'Genera un reporte de pagos' },
];

interface BetaWelcomeProps {
  /** Called when user clicks a suggested prompt. Non-functional for now. */
  onPromptClick?: (prompt: string) => void;
  className?: string;
}

/**
 * BetaWelcome - Welcome/empty state for the Beta chat area.
 *
 * Shown when users first enter /panel/beta. Displays Leasefy AI branding,
 * a subtitle, and suggested prompt chips that will feed into chat in Phase 18.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full',
        'px-6 py-12',
        className
      )}
    >
      {/* Sparkle icon with animated pulse */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
          <Sparkle
            className="w-8 h-8 text-indigo-500 animate-pulse"
            weight="fill"
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-foreground mb-2">
        Leasefy AI
      </h1>

      {/* Beta badge */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 mb-4',
          'bg-indigo-500/10 text-indigo-500',
          'text-xs font-medium px-2.5 py-1 rounded-full'
        )}
      >
        <Sparkle className="w-3 h-3" weight="fill" />
        Beta
      </span>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-md mb-10">
        Tu asistente de administracion de arriendos. Preguntame lo que necesites.
      </p>

      {/* Suggested prompt chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptClick?.(prompt.text)}
            className={cn(
              'text-left px-4 py-3 rounded-xl',
              'text-[13px] text-muted-foreground',
              'bg-white dark:bg-card',
              'border border-neutral-200 dark:border-border',
              'hover:border-indigo-300 dark:hover:border-indigo-500/40',
              'hover:text-foreground',
              'hover:shadow-sm',
              'transition-all duration-150'
            )}
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
