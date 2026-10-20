import { afterEach, describe, expect, it, vi } from 'vitest';

import { esProduccion, mockDeSegundoFactorHabilitado } from './entorno';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('esProduccion', () => {
  it.each(['development', 'staging'])('%s no es producción', (valor) => {
    expect(esProduccion({ entorno: valor, hostname: 'localhost' })).toBe(false);
  });

  it.each([undefined, '', ' ', 'production', 'prod', 'Development', 'STAGING', 'development ', 'test'])(
    'falla cerrado con %j',
    (valor) => {
      expect(esProduccion({ entorno: valor, hostname: 'localhost' })).toBe(true);
    },
  );

  it.each(['leasefy.co', 'app.leasefy.co', 'api.leasefy.co', 'APP.Leasefy.CO'])(
    'el dominio %s es producción aunque el entorno diga development',
    (hostname) => {
      expect(esProduccion({ entorno: 'development', hostname })).toBe(true);
    },
  );

  it.each(['notleasefy.co', 'leasefy.co.evil.com', 'staging.leasefy.dev', 'localhost'])(
    'el dominio %s no se confunde con producción',
    (hostname) => {
      expect(esProduccion({ entorno: 'staging', hostname })).toBe(false);
    },
  );

  it('sin hostname (servidor) decide sólo el entorno', () => {
    expect(esProduccion({ entorno: 'staging', hostname: undefined })).toBe(false);
    expect(esProduccion({ entorno: undefined, hostname: undefined })).toBe(true);
  });
});

describe('mockDeSegundoFactorHabilitado', () => {
  it('lee NEXT_PUBLIC_APP_ENV', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
    expect(mockDeSegundoFactorHabilitado()).toBe(true);
  });

  it('sin la variable queda apagado', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
    expect(mockDeSegundoFactorHabilitado()).toBe(false);
  });

  it('con un valor desconocido queda apagado', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'preview');
    expect(mockDeSegundoFactorHabilitado()).toBe(false);
  });
});
