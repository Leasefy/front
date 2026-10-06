/**
 * QA-CONT (03-10-2026) · las reglas puras del QA de Contratos.
 *
 *  · C-13: la fecha de fin por defecto es inicio + 12 meses − 1 día, y los
 *    valores por defecto salen de la inmobiliaria.
 *  · C-22: el primer canon del resumen (espejo de la regla del back, sólo el canon).
 *  · C-16: la búsqueda encuentra por documento del inquilino, por propietario
 *    y por dirección sin importar espacios, «#» ni tildes.
 *  · C-05 / C-06: «Por empezar» no es vigente, y un terminado no es vigente
 *    aunque su fin pactado sea futuro.
 */
import { describe, it, expect } from 'vitest';
import type { Contract } from '@/lib/types/contract';
import { finPorDefectoISO } from '@/app/panel/inmobiliaria/contratos/nuevo/fechas-y-topes';
import { primerCanon } from './primer-canon';
import { terminosPorDefectoDeLaAgencia } from './terminos-por-defecto';
import { empiezaDespues, filtrarContratos, FILTROS_INICIALES, type FiltrosDeContratos } from './filtrar-contratos';
import { estadoParaMostrar } from './estado-para-mostrar';
import { vigenciaDelContrato } from './vigencia';
import { fechaRelativa } from '@/lib/i18n/fecha-relativa';
import { usoPorElTipo } from './uso-del-inmueble';

describe('C-13 · fin por defecto = inicio + 12 meses − 1 día', () => {
  it.each([
    ['2026-10-03', '2027-10-02'],
    ['2026-11-01', '2027-10-31'],
    ['2026-01-01', '2026-12-31'],
    ['2026-03-31', '2027-03-30'],
    // Un aniversario que no existe (29 de febrero) cae en el último día y resta uno.
    ['2028-02-29', '2029-02-27'],
  ])('%s → %s', (inicio, fin) => {
    expect(finPorDefectoISO(inicio)).toBe(fin);
  });

  it('🔴 ya no es «12 meses y un día» (03-10-2026 → 03-10-2027)', () => {
    expect(finPorDefectoISO('2026-10-03')).not.toBe('2027-10-03');
  });

  it('una fecha rota se devuelve tal cual', () => {
    expect(finPorDefectoISO('')).toBe('');
    expect(finPorDefectoISO('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('C-13 · los valores por defecto de la inmobiliaria', () => {
  it('el día de pago y el plazo salen de su configuración', () => {
    expect(terminosPorDefectoDeLaAgencia({ paymentDueDay: 5, diasDePlazo: 3 })).toEqual({
      diaDePago: 5,
      prorratear: null,
      diasDePlazo: 3,
    });
  });

  it('el prorrateo, cuando el back lo publica', () => {
    expect(terminosPorDefectoDeLaAgencia({ paymentDueDay: 1, prorratearPrimerMes: true })?.prorratear).toBe(true);
  });

  it('no inventa: sin inmobiliaria es null y un día fuera de 1 a 28 no se usa', () => {
    expect(terminosPorDefectoDeLaAgencia(null)).toBeNull();
    expect(terminosPorDefectoDeLaAgencia({ paymentDueDay: 31 })?.diaDePago).toBeNull();
  });
});

describe('C-22 · el primer canon del resumen', () => {
  it('prorrateado: del inicio al último día del mes, base 30', () => {
    // 3 de octubre: del 3 al 30 comercial = 28 días de 30.
    expect(primerCanon({ inicio: '2026-10-03', canon: 3_000_000, prorratear: true })).toEqual({
      desde: '2026-10-03',
      hasta: '2026-10-31',
      dias: 28,
      valor: 2_800_000,
      prorrateado: true,
    });
  });

  it('prorrateado desde el 1: el mes completo', () => {
    const p = primerCanon({ inicio: '2026-11-01', canon: 2_500_000, prorratear: true })!;
    expect(p.dias).toBe(30);
    expect(p.valor).toBe(2_500_000);
    expect(p.prorrateado).toBe(false);
  });

  it('el 31 es el día 30 comercial: 1 día (mismo borde que el back)', () => {
    expect(primerCanon({ inicio: '2026-10-31', canon: 3_000_000, prorratear: true })?.dias).toBe(1);
  });

  it('fecha a fecha: el canon completo, vence el día en que empieza', () => {
    expect(primerCanon({ inicio: '2026-10-20', canon: 1_650_000, prorratear: false })).toEqual({
      desde: '2026-10-20',
      hasta: '2026-11-19',
      dias: 30,
      valor: 1_650_000,
      prorrateado: false,
    });
  });

  it('sin canon o sin fecha no inventa un número', () => {
    expect(primerCanon({ inicio: '2026-10-03', canon: 0, prorratear: true })).toBeNull();
    expect(primerCanon({ inicio: '', canon: 1_000_000, prorratear: true })).toBeNull();
  });
});

// ── La lista ─────────────────────────────────────────────────────────────────

const HOY = new Date(2026, 9, 3); // 3 de octubre de 2026

function contrato(overrides: Partial<Contract>): Partial<Contract> {
  return {
    id: 'c',
    code: 1,
    externalId: null,
    status: 'active',
    contractOrigin: 'MIGRATED',
    propertyId: 'p-1',
    tenantId: 't-1',
    tenantName: 'Ana Díaz',
    tenantDocument: '',
    propertyAddress: 'Calle 7 # 39-12',
    propertyCity: 'Medellín',
    monthlyRent: 1_500_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ...overrides,
  };
}

const con = (parcial: Partial<FiltrosDeContratos>): FiltrosDeContratos => ({ ...FILTROS_INICIALES, ...parcial });
const ids = (xs: Partial<Contract>[]) => xs.map((x) => x.id);

describe('C-16 · la búsqueda de la lista', () => {
  const lista = [
    contrato({ id: 'doc', tenantName: 'Iván Úsuga', tenantDocument: '1.037.600.101' }),
    contrato({
      id: 'dueno',
      tenantName: 'Laura',
      propertyAddress: 'Carrera 35 # 8A-60',
      propietarioDeLaConsignacion: { id: 'pr-1', name: 'Jorge Restrepo', documentNumber: '70111222' },
    }),
    contrato({ id: 'otra', tenantName: 'Mariana', propertyAddress: 'Calle 99 # 1-1' }),
  ];

  it('🔴 por el documento del inquilino, con o sin puntos', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: '1037600101' }), HOY))).toEqual(['doc']);
    expect(ids(filtrarContratos(lista, con({ busqueda: '1.037.600' }), HOY))).toEqual(['doc']);
  });

  it('🔴 por la dirección sin importar los espacios ni el «#»', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: 'calle 7 #39' }), HOY))).toEqual(['doc']);
    expect(ids(filtrarContratos(lista, con({ busqueda: 'carrera 35 #8a' }), HOY))).toEqual(['dueno']);
  });

  it('🔴 por el propietario, sin tildes', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: 'jorge restrepo' }), HOY))).toEqual(['dueno']);
  });

  it('un número corto no se toma por documento', () => {
    expect(ids(filtrarContratos(lista, con({ busqueda: '1037' }), HOY))).toEqual([]);
  });
});

describe('C-05 / C-06 · vigencia, por empezar y terminados', () => {
  const lista = [
    contrato({ id: 'corre', endDate: '2027-06-30' }),
    contrato({ id: 'empieza-en-nov', startDate: '2026-11-01', endDate: '2027-10-31' }),
    // #9: terminado antes de tiempo, con el fin pactado todavía futuro.
    contrato({ id: 'terminado', status: 'expired', endDate: '2026-10-31' }),
  ];

  it('🔴 un contrato que empieza el 1 de noviembre NO es vigente: es «por empezar»', () => {
    expect(empiezaDespues(lista[1]!, HOY)).toBe(true);
    expect(ids(filtrarContratos(lista, con({ vigencia: 'vigente' }), HOY))).toEqual(['corre']);
    expect(ids(filtrarContratos(lista, con({ vigencia: 'por_empezar' }), HOY))).toEqual(['empieza-en-nov']);
  });

  it('🔴 un terminado no sale en «Vigentes» ni en «Vencen en 90 días», sí en «Vencidos»', () => {
    expect(ids(filtrarContratos(lista, con({ vigencia: 'por_vencer' }), HOY))).toEqual([]);
    expect(ids(filtrarContratos(lista, con({ vigencia: 'vencido' }), HOY))).toEqual(['terminado']);
  });
});

// ── La palabra del estado (lista y ficha) ───────────────────────────────────


describe('C-05 / C-01 · la palabra del estado', () => {
  const hoy = new Date(2026, 9, 3, 12);

  it('🔴 un activo que empieza el 1 de noviembre dice «Empieza el 1 de nov», no «Activo»', () => {
    const c = { status: 'active' as const, startDate: '2026-11-01T00:00:00.000Z', endDate: '2027-10-31' };
    const v = vigenciaDelContrato(c, hoy);
    const e = estadoParaMostrar({ contrato: c, vigencia: v, etiquetaDelEstado: 'Activo', locale: 'es', hoy });
    expect(e.clave).toBe('POR_EMPEZAR');
    expect(e.texto).toMatch(/^Empieza el 1 (de )?nov/);
    expect(e.texto).not.toContain('Activo');
  });

  it('🔴 C-01: una terminación con fecha futura sigue activa: «Activo · Termina el 31 de oct»', () => {
    const c = { status: 'active' as const, startDate: '2026-01-01', endDate: '2026-12-31', terminadoEn: '2026-10-31' };
    const v = vigenciaDelContrato(c, hoy);
    expect(v.estado).toBe('VIGENTE');
    expect(v.terminaEl).toBe('2026-10-31');
    const e = estadoParaMostrar({ contrato: c, vigencia: v, etiquetaDelEstado: 'Activo', locale: 'es', hoy });
    expect(e.texto).toMatch(/^Activo · Termina el 31 (de )?oct/);
  });

  it('una terminación que ya llegó sigue diciendo «Terminado»', () => {
    const c = { status: 'expired' as const, startDate: '2026-01-01', endDate: '2026-12-31', terminadoEn: '2026-09-30' };
    const v = vigenciaDelContrato(c, hoy);
    expect(estadoParaMostrar({ contrato: c, vigencia: v, etiquetaDelEstado: 'Expirado', locale: 'es', hoy }).texto).toBe('Terminado');
  });
});

describe('C-09 · el mismo conteo de días en el encabezado y el historial', () => {
  it('🔴 una fecha de calendario se cuenta por días de calendario (antes: «En 27 días» contra «28»)', () => {
    const ahora = new Date(2026, 9, 3, 17, 0); // 3-oct, 5 p. m. en la hora de quien mira
    expect(fechaRelativa('2026-10-31T00:00:00.000Z', 'es', ahora).texto).toBe('En 28 días');
    expect(fechaRelativa('2026-10-31', 'es', ahora).dias).toBe(28);
    expect(fechaRelativa('2026-10-04T00:00:00.000Z', 'es', ahora).texto).toBe('Mañana');
  });
});

describe('Nico 03-10 · el depósito sólo en comercial', () => {
  it('el uso sale del tipo de inmueble, con la lista del back', () => {
    expect(usoPorElTipo('apartment')).toBe('VIVIENDA');
    expect(usoPorElTipo('house')).toBe('VIVIENDA');
    expect(usoPorElTipo('commercial')).toBe('COMERCIAL');
    expect(usoPorElTipo('warehouse')).toBe('COMERCIAL');
    expect(usoPorElTipo(undefined)).toBeNull();
  });
});
