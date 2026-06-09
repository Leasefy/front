'use client';

import { BetaLayout } from '@/components/beta/BetaLayout';
import { BetaErrorBoundary } from '@/components/beta/BetaErrorBoundary';
import { ChatContainer } from '@/components/beta/ChatContainer';

/**
 * Agency INICIO — the Manus-style AI chat home (AI CHAT HOME F3).
 *
 * The chat IS `/panel/inmobiliaria`: opens with the welcome state, converses
 * over the agency's real data, and dispatches the AI agents (wired in F2).
 * The classic dashboard now lives at `/panel/inmobiliaria/dashboard` and is
 * reachable from the chat's AppSwitcher (and the sidebar "dashboard" item).
 *
 * Renders the same `BetaLayout` (which mounts BetaChatProvider) + ChatContainer
 * as the `/beta` route, so it behaves identically — `/beta` is kept as an alias.
 */
export default function InmobiliariaInicioPage() {
  return (
    <BetaErrorBoundary>
      <BetaLayout basePath="/panel/inmobiliaria">
        <ChatContainer />
      </BetaLayout>
    </BetaErrorBoundary>
  );
}
