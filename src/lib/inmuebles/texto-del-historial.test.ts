import { describe, expect, it } from 'vitest';

import { textoDelHistorial } from './texto-del-historial';

describe('textoDelHistorial', () => {
  it('«Agente asignado» es «Asesor a cargo», y sin «pipeline»', () => {
    expect(textoDelHistorial('Agente asignado: Ana Administradora Lab')).toBe(
      'Asesor a cargo: Ana Administradora Lab',
    );
    expect(
      textoDelHistorial('Queda como responsable del inmueble, sus fichas del pipeline y sus cobros.'),
    ).toBe('Lleva el inmueble, sus prospectos y sus cobros.');
  });

  it('cambia la jerga suelta y deja lo demás como vino', () => {
    expect(textoDelHistorial('Lo movió al pipeline')).toBe('Lo movió a la prospección');
    expect(textoDelHistorial('Recibo de caja #1 por $ 1.000.000')).toBe('Recibo de caja #1 por $ 1.000.000');
    expect(textoDelHistorial('Firmó el contrato de consignación')).toBe('Firmó el mandato');
  });
});
