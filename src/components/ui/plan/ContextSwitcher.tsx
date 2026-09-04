'use client';

import { User, Buildings, Check } from '@phosphor-icons/react';
import { isDualContextUser, type ActiveContext } from '@/lib/auth/active-context';

export interface ContextSwitcherProps {
  user: { role?: string } | null | undefined;
  agencyName?: string | null;
  activeContext: ActiveContext;
  hasActiveAgencyMembership: boolean;
  locale: string;
  /** Called with the chosen context. The caller persists it + navigates. */
  onSwitch: (context: ActiveContext) => void;
}

/**
 * Personal ↔ agency context switcher, rendered inside the avatar dropdown.
 * Renders ONLY for dual-context users (personal role + ACTIVE agency
 * membership) — visibility is driven by the SAME `isDualContextUser` predicate
 * the auth context uses to resolve the active context, so they never diverge.
 */
export function ContextSwitcher({
  user,
  agencyName,
  activeContext,
  hasActiveAgencyMembership,
  locale,
  onSwitch,
}: ContextSwitcherProps) {
  if (!isDualContextUser(user, hasActiveAgencyMembership)) return null;
  const es = locale === 'es';
  return (
    <div data-testid="context-switcher" role="group" aria-label={es ? 'Cambiar de contexto' : 'Switch context'}>
      <div className="h-px bg-surface-muted my-1" />
      <p className="px-3 pt-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        {es ? 'Cambiar de contexto' : 'Switch context'}
      </p>
      <button
        type="button"
        data-testid="switch-personal"
        onClick={() => onSwitch('personal')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-lg cursor-pointer"
      >
        <User className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
        <span className="flex-1 text-left">{es ? 'Mi cuenta' : 'My account'}</span>
        {activeContext === 'personal' && <Check className="w-4 h-4 text-primary" />}
      </button>
      <button
        type="button"
        data-testid="switch-agency"
        onClick={() => onSwitch('agency')}
        className="w-full flex items-center gap-3 px-3 py-2 text-[13px] text-fg hover:bg-surface-muted rounded-lg cursor-pointer"
      >
        <Buildings className="w-4 h-4 stroke-[1.5px] text-fg-muted" />
        <span className="flex-1 text-left truncate">
          {agencyName
            ? es
              ? `Inmobiliaria ${agencyName}`
              : `Agency ${agencyName}`
            : es
              ? 'Inmobiliaria'
              : 'Agency'}
        </span>
        {activeContext === 'agency' && <Check className="w-4 h-4 text-primary" />}
      </button>
      <div className="h-px bg-surface-muted my-1" />
    </div>
  );
}
