/**
 * Configuración → Integraciones → «Wompi · Pagos a terceros».
 *
 * Lo que se fija: la llave NUNCA se muestra (sólo sus últimos cuatro), el
 * formulario manda exactamente lo que se pegó y se vacía al guardar, quien no
 * es administrador ve todo apagado con el porqué, y sin la migración la
 * pantalla lo dice en vez de ofrecer un formulario que va a fallar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { VistaDeLaConexion } from '@/lib/api/wompi-pagos.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ ver: vi.fn(), guardar: vi.fn(), probar: vi.fn(), puede: { valor: true } }));

vi.mock('@/lib/api/wompi-pagos.service', () => ({
  wompiPagosApi: { verConexion: h.ver, guardarConexion: h.guardar, probarConexion: h.probar },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => h.puede.valor }),
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { ConexionWompiPagos, resumenDeLaConexion } from './ConexionWompiPagos';

const CONECTADA: VistaDeLaConexion = {
  disponible: true,
  motivo: null,
  conexion: {
    ambiente: 'PRODUCCION',
    estado: 'CONECTADA',
    finalDeLaLlave: '1234',
    tieneSecretoDeEventos: false,
    ultimaPruebaAt: '2026-09-23T14:00:00.000Z',
    ultimoError: null,
    cuentasOrigen: [
      { id: 'a', banco: 'Bancolombia', codigoDelBanco: 'BANCOLOMBIA', numero: '****5678', tipo: 'CORRIENTE', estado: 'ACTIVE', saldoCentavos: 5_000_000_000, actualizadaAt: null },
      { id: 'b', banco: 'Banco de Occidente', codigoDelBanco: null, numero: '****1111', tipo: 'AHORROS', estado: 'IN_REVIEW', saldoCentavos: null, actualizadaAt: null },
    ],
    cuentasLeidasAt: null,
    webhook: { ruta: '/webhooks/wompi-pagos/tok', url: 'https://api.leasefy.co/webhooks/wompi-pagos/tok' },
    limites: null,
  },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.ver.mockReset().mockResolvedValue(CONECTADA);
  h.guardar.mockReset().mockResolvedValue(CONECTADA);
  h.puede.valor = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<ConexionWompiPagos />);
  });
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('La conexión con Wompi', () => {
  it('dice en una frase cómo está, con la llave por sus últimos cuatro, y lista las cuentas origen', async () => {
    await pintar();
    expect(container.querySelector('[data-testid="resumen-de-la-conexion"]')?.textContent).toMatch(
      /^Conectada en producción con la llave ••••1234: 1 cuenta origen activa\./,
    );
    const cuentas = container.querySelector('[data-testid="cuentas-origen"]')?.textContent ?? '';
    expect(cuentas).toContain('****5678');
    expect(cuentas).toContain('En revisión');
    expect(container.textContent).toContain('https://api.leasefy.co/webhooks/wompi-pagos/tok');
    expect(container.textContent).toMatch(/Sin el secreto de eventos/);
  });

  it('guardar manda lo pegado y vacía los campos: la llave no se queda en pantalla', async () => {
    await pintar();
    const [apiKey, usuario] = ['#wompi-api-key', '#wompi-usuario'].map((s) => container.querySelector<HTMLInputElement>(s)!);
    await act(async () => {
      escribir(apiKey, 'prv_prod_NUEVA');
      escribir(usuario, 'up-9');
    });
    const form = container.querySelector('[data-testid="formulario-de-llaves"]') as HTMLFormElement;
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(h.guardar).toHaveBeenCalledWith({ ambiente: 'PRODUCCION', apiKey: 'prv_prod_NUEVA', usuarioPrincipalId: 'up-9' });
    expect(apiKey.value).toBe('');
    expect(container.textContent).not.toContain('prv_prod_NUEVA');
  });

  it('🔴 quien no es administrador lo ve todo apagado, con el porqué', async () => {
    h.puede.valor = false;
    await pintar();
    expect(container.querySelector<HTMLInputElement>('#wompi-api-key')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-testid="probar-conexion"]')?.disabled).toBe(true);
    expect(container.textContent).toContain('Las llaves de Wompi las cambia un administrador de la inmobiliaria.');
  });

  it('sin la migración dice qué falta en vez de ofrecer el formulario', async () => {
    h.ver.mockResolvedValue({ disponible: false, motivo: 'Falta aplicar 20260923000000_wompi_pagos_a_terceros.', conexion: null });
    await pintar();
    expect(container.textContent).toContain('Falta aplicar 20260923000000_wompi_pagos_a_terceros.');
    expect(container.querySelector('[data-testid="formulario-de-llaves"]')).toBeNull();
  });
});

/**
 * 02-10-2026 · tanda 2 del sistema de errores (A6): guardar las llaves dice
 * lo que de verdad pasó, por campo si el 400 trae `campos`.
 */
describe('Las llaves de Wompi — cuando el back no las guarda', () => {
  async function guardarLlaves() {
    await pintar();
    const [apiKey, usuario] = ['#wompi-api-key', '#wompi-usuario'].map((s) => container.querySelector<HTMLInputElement>(s)!);
    await act(async () => {
      escribir(apiKey, 'prv_prod_NUEVA');
      escribir(usuario, 'up-9');
    });
    const form = container.querySelector('[data-testid="formulario-de-llaves"]') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
  }

  it('🔴 un 400 con campos pinta el error bajo su campo y le da el foco', async () => {
    const { ApiError } = await import('@/lib/api/client');
    h.guardar.mockRejectedValue(
      new ApiError(400, ['La API Key no tiene la forma de una llave de Wompi.'], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'apiKey', regla: 'formato', mensaje: 'La API Key no tiene la forma de una llave de Wompi.' }],
      }),
    );
    await guardarLlaves();
    expect(container.querySelector('#wompi-api-key-error')?.textContent).toBe(
      'La API Key no tiene la forma de una llave de Wompi.',
    );
    expect(container.querySelector('#wompi-api-key')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(container.querySelector('#wompi-api-key'));
  });

  it('un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client');
    h.guardar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', { statusCode: 500, referencia: 'c0ffee12' }),
    );
    await guardarLlaves();
    const texto = container.textContent ?? '';
    expect(texto).toContain('No pudimos guardar las llaves: algo falló de nuestro lado');
    expect(texto).toContain('c0ffee12');
  });

  it('sin respuesta (status 0) sí habla de la conexión', async () => {
    h.guardar.mockRejectedValue(new TypeError('Failed to fetch'));
    await guardarLlaves();
    expect(container.textContent).toMatch(/Revisa tu conexión|No tienes conexión/);
  });
});

describe('resumenDeLaConexion', () => {
  it('sin conexión lo dice', () => {
    expect(resumenDeLaConexion({ disponible: true, motivo: null, conexion: null })).toMatch(/todavía no ha conectado/);
  });
});
