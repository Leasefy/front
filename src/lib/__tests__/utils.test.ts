import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('passes through a single class', () => {
    expect(cn('px-4')).toBe('px-4');
  });

  it('merges multiple classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes with clsx', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });

  it('supports object syntax from clsx', () => {
    expect(cn('base', { hidden: true, flex: false })).toBe('base hidden');
  });

  it('supports array syntax from clsx', () => {
    expect(cn(['px-2', 'py-2'])).toBe('px-2 py-2');
  });

  describe('tailwind-merge behavior', () => {
    it('resolves conflicting padding classes (last wins)', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('resolves conflicting margin classes', () => {
      expect(cn('mt-2', 'mt-4')).toBe('mt-4');
    });

    it('resolves conflicting text color classes', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('resolves conflicting background color classes', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('keeps non-conflicting classes from both inputs', () => {
      expect(cn('px-2 py-4', 'px-4 font-bold')).toBe('py-4 px-4 font-bold');
    });

    it('resolves conflicting display classes', () => {
      expect(cn('block', 'flex')).toBe('flex');
    });

    it('resolves conflicting rounded classes', () => {
      expect(cn('rounded-sm', 'rounded-lg')).toBe('rounded-lg');
    });
  });

  describe('real-world patterns', () => {
    it('merges base styles with conditional variant', () => {
      const isActive = true;
      const result = cn(
        'px-4 py-2 rounded-md text-sm',
        isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
      );
      expect(result).toBe('px-4 py-2 rounded-md text-sm bg-blue-500 text-white');
    });

    it('overrides base styles with variant overrides', () => {
      const result = cn(
        'px-4 py-2 bg-gray-100',
        'bg-blue-500'
      );
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('handles className prop pattern', () => {
      const baseClasses = 'flex items-center gap-2';
      const className = 'gap-4 justify-end';
      const result = cn(baseClasses, className);
      expect(result).toBe('flex items-center gap-4 justify-end');
    });
  });
});
