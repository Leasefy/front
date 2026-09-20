import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackendContract } from '@/lib/api/contracts.types';

vi.mock('@/lib/api/client', () => ({ getAccessToken: () => 'token-1' }));

/*
 * 🔴 19-09-2026 · Por qué `matchesQuery` y `numeroQueCoincide` se importan
 * ARRIBA y no con un `await import()` dentro de cada test.
 *
 * Este archivo tumbó la suite completa tres veces el mismo día, siempre con
 * `Test timed out in 5000ms`, y siempre pasaba solo. La causa no era el
 * código que prueba: el `beforeEach` hace `vi.resetModules()` y cada test
 * volvía a importar el módulo entero —que arrastra `@phosphor-icons/react`,
 * un paquete enorme— DENTRO del reloj de 5 segundos del test. Solo tarda
 * 1,3 s; con la máquina ocupada, 5,9 s y falla.
 *
 * Los dos helpers son PUROS: no leen la URL del back ni nada del entorno, así
 * que no tienen por qué pagar un módulo fresco. El único test que sí lo
 * necesita —el que corre `contratosSource.run` con un `fetch` falso— conserva
 * su `await import()` y su `resetModules`.
 */
import { matchesQuery, numeroQueCoincide } from './contratos-source';

/**
 * 🔴 Nico, 2026-09-12: buscar «1686» (el número de SU sistema) tiene que
 * encontrar el contrato que en Leasefy es el #1839 — y el resultado tiene que
 * decir cuál de los dos números fue el que empató, rotulando el nuestro.
 */
function contrato(over: Partial<BackendContract> = {}): BackendContract {
  return {
    id: 'ct-1',
    code: 1839,
    externalId: '1686',
    status: 'ACTIVE',
    tenantName: 'Nubia Amparo David',
    tenantEmail: 'nubia@correo.co',
    tenantDocument: '43123456',
    propertyAddress: 'Cra 76 #45-12 apto 302',
    propertyCity: 'Medellín',
    monthlyRent: 1_800_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...over,
  } as BackendContract;
}

describe('contratosSource — el número que coincidió', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://back.test');
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('el de Nui encuentra el contrato y se muestra tal cual', () => {
    expect(matchesQuery(contrato(), '1686')).toBe(true);
    expect(numeroQueCoincide(contrato(), '1686')).toBe('1686');
  });

  it('el nuestro también encuentra, pero se muestra rotulado para que no se confunda', () => {
    expect(matchesQuery(contrato(), '1839')).toBe(true);
    expect(numeroQueCoincide(contrato(), '1839')).toBe('Leasefy #1839');
  });

  it('en un contrato nativo el nuestro es EL número: «#14» sin rótulo', () => {
    expect(numeroQueCoincide(contrato({ code: 14, externalId: null }), '14')).toBe('#14');
  });

  it('si lo que empató fue el nombre o la dirección, no hay número que resaltar', () => {
    expect(numeroQueCoincide(contrato(), 'nubia')).toBeNull();
    expect(numeroQueCoincide(contrato(), '')).toBeNull();
  });

  it('el resultado lleva el número que coincidió como primera insignia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [contrato(), contrato({ id: 'ct-2', code: 14, externalId: null, tenantName: 'Otro' })],
      })),
    );
    const { contratosSource } = await import('./contratos-source');
    const resultados = await contratosSource.run('1686', {} as never, new AbortController().signal);
    expect(resultados).toHaveLength(1);
    expect(resultados[0].badges?.[0]).toEqual({ label: '1686', color: 'neutral' });
    expect(resultados[0].href).toBe('/panel/inmobiliaria/contratos/ct-1');

    const porElNuestro = await contratosSource.run('1839', {} as never, new AbortController().signal);
    expect(porElNuestro[0].badges?.[0]).toEqual({ label: 'Leasefy #1839', color: 'neutral' });
  });
});
