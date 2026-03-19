import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatArea,
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from '@/lib/format';

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  describe('es locale (default)', () => {
    it('formats zero', () => {
      expect(formatCurrency(0)).toBe('$ 0');
    });

    it('formats thousands', () => {
      const result = formatCurrency(1000);
      // es-CL uses period as thousands separator
      expect(result).toBe('$ 1.000');
    });

    it('formats millions', () => {
      const result = formatCurrency(2500000);
      expect(result).toBe('$ 2.500.000');
    });

    it('truncates decimals', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBe('$ 1.235');
    });

    it('explicit es locale matches default', () => {
      expect(formatCurrency(2500000, 'es')).toBe(formatCurrency(2500000));
    });
  });

  describe('en locale', () => {
    it('formats zero', () => {
      expect(formatCurrency(0, 'en')).toBe('$ 0');
    });

    it('formats thousands with comma separator', () => {
      expect(formatCurrency(1000, 'en')).toBe('$ 1,000');
    });

    it('formats millions with comma separator', () => {
      expect(formatCurrency(2500000, 'en')).toBe('$ 2,500,000');
    });
  });

  it('always prefixes with "$ "', () => {
    expect(formatCurrency(42)).toMatch(/^\$ /);
    expect(formatCurrency(42, 'en')).toMatch(/^\$ /);
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  describe('es locale (default)', () => {
    it('formats small numbers unchanged', () => {
      expect(formatNumber(5)).toBe('5');
    });

    it('uses period as thousands separator', () => {
      expect(formatNumber(1000)).toBe('1.000');
    });

    it('formats large numbers', () => {
      expect(formatNumber(2500000)).toBe('2.500.000');
    });

    it('preserves decimals', () => {
      const result = formatNumber(1234.5);
      // es-CL uses comma as decimal separator
      expect(result).toBe('1.234,5');
    });
  });

  describe('en locale', () => {
    it('uses comma as thousands separator', () => {
      expect(formatNumber(1000, 'en')).toBe('1,000');
    });

    it('formats large numbers', () => {
      expect(formatNumber(2500000, 'en')).toBe('2,500,000');
    });

    it('uses period as decimal separator', () => {
      expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
    });
  });
});

// ---------------------------------------------------------------------------
// formatArea
// ---------------------------------------------------------------------------
describe('formatArea', () => {
  it('appends m-squared suffix', () => {
    expect(formatArea(75)).toBe('75 m\u00B2');
  });

  it('handles zero', () => {
    expect(formatArea(0)).toBe('0 m\u00B2');
  });

  it('handles decimal values', () => {
    expect(formatArea(120.5)).toBe('120.5 m\u00B2');
  });

  it('handles large values', () => {
    expect(formatArea(10000)).toBe('10000 m\u00B2');
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  // Using a fixed ISO date. toLocaleDateString output depends on Node ICU data,
  // so month names are validated with toContain rather than exact match.
  const isoDate = '2026-01-18T14:30:00Z';

  describe('es locale (default)', () => {
    it('contains the day', () => {
      expect(formatDate(isoDate)).toContain('18');
    });

    it('contains the year', () => {
      expect(formatDate(isoDate)).toContain('2026');
    });

    it('contains a short month name (ene)', () => {
      const result = formatDate(isoDate);
      expect(result.toLowerCase()).toContain('ene');
    });
  });

  describe('en locale', () => {
    it('contains the day', () => {
      expect(formatDate(isoDate, 'en')).toContain('18');
    });

    it('contains the year', () => {
      expect(formatDate(isoDate, 'en')).toContain('2026');
    });

    it('contains a short month name (Jan)', () => {
      const result = formatDate(isoDate, 'en');
      expect(result.toLowerCase()).toContain('jan');
    });
  });

  it('explicit es locale matches default', () => {
    expect(formatDate(isoDate, 'es')).toBe(formatDate(isoDate));
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe('formatDateTime', () => {
  const isoDate = '2026-01-18T14:30:00Z';

  describe('es locale (default)', () => {
    it('contains the day', () => {
      expect(formatDateTime(isoDate)).toContain('18');
    });

    it('contains the year', () => {
      expect(formatDateTime(isoDate)).toContain('2026');
    });

    it('contains a short month name', () => {
      const result = formatDateTime(isoDate).toLowerCase();
      expect(result).toContain('ene');
    });

    it('contains minute component', () => {
      // The time portion should include :30 (minutes)
      expect(formatDateTime(isoDate)).toMatch(/\d+:\d{2}/);
    });

    it('contains AM/PM indicator', () => {
      const result = formatDateTime(isoDate).toLowerCase();
      expect(result).toMatch(/a\.?\s?m\.?|p\.?\s?m\.?/);
    });
  });

  describe('en locale', () => {
    it('contains a short month name (Jan)', () => {
      const result = formatDateTime(isoDate, 'en').toLowerCase();
      expect(result).toContain('jan');
    });

    it('contains time component', () => {
      expect(formatDateTime(isoDate, 'en')).toMatch(/\d+:\d{2}/);
    });

    it('contains AM/PM indicator', () => {
      const result = formatDateTime(isoDate, 'en').toUpperCase();
      expect(result).toMatch(/AM|PM/);
    });
  });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------
describe('formatRelativeTime', () => {
  const FIXED_NOW = new Date('2026-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: create ISO string offset from FIXED_NOW by given milliseconds in the past
  function pastDate(ms: number): string {
    return new Date(FIXED_NOW.getTime() - ms).toISOString();
  }

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // ---- "now" range (< 1 minute) ----
  describe('now range (< 1 minute)', () => {
    it('returns "ahora" for es (default) when diff is 0', () => {
      expect(formatRelativeTime(FIXED_NOW.toISOString())).toBe('ahora');
    });

    it('returns "ahora" for es when diff is 30 seconds', () => {
      expect(formatRelativeTime(pastDate(30 * SECOND))).toBe('ahora');
    });

    it('returns "now" for en when diff is 0', () => {
      expect(formatRelativeTime(FIXED_NOW.toISOString(), 'en')).toBe('now');
    });
  });

  // ---- minutes range (1-59 min) ----
  describe('minutes range', () => {
    it('returns singular "minuto" / "minute"', () => {
      expect(formatRelativeTime(pastDate(1 * MINUTE))).toBe('hace 1 minuto');
      expect(formatRelativeTime(pastDate(1 * MINUTE), 'en')).toBe('1 minute ago');
    });

    it('returns plural "minutos" / "minutes"', () => {
      expect(formatRelativeTime(pastDate(5 * MINUTE))).toBe('hace 5 minutos');
      expect(formatRelativeTime(pastDate(5 * MINUTE), 'en')).toBe('5 minutes ago');
    });

    it('handles upper boundary (59 min)', () => {
      expect(formatRelativeTime(pastDate(59 * MINUTE))).toBe('hace 59 minutos');
      expect(formatRelativeTime(pastDate(59 * MINUTE), 'en')).toBe('59 minutes ago');
    });
  });

  // ---- hours range (1-23 h) ----
  describe('hours range', () => {
    it('returns singular "hora" / "hour"', () => {
      expect(formatRelativeTime(pastDate(1 * HOUR))).toBe('hace 1 hora');
      expect(formatRelativeTime(pastDate(1 * HOUR), 'en')).toBe('1 hour ago');
    });

    it('returns plural "horas" / "hours"', () => {
      expect(formatRelativeTime(pastDate(3 * HOUR))).toBe('hace 3 horas');
      expect(formatRelativeTime(pastDate(3 * HOUR), 'en')).toBe('3 hours ago');
    });

    it('handles upper boundary (23 h)', () => {
      expect(formatRelativeTime(pastDate(23 * HOUR))).toBe('hace 23 horas');
      expect(formatRelativeTime(pastDate(23 * HOUR), 'en')).toBe('23 hours ago');
    });
  });

  // ---- days range (1-6 days) ----
  describe('days range', () => {
    it('returns singular "dia" / "day"', () => {
      expect(formatRelativeTime(pastDate(1 * DAY))).toBe('hace 1 dia');
      expect(formatRelativeTime(pastDate(1 * DAY), 'en')).toBe('1 day ago');
    });

    it('returns plural "dias" / "days"', () => {
      expect(formatRelativeTime(pastDate(3 * DAY))).toBe('hace 3 dias');
      expect(formatRelativeTime(pastDate(3 * DAY), 'en')).toBe('3 days ago');
    });

    it('handles upper boundary (6 days)', () => {
      expect(formatRelativeTime(pastDate(6 * DAY))).toBe('hace 6 dias');
      expect(formatRelativeTime(pastDate(6 * DAY), 'en')).toBe('6 days ago');
    });
  });

  // ---- weeks range (7-29 days) ----
  describe('weeks range', () => {
    it('returns singular "semana" / "week"', () => {
      expect(formatRelativeTime(pastDate(7 * DAY))).toBe('hace 1 semana');
      expect(formatRelativeTime(pastDate(7 * DAY), 'en')).toBe('1 week ago');
    });

    it('returns plural "semanas" / "weeks"', () => {
      expect(formatRelativeTime(pastDate(21 * DAY))).toBe('hace 3 semanas');
      expect(formatRelativeTime(pastDate(21 * DAY), 'en')).toBe('3 weeks ago');
    });

    it('handles upper boundary (28 days = 4 weeks)', () => {
      expect(formatRelativeTime(pastDate(28 * DAY))).toBe('hace 4 semanas');
      expect(formatRelativeTime(pastDate(28 * DAY), 'en')).toBe('4 weeks ago');
    });
  });

  // ---- months range (30+ days) ----
  describe('months range', () => {
    it('returns singular "mes" / "month"', () => {
      expect(formatRelativeTime(pastDate(30 * DAY))).toBe('hace 1 mes');
      expect(formatRelativeTime(pastDate(30 * DAY), 'en')).toBe('1 month ago');
    });

    it('returns plural "meses" / "months"', () => {
      expect(formatRelativeTime(pastDate(90 * DAY))).toBe('hace 3 meses');
      expect(formatRelativeTime(pastDate(90 * DAY), 'en')).toBe('3 months ago');
    });

    it('handles large month values', () => {
      expect(formatRelativeTime(pastDate(365 * DAY))).toBe('hace 12 meses');
      expect(formatRelativeTime(pastDate(365 * DAY), 'en')).toBe('12 months ago');
    });
  });

  // ---- locale defaults ----
  describe('locale defaulting', () => {
    it('defaults to es when locale is undefined', () => {
      expect(formatRelativeTime(pastDate(5 * MINUTE))).toBe('hace 5 minutos');
    });

    it('explicit es matches default', () => {
      expect(formatRelativeTime(pastDate(5 * MINUTE), 'es')).toBe(
        formatRelativeTime(pastDate(5 * MINUTE))
      );
    });
  });
});
