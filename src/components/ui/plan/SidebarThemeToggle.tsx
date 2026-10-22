'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/**
 * Claro / oscuro para el pie del sidebar.
 *
 * Segmentado de dos opciones en vez de un switch: el switch obliga a leer la
 * etiqueta para saber qué lado es cuál, y acá no hay etiqueta. Con sol y luna
 * visibles a la vez, el estado actual se ve sin interpretar nada, y cada opción
 * es un destino directo — no un "invierte lo que haya".
 *
 * Persistencia y clase `.dark` las maneja next-themes (ThemeProvider, attribute
 * class + defaultTheme system). Acá solo se elige explícitamente entre los dos,
 * igual que el ajuste de Configuración → Preferencias.
 *
 * SSR: el tema real solo se conoce en cliente, así que hasta montar se renderiza
 * el mismo marcado inerte que produce el servidor — si no, hay mismatch de
 * hidratación y un parpadeo del lado activo.
 */

type Mode = 'light' | 'dark';

export interface SidebarThemeToggleProps {
  /** Rail colapsado → un solo botón que alterna, en vez del segmentado. */
  collapsed?: boolean;
  labels?: { light: string; dark: string; group: string };
}

const DEFAULT_LABELS = {
  light: 'Tema claro',
  dark: 'Tema oscuro',
  group: 'Tema de la interfaz',
};

export function SidebarThemeToggle({ collapsed = false, labels }: SidebarThemeToggleProps) {
  const l = labels ?? DEFAULT_LABELS;
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // `resolvedTheme` resuelve 'system' al valor real. Antes de montar no hay
  // valor confiable: se asume claro para que servidor y cliente coincidan.
  const mode: Mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  if (collapsed) {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    const Icon = mode === 'dark' ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        title={next === 'dark' ? l.dark : l.light}
        aria-label={next === 'dark' ? l.dark : l.light}
        className="mx-auto grid h-10 w-10 place-items-center rounded-[12px] text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Icon className="w-[18px] h-[18px]" />
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={l.group}
      // C7 (plan de la barra, 22-10): con la esquina de la casa y un filete (en arena el gris desaparecía).
      className="inline-flex items-center gap-0.5 rounded-[10px] p-0.5 ring-1 ring-inset ring-border"
    >
      {(['light', 'dark'] as const).map((m) => {
        const Icon = m === 'light' ? Sun : Moon;
        const isActive = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setTheme(m)}
            aria-pressed={isActive}
            aria-label={m === 'light' ? l.light : l.dark}
            title={m === 'light' ? l.light : l.dark}
            className={cn(
              'flex h-6 w-7 items-center justify-center rounded-[8px] transition-colors',
              isActive
                ? 'bg-surface text-fg'
                : 'text-fg-subtle hover:text-fg'
            )}
          >
            <Icon className="w-4 h-4" weight={isActive ? 'fill' : 'regular'} />
          </button>
        );
      })}
    </div>
  );
}
