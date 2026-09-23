/**
 * La tarjeta del período contable, después del glow-up del 22-09.
 *
 * Nico, con la captura de la portada: «no le hiciste el glow up y eso se ve por
 * ahí tirado todo». La tarjeta tenía cinco bloques apilados con el mismo peso
 * —título, párrafo de estado, campo de fecha suelto, «Reabrir un mes cerrado»
 * con su párrafo de tres renglones y un botón gris debajo, y la bitácora vacía
 * con su propio encabezado— y el estado, que es lo que se busca primero,
 * estaba a mitad de un párrafo gris.
 *
 * Lo que fija este archivo es lo que se ve, no la lógica del cierre (que no
 * cambió):
 *   · el estado es UNA frase arriba («Todo está abierto…» / «Cerrado hasta el…»);
 *   · mientras carga, un esqueleto con la forma de esa frase, no un texto que
 *     afirme algo, y el formulario en su lugar pero apagado;
 *   · la explicación larga NO está sobre la pantalla: está detrás de «Cómo
 *     funciona»;
 *   · el botón de reabrir apagado dice por qué, pegado a él;
 *   · la bitácora vacía es UNA línea, sin encabezado propio.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BitacoraDeReaperturas, Cierre } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, permisoMock } = vi.hoisted(() => ({
  api: { asientos: { cerrar: vi.fn(), reabrir: vi.fn(), reaperturas: vi.fn() } },
  permisoMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeReabrir: () => permisoMock };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { CierreDePeriodo } from './CierreDePeriodo';
import { MOTIVO_SIN_REAPERTURA } from '../use-puede-escribir';

const bitacora = (extra: Partial<BitacoraDeReaperturas> = {}): BitacoraDeReaperturas => ({
  disponible: true,
  motivo: null,
  reaperturas: [],
  ...extra,
});

let host: HTMLDivElement;
let root: Root;
const q = (t: string) => document.querySelector<HTMLElement>(`[data-testid="${t}"]`);

beforeEach(() => {
  api.asientos.reaperturas.mockReset().mockResolvedValue(bitacora());
  permisoMock.puede = true;
  permisoMock.motivo = null;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

async function pintar(props: { cierre: Cierre | null; cargando?: boolean; fallo?: boolean }) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<CierreDePeriodo {...props} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<CierreDePeriodo> · el estado en una frase', () => {
  it('🔴 nada cerrado: «Todo está abierto», arriba y en una frase', async () => {
    await pintar({ cierre: { cerradaHasta: null } as Cierre });
    expect(q('estado-del-periodo')!.textContent).toBe(
      'Todo está abierto: cualquier fecha admite asientos.',
    );
    // Es lo primero que se lee de la tarjeta: va antes del formulario de cierre.
    const tarjeta = q('cierre-de-periodo')!;
    const orden = [q('estado-del-periodo')!, q('cierre-hasta')!];
    expect(
      orden[0].compareDocumentPosition(orden[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(tarjeta.contains(orden[0])).toBe(true);
  });

  it('cerrado: «Cerrado hasta el 31 de agosto de 2026.»', async () => {
    await pintar({ cierre: { cerradaHasta: '2026-08-31' } as Cierre });
    expect(q('estado-del-periodo')!.textContent).toBe('Cerrado hasta el 31 de agosto de 2026.');
  });

  it('🔴 un fallo no se dice como «todo abierto»', async () => {
    await pintar({ cierre: null, fallo: true });
    expect(q('estado-del-periodo')!.textContent).not.toMatch(/abierto/i);
    expect(q('estado-del-periodo')!.textContent).toMatch(/No pude consultar/);
    // Tampoco el porqué del botón de reabrir.
    expect(q('abrir-reapertura-motivo')!.textContent).not.toMatch(/abierto/i);
  });

  it('🔴 cargando: la FORMA de la frase y el formulario apagado en su lugar, sin afirmar nada', async () => {
    await pintar({ cierre: null, cargando: true });
    expect(q('estado-del-periodo')).toBeNull();
    const esqueleto = q('estado-del-periodo-cargando')!;
    expect(esqueleto.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    expect(q('cierre-de-periodo')!.getAttribute('aria-busy')).toBe('true');
    // El formulario ya está donde va a estar: nada salta cuando llega el dato.
    expect((q('cierre-hasta') as HTMLInputElement).disabled).toBe(true);
    expect((q('abrir-cierre') as HTMLButtonElement).disabled).toBe(true);
    // Y ni una frase que afirme el estado.
    expect(q('cierre-de-periodo')!.textContent).not.toMatch(/abierto|Cerrado hasta/);
  });
});

describe('<CierreDePeriodo> · lo que ya no está tirado', () => {
  it('🔴 la explicación larga no está sobre la pantalla: está detrás de «Cómo funciona»', async () => {
    await pintar({ cierre: { cerradaHasta: '2026-08-31' } as Cierre });
    const tarjeta = q('cierre-de-periodo')!;
    expect(tarjeta.textContent).not.toContain('no se desmarcan');
    const boton = tarjeta.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!;
    expect(boton.textContent).toContain('Cómo funciona');
    await act(async () => {
      boton.click();
    });
    expect(q('para-entender-mas-contenido')!.textContent).toContain('no se desmarcan');
  });

  it('🔴 «Reabrir…» apagado dice por qué, pegado al botón y visible', async () => {
    permisoMock.puede = false;
    permisoMock.motivo = MOTIVO_SIN_REAPERTURA;
    await pintar({ cierre: { cerradaHasta: '2026-08-31' } as Cierre });
    const boton = q('abrir-reapertura') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    const porque = q('abrir-reapertura-motivo')!;
    expect(porque.textContent).toContain('El contador cierra');
    expect(boton.getAttribute('aria-describedby')).toBe(porque.id);
  });

  it('con todo abierto, el porqué del botón no repite la frase de arriba', async () => {
    await pintar({ cierre: { cerradaHasta: null } as Cierre });
    expect(q('abrir-reapertura-motivo')!.textContent).toBe(
      'Con todo abierto no hay nada que reabrir.',
    );
  });

  it('🔴 la bitácora vacía es UNA línea, sin encabezado propio', async () => {
    await pintar({ cierre: { cerradaHasta: '2026-08-31' } as Cierre });
    const linea = q('bitacora-vacia')!;
    expect(linea.tagName).toBe('P');
    expect(linea.textContent).toContain('Bitácora de reaperturas:');
    expect(linea.textContent).toContain('nadie reabrió un período todavía');
    expect(q('bitacora-de-reaperturas')).toBeNull();
  });

  it('con varias reaperturas se ve la última entera y el resto se abre', async () => {
    const fila = (id: string, motivo: string) => ({
      id,
      agencyId: 'a-1',
      fronteraAnterior: '2025-12-31T00:00:00.000Z',
      fronteraNueva: '2025-11-30T00:00:00.000Z',
      motivo,
      reabiertoPorUserId: 'u-9',
      reabiertoAt: '2026-09-19T14:00:00.000Z',
    });
    api.asientos.reaperturas.mockResolvedValue(
      bitacora({ reaperturas: [fila('r-2', 'La más reciente'), fila('r-1', 'La vieja')] }),
    );
    await pintar({ cierre: { cerradaHasta: '2025-11-30' } as Cierre });
    let filas = document.querySelectorAll('[data-testid="fila-de-reapertura"]');
    expect(filas).toHaveLength(1);
    expect(filas[0].textContent).toContain('La más reciente');

    await act(async () => {
      q('bitacora-ver-todas')!.click();
    });
    filas = document.querySelectorAll('[data-testid="fila-de-reapertura"]');
    expect(filas).toHaveLength(2);
  });
});
