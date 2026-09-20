/**
 * Reabrir un mes cerrado.
 *
 * Los cuatro casos que este archivo protege, y ninguno es cosmético:
 *
 * 🔴 1. El diálogo dice qué queda cerrado DESPUÉS. «Reabrir diciembre» se pide
 *       con `2025-12-01` y la frontera termina en el 30 de noviembre. Si la
 *       pantalla repitiera la fecha escrita, la persona confirmaría creyendo
 *       que deja diciembre cerrado.
 *
 * 🔴 2. Lo que viaja al back es `{ hasta, motivo }` y nada más: el
 *       `ValidationPipe` corre con `forbidNonWhitelisted`. Y «reabrir todo» NO
 *       manda `hasta: null` — lo OMITE, porque el DTO es `@IsDateString()` y
 *       un null explícito es un 400.
 *
 * 🔴 3. Al que no es ADMIN se le explica por qué no tiene el botón, con el
 *       texto del back: el contador cierra, y deshacer el cierre es otra
 *       decisión. Un botón que desaparece manda a adivinar.
 *
 * 🔴 4. El `aviso` del back se queda en pantalla: los asientos marcados NO se
 *       desmarcan. Eso no cabe en un toast que se va solo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { BitacoraDeReaperturas, ResultadoDeReapertura } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, permisoMock, toastMock } = vi.hoisted(() => ({
  api: { asientos: { reabrir: vi.fn(), reaperturas: vi.fn() } },
  permisoMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { Reapertura } from './Reapertura';
import { MOTIVO_SIN_REAPERTURA } from '../use-puede-escribir';
import { diaLegible } from '@/lib/contabilidad/fechas';

const bitacora = (extra: Partial<BitacoraDeReaperturas> = {}): BitacoraDeReaperturas => ({
  disponible: true,
  motivo: null,
  reaperturas: [],
  ...extra,
});

const resultado = (extra: Partial<ResultadoDeReapertura> = {}): ResultadoDeReapertura => ({
  reapertura: {
    id: 'r-1',
    agencyId: 'a-1',
    fronteraAnterior: '2025-12-31T00:00:00.000Z',
    fronteraNueva: '2025-11-30T00:00:00.000Z',
    motivo: 'Faltó causar la factura de aseo',
    reabiertoPorUserId: 'u-1',
    reabiertoAt: '2026-09-19T14:00:00.000Z',
  },
  fronteraAnterior: '2025-12-31',
  fronteraNueva: '2025-11-30',
  aviso:
    'Se movió la frontera del cierre. Los asientos que ya estaban marcados como cerrados NO se desmarcan.',
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;
const todos = (t: string) =>
  Array.from(document.querySelectorAll(`[data-testid="${t}"]`)) as HTMLElement[];

beforeEach(() => {
  api.asientos.reabrir.mockReset().mockResolvedValue(resultado());
  api.asientos.reaperturas.mockReset().mockResolvedValue(bitacora());
  permisoMock.puede = true;
  permisoMock.motivo = null;
  permisoMock.usuarioId = 'u-1';
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(cerradaHasta: string | null = '2025-12-31') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Reapertura cerradaHasta={cerradaHasta} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
    await Promise.resolve();
  });
}

/** Escribe en un input/textarea controlado por React. */
async function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const prototipo = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(prototipo.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function abrirDialogo() {
  await clic(q('abrir-reapertura')!);
}

describe('<Reapertura>', () => {
  it('🔴 el diálogo dice qué queda cerrado DESPUÉS, no la fecha que se escribió', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();

    // Arranca proponiendo el primero del mes cerrado: «reabrir diciembre».
    expect((q('reapertura-hasta') as HTMLInputElement).value).toBe('2025-12-01');

    const resultado = q('resultado-de-la-reapertura')!;
    expect(resultado.textContent).toContain(`quedará cerrada hasta el ${diaLegible('2025-11-30')}`);
    expect(resultado.textContent).toContain(`no hasta el ${diaLegible('2025-12-01')}`);
  });

  it('🔴 manda SÓLO { hasta, motivo } — forbidNonWhitelisted', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();
    await escribir(q('reapertura-motivo') as HTMLTextAreaElement, 'Faltó causar la factura de aseo');
    await clic(q('confirmar-reapertura')!);

    expect(api.asientos.reabrir).toHaveBeenCalledWith('2025-12-01', 'Faltó causar la factura de aseo');
  });

  it('🔴 «reabrir todo» manda la fecha en null y avisa que no queda ninguna cerrada', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();
    await clic(q('reapertura-todo')!);

    expect(q('resultado-de-la-reapertura')!.textContent).toContain('TODO');

    await escribir(q('reapertura-motivo') as HTMLTextAreaElement, 'Migración mal fechada');
    await clic(q('confirmar-reapertura')!);

    expect(api.asientos.reabrir).toHaveBeenCalledWith(null, 'Migración mal fechada');
  });

  it('sin motivo no deja confirmar y dice por qué', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();

    expect((q('confirmar-reapertura') as HTMLButtonElement).disabled).toBe(true);
    expect(q('problema-de-reapertura')!.textContent).toContain('motivo');
    expect(api.asientos.reabrir).not.toHaveBeenCalled();
  });

  it('una fecha posterior a la frontera se frena acá: eso es cerrar, no reabrir', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();
    await escribir(q('reapertura-hasta') as HTMLInputElement, '2026-03-01');
    await escribir(q('reapertura-motivo') as HTMLTextAreaElement, 'Un motivo cualquiera');

    expect(q('problema-de-reapertura')!.textContent).toContain('no mueve nada hacia atrás');
    expect((q('confirmar-reapertura') as HTMLButtonElement).disabled).toBe(true);
  });

  it('🔴 al que no es ADMIN se le dice por qué, con el texto del back', async () => {
    permisoMock.puede = false;
    permisoMock.motivo = MOTIVO_SIN_REAPERTURA;
    await pintar('2025-12-31');

    expect((q('abrir-reapertura') as HTMLButtonElement).disabled).toBe(true);
    expect(q('abrir-reapertura-motivo')!.textContent).toContain('El contador cierra');
  });

  it('sin nada cerrado el botón está apagado y lo explica', async () => {
    await pintar(null);
    expect((q('abrir-reapertura') as HTMLButtonElement).disabled).toBe(true);
    expect(q('abrir-reapertura-motivo')!.textContent).toContain('no hay nada que reabrir');
  });

  it('🔴 el aviso del back queda en pantalla: los asientos NO se desmarcan', async () => {
    await pintar('2025-12-31');
    await abrirDialogo();
    await escribir(q('reapertura-motivo') as HTMLTextAreaElement, 'Faltó causar la factura de aseo');
    await clic(q('confirmar-reapertura')!);

    expect(q('aviso-de-la-reapertura')!.textContent).toContain('NO se desmarcan');
  });

  it('la bitácora dice de qué fecha a qué fecha y el motivo completo', async () => {
    api.asientos.reaperturas.mockResolvedValue(
      bitacora({
        reaperturas: [
          {
            id: 'r-1',
            agencyId: 'a-1',
            fronteraAnterior: '2025-12-31T00:00:00.000Z',
            fronteraNueva: '2025-11-30T00:00:00.000Z',
            motivo: 'Faltó causar la factura de diciembre del proveedor de aseo',
            reabiertoPorUserId: 'u-9',
            reabiertoAt: '2026-09-19T14:00:00.000Z',
          },
        ],
      }),
    );
    await pintar('2025-11-30');

    const fila = todos('fila-de-reapertura')[0];
    expect(fila.textContent).toContain(`de ${diaLegible('2025-12-31')} a ${diaLegible('2025-11-30')}`);
    expect(fila.textContent).toContain('proveedor de aseo');
  });

  it('🔴 una reapertura total en la bitácora no se pinta como un guion', async () => {
    api.asientos.reaperturas.mockResolvedValue(
      bitacora({
        reaperturas: [
          {
            id: 'r-2',
            agencyId: 'a-1',
            fronteraAnterior: '2025-12-31T00:00:00.000Z',
            fronteraNueva: null,
            motivo: 'La migración entró con fechas del año que no era',
            reabiertoPorUserId: 'u-1',
            reabiertoAt: '2026-09-19T14:00:00.000Z',
          },
        ],
      }),
    );
    await pintar(null);

    expect(todos('fila-de-reapertura')[0].textContent).toContain('sin ninguna fecha cerrada');
  });

  it('sin la migración 68 no se dibuja el botón: explica qué falta y quién la aplica', async () => {
    api.asientos.reaperturas.mockResolvedValue(
      bitacora({
        disponible: false,
        motivo:
          'Falta la migración 20260919000000_reapertura_contable_y_comision_de_venta para poder reabrir un mes cerrado.',
      }),
    );
    await pintar('2025-12-31');

    expect(q('reapertura-sin-migracion')!.textContent).toContain('20260919000000');
    expect(q('reapertura-sin-migracion')!.textContent).toContain('La aplica Víctor');
    expect(q('abrir-reapertura')).toBeNull();
  });
});
