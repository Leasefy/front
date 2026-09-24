/**
 * El mapeo rubro del P&G → cuentas del PUC.
 *
 * Los dos casos que este archivo protege:
 *
 * 🔴 Un rubro MIXTO —cuentas de clases distintas— produce un número que suma
 * ingresos y gastos, y que se ve razonable. Es el error más peligroso de este
 * mapeo, así que va primero en los avisos y se prueba que va primero.
 *
 * 🔴 Un rubro que la inmobiliaria inventó y dejó sin cuenta NO es un faltante:
 * nadie propuso una cuenta para él. Contarlo dejaría el mapeo incompleto para
 * siempre, y un contador que nunca puede terminar deja de intentarlo.
 */

import { describe, it, expect } from 'vitest';

import {
  NOMBRE_DE_LA_FUENTE,
  NOMBRE_DE_LA_NATURALEZA,
  avisosDelMapeoDeRubros,
  cuentasMayores,
  explicacionDeLaSegundaLectura,
  faltantesSugeridos,
  resumenDeLasCuentas,
  rubrosMixtos,
  rubrosSembrables,
  rubrosSinCuenta,
  rubrosSinPresetEnElPlan,
  tieneFuentePropia,
} from './rubros-del-pyg';
import type { CuentaDelRubro, MapeoDeRubro, MapeoDeRubros } from '@/lib/api/contabilidad.service';

const cuenta = (extra: Partial<CuentaDelRubro> = {}): CuentaDelRubro => ({
  id: 'c1',
  codigo: '5135',
  nombre: 'Servicios',
  naturaleza: 'DEBITO',
  imputable: false,
  ...extra,
});

const rubro = (extra: Partial<MapeoDeRubro> = {}): MapeoDeRubro => ({
  rubro: 'servicios',
  nombre: 'Servicios públicos y comunicaciones',
  naturaleza: 'COSTO',
  fuenteDelReal: 'CUENTAS_DEL_PUC',
  motivoSinReal: null,
  sugerido: true,
  cuentas: [cuenta()],
  propuestas: [cuenta()],
  codigosPropuestos: ['5135'],
  ...extra,
});

const mapeo = (rubros: MapeoDeRubro[]): MapeoDeRubros => ({
  disponible: true,
  motivo: null,
  completo: rubros.every((r) => !r.sugerido || r.cuentas.length > 0),
  faltantes: rubros.filter((r) => r.sugerido && r.cuentas.length === 0).map((r) => r.rubro),
  rubros,
});

describe('los nombres', () => {
  it('COSTO se lee «Gasto»: es lo que un contador de inmobiliaria dice', () => {
    expect(NOMBRE_DE_LA_NATURALEZA.COSTO).toBe('Gasto');
  });

  it('las cinco fuentes tienen su frase', () => {
    for (const f of [
      'COMISION_CAUSADA',
      'RECARGOS_RECAUDADOS',
      'COSTOS_DE_LA_PLATA',
      'CUENTAS_DEL_PUC',
      'SIN_FUENTE',
    ] as const) {
      expect(NOMBRE_DE_LA_FUENTE[f]).toBeTruthy();
    }
  });
});

describe('tieneFuentePropia', () => {
  it('los tres rubros que ya se medían', () => {
    expect(tieneFuentePropia(rubro({ fuenteDelReal: 'COMISION_CAUSADA' }))).toBe(true);
    expect(tieneFuentePropia(rubro({ fuenteDelReal: 'RECARGOS_RECAUDADOS' }))).toBe(true);
    expect(tieneFuentePropia(rubro({ fuenteDelReal: 'COSTOS_DE_LA_PLATA' }))).toBe(true);
  });

  it('el que se mide sólo con el PUC no tiene fuente propia', () => {
    expect(tieneFuentePropia(rubro({ fuenteDelReal: 'CUENTAS_DEL_PUC' }))).toBe(false);
    expect(tieneFuentePropia(rubro({ fuenteDelReal: 'SIN_FUENTE' }))).toBe(false);
  });
});

describe('los grupos de rubros', () => {
  it('sin cuenta son los vacíos, sugeridos o no', () => {
    const m = mapeo([
      rubro({ rubro: 'a', cuentas: [] }),
      rubro({ rubro: 'b', cuentas: [], sugerido: false }),
      rubro({ rubro: 'c' }),
    ]);
    expect(rubrosSinCuenta(m).map((r) => r.rubro)).toEqual(['a', 'b']);
  });

  it('🔴 los faltantes son sólo los SUGERIDOS: lo inventado no es un pendiente', () => {
    const m = mapeo([
      rubro({ rubro: 'a', cuentas: [] }),
      rubro({ rubro: 'inventado', cuentas: [], sugerido: false }),
    ]);
    expect(faltantesSugeridos(m).map((r) => r.rubro)).toEqual(['a']);
  });

  it('los sembrables son los vacíos con propuesta existente en el plan', () => {
    const m = mapeo([
      rubro({ rubro: 'a', cuentas: [], propuestas: [cuenta()] }),
      rubro({ rubro: 'b', cuentas: [], propuestas: [] }),
      rubro({ rubro: 'c', cuentas: [cuenta()], propuestas: [cuenta()] }),
    ]);
    expect(rubrosSembrables(m).map((r) => r.rubro)).toEqual(['a']);
  });

  it('sin preset en el plan: vacío, sin propuestas, pero con códigos propuestos', () => {
    const m = mapeo([
      rubro({ rubro: 'a', cuentas: [], propuestas: [], codigosPropuestos: ['51959505'] }),
      // Uno que nadie propuso: no aparece acá, no hay nada que crear.
      rubro({ rubro: 'b', cuentas: [], propuestas: [], codigosPropuestos: [] }),
    ]);
    expect(rubrosSinPresetEnElPlan(m).map((r) => r.rubro)).toEqual(['a']);
  });

  it('los mixtos son los de naturaleza MIXTO', () => {
    const m = mapeo([rubro({ rubro: 'a', naturaleza: 'MIXTO' }), rubro({ rubro: 'b' })]);
    expect(rubrosMixtos(m).map((r) => r.rubro)).toEqual(['a']);
  });
});

describe('avisosDelMapeoDeRubros', () => {
  it('un mapeo completo y limpio no dice nada', () => {
    expect(avisosDelMapeoDeRubros(mapeo([rubro()]))).toEqual([]);
  });

  it('🔴 el mixto va PRIMERO: es el que produce un número mal', () => {
    const m = mapeo([
      rubro({ rubro: 'vacio', nombre: 'Nómina', cuentas: [] }),
      rubro({ rubro: 'mixto', nombre: 'Gastos', naturaleza: 'MIXTO' }),
    ]);
    const avisos = avisosDelMapeoDeRubros(m);
    expect(avisos[0]).toContain('clases distintas');
    expect(avisos[0]).toContain('el número no significa nada');
  });

  it('el faltante nombra el guion del presupuesto: es la consecuencia visible', () => {
    const m = mapeo([rubro({ rubro: 'nomina', nombre: 'Nómina', cuentas: [] })]);
    const aviso = avisosDelMapeoDeRubros(m).find((a) => a.includes('Nómina'))!;
    expect(aviso).toContain('«—»');
  });

  it('el que no tiene su preset en el plan dice el código a crear', () => {
    const m = mapeo([
      rubro({
        rubro: 'software',
        nombre: 'Software y licencias',
        cuentas: [],
        propuestas: [],
        codigosPropuestos: ['51959505'],
      }),
    ]);
    const aviso = avisosDelMapeoDeRubros(m).find((a) => a.includes('51959505'))!;
    expect(aviso).toContain('Créala en el plan de cuentas');
  });

  it('un rubro inventado y vacío no genera ningún aviso', () => {
    const m = mapeo([
      rubro({ rubro: 'mio', cuentas: [], sugerido: false, propuestas: [], codigosPropuestos: [] }),
    ]);
    expect(avisosDelMapeoDeRubros(m)).toEqual([]);
  });

  it('singular y plural', () => {
    const uno = avisosDelMapeoDeRubros(mapeo([rubro({ cuentas: [] })]));
    expect(uno[0]).toContain('Falta la cuenta de 1 rubro');
    const dos = avisosDelMapeoDeRubros(
      mapeo([rubro({ rubro: 'a', cuentas: [] }), rubro({ rubro: 'b', cuentas: [] })]),
    );
    expect(dos[0]).toContain('Faltan las cuentas de 2 rubros');
  });
});

describe('explicacionDeLaSegundaLectura', () => {
  it('🔴 un rubro con fuente propia explica que el mapeo NO la reemplaza', () => {
    const frase = explicacionDeLaSegundaLectura(
      rubro({ fuenteDelReal: 'COMISION_CAUSADA' }),
    )!;
    expect(frase).toContain('eso no cambia');
    expect(frase).toContain('segunda lectura');
  });

  it('un rubro que sólo se mide con el PUC no la necesita', () => {
    expect(explicacionDeLaSegundaLectura(rubro({ fuenteDelReal: 'CUENTAS_DEL_PUC' }))).toBeNull();
  });
});

describe('resumenDeLasCuentas', () => {
  it('sin cuenta lo dice', () => {
    expect(resumenDeLasCuentas(rubro({ cuentas: [] }))).toBe('Sin cuenta');
  });

  it('con una, código y nombre', () => {
    expect(resumenDeLasCuentas(rubro())).toBe('5135 · Servicios');
  });

  it('con varias, la primera y cuántas más', () => {
    expect(
      resumenDeLasCuentas(
        rubro({ cuentas: [cuenta(), cuenta({ id: 'c2' }), cuenta({ id: 'c3' })] }),
      ),
    ).toBe('5135 · Servicios +2 más');
  });
});

describe('cuentasMayores', () => {
  it('cuenta las no imputables: cambian lo que el número significa', () => {
    expect(
      cuentasMayores(
        rubro({ cuentas: [cuenta({ imputable: false }), cuenta({ id: 'c2', imputable: true })] }),
      ),
    ).toBe(1);
  });
});
