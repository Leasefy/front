'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SquaresFour, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type Workspace = 'dashboard' | 'beta';

interface AppSwitcherProps {
  /** Current workspace. Auto-detected from pathname if not provided. */
  currentWorkspace?: Workspace;
  /** Base path prefix: '/panel' for propietarios, '/panel/inmobiliaria' for inmobiliarias */
  basePath?: string;
}

/**
 * AppSwitcher - Dashboard <-> AI Beta workspace toggle.
 *
 * Inspired by Slack's workspace selector. Compact clickable element
 * at the top of the sidebar that switches between the classic Dashboard
 * and the AI Beta universe.
 *
 * Integration: Will be placed in the Beta layout sidebar (Plan 02).
 */
export function AppSwitcher({ currentWorkspace, basePath }: AppSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Auto-detect base path from pathname if not provided
  const resolvedBase = basePath ?? (
    pathname.startsWith('/panel/inmobiliaria') ? '/panel/inmobiliaria' : '/panel'
  );

  // Auto-detect current workspace from pathname if not provided
  const resolvedWorkspace: Workspace = currentWorkspace ?? (
    pathname.includes('/beta') ? 'beta' : 'dashboard'
  );

  const isDashboard = resolvedWorkspace === 'dashboard';
  const targetPath = isDashboard
    ? `${resolvedBase}/beta`
    : resolvedBase;

  const handleSwitch = () => {
    router.push(targetPath);
  };

  return (
    <button
      onClick={handleSwitch}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
        'text-[13px] font-medium',
        'transition-colors duration-150',
        'bg-neutral-50 dark:bg-neutral-800/50',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'border border-neutral-200/60 dark:border-neutral-700/50',
        'text-foreground'
      )}
    >
      {/* Current workspace icon */}
      {isDashboard ? (
        <SquaresFour className="w-[18px] h-[18px] text-muted-foreground" />
      ) : (
        <Sparkle className="w-[18px] h-[18px] text-indigo-500" weight="fill" />
      )}

      {/* Label */}
      <span className="flex-1 text-left truncate">
        {isDashboard ? 'Dashboard' : 'AI Beta'}
      </span>

      {/* Beta badge (only on AI Beta mode) */}
      {!isDashboard && (
        <span className="bg-indigo-500 text-white text-[11px] rounded-full px-1.5 py-0.5 leading-none font-medium">
          Beta
        </span>
      )}

      {/* Switch indicator */}
      <span className="text-[11px] text-muted-foreground">
        {isDashboard ? 'Ir a Beta' : 'Ir a Dashboard'}
      </span>
    </button>
  );
}
