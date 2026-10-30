/**
 * La liquidación al entregar el inmueble (Portofino, 29-10-2026): meses pendientes + trámites − saldo a favor.
 */
import { describe, expect, it } from 'vitest';

import type { FilaDeLaSalida } from '@/lib/api/servicios-publicos.service';
import {
  conDias,
  conValor,
  explicacionDelEstimado,
  filaAgregada,
  filaParaCargar,
  filasEditables,
  fraseDelTotal,
  problemaDeLosDias,
  totalDeLaSalida,
} from './liquidacion-de-salida';

const fila = (over: Partial<FilaDeLaSalida> = {}): FilaDeLaSalida => ({
  grupo: 'AGUA,ENERGIA,GAS',
  servicios: ['ENERGIA', 'AGUA', 'GAS'],
  nombreDelServicio: 'Energía, acueducto y gas',
  mesFacturado: '2026-11',
  corteDesde: '2026-09-16',
  corteHasta: '2026-10-15',
  dias: 30,
  tarifaDiariaCop: 6_893,
  valorCop: 206_790,
  estimado: true,
  valorAMano: false,
  facturaId: null,
  ...over,
});

describe('la liquidación de salida en la pantalla', () => {
  it('si cambian los días, el valor = días × tarifa por día', () => {
    const [f] = filasEditables([fila()]);
    const g = conDias(f, 18);
    expect(g.valorCop).toBe(18 * 6_893);
    expect(g.valorAMano).toBe(false);
  });

  it('el valor escrito a mano manda; si coincide con días × tarifa no cuenta como «a mano»', () => {
    const [f] = filasEditables([fila()]);
    expect(conValor(f, 200_000)).toMatchObject({ valorCop: 200_000, valorAMano: true });
    expect(conValor(f, 206_790).valorAMano).toBe(false);
  });

  it('una factura real sin tarifa: los días cambian, el valor se queda', () => {
    const [f] = filasEditables([fila({ estimado: false, tarifaDiariaCop: null, valorCop: 180_000, facturaId: 'f9' })]);
    expect(conDias(f, 20)).toMatchObject({ dias: 20, valorCop: 180_000 });
  });

  it('frena días fuera de 1 a 62', () => {
    expect(problemaDeLosDias(0)).toBe('Los días van de 1 a 62.');
    expect(problemaDeLosDias(63)).not.toBeNull();
    expect(problemaDeLosDias(30)).toBeNull();
  });

  it('total = subtotal + trámites − saldo a favor; si el saldo pasa, hay que devolverle', () => {
    const t = totalDeLaSalida([{ valorCop: 206_790 }, { valorCop: 96_502 }], 10_000, 0);
    expect(t).toEqual({ subtotalCop: 303_292, tramitesCop: 10_000, saldoAFavorCop: 0, totalCop: 313_292, aDevolverCop: 0 });
    expect(fraseDelTotal(t, 2)).toBe('Se le cobran al inquilino $ 313.292: 2 meses de servicios ($ 303.292) + trámites bancarios $ 10.000.');
    const devolver = totalDeLaSalida([{ valorCop: 100_000 }], 10_000, 150_000);
    expect(devolver).toMatchObject({ totalCop: 0, aDevolverCop: 40_000 });
    expect(fraseDelTotal(devolver, 1)).toContain('Hay que devolverle $ 40.000');
  });

  it('explica el estimado con el promedio y la desviación', () => {
    const tarifa = { tarifaDiariaCop: 6_893, desviacionCop: 410, facturasUsadas: 6, cortes: [] };
    expect(explicacionDelEstimado({ tarifa })).toBe('Promedio de 6 facturas anteriores: $ 6.893 por día (± $ 410).');
    expect(explicacionDelEstimado({ tarifa: { ...tarifa, tarifaDiariaCop: null, facturasUsadas: 0 } })).toContain('escribe el valor');
  });

  it('una fila agregada a mano cuenta sus días y va como estimada con su valor', () => {
    const f = filaAgregada({ corteDesde: '2026-10-16', corteHasta: '2026-10-29', valorCop: 90_000 }, 0);
    expect(f).toMatchObject({ dias: 14, mesFacturado: '2026-11', estimado: true, valorAMano: true, valorCop: 90_000 });
    expect(conValor(f, 95_000).valorAMano).toBe(true);
  });

  it('la fila viaja al POST tal cual, sin la llave de la pantalla', () => {
    const [f] = filasEditables([fila()]);
    const enviada = filaParaCargar(conValor(f, 200_000));
    expect(enviada).toMatchObject({ corteDesde: '2026-09-16', corteHasta: '2026-10-15', dias: 30, valorCop: 200_000, estimado: true, valorAMano: true });
    expect('clave' in enviada).toBe(false);
  });
});
