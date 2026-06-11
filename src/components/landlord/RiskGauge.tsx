'use client';

import { cn } from '@/lib/utils';

interface RiskDistribution {
  levelA: number;
  levelB: number;
  levelC: number;
  levelD: number;
}

interface RiskGaugeProps {
  distribution: RiskDistribution;
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

/**
 * Risk Gauge - Horizontal bar showing candidate risk distribution
 * Colors: A=emerald, B=blue, C=amber, D=red
 */
export function RiskGauge({
  distribution,
  size = 'md',
  showLabels = false,
  className,
}: RiskGaugeProps) {
  const { levelA, levelB, levelC, levelD } = distribution;
  const total = levelA + levelB + levelC + levelD;

  if (total === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'bg-muted rounded-full overflow-hidden',
            size === 'sm' ? 'h-1.5' : 'h-2'
          )}
        />
        {showLabels && (
          <p className="text-xs text-muted-foreground mt-1.5">Sin candidatos</p>
        )}
      </div>
    );
  }

  const percentA = (levelA / total) * 100;
  const percentB = (levelB / total) * 100;
  const percentC = (levelC / total) * 100;
  const percentD = (levelD / total) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Bar */}
      <div
        className={cn(
          'flex rounded-full overflow-hidden',
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        {levelA > 0 && (
          <div
            className="bg-[#2C7A53] transition-all duration-500"
            style={{ width: `${percentA}%` }}
          />
        )}
        {levelB > 0 && (
          <div
            className="bg-[#1A40FF] transition-all duration-500"
            style={{ width: `${percentB}%` }}
          />
        )}
        {levelC > 0 && (
          <div
            className="bg-[#B7791F] transition-all duration-500"
            style={{ width: `${percentC}%` }}
          />
        )}
        {levelD > 0 && (
          <div
            className="bg-[#C4503B] transition-all duration-500"
            style={{ width: `${percentD}%` }}
          />
        )}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex items-center gap-3 mt-2">
          {levelA > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2C7A53]" />
              <span className="text-xs text-muted-foreground">
                {levelA} nivel A
              </span>
            </div>
          )}
          {levelB > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#1A40FF]" />
              <span className="text-xs text-muted-foreground">
                {levelB} nivel B
              </span>
            </div>
          )}
          {levelC > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#B7791F]" />
              <span className="text-xs text-muted-foreground">
                {levelC} nivel C
              </span>
            </div>
          )}
          {levelD > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#C4503B]" />
              <span className="text-xs text-muted-foreground">
                {levelD} nivel D
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for property cards
 */
export function RiskGaugeMini({
  distribution,
  className,
}: {
  distribution: RiskDistribution;
  className?: string;
}) {
  return <RiskGauge distribution={distribution} size="sm" className={className} />;
}

export { RiskGauge as default };
