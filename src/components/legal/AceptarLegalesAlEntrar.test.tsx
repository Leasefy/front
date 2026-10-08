/**
 * 🔴 Decisión 1 del 05-10-2026 (FALTANTES): la política v4.0 y los términos
 * v2.1 se aceptan UNA vez, con lo que cambió; sin aceptar no se sigue; sin
 * bucles ni pantallas negadas. Y desde el 08-10 (Nico): sólo en el HOME, con
 * todo lo demás hecho.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, sesion, ruta } = vi.hoisted(() => ({
  api: { estado: vi.fn(), aceptar: vi.fn() },
  sesion: {
    user: { id: 'u-1', role: 'agency' } as { id: string; role: string } | null,
    signOut: vi.fn(async () => undefined),
    activeContext: 'agency' as const,
    agencyRole: 'ADMIN' as const,
  },
  ruta: { actual: '/panel/inmobiliaria/piloto' },
}));
vi.mock('@/lib/api/aceptaciones-legales.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/aceptaciones-legales.service')>()),
  aceptacionesLegalesApi: api,
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => sesion }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

import { AceptarLegalesAlEntrar } from './AceptarLegalesAlEntrar';
import { rutaSinVentanaLegal } from '@/lib/api/aceptaciones-legales.service';
import { LATIDO_MS, LATIDOS_EN_CALMA } from '@/lib/legal/cuando-sale-la-ventana-legal';

const PIDE = {
  disponible: true,
  debeAceptar: true,
  politica: { version: 'politica-tratamiento-v4.0', aceptada: false, aceptadaEl: null },
  terminos: { version: 'terminos-v2.1', aceptada: false, aceptadaEl: null },
  cambios: ['Política de tratamiento de datos, versión 4.0 (desde el 4 de octubre de 2026): cambiaron las secciones 13 y 16.', 'Términos y condiciones, versión 2.1: cambió la sección 19.'],
};

let host: HTMLDivElement;
let root: Root;
/** Lo que tarda en salir: la respuesta del back y los latidos en calma. */
const esperar = () => act(async () => { await vi.advanceTimersByTimeAsync(LATIDO_MS * (LATIDOS_EN_CALMA + 1)); });
const ventana = () => document.querySelector('[data-testid="aceptar-legales"]');

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.estado.mockReset();
  api.aceptar.mockReset();
  sesion.user = { id: 'u-1', role: 'agency' };
  sesion.activeContext = 'agency';
  ruta.actual = '/panel/inmobiliaria/piloto';
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.documentElement.removeAttribute('data-recorrido-pendiente');
  vi.useRealTimers();
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

    ruta.actual = '/panel/inmobiliaria/piloto';
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

  it('🔴 no sale encima de «¿Cómo vas a usar Leasefy?» ni fuera del home (Nico, 08-10)', async () => {
    api.estado.mockResolvedValue(PIDE);
    for (const [i, otra] of ['/onboarding/seleccionar-rol', '/panel/inmobiliaria', '/panel/inmobiliaria/contratos'].entries()) {
      ruta.actual = otra;
      await act(async () => root.render(<AceptarLegalesAlEntrar key={`fuera-${i}`} />));
      await esperar();
      expect(ventana()).toBeNull();
    }
  });

  it('el home de cada rol: el inquilino en /inquilino, el propietario en /panel', async () => {
    api.estado.mockResolvedValue(PIDE);
    sesion.activeContext = 'personal' as never;
    sesion.user = { id: 'u-2', role: 'tenant' };
    ruta.actual = '/inquilino';
    await act(async () => root.render(<AceptarLegalesAlEntrar key="inquilino" />));
    await esperar();
    expect(ventana()).not.toBeNull();
  });

  it('🔴 espera al recorrido del panel: sale cuando ya no falta', async () => {
    api.estado.mockResolvedValue(PIDE);
    document.documentElement.setAttribute('data-recorrido-pendiente', '');
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    expect(ventana()).toBeNull();
    document.documentElement.removeAttribute('data-recorrido-pendiente');
    await esperar();
    expect(ventana()).not.toBeNull();
  });

  it('las rutas sin la ventana', () => {
    expect(rutaSinVentanaLegal('/terminos')).toBe(true);
    expect(rutaSinVentanaLegal('/auth/mfa-verify')).toBe(true);
    expect(rutaSinVentanaLegal('/firmar/acta/x')).toBe(true);
    expect(rutaSinVentanaLegal('/inquilino')).toBe(false);
  });
});
