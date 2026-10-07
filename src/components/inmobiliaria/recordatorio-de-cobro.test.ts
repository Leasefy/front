import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { ApiError } from '@/lib/api/client';
import {
  enviarRecordatorio,
  motivoDelFalloDelRecordatorio,
  NO_CONFIRMO_EL_ENVIO,
} from './recordatorio-de-cobro';

const EXITO = { titulo: 'Recordatorio enviado', descripcion: 'Se envió un recordatorio a Jose' };

describe('enviarRecordatorio (C1: el recordatorio no miente)', () => {
  beforeEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.warning.mockReset();
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
    // PG-R01 (03-10-2026): el éxito pide que el back CONFIRME el envío.
    let soltar!: (r: unknown) => void;
    const enviar = vi.fn(() => new Promise<unknown>((r) => (soltar = r)));

    const enCurso = enviarRecordatorio({ enviar, exito: EXITO });
    await Promise.resolve();
    expect(toastMock.success).not.toHaveBeenCalled();

    soltar({ enviado: true });
    await expect(enCurso).resolves.toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith(EXITO.titulo, { description: EXITO.descripcion });
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('🔴 PG-R01: un 200 SIN la confirmación del envío (el back de antes no mandaba nada) NO es «enviado»', async () => {
    for (const respuesta of [undefined, {}, { id: 'c-1', remindersSent: 3 }]) {
      toastMock.success.mockReset();
      toastMock.warning.mockReset();
      const salio = await enviarRecordatorio({ enviar: () => Promise.resolve(respuesta), exito: EXITO });
      expect(salio).toBe(false);
      expect(toastMock.success).not.toHaveBeenCalled();
      expect(toastMock.warning).toHaveBeenCalledWith('El recordatorio no salió', {
        description: NO_CONFIRMO_EL_ENVIO,
      });
    }
  });

  it('🔴 PG-R01: el aviso apagado se dice con el motivo del back, no como enviado', async () => {
    const salio = await enviarRecordatorio({
      enviar: () =>
        Promise.resolve({ enviado: false, motivo: 'El aviso de cobro está apagado en Configuración → Avisos.' }),
      exito: EXITO,
    });
    expect(salio).toBe(false);
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalledWith('El recordatorio no salió', {
      description: 'El aviso de cobro está apagado en Configuración → Avisos.',
    });
  });

  it('con la confirmación dice por dónde salió', async () => {
    await enviarRecordatorio({ enviar: () => Promise.resolve({ enviado: true, canal: 'EMAIL' }), exito: EXITO });
    expect(toastMock.success).toHaveBeenCalledWith(EXITO.titulo, {
      description: `${EXITO.descripcion} por correo.`,
    });
  });

  it('un 500 no muestra el mensaje crudo del servidor: dice que fue nuestro, con la referencia', () => {
    const motivo = motivoDelFalloDelRecordatorio(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: '9f8e7d6c' }),
    );
    // 02-10-2026: por el traductor (la regla de oro), con la referencia para soporte.
    expect(motivo).toContain('No pudimos enviar el recordatorio: algo falló de nuestro lado');
    expect(motivo).toContain('9f8e7d6c');
    expect(motivo).not.toContain('Internal server error');
  });

  it('el 403 del back que ya explica qué cuenta hace falta se dice tal cual', () => {
    expect(
      motivoDelFalloDelRecordatorio(
        new ApiError(403, 'Esta acción es para cuentas de inmobiliaria con permiso de cobros.'),
      ),
    ).toBe('Esta acción es para cuentas de inmobiliaria con permiso de cobros.');
  });

  it('un 403 dice que falta el permiso, no «Forbidden resource»', () => {
    expect(motivoDelFalloDelRecordatorio(new ApiError(403, 'Forbidden resource'))).toBe(
      'No tienes permiso para enviar recordatorios.',
    );
  });

  it('sin respuesta del servidor habla de la conexión', () => {
    // El texto con el que el NAVEGADOR dice que el pedido no salió (Chrome).
    expect(motivoDelFalloDelRecordatorio(new TypeError('Failed to fetch'))).toContain('conexión');
    expect(motivoDelFalloDelRecordatorio(new ApiError(0, 'fetch failed'))).toContain('conexión');
  });

  it('🔴 un error del código (no de la red) NO culpa a la conexión (02-10-2026)', () => {
    const motivo = motivoDelFalloDelRecordatorio(new TypeError('enviar is not a function'));
    expect(motivo).not.toContain('conexión');
    expect(motivo).not.toContain('is not a function');
  });
});
