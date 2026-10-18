import { describe, expect, it } from 'vitest';

import { titularDelPago } from './titular-del-pago';

const ERIKA = { id: 'i-erika', nombreTitular: 'Erika Andrea Agudelo Atehortua' };

describe('titularDelPago (PROP-3)', () => {
  it('🔴 cuenta de otra persona sin nombre: no la presenta como de la propietaria', () => {
    const t = titularDelPago(ERIKA, [
      { itemId: 'i-erika', propietarioNombre: 'Erika Andrea Agudelo Atehortua', tipoDocumento: 'CC', documento: '21436689', nombreDelTitular: null },
    ]);
    expect(t).toEqual({
      titular: 'Cuenta de otra persona',
      detalle: 'Para Erika Andrea Agudelo Atehortua · no tenemos el nombre del titular, sólo su documento',
      deOtraPersona: true,
    });
  });

  it('cuenta de otra persona con nombre: el titular y para quién es la plata', () => {
    const t = titularDelPago({ id: 'i-1', nombreTitular: 'MARLENY ATEHORTUA' }, [
      { itemId: 'i-1', propietarioNombre: 'Erika', tipoDocumento: 'CC', documento: '21436689', nombreDelTitular: 'MARLENY ATEHORTUA' },
    ]);
    expect(t.titular).toBe('MARLENY ATEHORTUA');
    expect(t.detalle).toBe('Cuenta de otra persona · para Erika');
  });

  it('la cuenta del propietario (o un back anterior) sale como siempre', () => {
    expect(titularDelPago(ERIKA, [])).toEqual({ titular: ERIKA.nombreTitular, detalle: null, deOtraPersona: false });
    expect(titularDelPago(ERIKA, undefined).detalle).toBeNull();
  });
});
