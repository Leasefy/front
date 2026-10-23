'use client';

import { Shield, Lock } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { RISK_LEVELS, getRiskBadgeVariant } from '@/lib/types/risk-score';
import type { RiskLevel } from '@/lib/types/risk-score';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface ScoreCardProps {
  isPaid: boolean;
  level?: RiskLevel | null;
  onClick: () => void;
}

// GLOW UP 22-10: los colores de la casa (antes en hex a mano; la B iba en voltaje, que es sólo para la acción).
const LEVEL_ICON_COLORS: Record<RiskLevel, string> = {
  A: 'text-success',
  B: 'text-fg-muted',
  C: 'text-warning',
  D: 'text-danger',
};

export function ScoreCard({ isPaid, level, onClick }: ScoreCardProps) {
  const { locale } = useI18n();

  if (!isPaid || !level) {
    return (
      <button
        onClick={onClick}
        className="rounded-lg bg-surface-muted p-5 text-left w-full hover:bg-surface-muted transition-colors group"
      >
        <Shield className="w-5 h-5 text-fg-subtle shrink-0" aria-hidden="true" />
        <p className="text-caption text-fg-muted mb-1">
          {locale === 'es' ? 'Tu calificación' : 'Your rating'}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-fg-subtle">
            {locale === 'es' ? 'Sin evaluar' : 'Not evaluated'}
          </p>
          {/* Decía "Evaluar perfil", una acción que no existe: la evaluación
              la lanza la inmobiliaria sobre una postulación. Ahora la etiqueta
              dice cuándo aparece, y el detalle lo explica. */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface text-fg-muted text-caption rounded-full">
            <Lock className="w-3 h-3" />
            {locale === 'es' ? 'Al postularte' : 'When you apply'}
          </span>
        </div>
      </button>
    );
  }

  const info = RISK_LEVELS[level];

  return (
    <button
      onClick={onClick}
      className="rounded-lg bg-surface-muted p-5 text-left w-full hover:bg-surface-muted transition-colors group"
    >
      {/* El ícono suelto con el color de su nivel (antes, en una caja blanca). */}
      <Shield className={cn('mb-3 w-5 h-5', LEVEL_ICON_COLORS[level])} aria-hidden="true" />
      <p className="text-caption text-fg-muted mb-1">
        {locale === 'es' ? 'Tu calificación' : 'Your rating'}
      </p>
      <div className="flex items-center gap-2">
        <p className="font-mono text-h2 tabular-nums text-fg">{level}</p>
        <Badge variant={getRiskBadgeVariant(level)} className="px-2 py-0.5">
          {info.label}
        </Badge>
      </div>
      <p className="text-caption text-fg-muted mt-1 group-hover:text-fg transition-colors">
        {locale === 'es' ? 'Ver detalle' : 'View detail'}
      </p>
    </button>
  );
}
