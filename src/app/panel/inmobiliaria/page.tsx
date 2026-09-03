'use client';

import { BetaLayout } from '@/components/beta/BetaLayout';
import { BetaErrorBoundary } from '@/components/beta/BetaErrorBoundary';
import { ChatContainer } from '@/components/beta/ChatContainer';

/**
 * Agency INICIO — the Manus-style AI chat home (AI CHAT HOME F3).
 *
 * The chat IS `/panel/inmobiliaria`: opens with the welcome state, converses
 * over the agency's real data, and dispatches the AI agents (wired in F2).
 * The classic dashboard now lives at `/panel/inmobiliaria/reportes/resumen` and is
 * reachable from the chat's AppSwitcher (and the sidebar "dashboard" item).
 *
 * Renders the same `BetaLayout` (which mounts BetaChatProvider) + ChatContainer
 * as the `/beta` route — but in `embedded` mode: the chat fills the panel's
 * content area while the MAIN backoffice sidebar + header stay visible
 * (requisito: la sidebar principal sigue existiendo sí o sí; el full-screen
 * "universo aparte" queda solo para el alias `/beta`).
 */
export default function InmobiliariaInicioPage() {
  return (
    <BetaErrorBoundary>
      <BetaLayout basePath="/panel/inmobiliaria" variant="embedded">
        <ChatContainer />
      </BetaLayout>
    </BetaErrorBoundary>
  );
}
