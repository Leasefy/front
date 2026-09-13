/**
 * MapeoContable.test.tsx — qué falta, dicho de forma que se entienda.
 *
 * 🔴 Nico, 2026-09-12, en el paso 5 con 2.790 cuentas y 6 eventos sin asignar:
 * «fue muy extraño porque los que no tenía seleccionado me tocó
 * seleccionarlos para poder que sí me dejara pasar, y hay que dar feedback
 * porque no se entiende nada».
 *
 * Dos cosas se probaron acá. Lo que la tabla DICE —cuántas faltan y qué hacer,
 * con cada fila marcada— y lo que la tabla REPORTA hacia afuera: el pie del
 * paso 5 decide con eso si ofrece «Continuar al paso 6», y `PlanDeCuentas`
 * mockea este componente en sus propias pruebas. Sin este archivo, ese mock
 * podría separarse del componente real sin que nada se ponga rojo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, cuentasMock } = vi.hoisted(() => ({
  api: {
    mapeo: { obtener: vi.fn(), guardar: vi.fn(), sembrar: vi.fn() },
    asientos: { faltantes: vi.fn(), reprocesar: vi.fn() },
  },
  cuentasMock: { cuentas: [] as unknown[], cargando: false },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('../use-cuentas', async () => {
  const actual = await vi.importActual<typeof import('../use-cuentas')>('../use-cuentas');
  return { ...actual, useCuentas: () => cuentasMock };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { MapeoContable, type EstadoDelMapeo } from './MapeoContable';

const evento = (nombre: string, conCuenta: boolean) => ({
  evento: nombre,
  nombre: `Evento ${nombre}`,
  explicacion: 'Lo que hace',
  lado: 'DEBE',
  cuenta: conCuenta ? { id: `c-${nombre}`, codigo: '110505', nombre: 'Caja' } : null,
  propuesta: null,
  codigoPropuesto: '110505',
});

function mapeoCon(conCuenta: number, sinCuenta: number) {
  const eventos = [
    ...Array.from({ length: conCuenta }, (_, i) => evento(`ok${i}`, true)),
    ...Array.from({ length: sinCuenta }, (_, i) => evento(`falta${i}`, false)),
  ];
  return {
    eventos,
    completo: sinCuenta === 0,
    faltantes: eventos.filter((e) => e.cuenta === null).map((e) => e.evento),
  };
}

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.mapeo.obtener.mockReset();
  api.asientos.faltantes.mockReset().mockResolvedValue({ total: 0, cobros: 0, recibos: 0, lotes: 0, mapeoCompleto: true });
  cuentasMock.cuentas = [];
  cuentasMock.cargando = false;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(onEstado?: (e: EstadoDelMapeo) => void) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MapeoContable onEstado={onEstado} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<MapeoContable>', () => {
  it('🔴 reporta hacia afuera cuántas faltan: de eso depende el pie del paso 5', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(3, 6));
    const visto: EstadoDelMapeo[] = [];

    await pintar((e) => visto.push(e));

    expect(visto.at(-1)).toEqual({ completo: false, faltan: 6, total: 9 });
  });

  it('con todo asignado reporta completo', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(9, 0));
    const visto: EstadoDelMapeo[] = [];

    await pintar((e) => visto.push(e));

    expect(visto.at(-1)).toEqual({ completo: true, faltan: 0, total: 9 });
  });

  it('vuelve a reportar al asignar una cuenta, sin recargar la pantalla', async () => {
    // Un evento sin cuenta pero CON propuesta usable: es el que dibuja el
    // botón «Usar», que llama al mismo `asignar` que el selector.
    const conPropuesta = {
      ...evento('falta0', false),
      propuesta: { id: 'c-prop', codigo: '110505', nombre: 'Caja', activa: true, imputable: true },
    };
    api.mapeo.obtener.mockResolvedValue({
      eventos: [evento('ok0', true), conPropuesta],
      completo: false,
      faltantes: ['falta0'],
    });
    api.mapeo.guardar.mockResolvedValue(mapeoCon(2, 0));
    const visto: EstadoDelMapeo[] = [];

    await pintar((e) => visto.push(e));
    expect(visto.at(-1)).toEqual({ completo: false, faltan: 1, total: 2 });

    const usar = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Usar',
    ) as HTMLButtonElement;
    expect(usar).toBeDefined();
    await act(async () => {
      usar.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.mapeo.guardar).toHaveBeenCalledWith([{ evento: 'falta0', cuentaId: 'c-prop' }]);
    expect(visto.at(-1)?.completo).toBe(true);
    expect(visto.at(-1)?.faltan).toBe(0);
  });

  /*
   * 🔴 «Hay que dar feedback porque no se entiende nada». El título decía la
   * consecuencia («sin cuenta, ese asiento no se genera») y nunca el trabajo:
   * cuántas faltan, de cuántas, y qué hay que hacer con ellas.
   */
  it('dice cuántas faltan, de cuántas, y qué hacer', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(3, 6));

    await pintar();

    const texto = q('mapeo-contable')!.textContent!;
    expect(texto).toContain('Faltan 6 de 9');
    expect(q('mapeo-que-hacer')?.textContent).toContain('Sin cuenta');
    expect(q('mapeo-que-hacer')?.textContent).toContain('el paso no queda hecho');
  });

  it('marca CADA fila que le falta la cuenta, no sólo las que la tienen', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(1, 2));

    await pintar();

    expect(q('falta-falta0')).not.toBeNull();
    expect(q('falta-falta1')).not.toBeNull();
    // La que sí tiene cuenta no lleva la marca de faltante.
    expect(q('falta-ok0')).toBeNull();
  });

  it('con todo asignado no reclama nada', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(9, 0));

    await pintar();

    expect(q('mapeo-que-hacer')).toBeNull();
    expect(q('mapeo-contable')!.textContent).toContain('Todos los eventos tienen cuenta');
  });
});
