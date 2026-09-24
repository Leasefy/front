/**
 * P&G y balance general.
 *
 * Los cuatro casos que este archivo protege, en orden de gravedad:
 *
 * 🔴 1. La frase del canon está SIEMPRE, también cuando los números están bien.
 *       Es entonces cuando alguien pregunta «¿y el canon dónde está?» y, sin
 *       respuesta, concluye que el informe está roto — o peor, que la
 *       inmobiliaria factura veinte veces lo que factura.
 *
 * 🔴 2. Un balance que no cuadra sale ARRIBA y en rojo, con los dos totales. Un
 *       balance descuadrado invalida todo lo que está debajo.
 *
 * 🔴 3. El presupuesto es otra tabla, no una columna del árbol. Repartir el
 *       presupuesto de «nómina» entre sus subcuentas sería inventar un número.
 *
 * 🔴 4. `null` se pinta «—», nunca `0`: ni en el año anterior, ni en el margen.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type {
  BalanceGeneral,
  EstadoDeResultados,
} from '@/lib/api/estados-financieros.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, finanzas } = vi.hoisted(() => ({
  api: { pyg: vi.fn(), balanceGeneral: vi.fn(), mayor: vi.fn(), terceros: vi.fn() },
  finanzas: { sedes: vi.fn() },
}));

vi.mock('@/lib/api/estados-financieros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/estados-financieros.service')>(
    '@/lib/api/estados-financieros.service',
  );
  return { ...actual, estadosFinancierosApi: api };
});
vi.mock('@/lib/api/finanzas.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/finanzas.service')>(
    '@/lib/api/finanzas.service',
  );
  return { ...actual, finanzasApi: finanzas };
});
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import {
  EstadosFinancieros,
  informeFinancieroDe,
  ultimoDiaDelMes,
} from './EstadosFinancieros';

const pyg = (extra: Partial<EstadoDeResultados> = {}): EstadoDeResultados => ({
  mes: '2026-09',
  mesDelAnioAnterior: '2025-09',
  sedeId: null,
  desdeElAcumulado: '2026-01-01',
  clases: [
    {
      clase: '4',
      nombre: 'Ingresos',
      naturaleza: 'CREDITO',
      mesCop: 118_000_000,
      acumuladoCop: 980_000_000,
      anioAnteriorMesCop: 101_000_000,
      anioAnteriorAcumuladoCop: null,
      grupos: [
        {
          codigo: '41',
          nombre: 'Operacionales',
          naturaleza: 'CREDITO',
          mesCop: 100_000_000,
          acumuladoCop: 850_000_000,
          anioAnteriorMesCop: 88_000_000,
          anioAnteriorAcumuladoCop: null,
          cuentas: [
            {
              cuentaId: 'c-415510',
              codigo: '415510',
              nombre: 'Inmobiliarias por retribución',
              naturaleza: 'CREDITO',
              mesCop: 100_000_000,
              acumuladoCop: 850_000_000,
              anioAnteriorMesCop: null,
              anioAnteriorAcumuladoCop: null,
              rubro: 'comisiones',
            },
          ],
        },
      ],
    },
  ],
  resultado: {
    ingresosMesCop: 118_000_000,
    gastosMesCop: 74_000_000,
    utilidadMesCop: 44_000_000,
    margenMesPct: 37.3,
    ingresosAcumuladoCop: 980_000_000,
    gastosAcumuladoCop: 600_000_000,
    utilidadAcumuladoCop: 380_000_000,
    margenAcumuladoPct: 38.8,
  },
  porRubro: {
    disponible: true,
    filas: [
      {
        rubro: 'nomina',
        nombre: 'Nómina',
        naturaleza: 'COSTO',
        realCop: 50_000_000,
        presupuestoCop: 52_000_000,
        anioAnteriorCop: null,
        contraPresupuestoCop: -2_000_000,
      },
    ],
  },
  elCanonNoEsIngreso:
    'El canon que se recauda NO es ingreso de la inmobiliaria: vive en la 2815, que es pasivo.',
  avisos: [],
  sinAsentar: { recibos: 0, lotes: 0, cobros: 0, total: 0 },
  movimientosSinSede: 0,
  ...extra,
});

const balance = (extra: Partial<BalanceGeneral> = {}): BalanceGeneral => ({
  hasta: '2026-09-30',
  sedeId: null,
  activo: {
    totalCop: 1_000_000_000,
    grupos: [
      {
        codigo: '11',
        nombre: 'Disponible',
        totalCop: 1_000_000_000,
        cuentas: [
          { codigo: '112005', nombre: 'Bancos', totalCop: 1_000_000_000, anioAnteriorTotalCop: null },
        ],
      },
    ],
  },
  pasivo: { totalCop: 900_000_000, grupos: [] },
  patrimonio: { totalCop: 56_000_000, grupos: [] },
  resultadoDelEjercicioCop: 44_000_000,
  cuadra: true,
  diferenciaCop: 0,
  elCanonNoEsIngreso: 'El canon no es ingreso.',
  avisos: [],
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.pyg.mockReset().mockResolvedValue(pyg());
  api.balanceGeneral.mockReset().mockResolvedValue(balance());
  finanzas.sedes.mockReset().mockResolvedValue({ sedes: [] });
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(inicial: 'pyg' | 'balance' = 'pyg') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<EstadosFinancieros inicial={inicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('informeFinancieroDe y ultimoDiaDelMes', () => {
  it('acepta los dos informes y cae al P&G con cualquier otra cosa', () => {
    expect(informeFinancieroDe('balance')).toBe('balance');
    expect(informeFinancieroDe('pyg')).toBe('pyg');
    expect(informeFinancieroDe('lo-que-sea')).toBe('pyg');
    expect(informeFinancieroDe(null)).toBe('pyg');
  });

  it('el balance se pide al último día del mes, sin corrimientos de zona', () => {
    expect(ultimoDiaDelMes('2026-09')).toBe('2026-09-30');
    expect(ultimoDiaDelMes('2026-02')).toBe('2026-02-28');
    // 2024 fue bisiesto.
    expect(ultimoDiaDelMes('2024-02')).toBe('2024-02-29');
    expect(ultimoDiaDelMes('2026-12')).toBe('2026-12-31');
  });
});

describe('<EstadosFinancieros> — P&G', () => {
  it('🔴 la frase del canon está aunque todo esté bien', async () => {
    await pintar();
    const frase = q('el-canon-no-es-ingreso')!.textContent!;
    expect(frase).toContain('NO es ingreso');
    expect(frase).toContain('2815');
  });

  it('🔴 usa la frase del BACK cuando viene', async () => {
    await pintar();
    expect(q('el-canon-no-es-ingreso')!.textContent).toContain('que es pasivo');
  });

  it('🔴 y la nuestra cuando el back no la manda: nunca se queda sin decirlo', async () => {
    api.pyg.mockResolvedValue(pyg({ elCanonNoEsIngreso: undefined }));
    await pintar();
    expect(q('el-canon-no-es-ingreso')!.textContent).toContain('CTCP 2020-0678');
  });

  it('dibuja el árbol con sus tres niveles', async () => {
    await pintar();
    expect(q('fila-clase-4')).not.toBeNull();
    expect(q('fila-grupo-4-41')).not.toBeNull();
    expect(q('fila-cuenta-c-415510')).not.toBeNull();
  });

  it('🔴 un `null` del año anterior se pinta «—», no «$0»', async () => {
    await pintar();
    const cuenta = q('fila-cuenta-c-415510')!.textContent!;
    expect(cuenta).toContain('—');
    expect(cuenta).not.toContain('$0');
  });

  it('🔴 el margen `null` es «—»: «vendiste y no ganaste» no es «no vendiste»', async () => {
    api.pyg.mockResolvedValue(
      pyg({
        resultado: { ...pyg().resultado, ingresosMesCop: 0, margenMesPct: null },
      }),
    );

    await pintar();

    expect(q('valor-margen')!.textContent).not.toContain('0.0%');
  });

  it('🔴 el presupuesto es otra tabla, no una columna del árbol', async () => {
    await pintar();
    // La comparación por rubro existe…
    expect(q('comparacion-por-rubro')).not.toBeNull();
    expect(q('rubro-nomina')).not.toBeNull();
    /*
     * …y el encabezado del ÁRBOL no tiene una columna «Presupuesto». La consulta
     * se acota al árbol a propósito: la tabla POR RUBRO sí la tiene, y es el
     * lugar correcto — el presupuesto pertenece al rubro.
     */
    const encabezados = [...q('arbol-del-pyg')!.querySelectorAll('th')].map((t) => t.textContent);
    expect(encabezados).toContain('Mes');
    expect(encabezados).not.toContain('Presupuesto');
    expect([...q('comparacion-por-rubro')!.querySelectorAll('th')].map((t) => t.textContent)).toContain(
      'Presupuesto',
    );
  });

  it('la comparación por rubro explica POR QUÉ va aparte', async () => {
    await pintar();
    expect(q('comparacion-por-rubro')!.textContent).toContain('número inventado');
  });

  it('sin la migración del mapeo de rubros lo dice, en vez de una tabla vacía', async () => {
    api.pyg.mockResolvedValue(pyg({ porRubro: { disponible: false, filas: [] } }));

    await pintar();

    expect(q('sin-comparacion-por-rubro')!.textContent).toContain('mapeo de rubros');
    expect(q('rubro-nomina')).toBeNull();
  });

  it('lo que falta por asentar sale como aviso, con el número', async () => {
    api.pyg.mockResolvedValue(
      pyg({ sinAsentar: { recibos: 2, lotes: 1, cobros: 0, total: 3 } }),
    );

    await pintar();

    const avisos = q('avisos-del-pyg')!.textContent!;
    expect(avisos).toContain('3 documentos sin asentar');
    expect(avisos).toContain('no está en este informe');
  });

  it('los avisos del back se muestran junto al de lo que falta', async () => {
    api.pyg.mockResolvedValue(
      pyg({ avisos: ['La columna por SEDE no está disponible: falta la migración 49.'] }),
    );

    await pintar();

    expect(q('avisos-del-pyg')!.textContent).toContain('columna por SEDE');
  });

  it('un P&G sin movimientos dice eso, no se queda en blanco', async () => {
    api.pyg.mockResolvedValue(pyg({ clases: [] }));
    await pintar();
    expect(container.textContent).toContain('No hay movimientos de ingreso ni de gasto');
  });

  it('el mes y la sede viajan en la consulta', async () => {
    await pintar();
    expect(api.pyg).toHaveBeenCalledWith(
      expect.objectContaining({ acumulado: true, comparar: ['presupuesto', 'anioAnterior'] }),
    );
  });
});

describe('<EstadosFinancieros> — balance', () => {
  it('cuando cuadra no grita, y muestra la ecuación', async () => {
    await pintar('balance');
    expect(q('balance-no-cuadra')).toBeNull();
    expect(q('ecuacion-del-balance')!.textContent).toContain('cuadra');
  });

  it('🔴 cuando NO cuadra sale arriba, con los dos totales y la diferencia', async () => {
    api.balanceGeneral.mockResolvedValue(
      balance({
        cuadra: false,
        diferenciaCop: 56_000_000,
        patrimonio: { totalCop: 0, grupos: [] },
      }),
    );

    await pintar('balance');

    const cartel = q('balance-no-cuadra')!.textContent!;
    expect(cartel).toContain('$1.000.000.000');
    expect(cartel).toContain('$944.000.000');
    expect(cartel).toContain('$56.000.000');
    expect(cartel).toContain('defecto del libro');
  });

  it('🔴 el balance de una inmobiliaria nueva se explica: falta el patrimonio', async () => {
    api.balanceGeneral.mockResolvedValue(
      balance({
        cuadra: false,
        diferenciaCop: 56_000_000,
        patrimonio: { totalCop: 0, grupos: [] },
      }),
    );

    await pintar('balance');

    // Se explica Y se sigue mostrando el descuadre: las dos cosas son ciertas.
    expect(q('falta-el-patrimonio')!.textContent).toContain('clase 3');
    expect(q('balance-no-cuadra')).not.toBeNull();
  });

  it('un descuadre CON patrimonio cargado no se explica con las cuentas que faltan', async () => {
    api.balanceGeneral.mockResolvedValue(balance({ cuadra: false, diferenciaCop: 3_000 }));

    await pintar('balance');

    expect(q('balance-no-cuadra')).not.toBeNull();
    expect(q('falta-el-patrimonio')).toBeNull();
  });

  it('el resultado del ejercicio explica por qué va aparte del patrimonio', async () => {
    await pintar('balance');
    expect(q('cifra-resultado-del-ejercicio')!.textContent).toContain('lo hace el contador');
  });

  it('dibuja los tres lados con sus grupos y cuentas', async () => {
    await pintar('balance');
    expect(q('lado-activo')!.textContent).toContain('112005');
    expect(q('lado-pasivo')).not.toBeNull();
    expect(q('lado-patrimonio')!.textContent).toContain('Sin cuentas con saldo');
  });

  it('pide el balance al último día del mes', async () => {
    await pintar('balance');
    expect(api.balanceGeneral).toHaveBeenCalledWith(
      expect.objectContaining({ hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
  });

  it('el fallo se puede reintentar', async () => {
    api.balanceGeneral.mockRejectedValue(new Error('sin red'));

    await pintar('balance');

    const reintentar = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Intentar de nuevo'),
    );
    expect(reintentar).toBeDefined();
  });
});

/**
 * 🔴 EL MOLDE (Nico, 21-09): «de verdad eso del mes, switch tab, y la tabla
 * deberían ser una sola cosa… y así hay muchas tablas que tienen mes afuera,
 * switch tab afuera y deberían estar junto a la tabla, revisa todas por favor,
 * a eso me refería también con vómito, todo súper separado».
 *
 * Acá eran dos bloques flotando —una tarjeta con el mes, la sede y las casillas
 * de comparación, y debajo las pestañas sueltas— y las casillas estaban en el
 * peor lugar posible: agregan COLUMNAS al árbol de cuentas, que vive 600 px más
 * abajo. Estos dos guardianes no dejan que se vuelvan a separar.
 */
describe('EstadosFinancieros · una sola cosa', () => {
  it('🔴 las pestañas, el mes y la sede viven en el MISMO renglón', async () => {
    await pintar('pyg');
    const pestana = q('pestana-pyg')!;
    const tarjeta = pestana.closest('div.rounded-lg')!;
    expect(tarjeta).not.toBeNull();
    // El mes y la sede están dentro de esa misma tarjeta, no en otra.
    expect(tarjeta.querySelector('[data-testid="selector-de-sede"]')).not.toBeNull();
    expect(tarjeta.textContent).toContain('Sede');
  });

  it('🔴 las casillas que agregan columnas viven DENTRO de la tabla que cambian', async () => {
    await pintar('pyg');
    const arbol = q('arbol-del-pyg')!;
    expect(arbol.querySelector('[data-testid="ver-acumulado"]')).not.toBeNull();
    expect(arbol.querySelector('[data-testid="ver-presupuesto"]')).not.toBeNull();
    expect(arbol.querySelector('[data-testid="ver-anio-anterior"]')).not.toBeNull();
    // Y dicen qué son: no son un filtro de la pantalla, son columnas.
    expect(arbol.textContent).toContain('Columnas que se agregan');
  });
});
