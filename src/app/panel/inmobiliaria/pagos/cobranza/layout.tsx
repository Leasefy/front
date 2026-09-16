'use client';

/**
 * Puerta de acceso a Cobranza. Los tres estados y el porqué viven en
 * `AgentModuleGate`.
 */

import React from 'react';
import { AgentModuleGate } from '@/components/auth/AgentModuleGate';
import { useI18n } from '@/lib/i18n';

export default function CobranzaLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  // Navigation (breadcrumb + tabs) now lives at the top: the breadcrumb in the
  // PlanHeader (AgentHeaderBreadcrumb) and the function tabs in WorkspaceNav.
  return (
    <AgentModuleGate
      module="cobranza"
      deniedTitle={t('inmobiliaria.ai.access.noAccessCobranza')}
    >
      {children}
    </AgentModuleGate>
  );
}
