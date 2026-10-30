/**
 * El corte de la factura (Portofino, 29-10-2026): «lo que se liquida de agosto a septiembre se liquidaría en octubre».
 */
import { describe, expect, it } from 'vitest';

import type { FacturaDeServicio } from '@/lib/api/servicios-publicos.service';
import {
  comoCaeDe,
  conceptosDelPropietarioDe,
  corteDe,
  diasEntre,
  estadoDeServi,
  fraseDelCorte,
  fraseDelMesFacturado,
  mesDelCorteDe,
  mesFacturadoDe,
  revisionDeServiDe,
  totalDelPropietario,
} from './corte-de-la-factura';

const base = { periodoDesde: '2026-08-15', periodoHasta: '2026-09-15' };

describe('el corte de una factura', () => {
  it('cuenta los días calendario inclusive, como la hoja de Portofino (15 ago – 15 sep = 32)', () => {
    expect(diasEntre('2026-08-15', '2026-09-15')).toBe(32);
    expect(diasEntre('2026-09-16', '2026-10-15')).toBe(30);
    expect(corteDe(base)).toEqual({ desde: '2026-08-15', hasta: '2026-09-15', dias: 32 });
  });

  it('usa el corte del back cuando lo manda', () => {
    expect(corteDe({ ...base, corte: { desde: '2026-08-15', hasta: '2026-09-15', dias: 32 } }).dias).toBe(32);
  });

  it('dice el corte en una frase y el año sólo si cruza de año', () => {
    expect(fraseDelCorte(base)).toBe('Consumo del 15 ago al 15 sep · 32 días');
    expect(fraseDelCorte({ periodoDesde: '2025-12-16', periodoHasta: '2026-01-15' })).toBe('Consumo del 16 dic 2025 al 15 ene 2026 · 31 días');
  });

  it('el tablero cuenta por el mes del corte; el mes facturado es aparte', () => {
    expect(mesDelCorteDe(base)).toBe('2026-09');
    expect(mesFacturadoDe({ ...base, mesFacturado: '2026-10', mesFacturadoSegun: 'FACTURA' })).toEqual({ mes: '2026-10', estimado: false });
    expect(fraseDelMesFacturado({ ...base, mesFacturado: '2026-10', mesFacturadoSegun: 'FACTURA' })).toEqual({ texto: 'facturada en octubre', estimado: false });
  });

  it('sin el mes de la factura (o un back anterior) lo estima: el siguiente al corte', () => {
    expect(mesFacturadoDe(base)).toEqual({ mes: '2026-10', estimado: true });
    expect(fraseDelMesFacturado({ ...base, mesFacturado: '2026-10', mesFacturadoSegun: 'ESTIMADO' })).toEqual({ texto: 'se factura en octubre', estimado: true });
    expect(fraseDelMesFacturado({ periodoDesde: '2026-11-16', periodoHasta: '2026-12-15' }).texto).toBe('se factura en enero de 2027');
  });

  it('cómo cae en el contrato: del back, de Servi o con el inicio', () => {
    expect(comoCaeDe({ ...base, comoCaeEnElContrato: 'CRUZA_EL_INICIO' })).toBe('CRUZA_EL_INICIO');
    expect(comoCaeDe(base, '2026-09-08')).toBe('CRUZA_EL_INICIO');
    expect(comoCaeDe(base, '2026-10-01')).toBe('ANTES_DEL_INICIO');
    expect(comoCaeDe(base, '2026-01-01')).toBe('DENTRO');
    expect(comoCaeDe(base)).toBeNull();
  });
});

describe('lo del propietario y lo que leyó Servi', () => {
  const revision = {
    veredicto: 'CUADRA',
    motivos: ['El valor y el corte coinciden con la factura.'],
    leido: { empresa: 'EPM', periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', valorCop: 140_260, mesFacturado: '2026-10', fechaDeEmision: '2026-10-02' },
    ajuste: null,
    conceptosDelPropietario: [{ tipo: 'ACUERDO_DE_PAGO', concepto: 'Cuota 3 de 12 acuerdo de pago', valorCop: 25_000 }],
    comoCaeEnElContrato: 'CRUZA_EL_INICIO',
    entrada: { entrega: '2026-09-08', diasDelPropietario: 24, diasDelInquilino: 8, partePropietarioCop: 86_445, parteInquilinoCop: 28_815 },
    propuestas: [{ proceso: 'servicios.ajuste', clave: 'entrada:f1', resumen: 'Partir la factura por días', montoCop: 86_445 }],
    revisadaEn: '2026-10-20T10:00:00.000Z',
  };

  it('lee la revisión en limpio', () => {
    const r = revisionDeServiDe({ revisionDeServi: revision })!;
    expect(r.veredicto).toBe('CUADRA');
    expect(r.leido?.mesFacturado).toBe('2026-10');
    expect(r.entrada?.parteInquilinoCop).toBe(28_815);
    expect(r.propuestas).toHaveLength(1);
    expect(revisionDeServiDe({ revisionDeServi: null })).toBeNull();
    expect(revisionDeServiDe({ revisionDeServi: { algo: 1 } })).toBeNull();
  });

  it('lo del propietario sale de la factura o, si no, de lo que leyó Servi; un tipo raro es «otro»', () => {
    expect(conceptosDelPropietarioDe({ revisionDeServi: revision })).toHaveLength(1);
    const raros = revisionDeServiDe({ revisionDeServi: { veredicto: 'CUADRA', conceptosDelPropietario: [{ tipo: 'X', concepto: 'RTR', valorCop: 10 }] } });
    expect(raros?.conceptosDelPropietario[0].tipo).toBe('OTRO');
    const lista = [
      { tipo: 'ACUERDO_DE_PAGO' as const, concepto: 'Acuerdo', valorCop: 25_000 },
      { tipo: 'REVISION_PERIODICA' as const, concepto: 'RTR', valorCop: 40_500 },
    ];
    expect(totalDelPropietario(lista)).toBe(65_500);
  });

  it('lo que Servi propuso y sigue por revisar se decide en la Bandeja', () => {
    const f = (estado: FacturaDeServicio['estado']) => ({ estado, revisionDeServi: revision });
    expect(estadoDeServi(f('POR_REVISAR'))).toBe('POR_DECIDIR');
    expect(estadoDeServi(f('AL_DIA'))).toBe('REVISADA');
    expect(estadoDeServi({ estado: 'POR_REVISAR', revisionDeServi: null })).toBeNull();
  });
});
