import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 QA-PAGOS-95 r2 (N-33, 06-10-2026). El cajón del convenio pedía «Número de
 * cuenta» y «Por dónde entra la plata de esa cuenta», y el back los guarda, pero
 * el cuerpo que arma el front los soltaba: la cuenta quedaba «sin declarar» y la
 * vía, siempre ARCHIVO (la de por defecto del back). Con eso la regla «un camino
 * de entrada por cuenta» no se podía configurar y el extracto de la cuenta del
 * convenio entraba igual («Ningún convenio de recaudo nombra la cuenta…»).
 */
const post = vi.fn();
const put = vi.fn();
vi.mock('@/lib/api/client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a), put: (...a: unknown[]) => put(...a), get: vi.fn() } }));
vi.mock('./refresco-de-datos', () => ({ invalidar: vi.fn() }));

import { tesoreriaApi } from './tesoreria.service';
import type { GuardarConvenio } from './tesoreria.types';

const BASE = {
  banco: 'Davivienda',
  codigo: 'QA95-001',
  nombre: 'Recaudo QA 95',
  tipo: 'DELIMITADO',
  separador: ';',
  columnas: { referencia: { indice: 0 }, fecha: { indice: 1 }, valor: { indice: 2 } },
  formatoDeFecha: 'DD/MM/YYYY',
  decimales: 0,
  lineasDeEncabezado: 1,
  activo: true,
} as unknown as GuardarConvenio;

describe('el convenio viaja con su cuenta y su vía de entrada', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({});
    put.mockReset().mockResolvedValue({});
  });

  it('🔴 crear manda la cuenta que recauda y la vía de entrada', async () => {
    await tesoreriaApi.crearConvenio({ ...BASE, cuentaBancaria: '45655544422', viaDeEntrada: 'EXTRACTO' } as GuardarConvenio);
    expect(post.mock.calls[0][1]).toMatchObject({ cuentaBancaria: '45655544422', viaDeEntrada: 'EXTRACTO' });
  });

  it('🔴 editar también (antes la cuenta escrita en el cajón no se guardaba nunca)', async () => {
    await tesoreriaApi.guardarConvenio('c-1', { ...BASE, cuentaBancaria: '45655544422', viaDeEntrada: 'ARCHIVO' } as GuardarConvenio);
    expect(put.mock.calls[0][1]).toMatchObject({ cuentaBancaria: '45655544422', viaDeEntrada: 'ARCHIVO' });
  });

  it('sin cuenta no manda la clave (el back la deja sin declarar)', async () => {
    await tesoreriaApi.crearConvenio({ ...BASE, viaDeEntrada: 'ARCHIVO' } as GuardarConvenio);
    expect('cuentaBancaria' in post.mock.calls[0][1]).toBe(false);
  });
});
