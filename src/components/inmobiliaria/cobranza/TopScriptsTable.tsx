'use client';

/*
 * TopScriptsTable — PERMANENTLY DEFERRED in Phase 37
 *
 * The "top scripts by conversion lift" widget requires Call.scriptTemplateId to link
 * call rows to the ScriptTemplate that was used. This FK does not exist in the current
 * schema (verified 2026-05-29 — see .planning/phases/37-cobranza-aggregate-analytics/
 * 37-SCHEMA-ALIGNMENT.md §4 and 37-RESEARCH.md §LANDMINE-1).
 *
 * Phase 38+ must add the migration + instrument script-picker.ts before this widget
 * can render real data. Until then, this component renders ONLY NoDataYetBadge.
 *
 * Do NOT add stub data rows here — showing synthetic data for a fundamentally
 * unavailable metric would mislead operators about their script performance.
 * (T-37-10-01 mitigation — see 37-10-PLAN.md threat model)
 */

import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge';
import { useI18n } from '@/lib/i18n';

export function TopScriptsTable(): JSX.Element {
  const { t } = useI18n();

  return (
    <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
      </h3>
      <NoDataYetBadge
        phase={38}
        reason={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.pendingPhase38')}
      />
    </section>
  );
}
