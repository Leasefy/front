import { describe, expect, it, vi } from 'vitest';

const cliente = vi.hoisted(() => ({ delete: vi.fn(async () => ({ eliminado: true })) }));
vi.mock('./client', async (original) => ({ ...(await original<typeof import('./client')>()), apiClient: cliente }));

import { mantenimientoApi } from './inmobiliaria.service';

describe('Eliminar un arreglo (28-10-2026)', () => {
  it('pega al DELETE del back con el id', async () => {
    await mantenimientoApi.eliminar('sol 1');
    expect(cliente.delete).toHaveBeenCalledWith('/inmobiliaria/mantenimiento/sol%201');
  });
});
