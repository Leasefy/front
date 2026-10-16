/**
 * Los saldos iniciales desde el BALANCE del sistema anterior, sin React.
 *
 * 🔴 8.ª tanda de la migración de Portofino (14-10-2026). Nico eligió «saldos
 * al cierre + movimientos del año»: el balance de prueba POR TERCERO al cierre
 * del año anterior (31-12-2025) entra como la apertura; el libro diario trae
 * lo de después. Escribir a mano las ~3.000 líneas de un balance por tercero
 * no es un camino: esto lo lee del archivo que exporta Siigo, World Office,
 * Helisa, Alegra o Nuby y llena el formulario de siempre (`AsientoDeApertura`),
 * que sigue siendo el que cuadra y registra.
 *
 * ── Qué hace con cada renglón ───────────────────────────────────────────────
 *
 *  · Un balance trae los TOTALES de cada nivel (clase 1, grupo 11, cuenta
 *    1105…) junto al detalle. Un código que es el comienzo de otro código del
 *    MISMO archivo es un total: no se suma (sería contar dos veces).
 *  · El de por tercero trae además, en la cuenta auxiliar, un renglón sin
 *    tercero con la suma de sus terceros: si iguala esa suma, es el subtotal.
 *  · Cada código se ubica en el plan de cuentas de la inmobiliaria: igual a
 *    una cuenta que recibe movimientos → esa; más largo que una (una
 *    subcuenta del sistema viejo que acá no existe) → se suma a esa y se dice;
 *    una cuenta que en el plan tiene subcuentas, o que no está → no entra y
 *    se dice cuál y con cuánto, porque sin ella la apertura no va a cuadrar.
 *  · En cartera y terceros (13, 23, 28) el saldo va al propietario o inquilino
 *    con ESE documento —nunca por el nombre—; el resto, por cuenta.
 *  · La misma cuenta y el mismo tercero se suman; un saldo en cero no entra.
 *
 * ── El signo ────────────────────────────────────────────────────────────────
 *
 * Unos sistemas escriben el saldo como débito − crédito (negativo = saldo
 * crédito) y otros lo escriben en positivo según la naturaleza de la cuenta.
 * Un balance de prueba SIEMPRE cuadra, así que se sugiere la convención con
 * la que la suma da cero (`sugerirCreditoEnPositivo`) y la persona la puede
 * cambiar con una casilla.
 */

import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service';
import type { CuentaPuc, TerceroDelBalance } from '@/lib/api/contabilidad.service';
import { aCentavos } from '@/lib/plata/plata';
import type { MapeoDeColumna } from './columnas-de-tercero';
import {
  esCuentaDeTerceros,
  type FilaDeApertura,
  type TerceroDeApertura,
} from './asiento-de-apertura';
import { plataDeOrigen } from './valores-de-origen';

export type CampoDeBalance =
  | 'codigoCuenta'
  | 'nombreCuenta'
  | 'terceroDocumento'
  | 'terceroNombre'
  | 'saldoAnterior'
  | 'debitos'
  | 'creditos'
  | 'saldoFinal'
  | 'saldoDebito'
  | 'saldoCredito';

/**
 * Los encabezados con que exportan el balance de prueba (por tercero) los
 * sistemas que usan las inmobiliarias. Se comparan normalizados (sin tildes,
 * minúsculas); los de menos de 4 letras, sólo por igualdad.
 */
export const COLUMNAS_DE_BALANCE: readonly (ColumnaDePlantilla & { campo: CampoDeBalance })[] = [
  {
    campo: 'codigoCuenta',
    titulo: 'Código de cuenta',
    obligatoria: true,
    ejemplo: '130505',
    alias: ['codigo cuenta', 'codigo cuenta contable', 'cuenta', 'codigo', 'cuenta contable', 'codigo puc', 'puc', 'cta', 'cod cta', 'cod cuenta', 'cta contable', 'codigo contable', 'nro cuenta'],
    ayuda: 'Sólo el código; con puntos o guiones también se entiende (1305-05 → 130505).',
  },
  {
    campo: 'nombreCuenta',
    titulo: 'Nombre de la cuenta',
    obligatoria: false,
    ejemplo: 'Clientes nacionales',
    alias: ['nombre cuenta', 'nombre cuenta contable', 'nombre de la cuenta', 'descripcion cuenta', 'descripcion', 'nombre'],
  },
  {
    campo: 'terceroDocumento',
    titulo: 'Documento del tercero',
    obligatoria: false,
    ejemplo: '1036111001',
    alias: ['nit', 'nit tercero', 'tercero nit', 'identificacion', 'identificacion tercero', 'documento tercero', 'documento del tercero', 'cedula', 'cc nit', 'nit cc', 'numero identificacion', 'id tercero', 'nro identificacion', 'documento'],
    ayuda: 'Cédula o NIT de quien es el saldo. Con él, la cartera de cada inquilino nace con su nombre.',
  },
  {
    campo: 'terceroNombre',
    titulo: 'Nombre del tercero',
    obligatoria: false,
    ejemplo: 'Laura Mejía',
    alias: ['nombre tercero', 'nombre del tercero', 'tercero', 'razon social', 'nombre razon social', 'nombre'],
  },
  {
    campo: 'saldoAnterior',
    titulo: 'Saldo anterior',
    obligatoria: false,
    ejemplo: '1.500.000',
    alias: ['saldo anterior', 'saldo inicial', 'saldo inicio'],
    ayuda: 'Con débitos y créditos, el saldo es: anterior + débitos − créditos.',
  },
  {
    campo: 'debitos',
    titulo: 'Débitos del período',
    obligatoria: false,
    ejemplo: '300.000',
    alias: ['debitos', 'debito', 'debe', 'movimiento debito', 'movimientos debito', 'mov debito', 'total debitos'],
  },
  {
    campo: 'creditos',
    titulo: 'Créditos del período',
    obligatoria: false,
    ejemplo: '200.000',
    alias: ['creditos', 'credito', 'haber', 'movimiento credito', 'movimientos credito', 'mov credito', 'total creditos'],
  },
  {
    campo: 'saldoFinal',
    titulo: 'Saldo final',
    obligatoria: false,
    ejemplo: '-1.600.000',
    alias: ['saldo final', 'nuevo saldo', 'saldo actual', 'saldo', 'saldo a la fecha', 'saldo total', 'saldo al corte'],
    ayuda: 'Con signo (negativo = saldo crédito), o en positivo según la naturaleza de la cuenta: abajo se elige.',
  },
  {
    campo: 'saldoDebito',
    titulo: 'Saldo débito',
    obligatoria: false,
    ejemplo: '1.600.000',
    alias: ['saldo debito', 'saldo deudor', 'saldo final debito', 'saldo debe'],
  },
  {
    campo: 'saldoCredito',
    titulo: 'Saldo crédito',
    obligatoria: false,
    ejemplo: '',
    alias: ['saldo credito', 'saldo acreedor', 'saldo final credito', 'saldo haber'],
  },
];

/** De qué columnas sale el saldo de cada renglón. */
export type FormaDelSaldo = 'debito-y-credito' | 'saldo' | 'movimientos';

export function formaDelSaldo(mapeo: readonly MapeoDeColumna[]): FormaDelSaldo | null {
  const hay = (campo: CampoDeBalance) => mapeo.some((m) => m.campo === campo);
  if (hay('saldoDebito') || hay('saldoCredito')) return 'debito-y-credito';
  if (hay('saldoFinal')) return 'saldo';
  if (hay('saldoAnterior')) return 'movimientos';
  return null;
}

/** Un renglón del archivo, con sus montos ya leídos. */
export interface RenglonDelBalance {
  /** 1-based, sobre las filas de datos. */
  fila: number;
  /** Sólo dígitos. Vacío = un renglón sin cuenta (títulos, «TOTALES»). */
  codigo: string;
  nombreCuenta: string;
  documento: string;
  nombreTercero: string;
  saldoAnterior?: number;
  debitos?: number;
  creditos?: number;
  saldoFinal?: number;
  saldoDebito?: number;
  saldoCredito?: number;
  /** Una celda de plata con algo escrito que no es un número. */
  ilegible: boolean;
}

const CAMPOS_DE_PLATA = [
  'saldoAnterior',
  'debitos',
  'creditos',
  'saldoFinal',
  'saldoDebito',
  'saldoCredito',
] as const;

function textoDe(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** «1305-05», «130505 Clientes», 130505 → «130505». Lo que no empieza con un dígito: vacío. */
export function codigoDeCuenta(v: unknown): string {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.trunc(Math.abs(v))) : '';
  const m = /^\s*(\d[\d.\-\s]*)/.exec(textoDe(v));
  if (!m) return '';
  // «1105 05 Caja» no: un espacio seguido de letras corta el código.
  return m[1].trim().replace(/[^\d]/g, '');
}

/** Las filas del archivo, leídas con el mapeo de la persona. */
export function leerRenglones(
  filas: readonly Record<string, unknown>[],
  mapeo: readonly MapeoDeColumna[],
): RenglonDelBalance[] {
  const columna = new Map<string, string>();
  for (const m of mapeo) if (m.campo) columna.set(m.campo, m.columna);
  const celda = (fila: Record<string, unknown>, campo: CampoDeBalance) => {
    const c = columna.get(campo);
    return c === undefined ? undefined : fila[c];
  };

  return filas.map((fila, i) => {
    const r: RenglonDelBalance = {
      fila: i + 1,
      codigo: codigoDeCuenta(celda(fila, 'codigoCuenta')),
      nombreCuenta: textoDe(celda(fila, 'nombreCuenta')),
      documento: textoDe(celda(fila, 'terceroDocumento')),
      nombreTercero: textoDe(celda(fila, 'terceroNombre')),
      ilegible: false,
    };
    for (const campo of CAMPOS_DE_PLATA) {
      const crudo = celda(fila, campo);
      if (textoDe(crudo) === '') continue;
      const valor = plataDeOrigen(crudo);
      if (valor === undefined) r.ilegible = true;
      else r[campo] = valor;
    }
    return r;
  });
}

type Naturaleza = CuentaPuc['naturaleza'];

/**
 * El saldo del renglón como débito − crédito, en CENTAVOS. `null` = el
 * renglón no trae con qué calcularlo.
 */
export function netoDelRenglon(
  r: RenglonDelBalance,
  forma: FormaDelSaldo,
  naturaleza: Naturaleza | null,
  creditoEnPositivo: boolean,
): number | null {
  // En la convención por naturaleza, un saldo positivo de una cuenta crédito
  // es un saldo CRÉDITO.
  const signo = creditoEnPositivo && naturaleza === 'CREDITO' ? -1 : 1;
  if (forma === 'debito-y-credito') {
    if (r.saldoDebito === undefined && r.saldoCredito === undefined) return null;
    return aCentavos(r.saldoDebito ?? 0) - aCentavos(r.saldoCredito ?? 0);
  }
  if (forma === 'saldo') {
    if (r.saldoFinal === undefined) return null;
    return signo * aCentavos(r.saldoFinal);
  }
  if (
    r.saldoAnterior === undefined &&
    r.debitos === undefined &&
    r.creditos === undefined
  ) {
    return null;
  }
  return (
    signo * aCentavos(r.saldoAnterior ?? 0) +
    aCentavos(r.debitos ?? 0) -
    aCentavos(r.creditos ?? 0)
  );
}

// ── Dónde cae cada código ──────────────────────────────────────────────────

type Ubicacion =
  | { tipo: 'exacta'; cuenta: CuentaPuc }
  | { tipo: 'sumada'; cuenta: CuentaPuc }
  | { tipo: 'tiene-subcuentas' }
  | { tipo: 'no-esta' };

function ubicador(cuentas: readonly CuentaPuc[]) {
  const porCodigo = new Map<string, CuentaPuc>();
  const comienzos = new Set<string>();
  for (const c of cuentas) {
    const codigo = c.codigo.replace(/\D/g, '');
    porCodigo.set(codigo, c);
    for (let n = 1; n < codigo.length; n++) comienzos.add(codigo.slice(0, n));
  }
  return (codigo: string): Ubicacion => {
    const exacta = porCodigo.get(codigo);
    if (exacta) return { tipo: 'exacta', cuenta: exacta };
    if (comienzos.has(codigo)) return { tipo: 'tiene-subcuentas' };
    for (let n = codigo.length - 1; n >= 1; n--) {
      const madre = porCodigo.get(codigo.slice(0, n));
      if (madre) return { tipo: 'sumada', cuenta: madre };
    }
    return { tipo: 'no-esta' };
  };
}

/** Los códigos que son el TOTAL de otros del mismo archivo. */
function codigosDeTotales(renglones: readonly RenglonDelBalance[]): Set<string> {
  const comienzos = new Set<string>();
  for (const r of renglones) {
    for (let n = 1; n < r.codigo.length; n++) comienzos.add(r.codigo.slice(0, n));
  }
  return comienzos;
}

/** El renglón y la cuenta del plan que lo recibe. */
interface RenglonUbicado {
  renglon: RenglonDelBalance;
  cuenta: CuentaPuc;
  sumada: boolean;
}

interface Clasificacion {
  ubicados: RenglonUbicado[];
  sinCodigo: number;
  totales: number;
  subtotales: number;
  ilegibles: RenglonDelBalance[];
  fuera: { renglon: RenglonDelBalance; motivo: 'no-esta' | 'tiene-subcuentas' }[];
}

function clasificar(
  renglones: readonly RenglonDelBalance[],
  cuentas: readonly CuentaPuc[],
  forma: FormaDelSaldo,
): Clasificacion {
  const ubicar = ubicador(cuentas);
  const totales = codigosDeTotales(renglones);
  const r: Clasificacion = {
    ubicados: [],
    sinCodigo: 0,
    totales: 0,
    subtotales: 0,
    ilegibles: [],
    fuera: [],
  };
  for (const renglon of renglones) {
    if (!renglon.codigo) {
      r.sinCodigo += 1;
      continue;
    }
    if (totales.has(renglon.codigo)) {
      r.totales += 1;
      continue;
    }
    if (renglon.ilegible) {
      r.ilegibles.push(renglon);
      continue;
    }
    const donde = ubicar(renglon.codigo);
    if (donde.tipo === 'exacta' || donde.tipo === 'sumada') {
      r.ubicados.push({ renglon, cuenta: donde.cuenta, sumada: donde.tipo === 'sumada' });
    } else {
      r.fuera.push({ renglon, motivo: donde.tipo });
    }
  }

  /*
   * El subtotal de la cuenta auxiliar en un balance por tercero: un renglón
   * SIN tercero, con el mismo código que sus terceros y su misma suma. Con la
   * suma distinta es un saldo sin tercero de verdad y se queda.
   */
  const porCodigo = new Map<string, RenglonUbicado[]>();
  for (const u of r.ubicados) {
    const lista = porCodigo.get(u.renglon.codigo) ?? [];
    lista.push(u);
    porCodigo.set(u.renglon.codigo, lista);
  }
  const subtotales = new Set<RenglonUbicado>();
  for (const lista of porCodigo.values()) {
    const conTercero = lista.filter((u) => u.renglon.documento);
    if (conTercero.length === 0) continue;
    const neto = (u: RenglonUbicado) =>
      netoDelRenglon(u.renglon, forma, u.cuenta.naturaleza, false) ?? 0;
    const suma = conTercero.reduce((s, u) => s + neto(u), 0);
    for (const u of lista) {
      if (!u.renglon.documento && neto(u) === suma) subtotales.add(u);
    }
  }
  if (subtotales.size > 0) {
    r.subtotales = subtotales.size;
    r.ubicados = r.ubicados.filter((u) => !subtotales.has(u));
  }
  return r;
}

/**
 * ¿Los saldos crédito vienen en positivo? La convención con la que el balance
 * cuadra (débitos = créditos). Con saldo débito y saldo crédito en columnas
 * aparte no hay nada que decidir.
 */
export function sugerirCreditoEnPositivo(
  renglones: readonly RenglonDelBalance[],
  cuentas: readonly CuentaPuc[],
  forma: FormaDelSaldo | null,
): boolean {
  if (!forma || forma === 'debito-y-credito') return false;
  const { ubicados } = clasificar(renglones, cuentas, forma);
  let conSigno = 0;
  let porNaturaleza = 0;
  for (const u of ubicados) {
    conSigno += netoDelRenglon(u.renglon, forma, u.cuenta.naturaleza, false) ?? 0;
    porNaturaleza += netoDelRenglon(u.renglon, forma, u.cuenta.naturaleza, true) ?? 0;
  }
  if (conSigno === 0) return false;
  if (porNaturaleza === 0) return true;
  return Math.abs(porNaturaleza) < Math.abs(conSigno);
}

/** Los documentos a consultar: los de cartera y terceros (13, 23, 28). */
export function documentosDelBalance(renglones: readonly RenglonDelBalance[]): string[] {
  const docs = new Set<string>();
  for (const r of renglones) {
    if (r.documento && esCuentaDeTerceros(r.codigo)) docs.add(r.documento);
  }
  return [...docs];
}

// ── El resultado ───────────────────────────────────────────────────────────

/** Un tercero del archivo que no se pudo imputar, para decirlo con su nombre. */
export interface PersonaDelBalance {
  documento: string;
  nombre: string;
}

export interface CuentaFueraDelPlan {
  codigo: string;
  nombre: string;
  /** Débito − crédito, en pesos. */
  saldo: number;
  motivo: 'no-esta' | 'tiene-subcuentas';
}

export interface BalanceArmado {
  filas: FilaDeApertura[];
  /** Renglones con código de cuenta. */
  renglones: number;
  sinCodigo: number;
  totales: number;
  subtotales: number;
  enCero: number;
  ilegibles: { fila: number; codigo: string }[];
  /** Subcuentas del archivo sumadas a su cuenta del plan. */
  sumadas: { codigo: string; cuenta: string }[];
  fueraDelPlan: CuentaFueraDelPlan[];
  terceros: {
    conFicha: number;
    sinCuenta: PersonaDelBalance[];
    /** Con cuenta del portal pero todavía sin contrato en Leasefy. */
    sinContrato: PersonaDelBalance[];
    noEstan: PersonaDelBalance[];
    varios: PersonaDelBalance[];
  };
}

/** El 13 y los anticipos recibidos (2805) son de inquilinos; el resto, de propietarios. */
function ladoPreferido(codigo: string): 'inquilino' | 'propietario' {
  return /^13/.test(codigo) || /^2805/.test(codigo) ? 'inquilino' : 'propietario';
}

type Imputacion =
  | { tercero: TerceroDeApertura }
  | { motivo: 'sin-cuenta' | 'sin-contrato' | 'no-esta' | 'varios' };

function imputar(
  r: RenglonDelBalance,
  codigo: string,
  terceros: ReadonlyMap<string, TerceroDelBalance>,
): Imputacion {
  const t = terceros.get(r.documento);
  if (!t) return { motivo: 'no-esta' };
  const lados =
    ladoPreferido(codigo) === 'inquilino'
      ? (['inquilino', 'propietario'] as const)
      : (['propietario', 'inquilino'] as const);
  for (const lado of lados) {
    const ficha = t[lado];
    if (ficha && typeof ficha === 'object') {
      return {
        tercero: {
          tipo: lado === 'inquilino' ? 'ARRENDATARIO' : 'PROPIETARIO',
          id: ficha.id,
          nombre: ficha.nombre || r.nombreTercero || r.documento,
        },
      };
    }
  }
  if (t.propietario === 'VARIOS' || t.inquilino === 'VARIOS') return { motivo: 'varios' };
  if (t.inquilino === 'SIN_CUENTA') return { motivo: 'sin-cuenta' };
  if (t.inquilino === 'SIN_CONTRATO') return { motivo: 'sin-contrato' };
  return { motivo: 'no-esta' };
}

/**
 * Los renglones → las líneas del asiento de apertura, más todo lo que la
 * pantalla tiene que decir de lo que no entró.
 */
export function armarApertura(
  renglones: readonly RenglonDelBalance[],
  cuentas: readonly CuentaPuc[],
  forma: FormaDelSaldo,
  terceros: readonly TerceroDelBalance[],
  opciones: { creditoEnPositivo: boolean },
): BalanceArmado {
  const c = clasificar(renglones, cuentas, forma);
  const porDocumento = new Map(terceros.map((t) => [t.documento, t]));

  const lineas = new Map<
    string,
    { cuenta: CuentaPuc; tercero: TerceroDeApertura | null; centavos: number }
  >();
  const sumadas = new Map<string, string>();
  const personas = {
    'sin-cuenta': new Map<string, PersonaDelBalance>(),
    'sin-contrato': new Map<string, PersonaDelBalance>(),
    'no-esta': new Map<string, PersonaDelBalance>(),
    varios: new Map<string, PersonaDelBalance>(),
  };
  const conFicha = new Set<string>();

  for (const u of c.ubicados) {
    const neto = netoDelRenglon(
      u.renglon,
      forma,
      u.cuenta.naturaleza,
      opciones.creditoEnPositivo,
    );
    if (neto === null) continue;
    if (u.sumada) sumadas.set(u.renglon.codigo, `${u.cuenta.codigo} · ${u.cuenta.nombre}`);

    let tercero: TerceroDeApertura | null = null;
    if (u.renglon.documento && esCuentaDeTerceros(u.cuenta.codigo)) {
      const imputado = imputar(u.renglon, u.cuenta.codigo, porDocumento);
      if ('tercero' in imputado) {
        tercero = imputado.tercero;
        conFicha.add(`${tercero.tipo}:${tercero.id}`);
      } else if (neto !== 0) {
        personas[imputado.motivo].set(u.renglon.documento, {
          documento: u.renglon.documento,
          nombre: u.renglon.nombreTercero,
        });
      }
    }
    const llave = `${u.cuenta.id}|${tercero?.tipo ?? ''}|${tercero?.id ?? ''}`;
    const ya = lineas.get(llave);
    if (ya) ya.centavos += neto;
    else lineas.set(llave, { cuenta: u.cuenta, tercero, centavos: neto });
  }

  let enCero = 0;
  const filas: FilaDeApertura[] = [];
  const ordenadas = [...lineas.values()].sort(
    (a, b) =>
      a.cuenta.codigo.localeCompare(b.cuenta.codigo) ||
      (a.tercero ? 1 : 0) - (b.tercero ? 1 : 0) ||
      (a.tercero?.nombre ?? '').localeCompare(b.tercero?.nombre ?? '', 'es'),
  );
  for (const l of ordenadas) {
    if (l.centavos === 0) {
      enCero += 1;
      continue;
    }
    const pesos = Math.abs(l.centavos) / 100;
    filas.push({
      id: `balance-${filas.length + 1}`,
      cuentaId: l.cuenta.id,
      debitoCop: l.centavos > 0 ? pesos : 0,
      creditoCop: l.centavos < 0 ? pesos : 0,
      ...(l.tercero ? { tercero: l.tercero } : {}),
    });
  }

  // Lo que no entró, por cuenta y con su saldo (en la convención elegida).
  const fuera = new Map<string, CuentaFueraDelPlan & { centavos: number }>();
  for (const { renglon, motivo } of c.fuera) {
    const neto =
      netoDelRenglon(renglon, forma, naturalezaPorClase(renglon.codigo), opciones.creditoEnPositivo) ?? 0;
    const ya = fuera.get(renglon.codigo);
    if (ya) ya.centavos += neto;
    else
      fuera.set(renglon.codigo, {
        codigo: renglon.codigo,
        nombre: renglon.nombreCuenta,
        saldo: 0,
        motivo,
        centavos: neto,
      });
  }

  return {
    filas,
    renglones: renglones.filter((r) => r.codigo).length,
    sinCodigo: c.sinCodigo,
    totales: c.totales,
    subtotales: c.subtotales,
    enCero,
    ilegibles: c.ilegibles.map((r) => ({ fila: r.fila, codigo: r.codigo })),
    sumadas: [...sumadas.entries()].map(([codigo, cuenta]) => ({ codigo, cuenta })),
    fueraDelPlan: [...fuera.values()]
      .filter((f) => f.centavos !== 0)
      .map(({ centavos, ...f }) => ({ ...f, saldo: centavos / 100 })),
    terceros: {
      conFicha: conFicha.size,
      sinCuenta: [...personas['sin-cuenta'].values()],
      sinContrato: [...personas['sin-contrato'].values()],
      noEstan: [...personas['no-esta'].values()],
      varios: [...personas.varios.values()],
    },
  };
}

/**
 * La naturaleza de una cuenta que NO está en el plan, por su clase (sólo para
 * decir su saldo): 1, 5, 6 y 7 son débito; 2, 3 y 4, crédito.
 */
function naturalezaPorClase(codigo: string): Naturaleza | null {
  if (/^[1567]/.test(codigo)) return 'DEBITO';
  if (/^[234]/.test(codigo)) return 'CREDITO';
  return null;
}

/** El cierre del año anterior: la fecha de corte que se sugiere para el balance. */
export function cierreDelAnioAnterior(hoy: string): string {
  const anio = Number(hoy.slice(0, 4));
  return `${Number.isFinite(anio) ? anio - 1 : new Date().getFullYear() - 1}-12-31`;
}
