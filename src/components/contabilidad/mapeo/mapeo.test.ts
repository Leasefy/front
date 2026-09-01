import { describe, expect, it } from 'vitest';

import type { MapeoContable, MapeoDeEvento } from '@/lib/api/contabilidad.service';
import { eventosSembrables, eventosSinCuenta, loQueNoSeAsienta } from './mapeo';

function evento(over: Partial<MapeoDeEvento> & Pick<MapeoDeEvento, 'evento'>): MapeoDeEvento {
  return {
    nombre: over.evento,
    explicacion: '',
    lado: 'HABER',
    codigoPropuesto: '000000',
    cuenta: null,
    propuesta: null,
    ...over,
  };
}
const cuenta = (id: string, extra: Partial<{ activa: boolean; imputable: boolean }> = {}) => ({
  id,
  codigo: '112005',
  nombre: 'Bancos',
  activa: true,
  imputable: true,
  ...extra,
});

describe('mapeo (puro)', () => {
  const mapeo: MapeoContable = {
    eventos: [
      evento({ evento: 'RECIBO_BANCOS', cuenta: cuenta('c-1') }),
      evento({ evento: 'RECIBO_CAJA', propuesta: cuenta('c-2') }),
      evento({ evento: 'RECAUDO_CANON_TERCEROS', propuesta: cuenta('c-3', { imputable: false }) }),
      evento({ evento: 'INGRESO_COMISION' }),
    ],
    completo: false,
    faltantes: ['RECIBO_CAJA', 'RECAUDO_CANON_TERCEROS', 'INGRESO_COMISION'],
  };

  it('eventosSinCuenta lista los vacíos', () => {
    expect(eventosSinCuenta(mapeo)).toEqual(['RECIBO_CAJA', 'RECAUDO_CANON_TERCEROS', 'INGRESO_COMISION']);
  });

  it('eventosSembrables sólo cuenta los vacíos con propuesta usable (activa e imputable)', () => {
    expect(eventosSembrables(mapeo)).toEqual(['RECIBO_CAJA']);
  });

  it('loQueNoSeAsienta traduce lo que falta a los asientos que quedan apagados, sin repetir', () => {
    expect(loQueNoSeAsienta(['RECAUDO_CANON_TERCEROS'])).toEqual([
      'los recibos de caja por transferencia, PSE o pasarela',
      'los lotes de pago a propietarios',
    ]);
    expect(loQueNoSeAsienta(['INGRESO_COMISION'])).toEqual(['los lotes que liquidan comisión']);
    expect(loQueNoSeAsienta([])).toEqual([]);
  });
});
