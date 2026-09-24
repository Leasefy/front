import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { InventarioItemDialog } from './InventarioItemDialog';

/**
 * 🔴 Las fotos del inventario pasaron a un bucket PRIVADO (auditoría de
 * seguridad, 23-09-2026): el back las devuelve como URL FIRMADA, que con su
 * token mide ≈550 caracteres. El diálogo la cortaba a 500 al guardar —se
 * perdía el token y la vista previa del ítem quedaba rota hasta recargar—.
 */
const FIRMADA =
  'https://proyecto.supabase.co/storage/v1/object/sign/inventario-privado/inventario/inmueble/' +
  '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/it-1726500000000' +
  '?token=' +
  'x'.repeat(420);

let host: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('InventarioItemDialog', () => {
  it('guarda la URL firmada de la foto ENTERA, con su token', () => {
    expect(FIRMADA.length).toBeGreaterThan(500);
    const onGuardar = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root.render(
        <InventarioItemDialog
          abierto
          item={{ id: 'it-1', name: 'Nevera', quantity: 1, condition: 'good', photoUrl: FIRMADA }}
          guardando={false}
          onCerrar={vi.fn()}
          onGuardar={onGuardar}
        />,
      ),
    );
    const formulario = document.body.querySelector('form');
    expect(formulario).not.toBeNull();
    act(() => {
      formulario!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar.mock.calls[0][0].photoUrl).toBe(FIRMADA);
  });
});
