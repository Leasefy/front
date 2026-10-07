import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { clasificarFallo } from '@/lib/errores/clasificar';
import { falloDeLaFicha, MENSAJE_CONTRATO_NO_EXISTE } from './fallo-de-la-ficha';

describe('QA-CONT-95 · la ficha de un contrato que no se puede ver (CR-21)', () => {
  it('🔴 `/contratos/abc` (400 uuid) es «no existe», no «fue un problema nuestro»', () => {
    const f = falloDeLaFicha(new ApiError(400, 'Validation failed (uuid is expected)'));
    expect(clasificarFallo(f, { queEs: 'este contrato' }).tipo).toBe('noExiste');
    expect((f as ApiError).message).toBe(MENSAJE_CONTRATO_NO_EXISTE);
  });
  it('🔴 el de otra inmobiliaria (403 en inglés) es «no existe», en español y sin delatar', () => {
    const f = falloDeLaFicha(new ApiError(403, 'You do not have access to this contract'));
    expect(clasificarFallo(f, { queEs: 'este contrato' }).tipo).toBe('noExiste');
    expect((f as ApiError).message).not.toMatch(/access|contract/i);
  });
  it('el 404 «Contract not found» sale en español', () => {
    expect((falloDeLaFicha(new ApiError(404, 'Contract not found')) as ApiError).message).toBe(MENSAJE_CONTRATO_NO_EXISTE);
  });
  it('un 500 sigue siendo un 500 (reintentar sirve)', () => {
    const e = new ApiError(500, 'boom');
    expect(falloDeLaFicha(e)).toBe(e);
  });
  it('un 403 de permiso de módulo NO se disfraza de «no existe»', () => {
    const e = new ApiError(403, 'No tienes permiso para ver contratos.', 'SIN_PERMISO_DE_MODULO');
    expect(falloDeLaFicha(e)).toBe(e);
  });
});
