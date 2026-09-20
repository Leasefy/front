/**
 * `/inmobiliaria/contabilidad/reportes` — P&G, balance general, libro mayor y
 * auxiliar por tercero (contrato congelado del 18-09, §5 y §7).
 *
 * ── La regla que gobierna los cuatro ────────────────────────────────────────
 *
 * Ninguno suma consultas sueltas: los cuatro salen de `movimientos_contables`,
 * el libro. Lo que no está asentado no aparece — y el informe lo dice con el
 * número de lo que falta por asentar (`sinAsentar`). Por eso este archivo no
 * calcula nada: pide, y lo que el back devuelve es lo que la pantalla pinta.
 *
 * ── 🔴 El canon NO es ingreso, y el P&G tiene que decirlo ───────────────────
 *
 * El P&G sale de las clases 4 (ingresos), 5 (gastos) y 6/7 si se usan. El
 * canon recaudado vive en 2815, que es PASIVO —plata del propietario, no de la
 * inmobiliaria— así que no aparece, y eso es lo correcto (CTCP 2020-0678, ya
 * documentado en `puc-semilla.ts` del back). Sólo la comisión es ingreso
 * propio. Un P&G que mostrara el canon como ingreso diría que la inmobiliaria
 * factura veinte veces lo que factura.
 *
 * ── 🔴 Un balance que no cuadra es la noticia, no un detalle ────────────────
 *
 * `cuadra` = `activo == pasivo + patrimonio + resultadoDelEjercicio`. Cuando
 * es `false` la pantalla lo muestra en rojo y ARRIBA. El resultado del
 * ejercicio se CALCULA (clases 4 − 5/6/7 del año) porque el cierre anual que
 * lo lleva al patrimonio lo hace el contador, no el sistema.
 *
 * ── Por qué `sedeId` puede no servir ────────────────────────────────────────
 *
 * Filtra por `movimientos_contables.sede_id`, que llega con la migración 49.
 * Sin ella los informes salen CONSOLIDADOS y lo dicen en `avisos`;
 * `movimientosSinSede` cuenta cuánto quedaría afuera si se filtrara. No se
 * esconde el selector: se muestra con el aviso, porque saber que la columna
 * por sede todavía no existe es parte de leer el informe.
 */

import { apiClient } from './client';
import type { NaturalezaContable } from './contabilidad.service';

const BASE = '/inmobiliaria/contabilidad/reportes';

// ══ P&G ═════════════════════════════════════════════════════════════════════

/** Qué columnas de comparación se piden. Viajan como `comparar=a,b`. */
export type ComparacionDelPyg = 'presupuesto' | 'anioAnterior';

export const COMPARACIONES: readonly ComparacionDelPyg[] = ['presupuesto', 'anioAnterior'];

/** Las cuatro cifras que trae cada nivel del árbol. */
export interface CifrasDelPyg {
  mesCop: number;
  acumuladoCop: number;
  /** `null` = el año anterior no movió esa cuenta, o no existía. Nunca `0`. */
  anioAnteriorMesCop: number | null;
  anioAnteriorAcumuladoCop: number | null;
}

/** Una cuenta imputable, la hoja del árbol. */
export interface CuentaDelPyg extends CifrasDelPyg {
  cuentaId: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  /** El rubro del presupuesto que el mapeo del §1 le asignó. */
  rubro: string | null;
}

/** Un grupo de 2 dígitos: `41` Operacionales, `51` Operacionales de admón. */
export interface GrupoDelPyg extends CifrasDelPyg {
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  cuentas: CuentaDelPyg[];
}

/** Una clase: 4 ingresos, 5 gastos, 6/7 si la inmobiliaria las usa. */
export interface ClaseDelPyg extends CifrasDelPyg {
  clase: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  grupos: GrupoDelPyg[];
}

export interface ResultadoDelPyg {
  ingresosMesCop: number;
  gastosMesCop: number;
  utilidadMesCop: number;
  /**
   * 🔴 `null` cuando no hubo ingresos, NUNCA `0`: «vendiste y no ganaste» y «no
   * vendiste» son cosas distintas, y la pantalla pinta «—». Misma regla del
   * presupuesto.
   */
  margenMesPct: number | null;
  ingresosAcumuladoCop: number;
  gastosAcumuladoCop: number;
  utilidadAcumuladoCop: number;
  margenAcumuladoPct: number | null;
  ingresosAnioAnteriorMesCop?: number | null;
  gastosAnioAnteriorMesCop?: number | null;
  utilidadAnioAnteriorMesCop?: number | null;
}

/**
 * 🔴 El presupuesto va por RUBRO y NO por cuenta, y es a propósito.
 *
 * Un presupuesto pertenece a un rubro («nómina»), no a la subcuenta 510506.
 * Poner un `presupuestoMesCop` en cada cuenta habría obligado a repartir el
 * presupuesto del rubro entre sus cuentas, que es un número inventado — y de
 * los peligrosos, porque se ve razonable. La pantalla pinta el ÁRBOL con
 * `clases` y la COMPARACIÓN con `porRubro`: son dos tablas, no una.
 */
export interface FilaPorRubro {
  rubro: string;
  nombre: string;
  naturaleza: 'INGRESO' | 'COSTO' | 'MIXTO';
  /** El real del libro del mes, por las cuentas que el mapeo le asignó. */
  realCop: number | null;
  presupuestoCop: number | null;
  anioAnteriorCop: number | null;
  /** real − presupuesto. `null` si falta alguno de los dos. */
  contraPresupuestoCop: number | null;
}

export interface ComparacionPorRubro {
  /** `false` = falta la migración 49: no hay mapeo de rubros que leer. */
  disponible: boolean;
  filas: FilaPorRubro[];
}

/** Cuántos documentos no llegaron al libro. Lo que no está asentado no aparece. */
export interface SinAsentar {
  recibos: number;
  lotes: number;
  cobros: number;
  total: number;
  /** `false` = faltan cuentas en el mapeo, así que reprocesar no alcanzaría. */
  mapeoCompleto?: boolean;
}

export interface EstadoDeResultados {
  /** `AAAA-MM`. */
  mes: string;
  /** `AAAA-MM` del mismo mes del año pasado. */
  mesDelAnioAnterior?: string;
  sedeId: string | null;
  /** Desde dónde corre el acumulado: `AAAA-MM-DD`. */
  desdeElAcumulado: string;
  /** El árbol: clase → grupo (2 dígitos) → cuenta imputable. */
  clases: ClaseDelPyg[];
  resultado: ResultadoDelPyg;
  porRubro?: ComparacionPorRubro;
  /**
   * 🔴 La frase del canon VIENE DEL BACK, en la respuesta. No se escribe acá: es
   * lo que evita que alguien lea «ingresos $118 M» como un error cuando el
   * recaudo del mes fue de $1.118 M. Si el back no la manda, la pantalla usa la
   * suya (`lib/contabilidad/estados-financieros.ts#LEYENDA_DEL_CANON`), que dice
   * lo mismo — pero nunca se queda sin decirlo.
   */
  elCanonNoEsIngreso?: string;
  avisos: string[];
  sinAsentar: SinAsentar;
  /** Cuántos movimientos no tienen sede: lo que quedaría afuera al filtrar. */
  movimientosSinSede: number;
}

export interface FiltrosDelPyg {
  /** `AAAA-MM`, obligatorio. */
  mes: string;
  sedeId?: string;
  /** Por defecto vienen los dos (mes y acumulado). */
  acumulado?: boolean;
  comparar?: readonly ComparacionDelPyg[];
}

// ══ Balance general ═════════════════════════════════════════════════════════

export interface CuentaDelBalance {
  codigo: string;
  nombre: string;
  totalCop: number;
  /** La misma fecha del año anterior, con `comparativo=true`. */
  anioAnteriorTotalCop?: number | null;
}

export interface GrupoDelBalance {
  codigo: string;
  nombre: string;
  totalCop: number;
  anioAnteriorTotalCop?: number | null;
  cuentas: CuentaDelBalance[];
}

export interface LadoDelBalance {
  totalCop: number;
  anioAnteriorTotalCop?: number | null;
  grupos: GrupoDelBalance[];
}

export interface BalanceGeneral {
  /** `AAAA-MM-DD`. */
  hasta: string;
  sedeId?: string | null;
  comparativo?: boolean;
  activo: LadoDelBalance;
  pasivo: LadoDelBalance;
  patrimonio: LadoDelBalance;
  /**
   * Clases 4 − 5/6/7 del año, calculado. El cierre anual que lo lleva al
   * patrimonio lo hace el contador, no el sistema.
   */
  resultadoDelEjercicioCop: number;
  /** `activo == pasivo + patrimonio + resultadoDelEjercicio`. */
  cuadra: boolean;
  diferenciaCop: number;
  /** La misma frase del P&G: el canon no es ingreso y por eso no está acá. */
  elCanonNoEsIngreso?: string;
  /**
   * 🔴 En toda inmobiliaria nueva va a venir uno que hay que saber leer: **el
   * PUC semilla NO trae cuentas de patrimonio (clase 3)** —el capital de cada
   * una lo define su escritura— así que el balance NO cuadra hasta que el
   * contador las cree y cargue los saldos iniciales. Eso es esperado y se
   * muestra como aviso; el descuadre se muestra igual, en rojo y arriba, porque
   * sigue siendo cierto que el balance no cuadra.
   */
  avisos: string[];
}

export interface FiltrosDelBalance {
  /** `AAAA-MM-DD`, obligatorio. */
  hasta: string;
  sedeId?: string;
  /** Agrega la misma fecha del año anterior. */
  comparativo?: boolean;
}

// ══ Libro mayor ═════════════════════════════════════════════════════════════

/** A qué profundidad del PUC se agrupa. `hoja` = cada cuenta imputable. */
export type NivelDelMayor = '1' | '2' | '4' | '6' | 'hoja';

export const NIVELES_DEL_MAYOR: readonly NivelDelMayor[] = ['1', '2', '4', '6', 'hoja'];

export const NOMBRE_DEL_NIVEL: Record<NivelDelMayor, string> = {
  '1': 'Clase (1 dígito)',
  '2': 'Grupo (2 dígitos)',
  '4': 'Cuenta (4 dígitos)',
  '6': 'Subcuenta (6 dígitos)',
  hoja: 'Cada cuenta imputable',
};

export interface MesDelMayor {
  /** `AAAA-MM`. */
  mes: string;
  debitosCop: number;
  creditosCop: number;
  /** El saldo al cierre de ese mes, en la naturaleza de la cuenta. */
  saldoCop: number;
}

export interface FilaDelMayor {
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaContable;
  saldoAnteriorCop: number;
  debitosCop: number;
  creditosCop: number;
  saldoFinalCop: number;
  /** Un elemento por mes de `meses`, en el mismo orden. */
  porMes: MesDelMayor[];
}

export interface LibroMayor {
  desde: string | null;
  hasta: string | null;
  nivel: number | 'hoja';
  /** Los meses del período, `AAAA-MM`, en orden. */
  meses: string[];
  filas: FilaDelMayor[];
  totalDebitosCop: number;
  totalCreditosCop: number;
  cuadra: boolean;
  diferenciaCop: number;
}

export interface FiltrosDelMayor {
  desde?: string;
  hasta?: string;
  /** Por defecto `4`. */
  nivel?: NivelDelMayor;
  sedeId?: string;
  /** Una clase del PUC: `5` para pedir sólo los gastos. */
  clase?: string;
}

// ══ Auxiliar por tercero ════════════════════════════════════════════════════

export interface CuentaDelTercero {
  codigo: string;
  saldoCop: number;
}

export interface FilaDeTercero {
  terceroTipo: string;
  terceroId: string;
  nombre: string | null;
  documento: string | null;
  debitosCop: number;
  creditosCop: number;
  /** `débitos − créditos`: positivo = el tercero debe; negativo = se le debe. */
  saldoCop: number;
  cuentas: CuentaDelTercero[];
}

/**
 * Los movimientos SIN tercero.
 *
 * 🔴 No es un detalle: un movimiento a 2815 sin tercero es un asiento que NO
 * cumple el régimen de mandato, y es lo que bloquea la exógena. Se muestra
 * siempre, aunque sea cero — un bloque que aparece sólo cuando hay problema
 * enseña a no buscarlo.
 */
export interface MovimientosSinTercero {
  movimientos: number;
  debitosCop: number;
  creditosCop: number;
}

export interface AuxiliarPorTercero {
  total: number;
  limite: number;
  desplazamiento: number;
  terceros: FilaDeTercero[];
  sinTercero: MovimientosSinTercero;
  cuadraConElLibro: boolean;
}

export const MAX_LIMITE_DE_TERCEROS = 200;
export const LIMITE_POR_DEFECTO_DE_TERCEROS = 50;

export interface FiltrosDeTerceros {
  desde?: string;
  hasta?: string;
  cuentaId?: string;
  terceroTipo?: string;
  conSaldo?: boolean;
  limite?: number;
  desplazamiento?: number;
}

// ══ Helpers ═════════════════════════════════════════════════════════════════

function conQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Los booleanos viajan como texto: los DTO del back son `@IsBooleanString`. */
const texto = (v: boolean | undefined): string | undefined =>
  v === undefined ? undefined : String(v);

// ══ API ═════════════════════════════════════════════════════════════════════

export const estadosFinancierosApi = {
  /**
   * El P&G del mes y del acumulado del año. `mes` es obligatorio: un P&G sin
   * período no existe, y el back contestaría 400.
   */
  async pyg(filtros: FiltrosDelPyg): Promise<EstadoDeResultados> {
    return apiClient.get<EstadoDeResultados>(
      conQuery(`${BASE}/pyg`, {
        mes: filtros.mes,
        sedeId: filtros.sedeId,
        acumulado: texto(filtros.acumulado),
        comparar:
          filtros.comparar && filtros.comparar.length > 0
            ? filtros.comparar.join(',')
            : undefined,
      }),
    );
  },

  /** El balance general a una fecha. `hasta` es obligatorio. */
  async balanceGeneral(filtros: FiltrosDelBalance): Promise<BalanceGeneral> {
    return apiClient.get<BalanceGeneral>(
      conQuery(`${BASE}/balance-general`, {
        hasta: filtros.hasta,
        sedeId: filtros.sedeId,
        comparativo: texto(filtros.comparativo),
      }),
    );
  },

  /** El libro mayor: cada cuenta con sus débitos y créditos partidos por mes. */
  async mayor(filtros: FiltrosDelMayor = {}): Promise<LibroMayor> {
    return apiClient.get<LibroMayor>(
      conQuery(`${BASE}/mayor`, {
        desde: filtros.desde,
        hasta: filtros.hasta,
        nivel: filtros.nivel,
        sedeId: filtros.sedeId,
        clase: filtros.clase,
      }),
    );
  },

  /**
   * El auxiliar por tercero, como LISTA. El estado de cuenta que ya existía
   * (`reportes/estado-de-cuenta`) exige saber el id del tercero; esto lo
   * enumera, que es lo que hace que se pueda encontrar a alguien.
   */
  async terceros(filtros: FiltrosDeTerceros = {}): Promise<AuxiliarPorTercero> {
    return apiClient.get<AuxiliarPorTercero>(
      conQuery(`${BASE}/terceros`, {
        desde: filtros.desde,
        hasta: filtros.hasta,
        cuentaId: filtros.cuentaId,
        terceroTipo: filtros.terceroTipo,
        conSaldo: texto(filtros.conSaldo),
        limite:
          filtros.limite === undefined
            ? undefined
            : String(Math.min(filtros.limite, MAX_LIMITE_DE_TERCEROS)),
        desplazamiento:
          filtros.desplazamiento === undefined ? undefined : String(filtros.desplazamiento),
      }),
    );
  },
};
