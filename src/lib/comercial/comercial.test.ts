import { describe, expect, it } from 'vitest';

import {
  csvDeLasComisiones,
  esVacanciaLarga,
  mandatoPorVencerOVencido,
  textoDeLaRegla,
  textoDeLaVacancia,
  textoDelMandato,
  type ComisionesDelMes,
} from './comercial';

/** COMERCIAL (Nico, 04-10-2026): los textos que se repiten en lista, ficha y pantallas. */
describe('vacancia', () => {
  it('«Vacante hace 42 días» desde la fecha real; si no se sabe, lo dice', () => {
    expect(textoDeLaVacancia({ vacante: true, desde: '2026-08-23', dias: 42, fuente: 'FIN_DEL_CONTRATO' })).toBe(
      'Vacante hace 42 días',
    );
    expect(textoDeLaVacancia({ vacante: true, desde: '2026-10-03', dias: 1, fuente: 'CONSIGNACION' })).toBe('Vacante hace 1 día');
    expect(textoDeLaVacancia({ vacante: true, desde: null, dias: null, fuente: null })).toBe(
      'No sabemos desde cuándo está vacante',
    );
    expect(textoDeLaVacancia({ vacante: false, desde: null, dias: null, fuente: null })).toBeNull();
  });

  it('más de 30 días es vacancia larga; 30 justos no', () => {
    expect(esVacanciaLarga({ vacante: true, desde: 'x', dias: 31, fuente: 'CONSIGNACION' })).toBe(true);
    expect(esVacanciaLarga({ vacante: true, desde: 'x', dias: 30, fuente: 'CONSIGNACION' })).toBe(false);
    expect(esVacanciaLarga({ vacante: true, desde: null, dias: null, fuente: null })).toBe(false);
  });
});

describe('mandato', () => {
  it('dice la fecha de la casa y cuánto falta o cuánto hace', () => {
    expect(textoDelMandato({ estado: 'POR_VENCER', vence: '2026-10-15', dias: 11 })).toMatch(
      /^Mandato vence el 15 de octubre de 2026 \(faltan 11 días\)$/,
    );
    expect(textoDelMandato({ estado: 'VENCIDO', vence: '2026-10-01', dias: -3 })).toMatch(/vencido el 1 de octubre de 2026 \(hace 3 días\)/);
    expect(textoDelMandato({ estado: 'SIN_FECHA', vence: null, dias: null })).toBeNull();
    expect(mandatoPorVencerOVencido({ estado: 'VIGENTE', vence: '2027-01-01', dias: 89 })).toBe(false);
    expect(mandatoPorVencerOVencido({ estado: 'VENCIDO', vence: '2026-10-01', dias: -3 })).toBe(true);
  });
});

describe('regla', () => {
  it('se lee en una línea, con la plata de la casa', () => {
    expect(textoDeLaRegla({ forma: 'PORCENTAJE', pctCaptar: 10, pctCerrar: 12.5, fijoPorCierreCop: null })).toBe(
      '10 % por captar y 12,5 % por cerrar de la comisión que gana la inmobiliaria',
    );
    expect(textoDeLaRegla({ forma: 'FIJO_POR_CIERRE', pctCaptar: null, pctCerrar: null, fijoPorCierreCop: 300000 })).toBe(
      '$\u00a0300.000 por cada contrato que cierra',
    );
  });
});

describe('CSV para nómina', () => {
  it('una fila por línea y el total por asesor, con «;» y coma decimal', () => {
    const datos: ComisionesDelMes = {
      mes: '2026-10',
      hayReglas: true,
      soloLaMia: false,
      sinAsesor: 0,
      totales: { ganadoCop: 20000.5, porCausarCop: 0, lineas: 1, sinRegla: 0 },
      asesores: [
        {
          userId: 'u1',
          nombre: 'Sara Gómez',
          regla: null,
          ganadoCop: 20000.5,
          porCausarCop: 0,
          lineas: 1,
          sinRegla: 0,
          detalle: [
            {
              asesorUserId: 'u1',
              contractId: 'k1',
              codigo: 7,
              inmueble: 'Apto 402; torre 2',
              consignacionId: 'm1',
              accion: 'CAPTO',
              baseCop: 200005,
              baseCausadaCop: 200005,
              regla: { id: 'r', forma: 'PORCENTAJE', desdeMes: '2026-01', deTodos: true, texto: '10 %' },
              valorCop: 20000.5,
              ganadoCop: 20000.5,
              porCausarCop: 0,
              estado: 'GANADA',
            },
          ],
        },
      ],
    };
    const csv = csvDeLasComisiones(datos).split('\r\n');
    expect(csv[0]).toBe(
      'Mes;Asesor;Inmueble;Contrato;Qué hizo;Comisión de la inmobiliaria del mes;Causada;Regla;Valor del asesor;Ganado;Por causar;Estado',
    );
    expect(csv[1]).toBe('2026-10;Sara Gómez;"Apto 402; torre 2";#7;Captó;200005;200005;10 %;20000,5;20000,5;0;Ganada');
    expect(csv.at(-1)).toBe('2026-10;Sara Gómez;20000,5;0');
  });
});
