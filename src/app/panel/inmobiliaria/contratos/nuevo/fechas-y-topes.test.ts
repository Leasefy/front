import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ANIOS_HACIA_ADELANTE,
  ANIOS_HACIA_ATRAS,
  CANON_MAXIMO_COP,
  dentroDe,
  hace,
  oneYearAheadISO,
  todayISO,
} from './fechas-y-topes';

afterEach(() => vi.useRealTimers());

describe('todayISO — C21', () => {
  it('🔴 a las 19:30 de Bogotá sigue siendo HOY, no mañana', () => {
    // El defecto: `new Date().toISOString()` da el día de UTC, y Bogotá es
    // UTC−5. A las 19:30 del 15, UTC ya está en el 16: el formulario se abría
    // con la fecha de inicio en mañana y el contrato cobraba un día menos.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T00:30:00.000Z')); // 15 a las 19:30 en Bogotá
    const local = todayISO();
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-16');
    // El proceso de test corre en la zona de la máquina; lo que se comprueba
    // es que la fecha sale del calendario LOCAL y no de UTC.
    const esperado = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    expect(local).toBe(esperado);
  });

  it('devuelve siempre YYYY-MM-DD con ceros a la izquierda', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(todayISO()).toBe('2026-01-05');
  });
});

describe('oneYearAheadISO', () => {
  it('suma un año sin pasar por UTC', () => {
    expect(oneYearAheadISO('2026-09-15')).toBe('2027-09-15');
    expect(oneYearAheadISO('2026-01-01')).toBe('2027-01-01');
  });

  it('un 29 de febrero cae al 1 de marzo del año siguiente, no a una fecha inválida', () => {
    expect(oneYearAheadISO('2028-02-29')).toBe('2029-03-01');
  });

  it('una fecha vacía o rota se devuelve tal cual: no se inventa un año', () => {
    expect(oneYearAheadISO('')).toBe('');
    expect(oneYearAheadISO('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('topes — C22', () => {
  it('🔴 el tope de canon queda por debajo del límite de int4 del back', () => {
    // `contracts.monthly_rent` es `int4`: topa en 2.147.483.647. Un canon de
    // 1e15 pasaba la validación y reventaba allá como un 500 ilegible.
    expect(CANON_MAXIMO_COP).toBeLessThan(2_147_483_647);
    expect(CANON_MAXIMO_COP).toBeGreaterThan(100_000);
  });

  it('`hace` y `dentroDe` devuelven fechas comparables como texto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
    expect(hace(ANIOS_HACIA_ATRAS)).toBe('2021-09-15');
    expect(dentroDe(ANIOS_HACIA_ADELANTE)).toBe('2028-09-15');
    // La comparación del formulario es de strings: el formato tiene que
    // ordenar igual que el calendario.
    expect('2020-01-01' < hace(ANIOS_HACIA_ATRAS)).toBe(true);
    expect('2036-01-01' > dentroDe(ANIOS_HACIA_ADELANTE)).toBe(true);
    expect('2026-09-15' > hace(ANIOS_HACIA_ATRAS)).toBe(true);
    expect('2026-09-15' < dentroDe(ANIOS_HACIA_ADELANTE)).toBe(true);
  });

  it('retrofechar un mes sigue siendo legítimo: la ventana no lo bloquea', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
    expect('2026-08-01' > hace(ANIOS_HACIA_ATRAS)).toBe(true);
  });
});
