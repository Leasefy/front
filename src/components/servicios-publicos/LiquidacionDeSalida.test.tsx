/**
 * @vitest-environment happy-dom
 *
 * La liquidación al entregar el inmueble (Portofino, 29-10-2026): meses pendientes (estimados con el promedio) +
 * trámites − saldo a favor, corregible a mano, y «Cargar al contrato como anticipo de servicios públicos».
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ confirmar: vi.fn(async () => true) }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/confirmar', () => ({ confirmar: h.confirmar }));
vi.mock('@/components/facturacion/CampoDeFecha', () => ({
  CampoDeFecha: (p: { id: string; value: string; onChange: (v: string) => void; testid?: string }) => (
    <input id={p.id} data-testid={p.testid} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));
vi.mock('@/components/ui/money-input', () => ({
  MoneyInput: (p: { id?: string; value: string; onChange: (v: string) => void; 'data-testid'?: string }) => (
    <input id={p.id} data-testid={p['data-testid']} value={p.value} onChange={(e) => p.onChange(e.target.value)} />
  ),
}));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: { liquidacionDeSalida: vi.fn(), cargarLiquidacionDeSalida: vi.fn() },
}));

import { ApiError } from '@/lib/api/client';
import { toast } from '@/components/ui/toast';
import { serviciosPublicosApi, type LiquidacionDeSalida as Liquidacion } from '@/lib/api/servicios-publicos.service';
import { LiquidacionDeSalida } from './LiquidacionDeSalida';

const api = serviciosPublicosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

function liquidacion(over: Partial<Liquidacion> = {}): Liquidacion {
  const grupo = 'AGUA,ENERGIA,GAS';
  return {
    disponible: true,
    contractId: 'c1',
    contrato: '515',
    inquilino: 'María',
    inmueble: 'CL 131 CR 51',
    fechaEntrega: '2026-10-29',
    fechaEntregaDe: 'FIN_DEL_CONTRATO',
    tramitesPorDefectoCop: 10_000,
    anticipoDelContratoCop: 0,
    facturasDelPromedio: 6,
    grupos: [
      {
        grupo,
        servicios: ['AGUA', 'ENERGIA', 'GAS'],
        nombreDelServicio: 'Energía, acueducto y gas',
        ultimoCortePagado: '2026-09-15',
        diaDeCorte: 15,
        tarifa: { tarifaDiariaCop: 6_893, desviacionCop: 410, facturasUsadas: 6, cortes: [] },
      },
    ],
    filas: [
      { grupo, servicios: ['AGUA', 'ENERGIA', 'GAS'], nombreDelServicio: 'Energía, acueducto y gas', mesFacturado: '2026-11', corteDesde: '2026-09-16', corteHasta: '2026-10-15', dias: 30, tarifaDiariaCop: 6_893, valorCop: 206_790, estimado: true, valorAMano: false, facturaId: null },
      { grupo, servicios: ['AGUA', 'ENERGIA', 'GAS'], nombreDelServicio: 'Energía, acueducto y gas', mesFacturado: '2026-11', corteDesde: '2026-10-16', corteHasta: '2026-10-29', dias: 14, tarifaDiariaCop: 6_893, valorCop: 96_502, estimado: true, valorAMano: false, facturaId: null },
    ],
    subtotalCop: 303_292,
    tramitesCop: 10_000,
    saldoAFavorCop: 0,
    totalCop: 313_292,
    aDevolverCop: 0,
    sinHistorial: false,
    avisos: [],
    frase: '…',
    ...over,
  };
}

let root: Root;
let caja: HTMLDivElement;
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const escribir = async (el: HTMLElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  h.confirmar.mockResolvedValue(true);
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
});
afterEach(async () => {
  await act(async () => root.unmount());
  caja.remove();
});

async function montar(props: Partial<React.ComponentProps<typeof LiquidacionDeSalida>> = {}) {
  await act(async () => root.render(<LiquidacionDeSalida contractId="c1" activa puedeCargar {...props} />));
  await act(async () => {});
}

describe('Liquidación de la entrega del inmueble', () => {
  it('no pide nada hasta que la pestaña se abre', async () => {
    await montar({ activa: false });
    expect(api.liquidacionDeSalida).not.toHaveBeenCalled();
  });

  it('pinta los meses pendientes, el estimado con su promedio y el total con trámites', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    await montar();
    expect(api.liquidacionDeSalida).toHaveBeenCalledWith('c1', {});
    expect($('salida-fila-2026-09-16')!.textContent).toContain('Estimado');
    expect($('salida-explicacion-2026-09-16')!.textContent).toBe('Promedio de 6 facturas anteriores: $ 6.893 por día (± $ 410).');
    expect($('salida-total-cop')!.textContent).toBe('$ 313.292');
    expect(document.body.textContent).toContain('Es el fin del contrato: cámbiala si lo entrega otro día.');
  });

  it('🔴 si cambian los días, valor = días × tarifa y el total se mueve', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    await montar();
    await escribir($('salida-dias-2026-10-16')!, '18');
    expect(($('salida-valor-2026-10-16') as HTMLInputElement).value).toBe(String(18 * 6_893));
    expect($('salida-total-cop')!.textContent).toBe(`$ ${(206_790 + 18 * 6_893 + 10_000).toLocaleString('es-CO')}`);
  });

  it('días fuera de 1 a 62: lo dice y no deja cargar', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    await montar();
    await escribir($('salida-dias-2026-10-16')!, '80');
    expect(document.body.textContent).toContain('Los días van de 1 a 62.');
    expect(($('salida-cargar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('carga al contrato con confirmación, mandando las filas tal cual con el valor corregido', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    api.cargarLiquidacionDeSalida.mockResolvedValue({
      contractId: 'c1',
      conceptoId: 'k1',
      nombre: 'Anticipo de servicios públicos (entrega del inmueble el 29/10/2026)',
      valorCop: 300_000,
      meses: [{ mes: '2026-10', valorCop: 300_000 }],
      subtotalCop: 290_000,
      tramitesCop: 10_000,
      saldoAFavorCop: 0,
      totalCop: 300_000,
      aDevolverCop: 0,
      filas: [],
      avisos: [],
      frase: '',
    });
    await montar();
    await escribir($('salida-valor-2026-10-16')!, '83210');
    await act(async () => $('salida-cargar')!.click());
    expect(h.confirmar).toHaveBeenCalled();
    const [id, cuerpo] = api.cargarLiquidacionDeSalida.mock.calls[0];
    expect(id).toBe('c1');
    expect(cuerpo.fechaEntrega).toBe('2026-10-29');
    expect(cuerpo.tramitesCop).toBe(10_000);
    expect(cuerpo.filas[1]).toMatchObject({ corteDesde: '2026-10-16', dias: 14, valorCop: 83_210, valorAMano: true, estimado: true });
    expect((toast as unknown as { success: ReturnType<typeof vi.fn> }).success).toHaveBeenCalledWith(
      'Listo: cargamos $ 300.000 al contrato como anticipo de servicios públicos.',
      expect.anything(),
    );
    expect($('salida-cargada')!.textContent).toContain('octubre de 2026');
    expect($('salida-cargar')).toBeNull();
  });

  it('409 NADA_QUE_COBRAR: dice la frase y lo que hay que devolverle', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    api.cargarLiquidacionDeSalida.mockRejectedValue(
      new ApiError(409, 'No hay nada que cobrarle al inquilino.', 'NADA_QUE_COBRAR', { code: 'NADA_QUE_COBRAR', message: 'No hay nada que cobrarle al inquilino.', aDevolverCop: 40_000 }),
    );
    await montar();
    await act(async () => $('salida-cargar')!.click());
    expect($('salida-nada-que-cobrar')!.textContent).toContain('No hay nada que cobrarle al inquilino.');
    expect($('salida-nada-que-cobrar')!.textContent).toContain('$ 40.000');
  });

  it('con el saldo a favor que pasa la cuenta, no ofrece cargar y dice que hay que devolverle', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    await montar();
    await escribir($('salida-saldo')!, '400000');
    expect($('salida-total-cop')!.textContent).toBe('$ 86.708');
    expect(document.body.textContent).toContain('Hay que devolverle');
    expect(($('salida-cargar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin fecha de entrega (400 FALTA_LA_FECHA_DE_ENTREGA) la pide y vuelve a leer con ella', async () => {
    api.liquidacionDeSalida
      .mockRejectedValueOnce(new ApiError(400, 'Escribe el día en que el inquilino entrega el inmueble.', 'FALTA_LA_FECHA_DE_ENTREGA'))
      .mockResolvedValueOnce(liquidacion({ fechaEntrega: '2026-11-05', fechaEntregaDe: 'PEDIDA' }));
    await montar();
    expect(document.body.textContent).toContain('Escribe el día en que el inquilino entrega el inmueble');
    await escribir($('salida-entrega')!, '2026-11-05');
    expect(api.liquidacionDeSalida).toHaveBeenLastCalledWith('c1', { fechaEntrega: '2026-11-05' });
    expect($('salida-filas')).not.toBeNull();
  });

  it('sin historial: agrega un mes a mano con su corte y su valor', async () => {
    api.liquidacionDeSalida.mockResolvedValue(
      liquidacion({ filas: [], grupos: [], sinHistorial: true, avisos: ['El inmueble no tiene facturas de servicios registradas: no hay con qué estimar. Escribe los meses a mano.'] }),
    );
    await montar();
    expect($('salida-avisos')!.textContent).toContain('Escribe los meses a mano.');
    await act(async () => $('salida-agregar-mes')!.click());
    await escribir($('agregar-desde')!, '2026-10-16');
    await escribir($('agregar-valor')!, '90000');
    await act(async () => $('agregar-el-mes')!.click());
    expect($('salida-fila-2026-10-16')!.textContent).toContain('Lo agregaste a mano.');
    expect(($('salida-dias-2026-10-16') as HTMLInputElement).value).toBe('14');
    expect($('salida-total-cop')!.textContent).toBe('$ 100.000');
  });

  it('sin permiso de editar contratos, se ve pero no se carga', async () => {
    api.liquidacionDeSalida.mockResolvedValue(liquidacion());
    await montar({ puedeCargar: false });
    expect($('salida-cargar')).toBeNull();
    expect($('salida-sin-permiso')).not.toBeNull();
  });
});
