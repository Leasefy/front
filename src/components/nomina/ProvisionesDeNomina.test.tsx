/**
 * El pago de una prestación y el sistema de errores (02-10-2026).
 *
 *  · 🔁 El valor con un cero de más se ataja antes de enviar, con la MISMA
 *    frase del back (`limites-de-nomina.ts`), y no viaja nada.
 *  · Un 400 con `campos` va bajo su campo.
 *  · Un 5xx dice «de nuestro lado» con la referencia.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  provisiones: vi.fn(),
  catalogo: vi.fn(),
  registrar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: {
    provisiones: h.provisiones,
    catalogoDeProvisiones: h.catalogo,
    registrarPagoDePrestacion: h.registrar,
  },
  noEstaHabilitada: () => false,
  faltaLaMigracion: () => false,
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));

import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_NOMINA } from './limites-de-nomina';
import { ProvisionesDeNominaPanel } from './ProvisionesDeNomina';

let contenedor: HTMLDivElement;
let root: Root;

const q = <T extends HTMLElement = HTMLElement>(t: string) =>
  document.querySelector<T>(`[data-testid="${t}"]`);

function escribir(el: HTMLInputElement | HTMLSelectElement, valor: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

beforeEach(() => {
  h.provisiones.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    porTipo: [],
    porPersona: [{ personaId: 'p-1', nombre: 'Ana Gómez', documento: '123', porTipo: {}, vivoCop: 0 }],
    totalVivoCop: 0,
  });
  h.catalogo.mockReset().mockResolvedValue({ tipos: [] });
  h.registrar.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

async function abrirElPago(valor: string) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<ProvisionesDeNominaPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    q('registrar-pago')!.click();
  });
  await act(async () => {
    escribir(q<HTMLSelectElement>('campo-persona')!, 'p-1');
    escribir(q<HTMLInputElement>('campo-desde')!, '2026-01-01');
    escribir(q<HTMLInputElement>('campo-hasta')!, '2026-06-30');
    escribir(q<HTMLInputElement>('campo-fecha-pago')!, '2026-06-30');
    escribir(q<HTMLInputElement>('campo-valor')!, valor);
  });
}

async function registrar() {
  await act(async () => {
    q('guardar-pago')!.click();
    await Promise.resolve();
  });
}

describe('<ProvisionesDeNomina> · el pago de una prestación', () => {
  it('🔁 un valor con ceros de más se ataja antes de enviar, con la frase del back', async () => {
    await abrirElPago('18000000000');
    expect(document.getElementById('valor-del-pago-error')?.textContent).toBe(
      MENSAJES_DE_NOMINA.valorDelPagoMaximo,
    );
    await registrar();
    expect(h.registrar).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(q('campo-valor'));
  });

  it('🔴 un 400 con `campos` en `fechaPago` va bajo la fecha de pago', async () => {
    const mensaje = 'La fecha de pago no es una fecha válida (usa el formato AAAA-MM-DD).';
    h.registrar.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'fechaPago', regla: 'formato', mensaje }],
      }),
    );
    await abrirElPago('1500000');
    await registrar();

    expect(q('campo-fecha-pago')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('fecha-del-pago-error')?.textContent).toBe(mensaje);
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.registrar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'dddd4444',
      }),
    );
    await abrirElPago('1500000');
    await registrar();

    const texto = h.toast.error.mock.calls.at(-1)![0] as string;
    expect(texto).toMatch(/No pudimos registrar el pago: algo falló de nuestro lado/);
    expect(texto).toContain('dddd4444');
  });
});
