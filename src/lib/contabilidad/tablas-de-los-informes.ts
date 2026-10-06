/**
 * QA-FACT-CONTA-95 r2 · CB-C-13: las tablas de cada informe para bajarlas
 * (Excel e impresión), con las columnas de la pantalla y TODAS las filas que
 * mandó el back (la pantalla pagina; el archivo no). La plata va como número.
 */
import type {
  BalanceDePrueba,
  EstadoDeCuenta,
  LibroAuxiliar,
} from '@/lib/api/contabilidad.service';
import type {
  AuxiliarPorTercero,
  BalanceGeneral,
  EstadoDeResultados,
  LadoDelBalance,
  LibroMayor,
} from '@/lib/api/estados-financieros.service';
import type { TablaDelInforme } from './informe-descargable';
import { filasDelPyg } from './estados-financieros';

/** `2026-02-05T00:00:00.000Z` → `2026-02-05`: el día del asiento, sin hora. */
function dia(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 10) : '';
}

export function tablasDelBalanceDePrueba(b: BalanceDePrueba): TablaDelInforme[] {
  return [
    {
      columnas: ['Código', 'Cuenta', 'Naturaleza', 'Saldo anterior', 'Débitos', 'Créditos', 'Saldo final'],
      filas: b.filas.map((f) => [
        f.codigo,
        f.nombre,
        f.naturaleza === 'DEBITO' ? 'Débito' : 'Crédito',
        f.saldoAnteriorCop,
        f.debitosCop,
        f.creditosCop,
        f.saldoFinalCop,
      ]),
      pie: [
        ['Totales del período', null, null, null, b.totalDebitosCop, b.totalCreditosCop, null],
        // CB-T-01: los saldos, del lado en que quedan (un back viejo no los manda).
        ...(b.saldosAnteriores && b.saldosFinales
          ? [
              ['Saldos débito', null, null, b.saldosAnteriores.debitoCop, null, null, b.saldosFinales.debitoCop],
              ['Saldos crédito', null, null, b.saldosAnteriores.creditoCop, null, null, b.saldosFinales.creditoCop],
            ]
          : []),
      ],
    },
  ];
}

/** El mes del mayor como en la pantalla: «ene 2026». */
function mesCorto(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }).replace('.', '');
}

export function tablasDelMayor(mayor: LibroMayor, meses: readonly string[]): TablaDelInforme[] {
  return [
    {
      columnas: [
        'Código',
        'Cuenta',
        'Saldo anterior',
        ...meses.flatMap((m) => [`${mesCorto(m)} · Débito`, `${mesCorto(m)} · Crédito`]),
        'Débitos',
        'Créditos',
        'Saldo final',
      ],
      filas: mayor.filas.map((f) => [
        f.codigo,
        f.nombre,
        f.saldoAnteriorCop,
        ...meses.flatMap((m) => {
          const delMes = f.porMes.find((p) => p.mes === m);
          return [delMes?.debitosCop ?? 0, delMes?.creditosCop ?? 0];
        }),
        f.debitosCop,
        f.creditosCop,
        f.saldoFinalCop,
      ]),
      pie: [
        ['Totales', null, null, ...meses.flatMap(() => [null, null]), mayor.totalDebitosCop, mayor.totalCreditosCop, null],
      ],
    },
  ];
}

export function tablasDelAuxiliar(libro: LibroAuxiliar): TablaDelInforme[] {
  const tercero = (r: LibroAuxiliar['renglones'][number]) =>
    r.terceroNombre ? `${r.terceroNombre}${r.terceroDocumento ? ` · ${r.terceroDocumento}` : ''}` : r.terceroTipo ? `${r.terceroTipo} sin identificar` : '';
  return [
    {
      titulo: `${libro.cuenta.codigo} · ${libro.cuenta.nombre}`,
      columnas: ['Fecha', 'Asiento', 'Descripción', 'Tercero', 'Débito', 'Crédito', 'Saldo'],
      filas: [
        ['', '', 'Saldo inicial', '', null, null, libro.saldoInicialCop],
        ...libro.renglones.map((r) => [
          dia(r.fecha),
          `N.º ${r.numero}`,
          r.descripcion || r.descripcionAsiento,
          tercero(r),
          r.debitoCop,
          r.creditoCop,
          r.saldoCop,
        ]),
      ],
      pie: [['', '', 'Saldo final', '', libro.debitosCop, libro.creditosCop, libro.saldoFinalCop]],
    },
  ];
}

export function tablasDelAuxiliarPorTercero(a: AuxiliarPorTercero): TablaDelInforme[] {
  const tablas: TablaDelInforme[] = [
    {
      columnas: ['Tercero', 'Tipo', 'Documento', 'Débitos', 'Créditos', 'Saldo', 'Cuentas'],
      filas: a.terceros.map((t) => [
        t.nombre ?? 'Sin nombre',
        t.terceroTipo,
        t.documento ?? '',
        t.debitosCop,
        t.creditosCop,
        t.saldoCop,
        t.cuentas.map((c) => c.codigo).join(', '),
      ]),
    },
  ];
  if (a.sinTercero.movimientos > 0) {
    tablas[0].pie = [[`Sin tercero (${a.sinTercero.movimientos} movimientos)`, null, null, a.sinTercero.debitosCop, a.sinTercero.creditosCop, null, null]];
  }
  return tablas;
}

export function tablasDelEstadoDeCuenta(e: EstadoDeCuenta, quien: string): TablaDelInforme[] {
  return [
    {
      titulo: quien,
      columnas: ['Fecha', 'Asiento', 'Cuenta', 'Descripción', 'Débito', 'Crédito', 'Saldo'],
      filas: [
        ['', '', '', 'Saldo inicial', null, null, e.saldoInicialCop],
        ...e.renglones.map((r) => [
          dia(r.fecha),
          `N.º ${r.numero}`,
          `${r.codigo} · ${r.cuenta}`,
          r.descripcion || r.descripcionAsiento,
          r.debitoCop,
          r.creditoCop,
          r.saldoCop,
        ]),
      ],
      pie: [['', '', '', 'Saldo final', e.debitosCop, e.creditosCop, e.saldoFinalCop]],
    },
  ];
}

export function tablasDelPyg(pyg: EstadoDeResultados, conAnioAnterior: boolean): TablaDelInforme[] {
  const r = pyg.resultado;
  return [
    {
      columnas: [
        'Código',
        'Cuenta',
        'Del mes',
        'Acumulado del año',
        ...(conAnioAnterior ? ['Mes del año anterior', 'Acumulado del año anterior'] : []),
      ],
      filas: filasDelPyg(pyg).map((f) => [
        f.codigo,
        f.nombre,
        f.mesCop,
        f.acumuladoCop,
        ...(conAnioAnterior ? [f.anioAnteriorMesCop, f.anioAnteriorAcumuladoCop] : []),
      ]),
      pie: [
        ['', 'Ingresos', r.ingresosMesCop, r.ingresosAcumuladoCop, ...(conAnioAnterior ? [r.ingresosAnioAnteriorMesCop ?? null, null] : [])],
        ['', 'Gastos', r.gastosMesCop, r.gastosAcumuladoCop, ...(conAnioAnterior ? [r.gastosAnioAnteriorMesCop ?? null, null] : [])],
        ['', 'Utilidad', r.utilidadMesCop, r.utilidadAcumuladoCop, ...(conAnioAnterior ? [r.utilidadAnioAnteriorMesCop ?? null, null] : [])],
      ],
    },
  ];
}

function tablaDelLado(titulo: string, lado: LadoDelBalance, comparativo: boolean): TablaDelInforme {
  return {
    titulo,
    columnas: ['Código', 'Cuenta', 'Saldo', ...(comparativo ? ['Año anterior'] : [])],
    filas: lado.grupos.flatMap((g) => [
      [g.codigo, g.nombre, g.totalCop, ...(comparativo ? [g.anioAnteriorTotalCop ?? null] : [])],
      ...g.cuentas.map((c) => [c.codigo, `   ${c.nombre}`, c.totalCop, ...(comparativo ? [c.anioAnteriorTotalCop ?? null] : [])]),
    ]),
    pie: [[`Total ${titulo.toLowerCase()}`, null, lado.totalCop, ...(comparativo ? [lado.anioAnteriorTotalCop ?? null] : [])]],
  };
}

export function tablasDelBalanceGeneral(b: BalanceGeneral): TablaDelInforme[] {
  const comparativo = b.comparativo === true;
  return [
    tablaDelLado('Activo', b.activo, comparativo),
    tablaDelLado('Pasivo', b.pasivo, comparativo),
    tablaDelLado('Patrimonio', b.patrimonio, comparativo),
    {
      columnas: ['', 'Concepto', 'Valor'],
      filas: [
        ['', 'Resultado del ejercicio', b.resultadoDelEjercicioCop],
        ...(b.resultadoDeEjerciciosAnterioresCop !== undefined
          ? [['', 'Resultado de ejercicios anteriores', b.resultadoDeEjerciciosAnterioresCop]]
          : []),
      ],
    },
  ];
}
