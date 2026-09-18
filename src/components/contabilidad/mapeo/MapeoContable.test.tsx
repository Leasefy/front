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

const { api, cuentasMock, escrituraMock } = vi.hoisted(() => ({
  api: {
    mapeo: { obtener: vi.fn(), guardar: vi.fn(), sembrar: vi.fn(), rubros: vi.fn() },
    asientos: { faltantes: vi.fn(), reprocesar: vi.fn() },
  },
  cuentasMock: { cuentas: [] as unknown[], cargando: false },
  /*
   * El gate de escritura se mockea porque lee dos contextos (permisos y auth) y
   * este test monta el componente suelto. El hook real ya no LANZA sin ellos
   * —devuelve «no pudimos leer tu rol»—, pero eso dejaría todos los controles
   * deshabilitados y estos tests prueban justamente que asignar una cuenta
   * funciona. Se mockea en «sí puede», que es el caso de un ADMIN o un CONTADOR.
   */
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

import { MapeoContable, parteDe, PARTES_DEL_MAPEO, type EstadoDelMapeo } from './MapeoContable';

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

/**
 * Las dos partes de la pantalla y `?parte=` (contrato del 18-09, §8).
 *
 * `parteDe` se prueba como `informeDe` de los reportes, y por el mismo motivo:
 * un `value` que el `Tabs` de Radix no conoce deja la pantalla SIN ningún panel
 * montado —en blanco— y eso no se ve en el tipo, se ve en producción.
 */
describe('las dos partes del mapeo', () => {
  it('acepta las dos tal como viajan en la URL', () => {
    expect(parteDe('asientos')).toBe('asientos');
    expect(parteDe('rubros')).toBe('rubros');
  });

  it('lo que no existe cae a «asientos», no a una pestaña vacía', () => {
    expect(parteDe('lo-que-sea')).toBe('asientos');
    expect(parteDe('')).toBe('asientos');
    expect(parteDe(null)).toBe('asientos');
    expect(parteDe(undefined)).toBe('asientos');
  });

  it('la lista no tiene repetidos ni cosas de más', () => {
    expect(PARTES_DEL_MAPEO).toEqual(['asientos', 'rubros']);
    expect(new Set(PARTES_DEL_MAPEO).size).toBe(PARTES_DEL_MAPEO.length);
  });

  it('dibuja las dos pestañas', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(9, 0));
    await pintar();
    expect(q('parte-asientos')).not.toBeNull();
    expect(q('parte-rubros')).not.toBeNull();
  });

  it('🔴 la pestaña de rubros NO pide su consulta hasta que se abre', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(9, 0));
    await pintar();
    expect(api.mapeo.rubros).not.toHaveBeenCalled();
  });
});

/**
 * El bloque de eventos de gasto (§2).
 *
 * 🔴 El caso que importa es `hayEventosDeGasto` ausente o `false`: la base no
 * tiene los valores nuevos del enum, un PUT devolvería 400 EVENTO_SIN_MIGRACION
 * y NO escribiría nada —o sea que se perdería también lo que sí se podía
 * guardar—. Así que no se dibuja nada editable: se explica qué falta.
 */
describe('<MapeoContable> — eventos de gasto', () => {
  const eventoDeGasto = (nombre: string, conCuenta: boolean) => ({
    evento: nombre,
    nombre: `Gasto ${nombre}`,
    explicacion: 'Lo que hace',
    lado: 'DEBE',
    cuenta: conCuenta ? { id: `cg-${nombre}`, codigo: '519595', nombre: 'Otros' } : null,
    propuesta: null,
    codigoPropuesto: '519595',
  });

  it('con la migración ausente explica qué falta y no dibuja la tabla', async () => {
    api.mapeo.obtener.mockResolvedValue({
      ...mapeoCon(9, 0),
      hayEventosDeGasto: false,
      eventosDeGasto: [],
      completoGastos: false,
      faltantesGastos: [],
    });

    await pintar();

    expect(q('eventos-de-gasto-sin-migracion')).not.toBeNull();
    expect(q('eventos-de-gasto-sin-migracion')!.textContent).toContain('no se puede causar');
    expect(q('evento-de-gasto-GASTO_SIN_RUBRO')).toBeNull();
  });

  it('🔴 `undefined` de un back viejo se trata igual que `false`: no se afirma nada', async () => {
    api.mapeo.obtener.mockResolvedValue(mapeoCon(9, 0));

    await pintar();

    expect(q('eventos-de-gasto-sin-migracion')).not.toBeNull();
  });

  it('con la migración dibuja los siete y marca los que faltan', async () => {
    api.mapeo.obtener.mockResolvedValue({
      ...mapeoCon(9, 0),
      hayEventosDeGasto: true,
      completoGastos: false,
      faltantesGastos: ['IVA_DESCONTABLE'],
      eventosDeGasto: [
        eventoDeGasto('GASTO_SIN_RUBRO', true),
        eventoDeGasto('IVA_DESCONTABLE', false),
      ],
    });

    await pintar();

    expect(q('evento-de-gasto-GASTO_SIN_RUBRO')).not.toBeNull();
    expect(q('falta-gasto-IVA_DESCONTABLE')).not.toBeNull();
    expect(q('falta-gasto-GASTO_SIN_RUBRO')).toBeNull();
    expect(q('eventos-de-gasto-incompleto')!.textContent).toContain('Faltan 1 de 2');
  });

  it('dice qué NO se puede hacer hoy, en vez del nombre del evento', async () => {
    api.mapeo.obtener.mockResolvedValue({
      ...mapeoCon(9, 0),
      hayEventosDeGasto: true,
      completoGastos: false,
      faltantesGastos: ['IVA_DESCONTABLE'],
      eventosDeGasto: [eventoDeGasto('IVA_DESCONTABLE', false)],
    });

    await pintar();

    expect(q('eventos-de-gasto-apagado')!.textContent).toContain('IVA descontable');
  });

  it('completo lo dice sin reclamar nada', async () => {
    api.mapeo.obtener.mockResolvedValue({
      ...mapeoCon(9, 0),
      hayEventosDeGasto: true,
      completoGastos: true,
      faltantesGastos: [],
      eventosDeGasto: [eventoDeGasto('GASTO_SIN_RUBRO', true)],
    });

    await pintar();

    expect(q('eventos-de-gasto-completo')).not.toBeNull();
    expect(q('eventos-de-gasto-incompleto')).toBeNull();
  });

  /*
   * 🔴 `onEstado` es lo que decide si el paso 5 del muro ofrece «Continuar».
   * Los eventos de GASTO no entran ahí: un mapeo de gasto vacío no impide
   * asentar un solo recibo, y contarlo dejaría el paso 5 imposible de terminar
   * para cualquier inmobiliaria que nunca registró una factura de proveedor.
   */
  it('🔴 los eventos de gasto NO cuentan en lo que reporta hacia afuera', async () => {
    api.mapeo.obtener.mockResolvedValue({
      ...mapeoCon(9, 0),
      hayEventosDeGasto: true,
      completoGastos: false,
      faltantesGastos: ['IVA_DESCONTABLE', 'GASTO_POR_PAGAR'],
      eventosDeGasto: [
        eventoDeGasto('IVA_DESCONTABLE', false),
        eventoDeGasto('GASTO_POR_PAGAR', false),
      ],
    });
    const visto: EstadoDelMapeo[] = [];

    await pintar((e) => visto.push(e));

    expect(visto.at(-1)).toEqual({ completo: true, faltan: 0, total: 9 });
  });
});

/**
 * El 403 del back, dicho ANTES del clic.
 *
 * El back es la autoridad (`ContabilidadEscrituraGuard`) y un AGENTE recibe 403
 * haga lo que haga la pantalla. Lo que cambia es cuándo se entera: con el gate,
 * el control llega deshabilitado y con el motivo escrito.
 */
describe('<MapeoContable> — sin permiso de escritura', () => {
  it('deshabilita el botón de propuestas y dice por qué', async () => {
    escrituraMock.puede = false;
    escrituraMock.motivo =
      'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';
    const conPropuesta = {
      ...evento('falta0', false),
      propuesta: { id: 'c-prop', codigo: '110505', nombre: 'Caja', activa: true, imputable: true },
    };
    api.mapeo.obtener.mockResolvedValue({
      eventos: [conPropuesta],
      completo: false,
      faltantes: ['falta0'],
    });

    await pintar();

    const boton = q('usar-propuestas') as HTMLButtonElement | null;
    expect(boton?.disabled).toBe(true);
    expect(q('sin-escritura-mapeo')?.textContent).toContain('el contador');

    escrituraMock.puede = true;
    escrituraMock.motivo = null;
  });
});
