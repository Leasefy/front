/**
 * Los rubros del P&G — lo que la pantalla dice y lo que MANDA al back.
 *
 * Los tres casos que este archivo protege:
 *
 * 🔴 1. Agregar o quitar una cuenta manda el juego COMPLETO. El `PUT` reemplaza,
 *       así que mandar sólo la cuenta nueva dejaría el rubro con una sola, y
 *       mandar sólo el delta al quitar dejaría las tres que había.
 *
 * 🔴 2. Sin la migración 49 no se dibuja NADA editable. Cada `PUT` sería un 503,
 *       y un selector que sólo produce errores es peor que no tener selector.
 *
 * 🔴 3. Un rubro con fuente propia dice que el mapeo no la reemplaza. Sin esa
 *       frase, ver dos números distintos en la misma fila del presupuesto parece
 *       un bug del producto, cuando es el control que se quería.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CuentaDelRubro, MapeoDeRubro, MapeoDeRubros } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, cuentasMock, escrituraMock } = vi.hoisted(() => ({
  api: {
    mapeo: { rubros: vi.fn(), guardarRubro: vi.fn(), sembrarRubros: vi.fn(), borrarRubro: vi.fn() },
  },
  cuentasMock: { cuentas: [] as unknown[], cargando: false },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
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
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeEscribir: () => escrituraMock };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { RubrosDelPyg } from './RubrosDelPyg';

const cuenta = (extra: Partial<CuentaDelRubro> = {}): CuentaDelRubro => ({
  id: 'c-5135',
  codigo: '5135',
  nombre: 'Servicios',
  naturaleza: 'DEBITO',
  imputable: false,
  ...extra,
});

const rubro = (extra: Partial<MapeoDeRubro> = {}): MapeoDeRubro => ({
  rubro: 'servicios',
  nombre: 'Servicios públicos y comunicaciones',
  naturaleza: 'COSTO',
  fuenteDelReal: 'CUENTAS_DEL_PUC',
  motivoSinReal: null,
  sugerido: true,
  cuentas: [cuenta()],
  propuestas: [cuenta()],
  codigosPropuestos: ['5135'],
  ...extra,
});

const mapeo = (rubros: MapeoDeRubro[], extra: Partial<MapeoDeRubros> = {}): MapeoDeRubros => ({
  disponible: true,
  motivo: null,
  completo: rubros.every((r) => !r.sugerido || r.cuentas.length > 0),
  faltantes: rubros.filter((r) => r.sugerido && r.cuentas.length === 0).map((r) => r.rubro),
  rubros,
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.mapeo.rubros.mockReset();
  api.mapeo.guardarRubro.mockReset();
  api.mapeo.sembrarRubros.mockReset();
  cuentasMock.cuentas = [
    { id: 'c-5135', codigo: '5135', nombre: 'Servicios', imputable: false, activa: true },
    { id: 'c-5105', codigo: '5105', nombre: 'Gastos de personal', imputable: false, activa: true },
  ];
  cuentasMock.cargando = false;
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<RubrosDelPyg />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<RubrosDelPyg>', () => {
  it('🔴 sin la migración 49 explica qué falta y no dibuja la tabla', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro()], {
        disponible: false,
        motivo:
          'Falta la migración 20260918100000_rubros_del_pyg_y_sede_en_el_movimiento (tabla mapeos_de_rubro).',
      }),
    );

    await pintar();

    const cartel = q('rubros-sin-migracion')!;
      /* 🔴 20-09 · Acá se exigía que el cartel dijera el identificador de la
         migración y el nombre de quien la aplica. Nico lo reportó dos veces:
         el 18-09 por el identificador y el 20-09 por «La aplica Víctor». Son
         el mensaje del OPERADOR mandado al usuario final: quien administra
         inmuebles no puede aplicar nada y no sabe quién es Víctor.
         El original sigue en el `title` para quien deba diagnosticar. */
      expect(cartel.textContent).not.toContain('mapeos_de_rubro');
    expect(cartel.textContent).not.toContain('Víctor');
    expect(cartel.textContent).toContain('todavía no está disponible');
    // Nada editable: cada PUT sería un 503.
    expect(q('rubro-servicios')).toBeNull();
    expect(q('sembrar-preset-de-rubros')).toBeNull();
  });

  it('con todos mapeados lo dice y no reclama', async () => {
    api.mapeo.rubros.mockResolvedValue(mapeo([rubro()]));

    await pintar();

    expect(q('rubros-del-pyg')!.textContent).toContain(
      'Todos los rubros sugeridos tienen su cuenta',
    );
    expect(q('rubros-que-hacer')).toBeNull();
  });

  it('con faltantes dice cuántos de cuántos y nombra la cuenta mayor', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro(), rubro({ rubro: 'nomina', nombre: 'Nómina', cuentas: [] })]),
    );

    await pintar();

    expect(q('rubros-del-pyg')!.textContent).toContain('Faltan 1 de 2');
    expect(q('rubros-que-hacer')!.textContent).toContain('gastos = todo el 51');
  });

  it('un rubro sin cuenta dice que su real del libro sale en «—»', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro({ rubro: 'nomina', nombre: 'Nómina', cuentas: [] })]),
    );

    await pintar();

    expect(q('sin-cuenta-nomina')!.textContent).toContain('«—»');
  });

  it('avisa cuando el preset propuesto no está en el plan, con el código', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([
        rubro({
          rubro: 'software',
          nombre: 'Software y licencias',
          cuentas: [],
          propuestas: [],
          codigosPropuestos: ['51959505'],
        }),
      ]),
    );

    await pintar();

    expect(q('avisos-de-rubros')!.textContent).toContain('51959505');
  });

  it('🔴 un rubro MIXTO se marca en la fila: su total suma ingresos y gastos', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro({ rubro: 'gastos', nombre: 'Gastos', naturaleza: 'MIXTO' })]),
    );

    await pintar();

    expect(q('naturaleza-gastos')!.textContent).toContain('Mixto');
    expect(q('rubro-gastos')!.textContent).toContain('clases distintas');
    expect(q('avisos-de-rubros')!.textContent).toContain('el número no significa nada');
  });

  it('🔴 un rubro con fuente propia explica que el mapeo es una SEGUNDA lectura', async () => {
    api.mapeo.rubros.mockResolvedValue(
      mapeo([
        rubro({
          rubro: 'comisiones',
          nombre: 'Comisiones de administración',
          fuenteDelReal: 'COMISION_CAUSADA',
          naturaleza: 'INGRESO',
        }),
      ]),
    );

    await pintar();

    const frase = q('segunda-lectura-comisiones')!.textContent!;
    expect(frase).toContain('eso no cambia');
    expect(frase).toContain('segunda lectura');
  });

  it('marca las cuentas mayores: «51» y «5105» dan totales muy distintos', async () => {
    api.mapeo.rubros.mockResolvedValue(mapeo([rubro()]));

    await pintar();

    expect(q('rubro-servicios')!.textContent).toContain('suma sus hijas');
  });

  it('🔴 quitar una cuenta manda el juego COMPLETO que queda, no el delta', async () => {
    const dos = rubro({
      cuentas: [cuenta(), cuenta({ id: 'c-5105', codigo: '5105', nombre: 'Personal' })],
    });
    api.mapeo.rubros.mockResolvedValue(mapeo([dos]));
    api.mapeo.guardarRubro.mockResolvedValue(mapeo([rubro({ cuentas: [cuenta()] })]));

    await pintar();

    const quitar = q('quitar-servicios-c-5105') as HTMLButtonElement;
    expect(quitar).not.toBeNull();
    await act(async () => {
      quitar.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.mapeo.guardarRubro).toHaveBeenCalledWith({
      rubro: 'servicios',
      cuentaIds: ['c-5135'],
    });
  });

  it('🔴 quitar la última manda una lista VACÍA: es una decisión, no una omisión', async () => {
    api.mapeo.rubros.mockResolvedValue(mapeo([rubro()]));
    api.mapeo.guardarRubro.mockResolvedValue(mapeo([rubro({ cuentas: [] })]));

    await pintar();

    const quitar = q('quitar-servicios-c-5135') as HTMLButtonElement;
    await act(async () => {
      quitar.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.mapeo.guardarRubro).toHaveBeenCalledWith({ rubro: 'servicios', cuentaIds: [] });
  });

  it('ofrece sembrar el preset sólo cuando hay rubros que se pueden sembrar', async () => {
    api.mapeo.rubros.mockResolvedValue(mapeo([rubro()]));
    await pintar();
    expect(q('sembrar-preset-de-rubros')).toBeNull();

    if (root) act(() => root?.unmount());
    container.remove();

    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro({ rubro: 'nomina', cuentas: [], propuestas: [cuenta()] })]),
    );
    await pintar();
    expect(q('sembrar-preset-de-rubros')).not.toBeNull();
  });

  it('sin permiso de escritura deshabilita el sembrado y dice por qué', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo =
      'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';
    api.mapeo.rubros.mockResolvedValue(
      mapeo([rubro({ rubro: 'nomina', cuentas: [], propuestas: [cuenta()] })]),
    );

    await pintar();

    const boton = q('sembrar-preset-de-rubros') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(q('sembrar-preset-de-rubros-motivo')!.textContent).toContain('el contador');
  });

  it('sin permiso tampoco se puede quitar una cuenta', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo = 'Sólo el administrador o el contador.';
    api.mapeo.rubros.mockResolvedValue(mapeo([rubro()]));

    await pintar();

    const quitar = q('quitar-servicios-c-5135') as HTMLButtonElement;
    expect(quitar.disabled).toBe(true);
  });

  it('el fallo de la consulta muestra el cartel con su reintento', async () => {
    api.mapeo.rubros.mockRejectedValueOnce(new Error('sin red'));

    await pintar();

    // Nada de la tabla, y el cartel de `FalloDeCarga` con su botón: el texto
    // exacto lo decide ese componente, así que acá se busca el botón.
    expect(q('rubros-del-pyg')).toBeNull();
    const reintentar = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Intentar de nuevo'),
    );
    expect(reintentar).toBeDefined();
  });
});
