import { describe, expect, it } from 'vitest';

import type { MapeoContable, MapeoDeEvento } from '@/lib/api/contabilidad.service';
import { eventosSembrables, eventosSinCuenta, loQueNoSeAsienta, propuestaQueSirve } from './mapeo';

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

  it('🔴 Portofino (14-10): una propuesta con OTRO nombre en el plan importado no se siembra', () => {
    const conOtroNombre: MapeoContable = {
      ...mapeo,
      eventos: [
        evento({ evento: 'RECIBO_CAJA', propuesta: cuenta('c-2'), propuestaConElNombreDelPlanBase: true }),
        evento({
          evento: 'RECAUDO_CANON_TERCEROS',
          propuesta: { ...cuenta('c-3'), codigo: '28150505', nombre: 'COBRO SERVICIOS PUBLICOS AL PROPIETARIO' },
          propuestaConElNombreDelPlanBase: false,
        }),
      ],
    };
    expect(eventosSembrables(conOtroNombre)).toEqual(['RECIBO_CAJA']);
  });

  it('loQueNoSeAsienta traduce lo que falta a los asientos que quedan apagados, sin repetir', () => {
    expect(loQueNoSeAsienta(['RECAUDO_CANON_TERCEROS'])).toEqual([
      'los recibos de caja por transferencia, PSE o pasarela',
      'los lotes de pago a propietarios',
    ]);
    expect(loQueNoSeAsienta(['INGRESO_COMISION'])).toEqual(['los lotes que liquidan comisión']);
    expect(loQueNoSeAsienta(['CARTERA_INQUILINOS'])).toEqual([
      'la causación de cada cobro (lo que debe el arrendatario)',
    ]);
    expect(loQueNoSeAsienta([])).toEqual([]);
  });
});

describe('el evento opcional «Ajuste al peso» (2026-09-16)', () => {
  it('sin cuenta no cuenta como faltante: su valor va a «otros recaudos»', () => {
    const mapeo = {
      eventos: [
        evento({ evento: 'AJUSTE_AL_PESO', opcional: true }),
        evento({ evento: 'RECIBO_CAJA' }),
      ],
      completo: false,
      faltantes: ['RECIBO_CAJA' as const],
    };
    expect(eventosSinCuenta(mapeo)).toEqual(['RECIBO_CAJA']);
  });
});

describe('propuestaQueSirve (Portofino 14-10)', () => {
  const p = { id: 'c-p', codigo: '28150505', nombre: 'X', activa: true, imputable: true }
  it('una alternativa activa, imputable, con el nombre del plan base y distinta de la elegida, sirve', () => {
    expect(propuestaQueSirve({ propuesta: p, propuestaConElNombreDelPlanBase: true }, 'c-elegida')).toBe(true)
  })
  it('🔴 con otro nombre en el plan importado, no', () => {
    expect(propuestaQueSirve({ propuesta: p, propuestaConElNombreDelPlanBase: false }, 'c-elegida')).toBe(false)
  })
  it('mayor, inactiva, la misma elegida o sin propuesta, no', () => {
    expect(propuestaQueSirve({ propuesta: { ...p, imputable: false } }, 'c-elegida')).toBe(false)
    expect(propuestaQueSirve({ propuesta: { ...p, activa: false } }, 'c-elegida')).toBe(false)
    expect(propuestaQueSirve({ propuesta: p }, 'c-p')).toBe(false)
    expect(propuestaQueSirve({ propuesta: null }, 'c-elegida')).toBe(false)
  })
})
