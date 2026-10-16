/**
 * balance-de-apertura.test.ts — los saldos iniciales desde el balance.
 *
 * 🔴 8.ª tanda de la migración de Portofino (14-10-2026). Nico eligió «saldos
 * al cierre + movimientos del año»: el balance de prueba POR TERCERO al
 * 31-12-2025 es la apertura. Un balance trae totales de cada nivel, el
 * subtotal de cada cuenta auxiliar y una línea por tercero: entrar todo
 * sumado contaría cada peso tres veces.
 */

import { describe, it, expect } from 'vitest';
import type { CuentaPuc, TerceroDelBalance } from '@/lib/api/contabilidad.service';
import { mapearColumnas } from './columnas-de-tercero';
import { problemasDeApertura, totalesDeApertura } from './asiento-de-apertura';
import {
  armarApertura,
  cierreDelAnioAnterior,
  codigoDeCuenta,
  COLUMNAS_DE_BALANCE,
  documentosDelBalance,
  formaDelSaldo,
  leerRenglones,
  sugerirCreditoEnPositivo,
} from './balance-de-apertura';

function cuenta(codigo: string, nombre: string, naturaleza: 'DEBITO' | 'CREDITO'): CuentaPuc {
  return {
    id: `c-${codigo}`,
    agencyId: 'ag-1',
    codigo,
    nombre,
    naturaleza,
    padreId: null,
    imputable: true,
    activa: true,
    createdAt: '2026-01-01',
  } as CuentaPuc;
}

/** Las cuentas que reciben movimientos en el plan de la inmobiliaria. */
const PLAN = [
  cuenta('110505', 'Caja general', 'DEBITO'),
  cuenta('111005', 'Bancos nacionales', 'DEBITO'),
  cuenta('130505', 'Clientes nacionales', 'DEBITO'),
  cuenta('135515', 'Retención en la fuente', 'DEBITO'),
  cuenta('281505', 'Valores recibidos para terceros', 'CREDITO'),
  cuenta('310505', 'Capital suscrito y pagado', 'CREDITO'),
];

const TERCEROS: TerceroDelBalance[] = [
  { documento: '1017000222', propietario: null, inquilino: { id: 'u-luisa', nombre: 'Luisa Gómez' } },
  { documento: '1020304050', propietario: null, inquilino: 'SIN_CUENTA' },
  { documento: '1037636779', propietario: { id: 'po-maria', nombre: 'María Valderrama' }, inquilino: null },
  {
    documento: '71234567',
    propietario: { id: 'po-pedro', nombre: 'Pedro Pérez' },
    inquilino: { id: 'u-pedro', nombre: 'Pedro Pérez' },
  },
];

/** Los encabezados de Siigo Nube, «Balance de prueba por tercero». */
const ENCABEZADOS = [
  'Nivel',
  'Código cuenta contable',
  'Nombre cuenta contable',
  'Identificación',
  'Nombre tercero',
  'Saldo final',
];

type Fila = [codigo: string, nombre: string, documento: string, tercero: string, saldo: number | string];

function archivo(filas: Fila[]): Record<string, unknown>[] {
  return filas.map(([codigo, nombre, documento, tercero, saldo]) => ({
    Nivel: '',
    'Código cuenta contable': codigo,
    'Nombre cuenta contable': nombre,
    Identificación: documento,
    'Nombre tercero': tercero,
    'Saldo final': saldo,
  }));
}

/** Débito − crédito: los saldos crédito vienen negativos. Cuadra: suma cero. */
const CON_SIGNO: Fila[] = [
  ['1', 'Activo', '', '', 10_000_000],
  ['11', 'Disponible', '', '', 6_000_000],
  ['1105', 'Caja', '', '', 1_000_000],
  ['110505', 'Caja general', '', '', 1_000_000],
  ['1110', 'Bancos', '', '', 5_000_000],
  ['111005', 'Bancos nacionales', '', '', 5_000_000],
  // Una subcuenta del sistema viejo que el plan de acá no tiene.
  ['11100501', 'Bancolombia ahorros', '', '', 5_000_000],
  ['13', 'Deudores', '', '', 4_000_000],
  ['1305', 'Clientes', '', '', 4_000_000],
  // El subtotal de la cuenta auxiliar, sin tercero.
  ['130505', 'Clientes nacionales', '', '', 4_000_000],
  ['130505', 'Clientes nacionales', '1017000222', 'LUISA GOMEZ', 2_500_000],
  ['130505', 'Clientes nacionales', '1020304050', 'ANDRES SIN CUENTA', 1_000_000],
  ['130505', 'Clientes nacionales', '900555111', 'FERRETERIA X', 500_000],
  ['2', 'Pasivo', '', '', -7_000_000],
  ['28', 'Otros pasivos', '', '', -7_000_000],
  ['2815', 'Ingresos recibidos para terceros', '', '', -7_000_000],
  ['281505', 'Valores recibidos para terceros', '', '', -7_000_000],
  ['281505', 'Valores recibidos para terceros', '1037636779', 'MARIA VALDERRAMA', -4_000_000],
  ['281505', 'Valores recibidos para terceros', '71.234.567', 'PEDRO PEREZ', -3_000_000],
  ['3', 'Patrimonio', '', '', -3_000_000],
  ['31', 'Capital social', '', '', -3_000_000],
  ['3105', 'Capital suscrito', '', '', -3_000_000],
  ['310505', 'Capital suscrito y pagado', '', '', -3_000_000],
  ['', 'TOTALES', '', '', 0],
];

/** El mismo balance con los saldos crédito en positivo (por naturaleza). */
const POR_NATURALEZA: Fila[] = CON_SIGNO.map(([c, n, d, t, s]) => [
  c,
  n,
  d,
  t,
  typeof s === 'number' && /^[23]/.test(c) ? -s : s,
]);

function leer(filas: Fila[]) {
  const mapeo = mapearColumnas(COLUMNAS_DE_BALANCE, ENCABEZADOS);
  return { mapeo, renglones: leerRenglones(archivo(filas), mapeo) };
}

// Los terceros de la consulta, con el documento tal como vino.
const TERCEROS_CONSULTADOS: TerceroDelBalance[] = TERCEROS.map((t) =>
  t.documento === '71234567' ? { ...t, documento: '71.234.567' } : t,
);

describe('el mapeo de un balance de Siigo Nube', () => {
  it('reconoce cada columna y lee el saldo final', () => {
    const { mapeo } = leer([]);
    const campo = (columna: string) => mapeo.find((m) => m.columna === columna)?.campo;
    expect(campo('Código cuenta contable')).toBe('codigoCuenta');
    expect(campo('Nombre cuenta contable')).toBe('nombreCuenta');
    expect(campo('Identificación')).toBe('terceroDocumento');
    expect(campo('Nombre tercero')).toBe('terceroNombre');
    expect(campo('Saldo final')).toBe('saldoFinal');
    expect(campo('Nivel')).toBeNull();
    expect(formaDelSaldo(mapeo)).toBe('saldo');
  });
});

describe('armarApertura · balance por tercero con signo', () => {
  const { renglones } = leer(CON_SIGNO);
  const r = armarApertura(renglones, PLAN, 'saldo', TERCEROS_CONSULTADOS, { creditoEnPositivo: false });

  it('arma una línea por cuenta y por tercero, sin totales ni subtotales', () => {
    const lineas = r.filas.map((f) => [
      f.cuentaId,
      f.tercero ? `${f.tercero.tipo}:${f.tercero.nombre}` : '',
      f.debitoCop,
      f.creditoCop,
    ]);
    expect(lineas).toEqual([
      ['c-110505', '', 1_000_000, 0],
      // La subcuenta del sistema viejo, sumada a la cuenta del plan.
      ['c-111005', '', 5_000_000, 0],
      // El inquilino sin cuenta y el proveedor que no está: saldo sin nombre.
      ['c-130505', '', 1_500_000, 0],
      ['c-130505', 'ARRENDATARIO:Luisa Gómez', 2_500_000, 0],
      ['c-281505', 'PROPIETARIO:María Valderrama', 0, 4_000_000],
      // Propietario E inquilino: en la 28 es el propietario.
      ['c-281505', 'PROPIETARIO:Pedro Pérez', 0, 3_000_000],
      ['c-310505', '', 0, 3_000_000],
    ]);
  });

  it('cuadra y el formulario de siempre lo deja registrar', () => {
    expect(totalesDeApertura(r.filas)).toEqual({ debitos: 10_000_000, creditos: 10_000_000, diferencia: 0 });
    expect(problemasDeApertura(r.filas, '2025-12-31')).toEqual([]);
  });

  it('dice lo que apartó y por qué', () => {
    expect(r.totales).toBe(13);
    expect(r.subtotales).toBe(2);
    expect(r.sinCodigo).toBe(1);
    expect(r.sumadas).toEqual([{ codigo: '11100501', cuenta: '111005 · Bancos nacionales' }]);
    expect(r.fueraDelPlan).toEqual([]);
    expect(r.terceros.conFicha).toBe(3);
    expect(r.terceros.sinCuenta).toEqual([{ documento: '1020304050', nombre: 'ANDRES SIN CUENTA' }]);
    expect(r.terceros.noEstan).toEqual([{ documento: '900555111', nombre: 'FERRETERIA X' }]);
  });
});

describe('el signo', () => {
  it('sugiere «crédito en positivo» sólo cuando así cuadra', () => {
    expect(sugerirCreditoEnPositivo(leer(CON_SIGNO).renglones, PLAN, 'saldo')).toBe(false);
    expect(sugerirCreditoEnPositivo(leer(POR_NATURALEZA).renglones, PLAN, 'saldo')).toBe(true);
  });

  it('con la casilla marcada, el balance por naturaleza da las mismas líneas', () => {
    const conSigno = armarApertura(leer(CON_SIGNO).renglones, PLAN, 'saldo', TERCEROS_CONSULTADOS, {
      creditoEnPositivo: false,
    });
    const porNaturaleza = armarApertura(leer(POR_NATURALEZA).renglones, PLAN, 'saldo', TERCEROS_CONSULTADOS, {
      creditoEnPositivo: true,
    });
    expect(porNaturaleza.filas).toEqual(conSigno.filas);
  });

  it('con la casilla equivocada no cuadra (y se ve)', () => {
    const mal = armarApertura(leer(POR_NATURALEZA).renglones, PLAN, 'saldo', TERCEROS_CONSULTADOS, {
      creditoEnPositivo: false,
    });
    expect(totalesDeApertura(mal.filas).diferencia).not.toBe(0);
  });
});

describe('las otras formas del saldo', () => {
  it('saldo débito y saldo crédito en columnas aparte', () => {
    const encabezados = ['Cuenta', 'Nombre', 'Saldo débito', 'Saldo crédito'];
    const mapeo = mapearColumnas(COLUMNAS_DE_BALANCE, encabezados);
    expect(formaDelSaldo(mapeo)).toBe('debito-y-credito');
    const renglones = leerRenglones(
      [
        { Cuenta: '110505', Nombre: 'Caja', 'Saldo débito': '1.200.000,50', 'Saldo crédito': '' },
        { Cuenta: '310505', Nombre: 'Capital', 'Saldo débito': '', 'Saldo crédito': '1.200.000,50' },
      ],
      mapeo,
    );
    const r = armarApertura(renglones, PLAN, 'debito-y-credito', [], { creditoEnPositivo: false });
    // Los centavos se quedan.
    expect(r.filas.map((f) => [f.cuentaId, f.debitoCop, f.creditoCop])).toEqual([
      ['c-110505', 1_200_000.5, 0],
      ['c-310505', 0, 1_200_000.5],
    ]);
  });

  it('saldo anterior + débitos − créditos (Siigo Pyme, Helisa)', () => {
    const encabezados = ['CUENTA', 'DESCRIPCION', 'SALDO ANTERIOR', 'DEBITOS', 'CREDITOS'];
    const mapeo = mapearColumnas(COLUMNAS_DE_BALANCE, encabezados);
    expect(formaDelSaldo(mapeo)).toBe('movimientos');
    const renglones = leerRenglones(
      [
        { CUENTA: '110505', DESCRIPCION: 'Caja', 'SALDO ANTERIOR': 1_000_000, DEBITOS: 500_000, CREDITOS: 200_000 },
        { CUENTA: '310505', DESCRIPCION: 'Capital', 'SALDO ANTERIOR': -1_000_000, DEBITOS: 0, CREDITOS: 300_000 },
      ],
      mapeo,
    );
    const r = armarApertura(renglones, PLAN, 'movimientos', [], { creditoEnPositivo: false });
    expect(r.filas.map((f) => [f.cuentaId, f.debitoCop, f.creditoCop])).toEqual([
      ['c-110505', 1_300_000, 0],
      ['c-310505', 0, 1_300_000],
    ]);
  });
});

describe('lo que no entra se dice', () => {
  it('la cuenta que no está en el plan, y la que en el plan tiene subcuentas', () => {
    const { renglones } = leer([
      ['110505', 'Caja general', '', '', 2_000_000],
      ['159205', 'Depreciación', '', '', -500_000],
      // En el plan, 1355 tiene subcuentas (135515): el saldo no sabe a cuál va.
      ['1355', 'Anticipo de impuestos', '', '', 300_000],
      ['310505', 'Capital', '', '', -1_800_000],
    ]);
    const r = armarApertura(renglones, PLAN, 'saldo', [], { creditoEnPositivo: false });
    expect(r.fueraDelPlan).toEqual([
      { codigo: '159205', nombre: 'Depreciación', saldo: -500_000, motivo: 'no-esta' },
      { codigo: '1355', nombre: 'Anticipo de impuestos', saldo: 300_000, motivo: 'tiene-subcuentas' },
    ]);
    // Sin ellas no cuadra: la pantalla lo muestra con la diferencia.
    expect(totalesDeApertura(r.filas).diferencia).toBe(200_000);
  });

  it('una celda de plata que no se puede leer aparta su renglón', () => {
    const { renglones } = leer([
      ['110505', 'Caja general', '', '', 'mil pesos'],
      ['310505', 'Capital', '', '', -1_000],
    ]);
    const r = armarApertura(renglones, PLAN, 'saldo', [], { creditoEnPositivo: false });
    expect(r.ilegibles).toEqual([{ fila: 1, codigo: '110505' }]);
  });

  it('un saldo que suma cero no entra', () => {
    const { renglones } = leer([
      ['130505', 'Clientes', '1017000222', 'LUISA', 500_000],
      ['130505', 'Clientes', '1017000222', 'LUISA', -500_000],
      ['110505', 'Caja', '', '', 100],
      ['310505', 'Capital', '', '', -100],
    ]);
    const r = armarApertura(renglones, PLAN, 'saldo', TERCEROS_CONSULTADOS, { creditoEnPositivo: false });
    expect(r.enCero).toBe(1);
    expect(r.filas).toHaveLength(2);
  });

  it('el inquilino con cuenta pero sin contrato todavía: sin nombre y se dice aparte', () => {
    const { renglones } = leer([
      ['130505', 'Clientes', '1055555555', 'SOFIA', 100],
      ['310505', 'Capital', '', '', -100],
    ]);
    const r = armarApertura(
      renglones,
      PLAN,
      'saldo',
      [{ documento: '1055555555', propietario: null, inquilino: 'SIN_CONTRATO' }],
      { creditoEnPositivo: false },
    );
    expect(r.terceros.sinContrato).toEqual([{ documento: '1055555555', nombre: 'SOFIA' }]);
    expect(r.terceros.noEstan).toEqual([]);
  });

  it('dos fichas con el mismo documento: el saldo entra sin nombre y se dice', () => {
    const { renglones } = leer([
      ['281505', 'Terceros', '43000111', 'ANA', -100],
      ['110505', 'Caja', '', '', 100],
    ]);
    const r = armarApertura(
      renglones,
      PLAN,
      'saldo',
      [{ documento: '43000111', propietario: 'VARIOS', inquilino: null }],
      { creditoEnPositivo: false },
    );
    expect(r.filas.find((f) => f.cuentaId === 'c-281505')?.tercero).toBeUndefined();
    expect(r.terceros.varios).toEqual([{ documento: '43000111', nombre: 'ANA' }]);
  });
});

describe('las piezas', () => {
  it('el código de la cuenta, venga como venga', () => {
    expect(codigoDeCuenta('1305-05')).toBe('130505');
    expect(codigoDeCuenta('1305.05')).toBe('130505');
    expect(codigoDeCuenta(130505)).toBe('130505');
    expect(codigoDeCuenta('130505 Clientes nacionales')).toBe('130505');
    expect(codigoDeCuenta('TOTALES')).toBe('');
    expect(codigoDeCuenta('')).toBe('');
  });

  it('sólo se consultan los documentos de cartera y terceros, una vez', () => {
    const { renglones } = leer(CON_SIGNO);
    expect(documentosDelBalance(renglones)).toEqual([
      '1017000222',
      '1020304050',
      '900555111',
      '1037636779',
      '71.234.567',
    ]);
  });

  it('la fecha sugerida es el cierre del año anterior', () => {
    expect(cierreDelAnioAnterior('2026-10-14')).toBe('2025-12-31');
  });
});
