/**
 * config.test.ts — the mock-mode guard.
 *
 * Regla del producto: el simulado NUNCA corre en producción (los datos inventados
 * no llegan a un usuario real) y fuera de producción es **opt-in explícito**.
 *
 * El test que muerde es el de la variable sin poner: mientras el default fue
 * `!== 'false'`, desarrollo y staging servían datos inventados sin avisar, y quien
 * probaba ahí creía estar mirando los suyos. Si alguien vuelve a dar vuelta el
 * default, este archivo se pone rojo.
 *
 * Es la guarda de la que cuelgan los hooks de mantenimiento (gatean por getApiConfig).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { getApiConfig, isMockMode } from './config';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API;

function setEnv(nodeEnv: string | undefined, useMock: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (useMock === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK_API;
  else process.env.NEXT_PUBLIC_USE_MOCK_API = useMock;
}

afterEach(() => {
  setEnv(ORIGINAL_NODE_ENV, ORIGINAL_USE_MOCK);
});

describe('getApiConfig — mock-mode guard', () => {
  it('forces mock OFF in production even when the flag is unset', () => {
    setEnv('production', undefined);
    expect(getApiConfig().useMockApi).toBe(false);
    expect(isMockMode()).toBe(false);
  });

  it('forces mock OFF in production even when the flag says "true"', () => {
    setEnv('production', 'true');
    expect(getApiConfig().useMockApi).toBe(false);
  });

  // 🔴 El que muerde: sin la variable puesta, datos REALES.
  it('sirve datos reales fuera de producción cuando la variable no está puesta', () => {
    setEnv('development', undefined);
    expect(getApiConfig().useMockApi).toBe(false);
    expect(isMockMode()).toBe(false);
  });

  it('lo mismo en staging: sin variable, nada de simulado', () => {
    setEnv('staging', undefined);
    expect(getApiConfig().useMockApi).toBe(false);
  });

  it('el simulado es opt-in explícito con "true"', () => {
    setEnv('development', 'true');
    expect(getApiConfig().useMockApi).toBe(true);
    expect(isMockMode()).toBe(true);
  });

  // Sólo "true" prende el simulado: ningún otro valor cuenta como opt-in.
  it.each(['false', 'False', '1', 'yes', ''])(
    'no prende el simulado con el valor %o',
    (valor) => {
      setEnv('development', valor);
      expect(getApiConfig().useMockApi).toBe(false);
    },
  );
});
