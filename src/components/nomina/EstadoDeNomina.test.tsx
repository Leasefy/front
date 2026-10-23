/**
 * LA PORTADA DE NÓMINA (GLOW UP, 21-10-2026): lo que falta para liquidar, la
 * nómina del mes paso a paso y lo que cuesta.
 *
 * Lo que fija:
 *   1. cada requisito sale de lo que respondió el back; lo que no se pudo
 *      revisar no cuenta como hecho;
 *   2. los pasos del mes salen del período real (BORRADOR → aprobar; APROBADO →
 *      asentar y pagar; PAGADO → hecho) y con la quincena 1 pagada el trabajo es
 *      armar la 2; los anulados no cuentan;
 *   3. con el módulo sin comprar no hay «Liquidar un período» (llevaría al mismo
 *      cartel); con los períodos caídos se dice, sin pintar pasos inventados.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EstadoDeNomina, PeriodoDeNomina, ResumenDelMes } from '@/lib/api/nomina.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  estado: vi.fn(),
  resumen: vi.fn(),
  periodos: vi.fn(),
  noEstaHabilitada: vi.fn((_e: unknown) => false),
  faltaLaMigracion: vi.fn((_e: unknown) => false),
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: { estado: h.estado, resumen: h.resumen, periodos: h.periodos },
  noEstaHabilitada: h.noEstaHabilitada,
  faltaLaMigracion: h.faltaLaMigracion,
}));

import {
  EstadoDeNominaPanel,
  pasosDelPeriodo,
  periodoEnFoco,
  requisitosParaLiquidar,
} from './EstadoDeNomina';

function estado(extra: Partial<EstadoDeNomina> = {}): EstadoDeNomina {
  return {
    anio: 2026,
    parametros: { disponible: true, motivo: null, completos: true, queFalta: [], confirmados: true },
    personas: { disponible: true, total: 4, cuotaDeAprendices: null },
    conceptos: { disponible: true, sembrados: 31, deSistema: 31, sinCuenta: [] },
    nominaElectronica: { nombre: 'Simulado', aviso: null } as unknown as EstadoDeNomina['nominaElectronica'],
    avisos: { pila: 'La planilla PILA se hace por fuera.', recobroEps: 'Recobro EPS.', recorteDeDeducciones: 'Recorte.' },
    ...extra,
  };
}

const resumen: ResumenDelMes = {
  disponible: true,
  mes: '2026-10',
  devengadoCop: 9_000_000,
  aportesCop: 2_000_000,
  provisionesCop: 1_500_000,
  netoCop: 8_100_000,
  costoTotalCop: 12_500_000,
  porSede: [],
} as unknown as ResumenDelMes;

function periodo(extra: Partial<PeriodoDeNomina> = {}): PeriodoDeNomina {
  return {
    id: 'per-1',
    mes: '2026-10',
    quincena: null,
    desde: '2026-10-01',
    hasta: '2026-10-31',
    estado: 'BORRADOR',
    totalDevengadoCop: 9_000_000,
    totalDeduccionesCop: 900_000,
    totalNetoCop: 8_100_000,
    totalAportesCop: 2_000_000,
    personas: 4,
    aprobadoAt: null,
    pagadoAt: null,
    asientoId: null,
    loteDeEgresosId: null,
    motivoAnulacion: null,
    ...extra,
  };
}

describe('requisitosParaLiquidar', () => {
  it('con todo cargado, confirmado, mapeado y gente en nómina, todo está listo', () => {
    const r = requisitosParaLiquidar(estado());
    expect(r.map((x) => [x.id, x.estado])).toEqual([
      ['cifras', 'listo'],
      ['confirmadas', 'listo'],
      ['conceptos', 'listo'],
      ['personas', 'listo'],
    ]);
  });

  it('dice qué cifras del año faltan y los conceptos que no tienen cuenta', () => {
    const r = requisitosParaLiquidar(
      estado({
        parametros: { disponible: true, motivo: null, completos: false, queFalta: ['salario mínimo', 'UVT'], confirmados: false },
        conceptos: { disponible: true, sembrados: 31, deSistema: 31, sinCuenta: [{ codigo: 'HE-D', nombre: 'Hora extra', falta: 'cuenta' }] },
      }),
    );
    const cifras = r.find((x) => x.id === 'cifras')!;
    expect(cifras.estado).toBe('falta');
    expect(String(cifras.detalle)).toContain('salario mínimo, UVT');
    // Sin las cifras no hay nada que confirmar todavía: no se ofrece el botón.
    expect(r.find((x) => x.id === 'confirmadas')!.accion).toBeUndefined();
    expect(String(r.find((x) => x.id === 'conceptos')!.detalle)).toContain('HE-D');
  });

  it('con el año vacío (el back dice «todo») nombra las tres cifras, no «Falta todo»', () => {
    const r = requisitosParaLiquidar(
      estado({ parametros: { disponible: true, motivo: null, completos: false, queFalta: ['todo'], confirmados: false } }),
    );
    const detalle = String(r.find((x) => x.id === 'cifras')!.detalle);
    expect(detalle).toContain('salario mínimo, auxilio de transporte y UVT');
    expect(detalle).not.toContain('Falta todo');
  });

  it('lo que no se pudo revisar va como desconocido (no cuenta como hecho)', () => {
    const r = requisitosParaLiquidar(
      estado({
        conceptos: { disponible: false, sembrados: 0, deSistema: 0, sinCuenta: [] },
        personas: { disponible: false, total: 0, cuotaDeAprendices: null },
      }),
    );
    expect(r.find((x) => x.id === 'conceptos')!.estado).toBe('desconocido');
    expect(r.find((x) => x.id === 'personas')!.estado).toBe('desconocido');
  });

  it('sin nadie en nómina, falta agregar personas', () => {
    const r = requisitosParaLiquidar(estado({ personas: { disponible: true, total: 0, cuotaDeAprendices: null } }));
    expect(r.find((x) => x.id === 'personas')!.estado).toBe('falta');
  });
});

describe('periodoEnFoco y pasosDelPeriodo', () => {
  const estados = (ps: PeriodoDeNomina[]) => pasosDelPeriodo(periodoEnFoco(ps)).map((p) => p.estado);

  it('sin nada liquidado, el paso actual es liquidar', () => {
    expect(periodoEnFoco([])).toEqual({ tipo: 'sin-armar', quincena: null });
    expect(estados([])).toEqual(['actual', 'pendiente', 'pendiente']);
  });

  it('un borrador se aprueba; uno aprobado se asienta y se paga; uno pagado está hecho', () => {
    expect(estados([periodo()])).toEqual(['hecho', 'actual', 'pendiente']);
    expect(estados([periodo({ estado: 'APROBADO', aprobadoAt: '2026-10-30T15:00:00Z' })])).toEqual(['hecho', 'hecho', 'actual']);
    expect(estados([periodo({ estado: 'PAGADO', aprobadoAt: '2026-10-30T15:00:00Z', pagadoAt: '2026-10-31T15:00:00Z', asientoId: 'a-1' })])).toEqual(['hecho', 'hecho', 'hecho']);
  });

  it('con la quincena 1 pagada y la 2 sin armar, el trabajo es armar la 2', () => {
    const q1 = periodo({ quincena: 1, estado: 'PAGADO', pagadoAt: '2026-10-15T15:00:00Z' });
    expect(periodoEnFoco([q1])).toEqual({ tipo: 'sin-armar', quincena: 2 });
  });

  it('va primero la quincena que no está pagada, y los anulados no cuentan', () => {
    const q1 = periodo({ id: 'q1', quincena: 1, estado: 'PAGADO' });
    const q2 = periodo({ id: 'q2', quincena: 2, estado: 'BORRADOR' });
    const anulado = periodo({ id: 'x', quincena: 2, estado: 'ANULADO' });
    const foco = periodoEnFoco([q2, anulado, q1]);
    expect(foco.tipo === 'periodo' && foco.periodo.id).toBe('q2');
  });

  it('sin las cifras del año, liquidar espera y dice por qué (armar el borrador sería un 422)', () => {
    const pasos = pasosDelPeriodo(periodoEnFoco([]), false)
    expect(pasos.map((p) => p.estado)).toEqual(['pendiente', 'pendiente', 'pendiente'])
    expect(String(pasos[0].bloqueadoPorque)).toContain('cifras del año')
  })

  it('pagado sin asiento lo dice en el resumen', () => {
    const pasos = pasosDelPeriodo(periodoEnFoco([periodo({ estado: 'PAGADO', pagadoAt: '2026-10-31T15:00:00Z' })]));
    expect(String(pasos[2].resumen)).toContain('sin asiento contable');
  });
});

describe('<EstadoDeNominaPanel />', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    h.estado.mockReset();
    h.resumen.mockReset();
    h.periodos.mockReset();
    h.noEstaHabilitada.mockImplementation(() => false);
    try {
      window.localStorage.clear();
    } catch {
      /* sin almacenamiento */
    }
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const montar = async () => {
    await act(async () => {
      root.render(<EstadoDeNominaPanel />);
    });
    await act(async () => {
      await Promise.resolve();
    });
  };

  it('con el módulo abierto: la acción principal, lo que falta, el mes paso a paso y el costo', async () => {
    h.estado.mockResolvedValue(estado());
    h.resumen.mockResolvedValue(resumen);
    h.periodos.mockResolvedValue({ disponible: true, periodos: [periodo()] });
    await montar();

    expect(host.querySelector('[data-testid="ir-a-liquidacion"]')?.getAttribute('href')).toBe('/panel/inmobiliaria/nomina/periodos');
    expect(host.querySelector('[data-testid="lista-para-liquidar"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="nomina-del-mes"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="costo-de-la-nomina"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="puerta-periodos"]')).not.toBeNull();
  });

  it('sin las cifras del año no ofrece «Liquidar un período»', async () => {
    h.estado.mockResolvedValue(
      estado({ parametros: { disponible: true, motivo: null, completos: false, queFalta: ['todo'], confirmados: false } }),
    )
    h.resumen.mockResolvedValue(resumen)
    h.periodos.mockResolvedValue({ disponible: true, periodos: [] })
    await montar()
    expect(host.querySelector('[data-testid="ir-a-liquidacion"]')).toBeNull()
    expect(host.querySelector('[data-testid="lista-para-liquidar"]')).not.toBeNull()
  })

  it('con el módulo sin comprar no ofrece «Liquidar un período»: sólo el cartel', async () => {
    const e402 = new Error('402');
    h.noEstaHabilitada.mockImplementation((e) => e === e402);
    h.estado.mockRejectedValue(e402);
    h.resumen.mockResolvedValue(resumen);
    h.periodos.mockResolvedValue({ disponible: true, periodos: [] });
    await montar();

    expect(host.querySelector('[data-testid="nomina-no-habilitada"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="ir-a-liquidacion"]')).toBeNull();
  });

  it('con los períodos caídos lo dice y no pinta pasos', async () => {
    h.estado.mockResolvedValue(estado());
    h.resumen.mockResolvedValue(resumen);
    h.periodos.mockRejectedValue(new Error('500'));
    await montar();

    expect(host.querySelector('[data-testid="nomina-del-mes-sin-leer"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="nomina-del-mes"]')).toBeNull();
  });
});
