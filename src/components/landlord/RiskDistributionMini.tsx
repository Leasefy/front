'use client';

import { cn } from '@/lib/utils';
interface RiskDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  total: number;
}

interface RiskDistributionMiniProps {
  distribution: RiskDistribution;
  className?: string;
}

const riskColors = {
  A: {
    bg: 'bg-[#2C7A53]',
    text: 'text-[#2C7A53]',
    label: 'text-[#2C7A53]',
  },
  B: {
    bg: 'bg-[#1A40FF]',
    text: 'text-[#1A40FF]',
    label: 'text-[#1A40FF]',
  },
  C: {
    bg: 'bg-[#B7791F]',
    text: 'text-[#B7791F]',
    label: 'text-[#B7791F]',
  },
  D: {
    bg: 'bg-[#C4503B]',
    text: 'text-[#C4503B]',
    label: 'text-[#C4503B]',
  },
};

/**
 * RiskDistributionMini - Compact risk level distribution bar
 * Shows A/B/C/D breakdown as colored segments
 */
export function RiskDistributionMini({ distribution, className }: RiskDistributionMiniProps) {
  const { A, B, C, D, total } = distribution;

  if (total === 0) {
    return null;
  }

  // Calculate percentages
  const percentages = {
    A: (A / total) * 100,
    B: (B / total) * 100,
    C: (C / total) * 100,
    D: (D / total) * 100,
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Bar visualization */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Riesgo:</span>
        <div className="flex h-2 w-20 rounded-full overflow-hidden bg-muted">
          {A > 0 && (
            <div
              className={cn('h-full', riskColors.A.bg)}
              style={{ width: `${percentages.A}%` }}
              title={`Nivel A: ${A} candidatos`}
            />
          )}
          {B > 0 && (
            <div
              className={cn('h-full', riskColors.B.bg)}
              style={{ width: `${percentages.B}%` }}
              title={`Nivel B: ${B} candidatos`}
            />
          )}
          {C > 0 && (
            <div
              className={cn('h-full', riskColors.C.bg)}
              style={{ width: `${percentages.C}%` }}
              title={`Nivel C: ${C} candidatos`}
            />
          )}
          {D > 0 && (
            <div
              className={cn('h-full', riskColors.D.bg)}
              style={{ width: `${percentages.D}%` }}
              title={`Nivel D: ${D} candidatos`}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="hidden sm:flex items-center gap-2 text-xs">
        {A > 0 && (
          <span className={cn('font-medium', riskColors.A.label)}>
            A:{A}
          </span>
        )}
        {B > 0 && (
          <span className={cn('font-medium', riskColors.B.label)}>
            B:{B}
          </span>
        )}
        {C > 0 && (
          <span className={cn('font-medium', riskColors.C.label)}>
            C:{C}
          </span>
        )}
        {D > 0 && (
          <span className={cn('font-medium', riskColors.D.label)}>
            D:{D}
          </span>
        )}
      </div>
    </div>
  );
}

export default RiskDistributionMini;
