import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * EmptyState — estado vacío limpio y MONOCROMO (rediseño 2026-06-16, pedido de
 * Nico). Renderiza el estilo canónico directamente (sin delegar al "brand
 * moment" del DS): nada de azul de marca, BrandMotif/dome ni líneas
 * decorativas, sin caja con borde punteado ni fondo gris de relleno.
 *
 * - icon: componente Phosphor (className, size, weight) → ícono mudo en gris
 *   dentro de un chip neutro.
 * - title + description neutros.
 * - action (opcional): { label, href } → ÚNICO elemento con énfasis, render
 *   como CTA pill outlined (estilo ElevenLabs) usando next/link.
 *
 * Referencia visual: empty states de ElevenLabs.
 * API pública intacta (no tocar los call sites).
 */

// ============================================================================
// Types (API local intacta)
// ============================================================================

export interface EmptyStateAction {
  label: string;
  href: string;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon: Icon;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional CTA button */
  action?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      {/* Ícono mudo en chip neutro — sin azul, sin líneas, sin caja */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
        <IconComponent
          weight="duotone"
          className="h-6 w-6 text-neutral-400 dark:text-neutral-500"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">
          {title}
        </p>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      </div>

      {action ? (
        <Link
          href={action.href}
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-800 transition-all duration-150 hover:border-neutral-300 hover:shadow-sm active:scale-[0.98] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-500"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
