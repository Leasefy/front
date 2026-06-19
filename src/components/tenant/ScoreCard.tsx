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

const LEVEL_ICON_COLORS: Record<RiskLevel, string> = {
  A: 'text-[#2C7A53] dark:text-[#3EAE70]',
  B: 'text-[#1A40FF] dark:text-[#5570FF]',
  C: 'text-[#B7791F] dark:text-[#D2992F]',
  D: 'text-[#C4503B] dark:text-[#E0664D]',
};

export function ScoreCard({ isPaid, level, onClick }: ScoreCardProps) {
  const { locale } = useI18n();

  if (!isPaid || !level) {
    return (
      <button
        onClick={onClick}
        className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5 text-left w-full hover:bg-neutral-100 dark:hover:bg-[#222224] transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
          <Shield className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          {locale === 'es' ? 'Tu score' : 'Your score'}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-neutral-300 dark:text-neutral-600 blur-[6px] select-none">
            ??
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-medium rounded-full">
            <Lock className="w-3 h-3" />
            {locale === 'es' ? 'Evaluar perfil' : 'Evaluate profile'}
          </span>
        </div>
      </button>
    );
  }

  const info = RISK_LEVELS[level];

  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-neutral-50 dark:bg-[#1a1a1c] p-5 text-left w-full hover:bg-neutral-100 dark:hover:bg-[#222224] transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center mb-3">
        <Shield className={cn('w-5 h-5', LEVEL_ICON_COLORS[level])} />
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
        {locale === 'es' ? 'Tu score' : 'Your score'}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{level}</p>
        <Badge variant={getRiskBadgeVariant(level)} className="text-[10px] px-2 py-0.5">
          {info.label}
        </Badge>
      </div>
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 group-hover:text-[#1A40FF] dark:group-hover:text-[#1A40FF] transition-colors">
        {locale === 'es' ? 'Ver detalle' : 'View detail'}
      </p>
    </button>
  );
}
