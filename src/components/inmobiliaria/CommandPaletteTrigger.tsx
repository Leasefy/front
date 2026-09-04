'use client';

/**
 * CommandPaletteTrigger — la píldora «Buscar… ⌘K» de la barra superior.
 *
 * El atajo se resuelve DESPUÉS de montar. Antes se leía `navigator.platform`
 * durante el render: en el servidor no hay `navigator`, así que el HTML salía
 * con «Ctrl+K» y el cliente lo repintaba «⌘K» — mismatch de hidratación y un
 * parpadeo en cada carga del panel. Ahora el primer render (servidor y cliente)
 * dice lo mismo y el efecto corrige sólo en Mac.
 */

import { useEffect, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Kbd } from '@leasefy/cadence';

import { useCommandPalette } from '@/lib/context/CommandPaletteContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface CommandPaletteTriggerProps {
  className?: string;
}

function esMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  // `userAgentData.platform` es lo vigente; `platform` sigue de respaldo porque
  // Safari y Firefox todavía no exponen el primero.
  const conDatos = navigator as Navigator & { userAgentData?: { platform?: string } };
  const plataforma = conDatos.userAgentData?.platform ?? navigator.platform ?? '';
  return /mac/i.test(plataforma);
}

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const { open } = useCommandPalette();
  const { t } = useI18n();
  const [atajo, setAtajo] = useState('Ctrl+K');

  useEffect(() => {
    if (esMac()) setAtajo('⌘K');
  }, []);

  return (
    <button
      onClick={open}
      aria-label={t('inmobiliaria.commandPalette.triggerAriaLabel')}
      className={cn(
        'group flex h-9 items-center gap-2 pl-3 pr-2.5',
        // ≥44px de objetivo táctil en punteros gruesos (el alto visual no cambia).
        '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center',
        'border border-border bg-surface-muted hover:bg-surface',
        'rounded-full transition-colors',
        'text-fg-subtle hover:text-fg-muted',
        className,
      )}
    >
      <MagnifyingGlass className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="hidden whitespace-nowrap text-caption text-fg-subtle transition-colors group-hover:text-fg-muted sm:inline">
        {t('inmobiliaria.commandPalette.placeholder')}
      </span>
      <Kbd size="sm" className="hidden flex-shrink-0 sm:inline-flex">
        {atajo}
      </Kbd>
    </button>
  );
}
