'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SquaresFour, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Workspace = 'dashboard' | 'beta';

interface AppSwitcherProps {
  currentWorkspace?: Workspace;
  basePath?: string;
}

/**
 * AppSwitcher — Brand header with dashboard navigation.
 * Shows "Leasefy AI" logo and a button to switch workspaces.
 */
export function AppSwitcher({ currentWorkspace, basePath }: AppSwitcherProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const resolvedBase = basePath ?? (
    pathname.startsWith('/panel/inmobiliaria') ? '/panel/inmobiliaria' : '/panel'
  );
  const resolvedWorkspace: Workspace = currentWorkspace ?? (
    pathname.includes('/beta') ? 'beta' : 'dashboard'
  );
  const isDashboard = resolvedWorkspace === 'dashboard';
  const targetPath = isDashboard ? `${resolvedBase}/beta` : resolvedBase;

  return (
    <div className="flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Sparkle className="w-[18px] h-[18px] text-white" weight="fill" />
        </div>
        <span className="text-[15px] font-bold text-foreground tracking-tight">
          Leasefy
          <span className="text-indigo-500 ml-1">AI</span>
        </span>
      </div>

      {/* Workspace switch */}
      <button
        onClick={() => router.push(targetPath)}
        className={cn(
          'p-2 rounded-lg',
          'text-neutral-400 dark:text-neutral-500',
          'hover:text-neutral-600 dark:hover:text-neutral-300',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          'transition-colors duration-150'
        )}
        title={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
        aria-label={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
      >
        <SquaresFour className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}
