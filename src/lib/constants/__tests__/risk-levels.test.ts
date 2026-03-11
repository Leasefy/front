import { describe, it, expect } from 'vitest';
import {
  RISK_LEVEL_COLORS,
  RISK_LEVEL_BADGE_VARIANTS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_DESCRIPTIONS,
  RISK_LEVEL_RECOMMENDATIONS,
  RISK_LEVEL_THRESHOLDS,
  getScoreLevel,
  getRiskColors,
  getBadgeVariant,
  getRiskLabel,
  getRiskDescription,
  getRiskRecommendation,
  isSafeRiskLevel,
  requiresAttention,
  getSeverityIndicator,
} from '@/lib/constants/risk-levels';

// =============================================================================
// Constants validation
// =============================================================================

describe('RISK_LEVEL_THRESHOLDS', () => {
  it('defines the correct threshold for each level', () => {
    expect(RISK_LEVEL_THRESHOLDS.A).toBe(85);
    expect(RISK_LEVEL_THRESHOLDS.B).toBe(70);
    expect(RISK_LEVEL_THRESHOLDS.C).toBe(50);
    expect(RISK_LEVEL_THRESHOLDS.D).toBe(0);
  });

  it('has thresholds in descending order', () => {
    expect(RISK_LEVEL_THRESHOLDS.A).toBeGreaterThan(RISK_LEVEL_THRESHOLDS.B);
    expect(RISK_LEVEL_THRESHOLDS.B).toBeGreaterThan(RISK_LEVEL_THRESHOLDS.C);
    expect(RISK_LEVEL_THRESHOLDS.C).toBeGreaterThan(RISK_LEVEL_THRESHOLDS.D);
  });
});

describe('RISK_LEVEL_COLORS', () => {
  it('provides color objects for every risk level', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      const colors = RISK_LEVEL_COLORS[level];
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('bgLight');
      expect(colors).toHaveProperty('bgMuted');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textLight');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('ring');
    }
  });

  it('uses risk-level-specific Tailwind classes', () => {
    expect(RISK_LEVEL_COLORS.A.bg).toBe('bg-risk-a');
    expect(RISK_LEVEL_COLORS.B.text).toBe('text-risk-b');
    expect(RISK_LEVEL_COLORS.C.border).toBe('border-risk-c/30');
    expect(RISK_LEVEL_COLORS.D.ring).toBe('ring-risk-d');
  });
});

describe('RISK_LEVEL_BADGE_VARIANTS', () => {
  it('maps each level to the correct badge variant string', () => {
    expect(RISK_LEVEL_BADGE_VARIANTS.A).toBe('risk-a');
    expect(RISK_LEVEL_BADGE_VARIANTS.B).toBe('risk-b');
    expect(RISK_LEVEL_BADGE_VARIANTS.C).toBe('risk-c');
    expect(RISK_LEVEL_BADGE_VARIANTS.D).toBe('risk-d');
  });
});

describe('RISK_LEVEL_LABELS', () => {
  it('maps each level to a Spanish label', () => {
    expect(RISK_LEVEL_LABELS.A).toBe('Excelente');
    expect(RISK_LEVEL_LABELS.B).toBe('Bueno');
    expect(RISK_LEVEL_LABELS.C).toBe('Regular');
    expect(RISK_LEVEL_LABELS.D).toBe('Riesgoso');
  });
});

describe('RISK_LEVEL_DESCRIPTIONS', () => {
  it('provides a non-empty description for every level', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      expect(RISK_LEVEL_DESCRIPTIONS[level]).toBeDefined();
      expect(RISK_LEVEL_DESCRIPTIONS[level].length).toBeGreaterThan(0);
    }
  });
});

describe('RISK_LEVEL_RECOMMENDATIONS', () => {
  it('provides a non-empty recommendation for every level', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      expect(RISK_LEVEL_RECOMMENDATIONS[level]).toBeDefined();
      expect(RISK_LEVEL_RECOMMENDATIONS[level].length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// getScoreLevel
// =============================================================================

describe('getScoreLevel', () => {
  it('returns A for scores >= 85', () => {
    expect(getScoreLevel(85)).toBe('A');
    expect(getScoreLevel(90)).toBe('A');
    expect(getScoreLevel(100)).toBe('A');
  });

  it('returns B for scores >= 70 and < 85', () => {
    expect(getScoreLevel(70)).toBe('B');
    expect(getScoreLevel(75)).toBe('B');
    expect(getScoreLevel(84)).toBe('B');
  });

  it('returns C for scores >= 50 and < 70', () => {
    expect(getScoreLevel(50)).toBe('C');
    expect(getScoreLevel(60)).toBe('C');
    expect(getScoreLevel(69)).toBe('C');
  });

  it('returns D for scores < 50', () => {
    expect(getScoreLevel(49)).toBe('D');
    expect(getScoreLevel(25)).toBe('D');
    expect(getScoreLevel(0)).toBe('D');
  });

  it('handles exact boundary values correctly', () => {
    expect(getScoreLevel(85)).toBe('A');
    expect(getScoreLevel(84)).toBe('B');
    expect(getScoreLevel(70)).toBe('B');
    expect(getScoreLevel(69)).toBe('C');
    expect(getScoreLevel(50)).toBe('C');
    expect(getScoreLevel(49)).toBe('D');
  });

  it('handles extreme values', () => {
    expect(getScoreLevel(1000)).toBe('A');
    expect(getScoreLevel(-10)).toBe('D');
  });
});

// =============================================================================
// getRiskColors
// =============================================================================

describe('getRiskColors', () => {
  it('returns the color object for the given level', () => {
    expect(getRiskColors('A')).toBe(RISK_LEVEL_COLORS.A);
    expect(getRiskColors('B')).toBe(RISK_LEVEL_COLORS.B);
    expect(getRiskColors('C')).toBe(RISK_LEVEL_COLORS.C);
    expect(getRiskColors('D')).toBe(RISK_LEVEL_COLORS.D);
  });

  it('returns an object with all expected color keys', () => {
    const colors = getRiskColors('A');
    expect(Object.keys(colors)).toEqual(
      expect.arrayContaining(['bg', 'bgLight', 'bgMuted', 'text', 'textLight', 'border', 'ring'])
    );
  });
});

// =============================================================================
// getBadgeVariant
// =============================================================================

describe('getBadgeVariant', () => {
  it('returns the correct variant string for each level', () => {
    expect(getBadgeVariant('A')).toBe('risk-a');
    expect(getBadgeVariant('B')).toBe('risk-b');
    expect(getBadgeVariant('C')).toBe('risk-c');
    expect(getBadgeVariant('D')).toBe('risk-d');
  });
});

// =============================================================================
// getRiskLabel
// =============================================================================

describe('getRiskLabel', () => {
  it('returns the correct Spanish label for each level', () => {
    expect(getRiskLabel('A')).toBe('Excelente');
    expect(getRiskLabel('B')).toBe('Bueno');
    expect(getRiskLabel('C')).toBe('Regular');
    expect(getRiskLabel('D')).toBe('Riesgoso');
  });
});

// =============================================================================
// getRiskDescription
// =============================================================================

describe('getRiskDescription', () => {
  it('returns a description string for each level', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      const desc = getRiskDescription(level);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    }
  });

  it('returns the exact description from the constant map', () => {
    expect(getRiskDescription('A')).toBe(RISK_LEVEL_DESCRIPTIONS.A);
    expect(getRiskDescription('D')).toBe(RISK_LEVEL_DESCRIPTIONS.D);
  });
});

// =============================================================================
// getRiskRecommendation
// =============================================================================

describe('getRiskRecommendation', () => {
  it('returns a recommendation string for each level', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      const rec = getRiskRecommendation(level);
      expect(typeof rec).toBe('string');
      expect(rec.length).toBeGreaterThan(0);
    }
  });

  it('returns the exact recommendation from the constant map', () => {
    expect(getRiskRecommendation('A')).toBe(RISK_LEVEL_RECOMMENDATIONS.A);
    expect(getRiskRecommendation('D')).toBe(RISK_LEVEL_RECOMMENDATIONS.D);
  });
});

// =============================================================================
// isSafeRiskLevel
// =============================================================================

describe('isSafeRiskLevel', () => {
  it('returns true for level A', () => {
    expect(isSafeRiskLevel('A')).toBe(true);
  });

  it('returns true for level B', () => {
    expect(isSafeRiskLevel('B')).toBe(true);
  });

  it('returns false for level C', () => {
    expect(isSafeRiskLevel('C')).toBe(false);
  });

  it('returns false for level D', () => {
    expect(isSafeRiskLevel('D')).toBe(false);
  });
});

// =============================================================================
// requiresAttention
// =============================================================================

describe('requiresAttention', () => {
  it('returns false for level A', () => {
    expect(requiresAttention('A')).toBe(false);
  });

  it('returns false for level B', () => {
    expect(requiresAttention('B')).toBe(false);
  });

  it('returns true for level C', () => {
    expect(requiresAttention('C')).toBe(true);
  });

  it('returns true for level D', () => {
    expect(requiresAttention('D')).toBe(true);
  });

  it('is the logical inverse of isSafeRiskLevel for all levels', () => {
    const levels = ['A', 'B', 'C', 'D'] as const;
    for (const level of levels) {
      expect(requiresAttention(level)).toBe(!isSafeRiskLevel(level));
    }
  });
});

// =============================================================================
// getSeverityIndicator
// =============================================================================

describe('getSeverityIndicator', () => {
  it('returns correct indicator for low severity', () => {
    const indicator = getSeverityIndicator('low');
    expect(indicator).toEqual({ label: 'Menor', color: 'text-muted-foreground' });
  });

  it('returns correct indicator for medium severity', () => {
    const indicator = getSeverityIndicator('medium');
    expect(indicator).toEqual({ label: 'Moderado', color: 'text-amber-600' });
  });

  it('returns correct indicator for high severity', () => {
    const indicator = getSeverityIndicator('high');
    expect(indicator).toEqual({ label: 'Importante', color: 'text-red-600' });
  });

  it('returns objects with label and color properties for all severities', () => {
    const severities = ['low', 'medium', 'high'] as const;
    for (const sev of severities) {
      const indicator = getSeverityIndicator(sev);
      expect(indicator).toHaveProperty('label');
      expect(indicator).toHaveProperty('color');
      expect(typeof indicator.label).toBe('string');
      expect(typeof indicator.color).toBe('string');
    }
  });
});
