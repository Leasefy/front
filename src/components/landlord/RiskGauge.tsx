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
            'bg-slate-100 rounded-full overflow-hidden',
            size === 'sm' ? 'h-1.5' : 'h-2'
          )}
        />
        {showLabels && (
          <p className="text-xs text-slate-400 mt-1.5">Sin candidatos</p>
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
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${percentA}%` }}
          />
        )}
        {levelB > 0 && (
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${percentB}%` }}
          />
        )}
        {levelC > 0 && (
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${percentC}%` }}
          />
        )}
        {levelD > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${percentD}%` }}
          />
        )}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex items-center gap-3 mt-2">
          {levelA > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">
                {levelA} nivel A
              </span>
            </div>
          )}
          {levelB > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-600">
                {levelB} nivel B
              </span>
            </div>
          )}
          {levelC > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600">
                {levelC} nivel C
              </span>
            </div>
          )}
          {levelD > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600">
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
