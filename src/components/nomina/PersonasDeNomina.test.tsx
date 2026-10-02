/**
 * Registrar a alguien en nómina y el sistema de errores (02-10-2026).
 *
 *  · 🔁 El salario con un cero de más se ataja antes de enviar, con la MISMA
 *    frase del back (`limites-de-nomina.ts`), y no viaja nada.
 *  · Un 400 con `campos` va bajo su campo y le da el foco.
 *  · Un 5xx dice «de nuestro lado» con la referencia; sin respuesta, conexión.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  personas: vi.fn(),
  catalogo: vi.fn(),
  crear: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: {
    personas: h.personas,
    catalogoDePersonas: h.catalogo,
    crearPersona: h.crear,
  },
  noEstaHabilitada: () => false,
  faltaLaMigracion: () => false,
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));

import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_NOMINA } from './limites-de-nomina';
import { PersonasDeNominaPanel } from './PersonasDeNomina';

let contenedor: HTMLDivElement;
let root: Root;

const q = <T extends HTMLElement = HTMLElement>(t: string) =>
  document.querySelector<T>(`[data-testid="${t}"]`);

function escribir(el: HTMLInputElement, valor: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  h.personas.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    personas: [],
    total: 0,
    cuotaDeAprendices: null,
  });
  h.catalogo.mockReset().mockResolvedValue({
    tipos: [{ tipo: 'EMPLEADO', nombre: 'Empleado', descripcion: 'Contrato laboral.' }],
    tiposDeContrato: ['INDEFINIDO'],
    periodicidades: ['MENSUAL'],
    clasesDeRiesgoArl: ['I'],
    claseDeRiesgoSugerida: 'I',
    fuenteArl: '',
    modeloDeAprendizajeSugerido: '',
  });
  h.crear.mockReset().mockResolvedValue({});
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

async function abrirElFormulario() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<PersonasDeNominaPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    q('nueva-persona')!.click();
  });
  await act(async () => {
    escribir(q<HTMLInputElement>('campo-nombre')!, 'Ana Gómez');
    escribir(q<HTMLInputElement>('campo-ingreso')!, '2026-01-15');
    escribir(q<HTMLInputElement>('campo-salario')!, '3500000');
  });
}

async function registrar() {
  await act(async () => {
    q('guardar-persona')!.click();
    await Promise.resolve();
  });
}

describe('<PersonasDeNomina> · errores en su campo', () => {
  it('🔁 un salario con ceros de más se ataja antes de enviar, con la frase del back', async () => {
    await abrirElFormulario();
    await act(async () => {
      escribir(q<HTMLInputElement>('campo-salario')!, '3500000000');
    });
    expect(document.getElementById('salario-de-persona-error')?.textContent).toBe(
      MENSAJES_DE_NOMINA.salarioMaximo,
    );
    await registrar();
    expect(h.crear).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(q('campo-salario'));
  });

  it('🔴 un 400 con `campos` pinta el error bajo el documento y le da el foco', async () => {
    const mensaje = 'El documento debe tener entre 3 y 30 caracteres.';
    h.crear.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'documento', regla: 'longitud', mensaje }],
      }),
    );
    await abrirElFormulario();
    await registrar();

    const documento = q('campo-documento')!;
    expect(documento.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('documento-de-persona-error')?.textContent).toBe(mensaje);
    expect(document.activeElement).toBe(documento);
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    h.crear.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'cccc3333',
      }),
    );
    await abrirElFormulario();
    await registrar();

    const texto = h.toast.error.mock.calls.at(-1)![0] as string;
    expect(texto).toMatch(/No pudimos registrar a la persona: algo falló de nuestro lado/);
    expect(texto).toContain('cccc3333');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    h.crear.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await abrirElFormulario();
    await registrar();

    const texto = h.toast.error.mock.calls.at(-1)![0] as string;
    expect(texto).toMatch(/conexión/);
  });
});
