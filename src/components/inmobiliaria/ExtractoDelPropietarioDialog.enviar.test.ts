import { describe, expect, it } from 'vitest';

import { sePuedeEnviarElExtracto } from './ExtractoDelPropietarioDialog';

describe('sePuedeEnviarElExtracto (PROP-2)', () => {
  it('un extracto vacío (el mes que liquidó el sistema anterior) no se envía', () => {
    expect(sePuedeEnviarElExtracto(true, { lineItems: [] })).toBe(false);
    expect(sePuedeEnviarElExtracto(undefined, { lineItems: [] })).toBe(false);
  });

  it('con propiedades se envía, salvo que quien mira no pueda mandarlo', () => {
    expect(sePuedeEnviarElExtracto(true, { lineItems: [{}] })).toBe(true);
    expect(sePuedeEnviarElExtracto(undefined, { lineItems: [{}] })).toBe(true);
    expect(sePuedeEnviarElExtracto(false, { lineItems: [{}] })).toBe(false);
  });

  it('sin extracto, no', () => {
    expect(sePuedeEnviarElExtracto(true, null)).toBe(false);
  });
});
