import { describe, expect, it } from 'vitest';

import { csvParaElAgente } from '../extracto-para-el-agente';

const FILAS = [
  { fecha: '2026-09-03', valorCop: 1350000, descripcion: 'PAGO PSE, ANA; GOMEZ', referencia: 'APTO 301' },
  { fecha: '2026-09-04', valorCop: -12000, descripcion: 'COMISION' },
];

describe('el extracto reescrito para el agente', () => {
  it('Bancolombia: punto y coma, el valor con signo en débito', () => {
    expect(csvParaElAgente(FILAS, 'bancolombia').split('\n')).toEqual([
      'Fecha;Descripcion;Debito;Credito;Referencia',
      '2026-09-03;PAGO PSE, ANA  GOMEZ;1350000;;APTO 301',
      '2026-09-04;COMISION;-12000;;',
    ]);
  });

  it('Davivienda: coma, valor con signo y la columna vacía antes de la referencia', () => {
    expect(csvParaElAgente(FILAS, 'davivienda').split('\n')).toEqual([
      'Fecha,Descripcion,Valor,,Referencia',
      '2026-09-03,PAGO PSE  ANA; GOMEZ,1350000,,APTO 301',
      '2026-09-04,COMISION,-12000,,',
    ]);
  });
});
