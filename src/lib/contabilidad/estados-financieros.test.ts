/**
 * El P&G, el balance y el mayor: las filas, las columnas y lo que se dice del
 * descuadre.
 *
 * 🔴 El test más importante de este archivo es el de `LEYENDA_DEL_CANON`. Una
 * inmobiliaria que administra mil millones de canon factura cien de comisión: si
 * esa frase se cae del producto, el P&G se lee como si facturara mil, y con eso
 * se declaran impuestos.
 */

import { describe, it, expect } from 'vitest';

import {
  LEYENDA_DEL_CANON,
  PATRIMONIO_LO_CREA_EL_CONTADOR,
  POR_QUE_EL_RESULTADO_VA_APARTE,
  anchoDelMayor,
  avisoDeLoQueFalta,
  columnasDelPyg,
  descripcionDelDescuadre,
  descuadreDelMayor,
  esElBalanceDeUnaInmobiliariaNueva,
  filasDelPyg,
  ladosDelBalance,
  leyendaDelCanon,
  margenLegible,
  mesesConDatos,
  motivoSinComparacionPorRubro,
  totalDelOtroLado,
} from './estados-financieros';
import type {
  BalanceGeneral,
  EstadoDeResultados,
  LibroMayor,
} from '@/lib/api/estados-financieros.service';

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

const pyg = (extra: Partial<EstadoDeResultados> = {}): EstadoDeResultados => ({
  mes: '2026-09',
  sedeId: null,
  desdeElAcumulado: '2026-01-01',
  clases: [
    {
      clase: '4',
      nombre: 'Ingresos',
      naturaleza: 'CREDITO',
      mesCop: 118_000_000,
      acumuladoCop: 980_000_000,
      anioAnteriorMesCop: 101_000_000,
      anioAnteriorAcumuladoCop: 900_000_000,
      grupos: [
        {
          codigo: '41',
          nombre: 'Operacionales',
          naturaleza: 'CREDITO',
          mesCop: 100_000_000,
          acumuladoCop: 850_000_000,
          anioAnteriorMesCop: 88_000_000,
          anioAnteriorAcumuladoCop: 800_000_000,
          cuentas: [
            {
              cuentaId: 'c-415510',
              codigo: '415510',
              nombre: 'Inmobiliarias por retribución o contrata',
              naturaleza: 'CREDITO',
              mesCop: 100_000_000,
              acumuladoCop: 850_000_000,
              anioAnteriorMesCop: 88_000_000,
              anioAnteriorAcumuladoCop: null,
              rubro: 'comisiones',
            },
          ],
        },
      ],
    },
    {
      clase: '5',
      nombre: 'Gastos',
      naturaleza: 'DEBITO',
      mesCop: 74_000_000,
      acumuladoCop: 600_000_000,
      anioAnteriorMesCop: null,
      anioAnteriorAcumuladoCop: null,
      grupos: [],
    },
  ],
  porRubro: {
    disponible: true,
    filas: [
      {
        rubro: 'nomina',
        nombre: 'Nómina',
        naturaleza: 'COSTO',
        realCop: 50_000_000,
        presupuestoCop: 52_000_000,
        anioAnteriorCop: 44_000_000,
        contraPresupuestoCop: -2_000_000,
      },
    ],
  },
  resultado: {
    ingresosMesCop: 118_000_000,
    gastosMesCop: 74_000_000,
    utilidadMesCop: 44_000_000,
    margenMesPct: 37.3,
    ingresosAcumuladoCop: 980_000_000,
    gastosAcumuladoCop: 600_000_000,
    utilidadAcumuladoCop: 380_000_000,
    margenAcumuladoPct: 38.8,
  },
  avisos: [],
  sinAsentar: { recibos: 0, lotes: 0, cobros: 0, total: 0 },
  movimientosSinSede: 0,
  ...extra,
});

const balance = (extra: Partial<BalanceGeneral> = {}): BalanceGeneral => ({
  hasta: '2026-09-30',
  sedeId: null,
  activo: { totalCop: 1_000_000_000, grupos: [] },
  pasivo: { totalCop: 900_000_000, grupos: [] },
  patrimonio: { totalCop: 56_000_000, grupos: [] },
  resultadoDelEjercicioCop: 44_000_000,
  cuadra: true,
  diferenciaCop: 0,
  avisos: [],
  ...extra,
});

const mayor = (extra: Partial<LibroMayor> = {}): LibroMayor => ({
  desde: '2026-01-01',
  hasta: '2026-12-31',
  nivel: 4,
  meses: ['2026-08', '2026-09', '2026-10'],
  filas: [],
  totalDebitosCop: 500_000,
  totalCreditosCop: 500_000,
  cuadra: true,
  diferenciaCop: 0,
  ...extra,
});

describe('🔴 LEYENDA_DEL_CANON', () => {
  it('dice que el canon no es ingreso, que es del propietario y que vive en 2815', () => {
    expect(LEYENDA_DEL_CANON).toContain('NO es ingreso');
    expect(LEYENDA_DEL_CANON).toContain('propietario');
    expect(LEYENDA_DEL_CANON).toContain('2815');
    expect(LEYENDA_DEL_CANON).toContain('pasivo');
  });

  it('nombra la comisión como lo que SÍ es ingreso propio', () => {
    expect(LEYENDA_DEL_CANON).toContain('comisión');
  });

  it('cita el concepto del CTCP: es lo que respalda la decisión', () => {
    expect(LEYENDA_DEL_CANON).toContain('CTCP 2020-0678');
  });
});

describe('filasDelPyg', () => {
  it('aplana los tres niveles en el orden en que se leen', () => {
    const filas = filasDelPyg(pyg());
    expect(filas.map((f) => [f.nivel, f.codigo])).toEqual([
      ['clase', '4'],
      ['grupo', '41'],
      ['cuenta', '415510'],
      ['clase', '5'],
    ]);
  });

  it('las claves son únicas: una cuenta repetida en dos grupos no colisiona', () => {
    const filas = filasDelPyg(pyg());
    expect(new Set(filas.map((f) => f.clave)).size).toBe(filas.length);
  });

  it('🔴 el `null` del año anterior llega como null, no como 0', () => {
    const cuenta = filasDelPyg(pyg()).find((f) => f.codigo === '415510')!;
    expect(cuenta.anioAnteriorAcumuladoCop).toBeNull();
    expect(cuenta.anioAnteriorMesCop).toBe(88_000_000);
  });

  it('🔴 ninguna fila del árbol trae presupuesto: eso va por rubro', () => {
    for (const fila of filasDelPyg(pyg())) {
      expect('presupuestoMesCop' in fila).toBe(false);
    }
  });

  it('sólo las cuentas llevan rubro', () => {
    const filas = filasDelPyg(pyg());
    expect(filas.find((f) => f.nivel === 'clase')!.rubro).toBeNull();
    expect(filas.find((f) => f.nivel === 'grupo')!.rubro).toBeNull();
    expect(filas.find((f) => f.nivel === 'cuenta')!.rubro).toBe('comisiones');
  });

  it('un P&G vacío no revienta, ni con clases ausentes', () => {
    expect(filasDelPyg(pyg({ clases: [] }))).toEqual([]);
    expect(filasDelPyg({ ...pyg(), clases: undefined } as unknown as EstadoDeResultados)).toEqual(
      [],
    );
  });
});

describe('columnasDelPyg', () => {
  it('sin comparaciones son mes y acumulado', () => {
    expect(columnasDelPyg([], true).map((c) => c.clave)).toEqual(['mes', 'acumulado']);
  });

  it('sin acumulado queda sólo el mes', () => {
    expect(columnasDelPyg([], false).map((c) => c.clave)).toEqual(['mes']);
  });

  it('🔴 pedir `presupuesto` NO agrega columna al árbol: eso mueve la tabla por rubro', () => {
    expect(columnasDelPyg(['presupuesto'], true).map((c) => c.clave)).toEqual([
      'mes',
      'acumulado',
    ]);
  });

  it('el año anterior agrega su mes y, con acumulado, también su acumulado', () => {
    expect(columnasDelPyg(['anioAnterior'], true).map((c) => c.clave)).toEqual([
      'mes',
      'acumulado',
      'anioAnterior',
      'anioAnteriorAcumulado',
    ]);
    expect(columnasDelPyg(['anioAnterior'], false).map((c) => c.clave)).toEqual([
      'mes',
      'anioAnterior',
    ]);
  });

  it('cada columna dice qué mide: un encabezado suelto no se audita', () => {
    for (const c of columnasDelPyg(['presupuesto', 'anioAnterior'], true)) {
      expect(c.definicion.length).toBeGreaterThan(20);
    }
  });

  it('la columna que puede traer null explica qué es el guion', () => {
    const columnas = columnasDelPyg(['anioAnterior'], true);
    expect(columnas.find((c) => c.clave === 'anioAnterior')!.definicion).toContain('«—»');
  });
});

describe('leyendaDelCanon', () => {
  it('usa la del back cuando viene', () => {
    expect(leyendaDelCanon({ elCanonNoEsIngreso: 'Lo que dice el back.' })).toBe(
      'Lo que dice el back.',
    );
  });

  it('🔴 sin la del back usa la nuestra: nunca se queda sin decirlo', () => {
    expect(leyendaDelCanon({})).toBe(LEYENDA_DEL_CANON);
    expect(leyendaDelCanon({ elCanonNoEsIngreso: '   ' })).toBe(LEYENDA_DEL_CANON);
  });
});

describe('motivoSinComparacionPorRubro', () => {
  it('con filas y disponible no hay motivo: se dibuja la tabla', () => {
    expect(motivoSinComparacionPorRubro(pyg())).toBeNull();
  });

  it('sin la migración explica que falta el mapeo de rubros', () => {
    const motivo = motivoSinComparacionPorRubro(
      pyg({ porRubro: { disponible: false, filas: [] } }),
    )!;
    expect(motivo).toContain('mapeo de rubros');
  });

  it('sin filas dice que no hay presupuesto cargado, no que falte una migración', () => {
    const motivo = motivoSinComparacionPorRubro(
      pyg({ porRubro: { disponible: true, filas: [] } }),
    )!;
    expect(motivo).toContain('presupuesto cargado');
  });

  it('un back viejo que no manda el bloque lo dice', () => {
    expect(motivoSinComparacionPorRubro(pyg({ porRubro: undefined }))).toContain(
      'todavía no manda',
    );
  });
});

describe('avisoDeLoQueFalta', () => {
  it('nada sin asentar, ningún aviso', () => {
    expect(avisoDeLoQueFalta({ recibos: 0, lotes: 0, cobros: 0, total: 0 })).toBeNull();
    expect(avisoDeLoQueFalta(null)).toBeNull();
    expect(avisoDeLoQueFalta(undefined)).toBeNull();
  });

  it('dice el número y el desglose', () => {
    const aviso = avisoDeLoQueFalta({ recibos: 2, lotes: 1, cobros: 0, total: 3 })!;
    expect(aviso).toContain('3 documentos sin asentar');
    expect(aviso).toContain('2 recibos');
    expect(aviso).toContain('1 lote');
    expect(aviso).toContain('no está en este informe');
  });

  it('un solo documento va en singular', () => {
    expect(avisoDeLoQueFalta({ recibos: 1, lotes: 0, cobros: 0, total: 1 })).toContain(
      '1 documento sin asentar (1 recibo)',
    );
  });
});

describe('margenLegible', () => {
  it('un decimal y el signo de porcentaje', () => {
    expect(margenLegible(37.3, '—')).toBe('37.3%');
  });

  it('🔴 `null` es guion: dividir por cero no es 0 %', () => {
    expect(margenLegible(null, '—')).toBe('—');
    expect(margenLegible(Number.NaN, '—')).toBe('—');
    expect(margenLegible(Number.POSITIVE_INFINITY, '—')).toBe('—');
  });

  it('un margen negativo se dice, no se esconde', () => {
    expect(margenLegible(-12.5, '—')).toBe('-12.5%');
  });
});

describe('el balance', () => {
  it('el otro lado es pasivo + patrimonio + resultado', () => {
    expect(totalDelOtroLado(balance())).toBe(1_000_000_000);
  });

  it('cuando cuadra no hay frase', () => {
    expect(descripcionDelDescuadre(balance(), pesos)).toBeNull();
  });

  it('🔴 cuando no cuadra dice los DOS totales y la diferencia', () => {
    const frase = descripcionDelDescuadre(
      balance({ cuadra: false, diferenciaCop: -3_000, patrimonio: { totalCop: 56_003_000, grupos: [] } }),
      pesos,
    )!;
    expect(frase).toContain(pesos(1_000_000_000));
    expect(frase).toContain(pesos(1_000_003_000));
    expect(frase).toContain(pesos(3_000));
    expect(frase).toContain('defecto del libro');
    expect(frase).toContain('mientras no cuadre, nada de lo que está abajo se puede firmar');
  });

  it('los tres lados salen en orden, con su título', () => {
    expect(ladosDelBalance(balance()).map((l) => [l.clave, l.titulo])).toEqual([
      ['activo', 'Activo'],
      ['pasivo', 'Pasivo'],
      ['patrimonio', 'Patrimonio'],
    ]);
  });

  it('el comparativo ausente llega como null, no como 0', () => {
    expect(ladosDelBalance(balance())[0].anioAnteriorCop).toBeNull();
  });

  it('lee `anioAnteriorTotalCop`, que es como lo manda el back', () => {
    const conComparativo = balance({
      activo: { totalCop: 1_000_000_000, anioAnteriorTotalCop: 900_000_000, grupos: [] },
    });
    expect(ladosDelBalance(conComparativo)[0].anioAnteriorCop).toBe(900_000_000);
  });

  /*
   * 🔴 El caso que va a ver TODA inmobiliaria nueva: el PUC semilla no trae
   * cuentas de patrimonio (clase 3) porque el capital lo define la escritura de
   * cada una. El balance no cuadra, y no es un defecto de la pantalla ni del
   * libro: es una tarea del contador. Decirlo evita que alguien busque el error
   * donde no está.
   */
  it('🔴 reconoce el balance de una inmobiliaria nueva: no cuadra y el patrimonio está en cero', () => {
    expect(
      esElBalanceDeUnaInmobiliariaNueva(
        balance({ cuadra: false, diferenciaCop: 56_000_000, patrimonio: { totalCop: 0, grupos: [] } }),
      ),
    ).toBe(true);
  });

  it('un balance que cuadra no es ése caso, aunque el patrimonio esté en cero', () => {
    expect(
      esElBalanceDeUnaInmobiliariaNueva(balance({ patrimonio: { totalCop: 0, grupos: [] } })),
    ).toBe(false);
  });

  it('un descuadre CON patrimonio cargado no se explica con las cuentas que faltan', () => {
    expect(esElBalanceDeUnaInmobiliariaNueva(balance({ cuadra: false }))).toBe(false);
  });

  it('la frase del patrimonio dice quién crea las cuentas y por qué no vienen', () => {
    expect(PATRIMONIO_LO_CREA_EL_CONTADOR).toContain('clase 3');
    expect(PATRIMONIO_LO_CREA_EL_CONTADOR).toContain('escritura');
    expect(PATRIMONIO_LO_CREA_EL_CONTADOR).toContain('Las crea el contador');
  });

  it('explica por qué el resultado del ejercicio va aparte del patrimonio', () => {
    expect(POR_QUE_EL_RESULTADO_VA_APARTE).toContain('cierre anual');
    expect(POR_QUE_EL_RESULTADO_VA_APARTE).toContain('el contador, no el sistema');
  });
});

describe('el mayor', () => {
  it('🔴 no dibuja meses que no llegaron: un cero de octubre en septiembre miente', () => {
    expect(mesesConDatos(mayor(), '2026-09')).toEqual(['2026-08', '2026-09']);
  });

  it('con el año terminado dibuja todos', () => {
    expect(mesesConDatos(mayor(), '2026-12')).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('el ancho cuenta dos columnas por mes más las de saldo', () => {
    expect(anchoDelMayor(['2026-08', '2026-09'])).toBe(10);
    expect(anchoDelMayor([])).toBe(6);
  });

  it('cuando cuadra no hay frase', () => {
    expect(descuadreDelMayor(mayor(), pesos)).toBeNull();
  });

  it('cuando no cuadra nombra la partida doble', () => {
    const frase = descuadreDelMayor(
      mayor({ cuadra: false, totalCreditosCop: 499_000, diferenciaCop: 1_000 }),
      pesos,
    )!;
    expect(frase).toContain(pesos(500_000));
    expect(frase).toContain(pesos(499_000));
    expect(frase).toContain('partida doble');
  });
});
