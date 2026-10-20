import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CODIGO_DEL_MOCK,
  MENSAJE_SIN_SECRETO_DEL_MOCK,
  clavePorFactor,
  guardarSecretoDelMock,
  leerSecretoDelMock,
  resolverCodigoDelMock,
  userIdDelToken,
} from './mock-del-segundo-factor';
import { codigoTotp } from './totp';

const CLAVE = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const AHORA = 1234567890 * 1000; // TOTP de 6 dígitos: 005924

function tokenCon(sub: string): string {
  const cuerpo = btoa(JSON.stringify({ sub })).replace(/=+$/, '');
  return `cabecera.${cuerpo}.firma`;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('almacenamiento del secreto', () => {
  it('la clave lleva usuario y factor', () => {
    expect(clavePorFactor('u1', 'f1')).toBe('leasefy:mfa-mock:u1:f1');
  });

  it('guarda y lee por usuario y factor', () => {
    guardarSecretoDelMock('u1', 'f1', CLAVE);
    expect(leerSecretoDelMock('u1', 'f1')).toBe(CLAVE);
    expect(leerSecretoDelMock('u1', 'f2')).toBeNull();
    expect(leerSecretoDelMock('u2', 'f1')).toBeNull();
  });

  it('sin usuario no hay secreto', () => {
    expect(leerSecretoDelMock(null, 'f1')).toBeNull();
  });

  it('un localStorage que lanza no rompe nada', () => {
    const espia = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(leerSecretoDelMock('u1', 'f1')).toBeNull();
    espia.mockRestore();
  });
});

describe('userIdDelToken', () => {
  it('lee el sub', () => {
    expect(userIdDelToken(tokenCon('abc'))).toBe('abc');
  });
  it('token ausente o roto da null', () => {
    expect(userIdDelToken(null)).toBeNull();
    expect(userIdDelToken('basura')).toBeNull();
  });
});

describe('resolverCodigoDelMock', () => {
  it('123456 con secreto guardado se cambia por el código real', async () => {
    guardarSecretoDelMock('u1', 'f1', CLAVE);
    const r = await resolverCodigoDelMock({ codigo: CODIGO_DEL_MOCK, userId: 'u1', factorId: 'f1', ahoraMs: AHORA });
    expect(r).toEqual({ ok: true, codigo: await codigoTotp(CLAVE, AHORA), sustituido: true });
    expect(r.ok && r.codigo).toBe('005924');
  });

  it('123456 sin secreto para ese factor dice por qué', async () => {
    guardarSecretoDelMock('u1', 'otro', CLAVE);
    const r = await resolverCodigoDelMock({ codigo: CODIGO_DEL_MOCK, userId: 'u1', factorId: 'f1' });
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK });
  });

  it('cualquier otro código pasa tal cual', async () => {
    guardarSecretoDelMock('u1', 'f1', CLAVE);
    const r = await resolverCodigoDelMock({ codigo: '654321', userId: 'u1', factorId: 'f1' });
    expect(r).toEqual({ ok: true, codigo: '654321', sustituido: false });
  });

  it.each([undefined, '', 'production', 'preview'])(
    'con la variable %j (producción) 123456 no tiene trato especial',
    async (valor) => {
      vi.stubEnv('NEXT_PUBLIC_APP_ENV', valor as string);
      guardarSecretoDelMock('u1', 'f1', CLAVE);
      const r = await resolverCodigoDelMock({ codigo: CODIGO_DEL_MOCK, userId: 'u1', factorId: 'f1' });
      expect(r).toEqual({ ok: true, codigo: CODIGO_DEL_MOCK, sustituido: false });
    },
  );

  it('con un secreto corrupto no revienta: dice que no hay mock', async () => {
    guardarSecretoDelMock('u1', 'f1', '1-no-es-base32');
    const r = await resolverCodigoDelMock({ codigo: CODIGO_DEL_MOCK, userId: 'u1', factorId: 'f1' });
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK });
  });
});
