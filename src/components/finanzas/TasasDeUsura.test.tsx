/**
 * La pantalla de usura grita los meses que faltan.
 *
 * Un mes sin tasa no se ve: el interés de ese mes simplemente sale sin techo.
 * Por eso el aviso —con los meses NOMBRADOS— es lo primero que estos tests
 * fijan, junto con las dos reglas que protegen la serie compartida: la tasa
 * general de Colombia no se borra desde acá, y borrar pide confirmación del
 * sistema de diseño (nunca `window.confirm`).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { TasaDeUsura, TasasDeUsura as Respuesta } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  usura: vi.fn(),
  guardarUsura: vi.fn(),
  borrarUsura: vi.fn(),
  codigo: vi.fn(),
}));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { usura: h.usura, guardarUsura: h.guardarUsura, borrarUsura: h.borrarUsura },
  codigoSinMigrar: h.codigo,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { TasasDeUsuraPanel, explicar, porcentaje } from './TasasDeUsura';

function tasa(extra: Partial<TasaDeUsura> = {}): TasaDeUsura {
  return {
    id: 't-1',
    mes: '2026-09',
    efectivaAnualPct: 24.86,
    diariaPct: 0.0611,
    fuente: 'Superfinanciera',
    esDeLaAgencia: false,
    ...extra,
  };
}

function respuesta(extra: Partial<Respuesta> = {}): Respuesta {
  return { disponible: true, motivo: null, tasas: [tasa()], mesesSinTasa: [], ...extra };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.usura.mockReset().mockResolvedValue(respuesta());
  h.guardarUsura.mockReset().mockResolvedValue(tasa());
  h.borrarUsura.mockReset().mockResolvedValue(undefined);
  h.codigo.mockReset().mockReturnValue(null);
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
    root.render(<TasasDeUsuraPanel />);
  });
}

function botonesDeBorrar(): HTMLButtonElement[] {
  return [...document.body.querySelectorAll('button')].filter((b) =>
    (b.getAttribute('aria-label') ?? '').startsWith('Borrar la tasa'),
  );
}

function botones(texto: string): HTMLButtonElement[] {
  return [...document.body.querySelectorAll('button')].filter((b) =>
    (b.textContent ?? '').includes(texto),
  );
}

describe('tasas de usura', () => {
  it('🔴 avisa los meses que faltan, nombrados, y dice qué pasa con ellos', async () => {
    h.usura.mockResolvedValue(
      respuesta({ mesesSinTasa: ['2026-07', '2026-08'] }),
    );
    await pintar();
    const aviso = document.body.querySelector('[data-testid="aviso-de-meses-sin-tasa"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('2026-07');
    expect(aviso!.textContent).toContain('2026-08');
    expect(aviso!.textContent).toContain('SIN topear');
    expect(aviso!.getAttribute('role')).toBe('alert');
  });

  it('sin `mesesSinTasa` del back, los deduce del rango que pidió', async () => {
    // El back devuelve una sola tasa y NO manda la lista: la pantalla no se
    // queda muda por un campo opcional que faltó.
    h.usura.mockResolvedValue({ disponible: true, motivo: null, tasas: [tasa()] });
    await pintar();
    expect(document.body.querySelector('[data-testid="aviso-de-meses-sin-tasa"]')).not.toBeNull();
  });

  it('sin meses faltantes no inventa una alarma', async () => {
    h.usura.mockResolvedValue(respuesta({ mesesSinTasa: [] }));
    await pintar();
    expect(document.body.querySelector('[data-testid="aviso-de-meses-sin-tasa"]')).toBeNull();
  });

  it('pinta la efectiva anual y la diaria que mandó el back, sin recalcular', async () => {
    await pintar();
    const fila = document.body.querySelector('[data-testid="tasa-2026-09"]');
    expect(fila?.textContent).toContain('24,86 %');
    expect(fila?.textContent).toContain('0,0611 %');
  });

  it('🔴 la tasa general de Colombia no ofrece borrar: la comparten todas', async () => {
    await pintar();
    expect(botonesDeBorrar()).toHaveLength(0);
  });

  it('la tasa propia sí se puede borrar', async () => {
    h.usura.mockResolvedValue(respuesta({ tasas: [tasa({ esDeLaAgencia: true })] }));
    await pintar();
    expect(botonesDeBorrar().length).toBeGreaterThan(0);
  });

  it('borrar pide confirmación del sistema de diseño antes de tocar nada', async () => {
    h.usura.mockResolvedValue(respuesta({ tasas: [tasa({ esDeLaAgencia: true })] }));
    await pintar();
    const borrar = botonesDeBorrar()[0]!;
    await act(async () => {
      borrar.click();
    });
    expect(document.body.querySelector('[data-testid="confirmar-borrado-de-tasa"]')).not.toBeNull();
    expect(h.borrarUsura).not.toHaveBeenCalled();

    await act(async () => {
      botones('Borrarla')[0]!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.borrarUsura).toHaveBeenCalledWith('t-1');
  });

  it('sin la migración lo explica y no deja guardar', async () => {
    h.usura.mockResolvedValue(
      respuesta({
        disponible: false,
        motivo: 'Falta la migración 20260917221000_usura_y_deterioro.',
        tasas: [],
      }),
    );
    await pintar();
    const cartel = document.body.querySelector('[data-testid="sin-la-migracion"]');
    expect(cartel?.textContent).not.toContain('20260917221000');
    // «Víctor» tampoco: la inmobiliaria no sabe quién es.
    expect(cartel?.textContent).not.toContain('Víctor');
    expect(cartel?.textContent).toContain('todavía no está disponible');
    expect(botones('Cargar una tasa')[0]!.disabled).toBe(true);
  });

  it('guarda lo que se escribió, en la serie de la agencia por defecto', async () => {
    await pintar();
    await act(async () => {
      botones('Cargar una tasa')[0]!.click();
    });
    const mes = document.body.querySelector<HTMLInputElement>('#tasa-mes')!;
    const efectiva = document.body.querySelector<HTMLInputElement>('#tasa-efectiva')!;
    escribir(mes, '2026-08');
    escribir(efectiva, '25,5');
    await act(async () => {
      botones('Guardar')[0]!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.guardarUsura).toHaveBeenCalledWith({
      mes: '2026-08',
      efectivaAnualPct: 25.5,
      fuente: undefined,
      general: false,
    });
  });
});

describe('piezas puras', () => {
  it('el porcentaje se escribe a la colombiana', () => {
    expect(porcentaje(24.86)).toBe('24,86 %');
    expect(porcentaje(0.0611, 4)).toBe('0,0611 %');
  });

  it('el 503 de la migración NO le dice al cliente quién la aplica', () => {
    h.codigo.mockReturnValue('USURA_SIN_MIGRAR');
    const texto = explicar(new Error('Falta la migración X'), 'x');
    expect(texto).not.toContain('Víctor');
    expect(texto).toContain('está habilitando');
    h.codigo.mockReturnValue(null);
    expect(explicar(new Error('Otro fallo'), 'x')).toBe('Otro fallo');
  });
});

/** Escribe como una persona: el setter nativo + `input` (React no ve un `.value=`). */
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/*
 * Sistema de errores (02-10-2026): 🔁 la tasa fuera de 0–500 dice la frase del
 * back bajo el campo; lo que el back dice de un campo va bajo ese campo; un
 * 5xx dice «de nuestro lado» con la referencia.
 */
describe('tasas de usura · errores en su campo', () => {
  async function abrirEditor() {
    await pintar();
    await act(async () => {
      botones('Cargar una tasa')[0]!.click();
    });
    escribir(document.body.querySelector<HTMLInputElement>('#tasa-mes')!, '2026-08');
  }

  it('🔁 2486 (sin la coma) dice la frase del back bajo el campo y no deja guardar', async () => {
    await abrirEditor();
    escribir(document.body.querySelector<HTMLInputElement>('#tasa-efectiva')!, '2486');
    // La ayuda gris sale y el error entra con un cruce (Cadence): se espera.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(document.getElementById('tasa-efectiva-error')?.textContent).toBe(
      'La tasa de usura no puede pasar del 500 % efectivo anual. Revisa que no sobren ceros.',
    );
    expect(botones('Guardar')[0]!.disabled).toBe(true);
    expect(h.guardarUsura).not.toHaveBeenCalled();
  });

  it('🔴 un 400 con `campos` en `fuente` va bajo la fuente', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const mensaje = 'La fuente puede tener hasta 200 caracteres.';
    h.guardarUsura.mockRejectedValueOnce(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'fuente', regla: 'longitud_maxima', mensaje }],
      }),
    );
    await abrirEditor();
    escribir(document.body.querySelector<HTMLInputElement>('#tasa-efectiva')!, '25,5');
    await act(async () => {
      botones('Guardar')[0]!.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    const fuente = document.body.querySelector<HTMLInputElement>('#tasa-fuente')!;
    expect(fuente.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('tasa-fuente-error')?.textContent).toBe(mensaje);
    expect(document.activeElement).toBe(fuente);
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const { toast } = await import('@/components/ui/toast');
    h.guardarUsura.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'eeee5555',
      }),
    );
    await abrirEditor();
    escribir(document.body.querySelector<HTMLInputElement>('#tasa-efectiva')!, '25,5');
    await act(async () => {
      botones('Guardar')[0]!.click();
      await new Promise((r) => setTimeout(r, 0));
    });

    const [, opciones] = vi.mocked(toast.error).mock.calls.at(-1)! as [string, { description: string }];
    expect(opciones.description).toMatch(/de nuestro lado/);
    expect(opciones.description).toContain('eeee5555');
  });
});
