import { describe, it, expect } from 'vitest';
import { periodosEnPalabras } from './periodo-en-palabras';

describe('periodosEnPalabras (IN-06)', () => {
  it('«Cobro de 2026-07» → «Cobro de julio de 2026»', () => {
    expect(periodosEnPalabras('Cobro de 2026-07')).toBe('Cobro de julio de 2026');
    expect(periodosEnPalabras('Cobros 2026-06 y 2026-12')).toBe('Cobros junio de 2026 y diciembre de 2026');
  });
  it('no toca fechas completas, números largos ni meses imposibles', () => {
    expect(periodosEnPalabras('Pagó el 2026-07-15')).toBe('Pagó el 2026-07-15');
    expect(periodosEnPalabras('Ref 12026-07')).toBe('Ref 12026-07');
    expect(periodosEnPalabras('Lote 2026-13')).toBe('Lote 2026-13');
    expect(periodosEnPalabras('Contrato firmado')).toBe('Contrato firmado');
  });
});
