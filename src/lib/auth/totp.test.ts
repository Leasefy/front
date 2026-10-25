import { describe, expect, it } from 'vitest';

import { codigoHotp, codigoTotp, decodificarBase32 } from './totp';

// RFC 4226 / RFC 6238: la clave de prueba es el ASCII «12345678901234567890».
const CLAVE_DEL_RFC = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('decodificarBase32', () => {
  it('decodifica la clave de los vectores del RFC', () => {
    expect(new TextDecoder().decode(decodificarBase32(CLAVE_DEL_RFC))).toBe('12345678901234567890');
  });

  it('vectores de RFC 4648', () => {
    const texto = (s: string) => new TextDecoder().decode(decodificarBase32(s));
    expect(texto('MY======')).toBe('f');
    expect(texto('MZXQ====')).toBe('fo');
    expect(texto('MZXW6===')).toBe('foo');
    expect(texto('MZXW6YQ=')).toBe('foob');
    expect(texto('MZXW6YTB')).toBe('fooba');
    expect(texto('MZXW6YTBOI======')).toBe('foobar');
  });

  it('ignora espacios, minúsculas y relleno', () => {
    expect(new TextDecoder().decode(decodificarBase32('mzxw 6ytb oi'))).toBe('foobar');
  });

  it('rechaza caracteres fuera del alfabeto', () => {
    expect(() => decodificarBase32('MZXW1')).toThrow();
  });
});

describe('codigoHotp (RFC 4226, apéndice D)', () => {
  const esperados = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  it.each(esperados.map((codigo, contador) => [contador, codigo] as const))(
    'contador %i da %s',
    async (contador, codigo) => {
      expect(await codigoHotp(decodificarBase32(CLAVE_DEL_RFC), contador)).toBe(codigo);
    },
  );
});

describe('codigoTotp (RFC 6238, apéndice B, SHA-1)', () => {
  // El RFC publica 8 dígitos; los 6 son los últimos seis.
  const vectores: Array<[number, string, string]> = [
    [59, '94287082', '287082'],
    [1111111109, '07081804', '081804'],
    [1111111111, '14050471', '050471'],
    [1234567890, '89005924', '005924'],
    [2000000000, '69279037', '279037'],
    [20000000000, '65353130', '353130'],
  ];
  it.each(vectores)('a los %i s', async (segundos, ocho, seis) => {
    expect(await codigoTotp(CLAVE_DEL_RFC, segundos * 1000)).toBe(seis);
    expect(await codigoTotp(CLAVE_DEL_RFC, segundos * 1000, { digitos: 8 })).toBe(ocho);
  });

  it('conserva los ceros a la izquierda', async () => {
    expect(await codigoTotp(CLAVE_DEL_RFC, 1234567890 * 1000)).toBe('005924');
  });

  it('el código no cambia dentro de la misma ventana de 30 s', async () => {
    const a = await codigoTotp(CLAVE_DEL_RFC, 60_000);
    const b = await codigoTotp(CLAVE_DEL_RFC, 89_999);
    const c = await codigoTotp(CLAVE_DEL_RFC, 90_000);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
