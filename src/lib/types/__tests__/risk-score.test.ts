import { describe, it, expect } from 'vitest';
import {
  RISK_LEVELS,
  scoreToLevel,
  getRiskLevelInfo,
  getRiskBadgeVariant,
} from '@/lib/types/risk-score';
import type { RiskLevel } from '@/lib/types/risk-score';

// =============================================================================
// RISK_LEVELS constant
// =============================================================================

describe('RISK_LEVELS', () => {
  it('contains entries for all four risk levels', () => {
    expect(RISK_LEVELS).toHaveProperty('A');
    expect(RISK_LEVELS).toHaveProperty('B');
    expect(RISK_LEVELS).toHaveProperty('C');
    expect(RISK_LEVELS).toHaveProperty('D');
  });

  it('has the correct label for each level', () => {
    expect(RISK_LEVELS.A.label).toBe('Excelente');
    expect(RISK_LEVELS.B.label).toBe('Bueno');
    expect(RISK_LEVELS.C.label).toBe('Regular');
    expect(RISK_LEVELS.D.label).toBe('Riesgoso');
  });

  it('has the correct color for each level', () => {
    expect(RISK_LEVELS.A.color).toBe('emerald');
    expect(RISK_LEVELS.B.color).toBe('blue');
    expect(RISK_LEVELS.C.color).toBe('amber');
    expect(RISK_LEVELS.D.color).toBe('red');
  });

  it('has the correct badgeVariant for each level', () => {
    expect(RISK_LEVELS.A.badgeVariant).toBe('risk-a');
    expect(RISK_LEVELS.B.badgeVariant).toBe('risk-b');
    expect(RISK_LEVELS.C.badgeVariant).toBe('risk-c');
    expect(RISK_LEVELS.D.badgeVariant).toBe('risk-d');
  });

  it('has the correct minScore for each level', () => {
    expect(RISK_LEVELS.A.minScore).toBe(85);
    expect(RISK_LEVELS.B.minScore).toBe(70);
    expect(RISK_LEVELS.C.minScore).toBe(50);
    expect(RISK_LEVELS.D.minScore).toBe(0);
  });

  it('has minScores in descending order', () => {
    expect(RISK_LEVELS.A.minScore).toBeGreaterThan(RISK_LEVELS.B.minScore);
    expect(RISK_LEVELS.B.minScore).toBeGreaterThan(RISK_LEVELS.C.minScore);
    expect(RISK_LEVELS.C.minScore).toBeGreaterThan(RISK_LEVELS.D.minScore);
  });

  it('provides a non-empty description for each level', () => {
    const levels: RiskLevel[] = ['A', 'B', 'C', 'D'];
    for (const level of levels) {
      expect(RISK_LEVELS[level].description).toBeDefined();
      expect(RISK_LEVELS[level].description.length).toBeGreaterThan(0);
    }
  });

  it('each entry has all required properties', () => {
    const levels: RiskLevel[] = ['A', 'B', 'C', 'D'];
    const requiredKeys = ['label', 'description', 'color', 'badgeVariant', 'minScore'];
    for (const level of levels) {
      for (const key of requiredKeys) {
        expect(RISK_LEVELS[level]).toHaveProperty(key);
      }
    }
  });
});

// =============================================================================
// scoreToLevel
// =============================================================================

describe('scoreToLevel', () => {
  it('returns A for scores >= 85', () => {
    expect(scoreToLevel(85)).toBe('A');
    expect(scoreToLevel(90)).toBe('A');
    expect(scoreToLevel(100)).toBe('A');
  });

  it('returns B for scores >= 70 and < 85', () => {
    expect(scoreToLevel(70)).toBe('B');
    expect(scoreToLevel(75)).toBe('B');
    expect(scoreToLevel(84)).toBe('B');
  });

  it('returns C for scores >= 50 and < 70', () => {
    expect(scoreToLevel(50)).toBe('C');
    expect(scoreToLevel(60)).toBe('C');
    expect(scoreToLevel(69)).toBe('C');
  });

  it('returns D for scores < 50', () => {
    expect(scoreToLevel(49)).toBe('D');
    expect(scoreToLevel(25)).toBe('D');
    expect(scoreToLevel(0)).toBe('D');
  });

  it('handles exact boundary values', () => {
    expect(scoreToLevel(85)).toBe('A');
    expect(scoreToLevel(84)).toBe('B');
    expect(scoreToLevel(70)).toBe('B');
    expect(scoreToLevel(69)).toBe('C');
    expect(scoreToLevel(50)).toBe('C');
    expect(scoreToLevel(49)).toBe('D');
  });

  it('handles extreme values', () => {
    expect(scoreToLevel(999)).toBe('A');
    expect(scoreToLevel(-50)).toBe('D');
  });

  it('produces the same result as comparing against RISK_LEVELS.minScore', () => {
    const testScores = [0, 25, 49, 50, 69, 70, 84, 85, 100];
    for (const score of testScores) {
      const level = scoreToLevel(score);
      expect(score).toBeGreaterThanOrEqual(RISK_LEVELS[level].minScore);
    }
  });
});

// =============================================================================
// getRiskLevelInfo
// =============================================================================

describe('getRiskLevelInfo', () => {
  it('returns the full metadata object for each level', () => {
    expect(getRiskLevelInfo('A')).toBe(RISK_LEVELS.A);
    expect(getRiskLevelInfo('B')).toBe(RISK_LEVELS.B);
    expect(getRiskLevelInfo('C')).toBe(RISK_LEVELS.C);
    expect(getRiskLevelInfo('D')).toBe(RISK_LEVELS.D);
  });

  it('returned object contains label, description, color, badgeVariant, and minScore', () => {
    const info = getRiskLevelInfo('A');
    expect(info).toEqual({
      label: 'Excelente',
      description: expect.any(String),
      color: 'emerald',
      badgeVariant: 'risk-a',
      minScore: 85,
    });
  });

  it('returns distinct objects for each level', () => {
    const infoA = getRiskLevelInfo('A');
    const infoD = getRiskLevelInfo('D');
    expect(infoA).not.toBe(infoD);
    expect(infoA.label).not.toBe(infoD.label);
    expect(infoA.color).not.toBe(infoD.color);
  });
});

// =============================================================================
// getRiskBadgeVariant
// =============================================================================

describe('getRiskBadgeVariant', () => {
  it('returns the correct badge variant string for each level', () => {
    expect(getRiskBadgeVariant('A')).toBe('risk-a');
    expect(getRiskBadgeVariant('B')).toBe('risk-b');
    expect(getRiskBadgeVariant('C')).toBe('risk-c');
    expect(getRiskBadgeVariant('D')).toBe('risk-d');
  });

  it('matches the badgeVariant property from getRiskLevelInfo', () => {
    const levels: RiskLevel[] = ['A', 'B', 'C', 'D'];
    for (const level of levels) {
      expect(getRiskBadgeVariant(level)).toBe(getRiskLevelInfo(level).badgeVariant);
    }
  });

  it('returns a string that starts with "risk-"', () => {
    const levels: RiskLevel[] = ['A', 'B', 'C', 'D'];
    for (const level of levels) {
      expect(getRiskBadgeVariant(level)).toMatch(/^risk-[a-d]$/);
    }
  });
});
