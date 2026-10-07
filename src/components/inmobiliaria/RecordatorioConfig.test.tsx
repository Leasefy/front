/**
 * RecordatorioConfig — «Guardar» tiene que guardar.
 *
 * El botón hacía `setTimeout(500)` → `onSave(config)` → `toast.success
 * ('Configuración guardada')`, y `onSave` en la página de Cobros era un
 * `setState` a secas: cero `fetch`. Los días viven en
 * `agency.reminderDaysBefore/After` y se recargan al volver a entrar, así que
 * lo editado se perdía y el back seguía mandando los recordatorios con lo
 * viejo, mientras la pantalla decía que se había guardado.
 *
 * Lo que muerde: que el cajón ESPERE a `onSave`, que el cartel de éxito salga
 * después, y que un fallo del back se vea en vez de festejarse.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { successMock, errorMock } = vi.hoisted(() => ({
  successMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: successMock, error: errorMock },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

import { RecordatorioConfig, type RecordatorioConfigData } from './RecordatorioConfig';

const CONFIG: RecordatorioConfigData = {
  daysBefore: [5],
  daysAfter: [3],
  channels: ['email', 'whatsapp'],
};

let host: HTMLDivElement;
let root: Root;

async function montar(onSave: (c: RecordatorioConfigData) => Promise<void> | void) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <RecordatorioConfig
        isOpen
        onClose={() => {}}
        config={CONFIG}
        onSave={onSave}
      />,
    );
  });
}

function botonGuardar(): HTMLButtonElement {
  // El cajón se porta en un portal: se busca en todo el documento.
  const botones = Array.from(document.querySelectorAll('button'));
  const b = botones.find((x) =>
    x.textContent?.includes('inmobiliaria.cobros.recordatorioConfig.save'),
  );
  if (!b) throw new Error(`No encontré el botón. Botones: ${botones.map((x) => x.textContent).join(' | ')}`);
  return b as HTMLButtonElement;
}

beforeEach(() => {
  successMock.mockReset();
  errorMock.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

describe('Guardar recordatorios', () => {
  it('llama a onSave con los días elegidos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    await montar(onSave);

    await act(async () => {
      botonGuardar().click();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      daysBefore: [5],
      daysAfter: [3],
    });
  });

  it('AL REVÉS: si el guardado falla NO dice «Configuración guardada»', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('403 sin permiso'));
    await montar(onSave);

    await act(async () => {
      botonGuardar().click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(successMock).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock.mock.calls[0][1]).toMatchObject({
      description: '403 sin permiso',
    });
  });

  it('el cartel de éxito sale DESPUÉS de que el guardado resuelve', async () => {
    let resolver: (() => void) | null = null;
    const onSave = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolver = () => res();
        }),
    );
    await montar(onSave);

    await act(async () => {
      botonGuardar().click();
    });

    // Guardado en vuelo: todavía no hay cartel.
    expect(successMock).not.toHaveBeenCalled();

    await act(async () => {
      resolver?.();
      await Promise.resolve();
    });

    expect(successMock).toHaveBeenCalledTimes(1);
  });
});

/*
 * 🔴 Tanda 2 del sistema de errores (02-10-2026): un 400 sobre los días va
 * bajo SU grupo con el foco; un 5xx dice «de nuestro lado» con la referencia;
 * sólo sin respuesta se habla de la conexión. Nada de `error.message` crudo.
 */
describe('Guardar recordatorios: los errores, cada uno en su lugar', () => {
  async function guardarCon(error: unknown) {
    await montar(vi.fn().mockRejectedValue(error));
    await act(async () => {
      botonGuardar().click();
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('🔴 un 400 en `reminderDaysAfter` va bajo «después del vencimiento», con el foco', async () => {
    const frase = 'Puedes elegir hasta 10 días de recordatorio.';
    const { ApiError } = await import('@/lib/api/client');
    await guardarCon(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'reminderDaysAfter', regla: 'maximo', mensaje: frase }],
      }),
    );

    expect(document.querySelector('#recordatorio-dias-despues-error')?.textContent).toBe(frase);
    expect(document.activeElement?.closest('#recordatorio-dias-despues')).toBeTruthy();
    expect(errorMock).not.toHaveBeenCalled();
    expect(successMock).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no el texto crudo', async () => {
    const { ApiError } = await import('@/lib/api/client');
    await guardarCon(new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: '1234abcd' }));

    const descripcion = String(errorMock.mock.calls[0]?.[1]?.description ?? '');
    expect(descripcion).toContain('No pudimos guardar los recordatorios: algo falló de nuestro lado');
    expect(descripcion).toContain('1234abcd');
    expect(descripcion).not.toContain('Internal server error');
  });

  it('sin respuesta (status 0) habla de la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client');
    await guardarCon(new ApiError(0, 'Failed to fetch'));

    expect(String(errorMock.mock.calls[0]?.[1]?.description ?? '')).toMatch(/conexión/);
  });
});
