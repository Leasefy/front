/**
 * Un medio apagado NO se ofrece — y la configuración falla ABIERTO.
 */

import { describe, it, expect } from 'vitest';

import {
  apagadosDespuesDe,
  estaApagado,
  mediosQueSeOfrecen,
  normalizarMedio,
  sinLosApagados,
} from './medios';

const CATALOGO = [
  { medio: 'TRANSFERENCIA', nombre: 'Transferencia bancaria', familia: 'TRANSFERENCIA', habilitado: true },
  { medio: 'PSE', nombre: 'PSE', familia: 'PASARELA', habilitado: true },
  { medio: 'EFECTIVO', nombre: 'Efectivo', familia: 'CAJA', habilitado: false },
  { medio: 'CHEQUE', nombre: 'Cheque', familia: 'CAJA', habilitado: false },
];

describe('🔴 los medios apagados no se ofrecen', () => {
  it('el preset de Nico deja transferencia y pasarela, sin efectivo ni cheque', () => {
    expect(mediosQueSeOfrecen(CATALOGO).map((m) => m.medio)).toEqual(['TRANSFERENCIA', 'PSE']);
  });

  it('filtra una lista de opciones escritas de cualquier forma', () => {
    const opciones = ['transferencia', 'Efectivo', 'cheque', 'PSE'];
    expect(sinLosApagados(opciones, (o) => o, ['EFECTIVO', 'CHEQUE'])).toEqual([
      'transferencia',
      'PSE',
    ]);
  });

  it('🔴 sin configuración no filtra nada: apagar medios por un fallo de red le impediría a una inmobiliaria recibir plata', () => {
    const opciones = ['transferencia', 'efectivo'];
    expect(sinLosApagados(opciones, (o) => o, [])).toEqual(opciones);
  });

  it('reconoce el medio escrito con tildes, espacios o minúsculas', () => {
    expect(normalizarMedio(' enlace de pago ')).toBe('ENLACE_DE_PAGO');
    expect(normalizarMedio('consignación')).toBe('CONSIGNACION');
    expect(estaApagado('Efectivo', ['EFECTIVO'])).toBe(true);
    expect(estaApagado('transferencia', ['EFECTIVO'])).toBe(false);
  });
});

describe('mover un interruptor', () => {
  it('apagar agrega el medio; prender lo saca, sin duplicar', () => {
    expect(apagadosDespuesDe([], 'EFECTIVO', false)).toEqual(['EFECTIVO']);
    expect(apagadosDespuesDe(['EFECTIVO'], 'EFECTIVO', false)).toEqual(['EFECTIVO']);
    expect(apagadosDespuesDe(['EFECTIVO', 'CHEQUE'], 'efectivo', true)).toEqual(['CHEQUE']);
  });
});
