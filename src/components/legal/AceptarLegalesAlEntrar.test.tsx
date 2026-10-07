/**
 * 🔴 Decisión 1 del 05-10-2026 (FALTANTES): la política v4.0 y los términos
 * v2.1 se aceptan UNA vez al próximo ingreso, con lo que cambió; sin aceptar
 * no se sigue; sin bucles ni pantallas negadas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, sesion, ruta } = vi.hoisted(() => ({
  api: { estado: vi.fn(), aceptar: vi.fn() },
  sesion: { user: { id: 'u-1' } as { id: string } | null, signOut: vi.fn(async () => undefined) },
  ruta: { actual: '/panel/inmobiliaria' },
}));
vi.mock('@/lib/api/aceptaciones-legales.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/aceptaciones-legales.service')>()),
  aceptacionesLegalesApi: api,
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => sesion }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

import { AceptarLegalesAlEntrar } from './AceptarLegalesAlEntrar';
import { rutaSinVentanaLegal } from '@/lib/api/aceptaciones-legales.service';

const PIDE = {
  disponible: true,
  debeAceptar: true,
  politica: { version: 'politica-tratamiento-v4.0', aceptada: false, aceptadaEl: null },
  terminos: { version: 'terminos-v2.1', aceptada: false, aceptadaEl: null },
  cambios: ['Política de tratamiento de datos, versión 4.0 (desde el 4 de octubre de 2026): cambiaron las secciones 13 y 16.', 'Términos y condiciones, versión 2.1: cambió la sección 19.'],
};

let host: HTMLDivElement;
let root: Root;
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const ventana = () => document.querySelector('[data-testid="aceptar-legales"]');

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.estado.mockReset();
  api.aceptar.mockReset();
  sesion.user = { id: 'u-1' };
  ruta.actual = '/panel/inmobiliaria';
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('AceptarLegalesAlEntrar', () => {
  it('quien no ha aceptado la versión de hoy ve qué cambió, sin ✕; «Acepto» la guarda con las versiones de hoy y se cierra', async () => {
    api.estado.mockResolvedValue(PIDE);
    api.aceptar.mockResolvedValue({ ...PIDE, debeAceptar: false });
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    expect(ventana()).not.toBeNull();
    expect(document.querySelector('[data-testid="aceptar-legales-cambios"]')!.textContent).toMatch(/secciones 13 y 16/);
    // Nico, 05-10: la cláusula de las preguntas del chat vive sólo en la política; la ventana no la repite.
    expect(ventana()!.textContent).not.toMatch(/Leasefy revisa las preguntas|12 meses/);
    expect(document.querySelector('[data-testid="aceptar-legales"] button[aria-label="Cerrar"]')).toBeNull();
    await act(async () => (document.querySelector('[data-testid="aceptar-legales-acepto"]') as HTMLElement).click());
    await esperar();
    expect(api.aceptar).toHaveBeenCalledWith('politica-tratamiento-v4.0', 'terminos-v2.1');
    expect(ventana()).toBeNull();
  });

  it('«Salir» cierra la sesión (sin aceptar no se sigue)', async () => {
    api.estado.mockResolvedValue(PIDE);
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    await act(async () => (document.querySelector('[data-testid="aceptar-legales-salir"]') as HTMLElement).click());
    expect(sesion.signOut).toHaveBeenCalled();
  });

  it('no aparece donde hay que poder leer, ni sin dónde guardarla, ni ya aceptada, ni sin sesión', async () => {
    ruta.actual = '/privacidad';
    api.estado.mockResolvedValue(PIDE);
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    expect(ventana()).toBeNull();

    ruta.actual = '/panel/inmobiliaria';
    api.estado.mockResolvedValue({ ...PIDE, disponible: false });
    await act(async () => root.render(<AceptarLegalesAlEntrar key="2" />));
    await esperar();
    expect(ventana()).toBeNull();

    api.estado.mockResolvedValue({ ...PIDE, debeAceptar: false });
    await act(async () => root.render(<AceptarLegalesAlEntrar key="3" />));
    await esperar();
    expect(ventana()).toBeNull();

    sesion.user = null;
    api.estado.mockClear();
    await act(async () => root.render(<AceptarLegalesAlEntrar key="4" />));
    await esperar();
    expect(api.estado).not.toHaveBeenCalled();
  });

  it('el back caído no deja a nadie atrapado', async () => {
    api.estado.mockRejectedValue(new Error('caído'));
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    expect(ventana()).toBeNull();
  });

  it('las rutas sin la ventana', () => {
    expect(rutaSinVentanaLegal('/terminos')).toBe(true);
    expect(rutaSinVentanaLegal('/auth/mfa-verify')).toBe(true);
    expect(rutaSinVentanaLegal('/firmar/acta/x')).toBe(true);
    expect(rutaSinVentanaLegal('/inquilino')).toBe(false);
  });
});
