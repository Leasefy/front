import { describe, it, expect } from 'vitest';
import { isLowerTierChange } from './plan-change-confirm';

describe('isLowerTierChange', () => {
  it('is true when the target level is below the current level', () => {
    expect(isLowerTierChange(2, 1)).toBe(true);
  });

  it('is false when the target level is above the current level (an upgrade)', () => {
    expect(isLowerTierChange(1, 2)).toBe(false);
  });

  it('is false for a same-level selection', () => {
    expect(isLowerTierChange(1, 1)).toBe(false);
  });

  it('is false when the current level is off-ladder (null)', () => {
    expect(isLowerTierChange(null, 1)).toBe(false);
  });

  it('is false when the target level is off-ladder (null)', () => {
    expect(isLowerTierChange(2, null)).toBe(false);
  });

  it('is false when either level is undefined (catalog not resolved yet)', () => {
    expect(isLowerTierChange(undefined, 1)).toBe(false);
    expect(isLowerTierChange(2, undefined)).toBe(false);
  });
});
