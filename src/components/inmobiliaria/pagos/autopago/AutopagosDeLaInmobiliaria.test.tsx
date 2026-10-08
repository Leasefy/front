/**
 * Autopago para la inmobiliaria contra un DOBLE de `GET /inmobiliaria/autopago`.
 *
 * Lo que importa: con el cobro automático apagado en el servidor (hasta que
 * Nico lo pruebe en QA) la pantalla lo dice ARRIBA, porque un «Activo» en la
 * fila no quiere decir que se esté cobrando. Y es sólo lectura.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}));
const pantalla = { movil: false };
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => pantalla.movil }));

const get = vi.fn();
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { get: (...a: unknown[]) => get(...a) },
}));

import { AutopagosDeLaInmobiliaria } from './AutopagosDeLaInmobiliaria';
import type { AutopagoDeContrato, AutopagosDeLaInmobiliaria as Respuesta } from '@/lib/types/payu';

const autopago = (parcial: Partial<AutopagoDeContrato>): AutopagoDeContrato => ({
  contratoId: 'k1',
  contratoNumero: '#43',
  inquilino: 'Marta Gómez',
  inmueble: 'Apartamento 101',
  activo: true,
  topeCop: 2_000_000,
  ultimoIntento: { estado: 'APROBADO', montoCop: 1_500_000, fecha: '2026-10-05T11:00:03.000Z', motivo: null },
  ...parcial,
});

const CINCO: AutopagoDeContrato[] = [
  autopago({ contratoId: 'k-aprobado' }),
  autopago({
    contratoId: 'k-rechazado',
    ultimoIntento: { estado: 'RECHAZADO', montoCop: 1_500_000, fecha: '2026-10-05T11:00:03.000Z', motivo: 'Fondos insuficientes' },
  }),
  autopago({
    contratoId: 'k-pendiente',
    ultimoIntento: { estado: 'PENDIENTE', montoCop: 1_500_000, fecha: '2026-10-05T11:00:03.000Z', motivo: null },
  }),
  autopago({
    contratoId: 'k-error',
    ultimoIntento: { estado: 'ERROR', montoCop: 1_500_000, fecha: '2026-10-05T11:00:03.000Z', motivo: 'La pasarela no respondió' },
  }),
  autopago({ contratoId: 'k-nunca', activo: false, ultimoIntento: null }),
];

const respuesta = (parcial: Partial<Respuesta>): Respuesta => ({
  cobroAutomaticoActivo: false,
  items: CINCO,
  ...parcial,
});

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pantalla.movil = false;
  get.mockReset();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

async function montar() {
  await act(async () => root.render(<AutopagosDeLaInmobiliaria />));
  await act(async () => {
    await Promise.resolve();
  });
}

const q = (sel: string) => contenedor.querySelector(sel);
const fila = (id: string) => q(`[data-testid="autopago-${id}"]`);

describe('Autopago — cobro automático apagado en el servidor', () => {
  it('🔴 lo dice arriba de la lista, con icono y palabras', async () => {
    get.mockResolvedValue(respuesta({ cobroAutomaticoActivo: false }));
    await montar();
    expect(get).toHaveBeenCalledWith('/inmobiliaria/autopago');
    const aviso = q('[data-testid="cobro-automatico"]');
    expect(aviso?.getAttribute('data-activo')).toBe('no');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.textContent).toContain('El cobro automático está apagado en el servidor.');
    expect(aviso?.textContent).toContain('ningún autopago de esta lista se cobra solo');
    expect(aviso?.querySelector('svg')).not.toBeNull();
    // El aviso va ANTES de la lista.
    const lista = q('[data-testid="autopagos"]')!;
    expect(aviso!.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('igual muestra la lista: contrato, inquilino, tope y último intento', async () => {
    get.mockResolvedValue(respuesta({}));
    await montar();
    const f = fila('k-aprobado');
    expect(f?.textContent).toContain('#43');
    expect(f?.textContent).toContain('Apartamento 101');
    expect(f?.textContent).toContain('Marta Gómez');
    expect(f?.textContent).toContain('$\u00a02.000.000');
    expect(f?.textContent).toContain('$\u00a01.500.000');
  });
});

describe('Autopago — cobro automático prendido', () => {
  it('lo dice sin alarma y no pinta el aviso de apagado', async () => {
    get.mockResolvedValue(respuesta({ cobroAutomaticoActivo: true }));
    await montar();
    const aviso = q('[data-testid="cobro-automatico"]');
    expect(aviso?.getAttribute('data-activo')).toBe('si');
    expect(contenedor.textContent).toContain('El cobro automático está prendido');
    expect(contenedor.textContent).not.toContain('apagado en el servidor');
  });
});

describe('Autopago — cada fila', () => {
  it('🔴 el último intento con icono y palabra en sus cuatro estados, y «nunca» sin inventar', async () => {
    get.mockResolvedValue(respuesta({}));
    await montar();
    const palabras: Record<string, string> = {
      'k-aprobado': 'Aprobado',
      'k-rechazado': 'Rechazado',
      'k-pendiente': 'Pendiente',
      'k-error': 'Error',
    };
    for (const [id, palabra] of Object.entries(palabras)) {
      const intento = fila(id)?.querySelector('[data-testid="ultimo-intento"]');
      expect(intento?.textContent, id).toContain(palabra);
      expect(intento?.querySelector('svg'), id).not.toBeNull();
    }
    expect(fila('k-rechazado')?.textContent).toContain('Fondos insuficientes');
    expect(fila('k-pendiente')?.textContent).toContain('La pasarela todavía no confirma este cobro.');
    const nunca = fila('k-nunca')?.querySelector('[data-testid="ultimo-intento"]');
    expect(nunca?.getAttribute('data-estado')).toBe('nunca');
    expect(nunca?.textContent).toContain('Nunca se ha intentado cobrar.');
    expect(nunca?.textContent).not.toContain('$');
  });

  it('activo e inactivo con icono y palabra', async () => {
    get.mockResolvedValue(respuesta({}));
    await montar();
    expect(fila('k-aprobado')?.querySelector('[data-testid="autopago-activo"]')?.textContent).toContain('Activo');
    const inactivo = fila('k-nunca')?.querySelector('[data-testid="autopago-activo"]');
    expect(inactivo?.textContent).toContain('Inactivo');
    expect(inactivo?.querySelector('svg')).not.toBeNull();
  });

  it('🔴 es sólo lectura: ni un botón para cobrar, pausar o cancelar', async () => {
    get.mockResolvedValue(respuesta({ cobroAutomaticoActivo: true }));
    await montar();
    expect(contenedor.querySelectorAll('button')).toHaveLength(0);
  });

  it('en el teléfono es una lista, no una tabla', async () => {
    pantalla.movil = true;
    get.mockResolvedValue(respuesta({}));
    await montar();
    expect(q('[data-testid="lista-de-autopagos"]')).not.toBeNull();
    expect(q('table')).toBeNull();
  });
});

describe('Autopago — vacío y fallo', () => {
  it('sin autopagos lo dice, y el aviso del servidor sigue arriba', async () => {
    get.mockResolvedValue(respuesta({ items: [] }));
    await montar();
    expect(contenedor.textContent).toContain('Ningún inquilino tiene autopago');
    expect(q('[data-testid="cobro-automatico"]')?.getAttribute('data-activo')).toBe('no');
  });

  it('si el back falla, no afirma nada sobre el cobro automático y deja reintentar', async () => {
    get.mockRejectedValue(new Error('500'));
    await montar();
    expect(q('[data-testid="cobro-automatico"]')).toBeNull();
    expect(contenedor.textContent).not.toMatch(/apagado|prendido/);
    const reintentar = [...contenedor.querySelectorAll('button')].find((b) => /intentar/i.test(b.textContent ?? ''));
    expect(reintentar).toBeTruthy();
  });
});
