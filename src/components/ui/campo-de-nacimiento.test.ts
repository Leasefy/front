import { describe, expect, it } from 'vitest';

import { fechaDeLasPartes, partesDeLaFecha } from './campo-de-nacimiento';

describe('CampoDeNacimiento — de DD / MM / AAAA a AAAA-MM-DD', () => {
  it('una fecha completa y real sale en AAAA-MM-DD, con ceros', () => {
    expect(fechaDeLasPartes({ day: '5', month: '3', year: '1988' })).toBe('1988-03-05');
    expect(fechaDeLasPartes({ day: '29', month: '02', year: '2000' })).toBe('2000-02-29');
  });

  it('a medias o un día que no existe: vacío (nunca otra fecha)', () => {
    expect(fechaDeLasPartes({ day: '31', month: '02', year: '1990' })).toBe('');
    expect(fechaDeLasPartes({ day: '29', month: '02', year: '1900' })).toBe('');
    expect(fechaDeLasPartes({ day: '12', month: '05', year: '19' })).toBe('');
    expect(fechaDeLasPartes({ day: '', month: '05', year: '1990' })).toBe('');
  });

  it('lee lo guardado (también con hora) y lo vacío', () => {
    expect(partesDeLaFecha('1988-03-05')).toEqual({ day: '05', month: '03', year: '1988' });
    expect(partesDeLaFecha('1988-03-05T00:00:00.000Z')).toEqual({ day: '05', month: '03', year: '1988' });
    expect(partesDeLaFecha('')).toEqual({ day: '', month: '', year: '' });
    expect(partesDeLaFecha(null)).toEqual({ day: '', month: '', year: '' });
  });
});
