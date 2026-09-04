'use client';

import { Hourglass } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';

interface NoDataYetBadgeProps {
  reason: string;
  phase: number;
  cta?: string;
  ctaHref?: string;
}

export function NoDataYetBadge({ reason, phase, cta, ctaHref }: NoDataYetBadgeProps) {
  const { t } = useI18n();

  return (
    // `role="status"` mirrors the EmptyState primitive so screen-reader users
    // get the same "informational region" semantics whether the page renders
    // a "below threshold" placeholder (this badge) or a true "no data" empty
    // state. Phase 38-08 a11y specs detect both via `[role="status"].border-dashed`.
    <div role="status" className="rounded-lg border-2 border-dashed border-border bg-surface-muted px-6 py-8 flex flex-col items-center gap-3 text-center">
      <Hourglass weight="duotone" className="h-8 w-8 text-fg-subtle" />
      <p className="text-sm font-semibold text-fg-muted">
        {t('inmobiliaria.ai.cotizador.noDataYet.heading')}
      </p>
      <p className="text-xs text-fg-subtle max-w-xs">{reason}</p>
      <span className="text-xs bg-muted rounded-full px-2 py-0.5 text-fg-muted">
        Fase {phase}
      </span>
      {cta && (
        <a href={ctaHref ?? '#'} className="text-xs text-primary underline hover:text-primary">
          {cta}
        </a>
      )}
    </div>
  );
}
