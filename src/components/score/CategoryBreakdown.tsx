'use client';

import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScoreProgressBar } from './ScoreProgressBar';
import type { ScoreCategory } from '@/lib/types/risk-score';
import { getScoreLevel, RISK_LEVEL_COLORS } from '@/lib/constants/risk-levels';

// ============================================================================
// TextTs
// ============================================================================

export interface CategoryBreakdownProps {
  /** Score categories with their details */
  categories: ScoreCategory[];
  /** Whether to expand first item by default */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Category Icons (optional visual enhancement)
// ============================================================================

const CATEGORY_ICONS: Record<string, string> = {
  income: '💰',
  stability: '🏢',
  history: '📋',
  credit: '💳',
  // Fallback
  default: '📊',
};

/**
 * Get icon for a category based on its name
 */
function getCategoryIcon(categoryName: string): string {
  const normalizedName = categoryName.toLowerCase();
  if (normalizedName.includes('pago') || normalizedName.includes('ingreso')) {
    return CATEGORY_ICONS.income;
  }
  if (normalizedName.includes('estabilidad') || normalizedName.includes('laboral')) {
    return CATEGORY_ICONS.stability;
  }
  if (normalizedName.includes('historial') || normalizedName.includes('arrendamiento')) {
    return CATEGORY_ICONS.history;
  }
  if (normalizedName.includes('credit') || normalizedName.includes('deuda')) {
    return CATEGORY_ICONS.credit;
  }
  return CATEGORY_ICONS.default;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CategoryBreakdown - Collapsible breakdown by scoring category
 *
 * Layout from PLAN-02:
 * ┌─────────────────────────────────┐
 * │ ▼ Capacidad de Pago      85/100 │
 * │   ─────────────────[████████░░] │
 * │   • Ratio arriendo/ingreso: 22% │
 * │   • Ingresos verificables       │
 * ├─────────────────────────────────┤
 * │ ▶ Estabilidad Laboral    78/100 │
 * ├─────────────────────────────────┤
 * │ ▶ Historial              90/100 │
 * └─────────────────────────────────┘
 *
 * Uses shadcn Accordion for expand/collapse behavior.
 */
export function CategoryBreakdown({
  categories,
  defaultExpanded = false,
  className,
}: CategoryBreakdownProps) {
  // Determine default expanded items
  const defaultValue = defaultExpanded && categories.length > 0
    ? [categories[0].name]
    : [];

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultValue}
      className={cn('w-full', className)}
    >
      {categories.map((category) => {
        const level = getScoreLevel(category.score);
        const colors = RISK_LEVEL_COLORS[level];
        const icon = getCategoryIcon(category.label);

        return (
          <AccordionItem
            key={category.name}
            value={category.name}
            className="border-b border-border-faint"
          >
            <AccordionTrigger className="hover:no-underline py-3 px-1">
              <div className="flex items-center justify-between w-full pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-base" role="img" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="text-sm font-medium text-fg">
                    {category.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreProgressBar
                    score={category.score}
                    level={level}
                    size="sm"
                    className="w-16 hidden sm:block"
                  />
                  <span className={cn('text-sm font-semibold font-mono tabular-nums', colors.text)}>
                    {category.score}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-1 pb-2">
                {/* Full progress bar in expanded view */}
                <div className="mb-3">
                  <ScoreProgressBar
                    score={category.score}
                    level={level}
                    size="md"
                    showValue
                    className="w-full"
                  />
                </div>

                {/* Contributing factors */}
                {category.factors.length > 0 && (
                  <ul className="space-y-1.5">
                    {category.factors.map((factor, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-fg-muted"
                      >
                        <span className="text-fg-subtle mt-0.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Weight indicator */}
                <div className="mt-3 text-xs text-fg-subtle">
                  Peso en evaluación:{' '}
                  <span className="font-mono tabular-nums">
                    {Math.round(category.weight * 100)}%
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
