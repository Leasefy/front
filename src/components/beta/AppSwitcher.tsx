'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SquaresFour } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { LeasefyMark } from './LeasefyMark';

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
    pathname.includes('/dashboard') ? 'dashboard' : 'beta'
  );
  const isDashboard = resolvedWorkspace === 'dashboard';
  // AI CHAT HOME F3: the chat is the root inicio; the classic dashboard moved
  // to `${base}/dashboard`. Toggle: chat (root) ⇄ classic dashboard.
  const targetPath = isDashboard ? resolvedBase : `${resolvedBase}/dashboard`;

  return (
    <div className="flex items-center justify-between">
      {/* Brand — real Leasefy mark (white on dark, brand blue on light) */}
      <div className="flex items-center gap-2.5">
        <LeasefyMark className="w-7 h-auto shrink-0 text-[#1A40FF] dark:text-white" />
        <span className="text-[15px] font-bold text-foreground tracking-tight">
          Leasefy
          <span className="text-[#1A40FF] dark:text-[#5570FF] ml-1">AI</span>
        </span>
      </div>

      {/* Workspace switch */}
      <button
        onClick={() => router.push(targetPath)}
        className={cn(
          'p-2 rounded-md',
          'inline-flex items-center justify-center',
          // ≥44px touch target on coarse pointers
          '[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11',
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
