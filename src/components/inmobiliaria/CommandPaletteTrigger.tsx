'use client';

/**
 * CommandPaletteTrigger — a "Buscar… ⌘K" pill in the top bar.
 *
 * Renders a compact search pill that opens the command palette on click.
 * Visually matches the PlanHeader search input style (same bg, border, rounded-full)
 * but is non-interactive (just a button affordance).
 */

import { MagnifyingGlass } from '@phosphor-icons/react';
import { useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface CommandPaletteTriggerProps {
  className?: string;
}

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { open } = useCommandPalette();
  const { t, locale } = useI18n();

  const shortcut = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac')
    ? '⌘K'
    : 'Ctrl+K';

  return (
    <button
      onClick={open}
      aria-label={t('inmobiliaria.commandPalette.triggerAriaLabel')}
      className={cn(
        'group flex items-center gap-2 h-9 pl-3 pr-2.5',
        // ≥44px touch target on coarse pointers (visual height unchanged on desktop)
        '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center',
        'bg-surface-muted hover:bg-surface border border-border hover:border-border',
        'rounded-full transition-colors',
        'text-fg-subtle hover:text-fg-muted',
        className,
      )}
    >
      <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-[13px] text-fg-subtle group-hover:text-fg-muted transition-colors whitespace-nowrap hidden sm:inline">
        {t('inmobiliaria.commandPalette.placeholder')}
      </span>
      <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-fg-subtle bg-surface-muted group-hover:bg-surface-muted rounded-sm border border-border transition-colors flex-shrink-0">
        {shortcut}
      </kbd>
    </button>
  );
}
