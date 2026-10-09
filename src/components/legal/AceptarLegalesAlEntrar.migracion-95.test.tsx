/**
 * 🔴 08-10-2026 (Nico): «debe aparecer es en el home luego de que ya tenga todo
 * check». La ventana legal ya NO sale con la puesta en marcha delante: espera a
 * que «¿Migramos tu inmobiliaria?» se vaya. Lo de abajo (QA-MIGRACION-95) sigue
 * valiendo para el caso raro en que aparezca DESPUÉS de abrirse: la ventana y
 * su velo quedan por encima, nunca tapados.
 *
 * 🔴 QA-MIGRACION-95 (06-10-2026): la ventana legal va POR ENCIMA de la
 * decisión de migración.
 *
 * Visto en el navegador con una inmobiliaria nueva: «¿Migramos tu
 * inmobiliaria?» (`TarjetaDePuestaEnMarcha`, capa `z-[1000]`) se pintaba
 * encima de «Actualizamos la política de datos y los términos» (`z-[300]`).
 * El diálogo de Radix es modal: le quita los clics a todo lo que está fuera
 * de él, así que «Migrar ahora», «En otro momento» y «No requiero migración»
 * no respondían, y la ventana que sí los recibía estaba tapada. La persona
 * quedaba mirando una pregunta que no podía contestar.
 *
 * «Sin aceptar no se sigue» (decisión 1 del 05-10): la ventana legal tiene que
 * ser lo de más arriba, por encima de las capas de la puesta en marcha
 * (decisión y velo de espera, `z-[1000]`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, sesion } = vi.hoisted(() => ({
  api: { estado: vi.fn(), aceptar: vi.fn() },
  sesion: {
    user: { id: 'u-1', role: 'agency' } as { id: string; role: string } | null,
    signOut: vi.fn(async () => undefined),
    activeContext: 'agency' as const,
    agencyRole: 'ADMIN' as const,
  },
}));
vi.mock('@/lib/api/aceptaciones-legales.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/aceptaciones-legales.service')>()),
  aceptacionesLegalesApi: api,
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => sesion }));
vi.mock('next/navigation', () => ({ usePathname: () => '/panel/inmobiliaria/piloto' }));

import { AceptarLegalesAlEntrar } from './AceptarLegalesAlEntrar';
import { LATIDO_MS, LATIDOS_EN_CALMA } from '@/lib/legal/cuando-sale-la-ventana-legal';

const esperar = () => act(async () => { await vi.advanceTimersByTimeAsync(LATIDO_MS * (LATIDOS_EN_CALMA + 1)); });

const PIDE = {
  disponible: true,
  debeAceptar: true,
  politica: { version: 'politica-tratamiento-v4.0', aceptada: false, aceptadaEl: null },
  terminos: { version: 'terminos-v2.1', aceptada: false, aceptadaEl: null },
  cambios: ['Política de tratamiento de datos, versión 4.0: cambiaron las secciones 13 y 16.'],
};

/** La capa de la decisión de migración y del velo de espera de la puesta en marcha. */
const CAPA_DE_LA_PUESTA_EN_MARCHA = 1000;

function capa(el: Element | null): number {
  const m = /(?:^|\s)z-\[(\d+)\]/.exec(el?.getAttribute('class') ?? '');
  return m ? Number(m[1]) : 0;
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.estado.mockReset();
  api.estado.mockResolvedValue(PIDE);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe('AceptarLegalesAlEntrar sobre la puesta en marcha', () => {
  it('🔴 con «¿Migramos tu inmobiliaria?» en pantalla espera; cuando se va, sale', async () => {
    const pregunta = document.createElement('div');
    pregunta.setAttribute('data-testid', 'decision-de-migracion');
    document.body.appendChild(pregunta);
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    expect(document.querySelector('[data-testid="aceptar-legales"]')).toBeNull();
    pregunta.remove();
    await esperar();
    expect(document.querySelector('[data-testid="aceptar-legales"]')).not.toBeNull();
  });

  it('la ventana y su velo quedan por encima de «¿Migramos tu inmobiliaria?»', async () => {
    await act(async () => root.render(<AceptarLegalesAlEntrar />));
    await esperar();
    const ventana = document.querySelector('[data-testid="aceptar-legales"]');
    expect(ventana).not.toBeNull();
    expect(capa(ventana)).toBeGreaterThan(CAPA_DE_LA_PUESTA_EN_MARCHA);
    // El velo del diálogo (hermano en el portal) también: si no, lo de abajo se ve sin difuminar.
    const velos = [...document.querySelectorAll('[data-state="open"]')].filter((el) => el !== ventana && /(?:^|\s)fixed(?:\s|$)/.test(el.getAttribute('class') ?? '') && /inset-0/.test(el.getAttribute('class') ?? ''));
    expect(velos.length).toBeGreaterThan(0);
    for (const v of velos) expect(capa(v)).toBeGreaterThan(CAPA_DE_LA_PUESTA_EN_MARCHA);
  });
});
