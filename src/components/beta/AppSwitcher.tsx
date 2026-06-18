'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SquaresFour } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
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
      {/* Brand — real Leasefy mark (brand blue on light, white on dark) */}
      <div className="flex items-center gap-2.5">
        <LeasefyMark className="w-7 h-auto shrink-0 text-primary dark:text-white" />
        <span className="text-sm font-bold text-fg tracking-tight">
          Leasefy
          <span className="text-primary ml-1">AI</span>
        </span>
      </div>

      {/* Workspace switch */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(targetPath)}
        className="text-fg-muted hover:text-fg"
        title={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
        aria-label={isDashboard ? t('beta.appSwitcher.goToBeta') : t('beta.appSwitcher.goToDashboard')}
      >
        <SquaresFour className="w-[18px] h-[18px]" />
      </Button>
    </div>
  );
}
