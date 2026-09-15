import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { ApiError } from '@/lib/api/client';
import { enviarRecordatorio, motivoDelFalloDelRecordatorio } from './recordatorio-de-cobro';

const EXITO = { titulo: 'Recordatorio enviado', descripcion: 'Se envió un recordatorio a Jose' };

describe('enviarRecordatorio (C1: el recordatorio no miente)', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it('🔴 si el envío falla NO dice «enviado»: dice por qué y devuelve false', async () => {
    const enviar = vi
      .fn()
      .mockRejectedValue(new ApiError(400, 'El inquilino no tiene correo ni teléfono'));

    const salio = await enviarRecordatorio({ enviar, exito: EXITO });

    expect(salio).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo enviar el recordatorio', {
      description: 'El inquilino no tiene correo ni teléfono',
    });
  });

  it('espera la promesa: el éxito se anuncia DESPUÉS de que el envío vuelve', async () => {
    let soltar!: () => void;
    const enviar = vi.fn(() => new Promise<void>((r) => (soltar = r)));

    const enCurso = enviarRecordatorio({ enviar, exito: EXITO });
    await Promise.resolve();
    expect(toastMock.success).not.toHaveBeenCalled();

    soltar();
    await expect(enCurso).resolves.toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith(EXITO.titulo, { description: EXITO.descripcion });
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('un 500 no muestra el mensaje crudo del servidor', () => {
    expect(motivoDelFalloDelRecordatorio(new ApiError(500, 'Internal server error'))).toBe(
      'Tuvimos un problema de nuestro lado. Intenta de nuevo en unos minutos.',
    );
  });

  it('un 403 dice que falta el permiso, no «Forbidden resource»', () => {
    expect(motivoDelFalloDelRecordatorio(new ApiError(403, 'Forbidden resource'))).toBe(
      'No tienes permiso para enviar recordatorios.',
    );
  });

  it('sin respuesta del servidor habla de la conexión', () => {
    expect(motivoDelFalloDelRecordatorio(new TypeError('fetch failed'))).toContain('conexión');
    expect(motivoDelFalloDelRecordatorio(new ApiError(0, 'fetch failed'))).toContain('conexión');
  });
});
