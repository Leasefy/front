/**
 * 🔴 EL MÓDULO DE PLATA — la única fuente de verdad de la aritmética de la plata.
 *
 * Pedido de Nico (03-10-2026): «que no se redondee, se trae tal cual» y
 * **centavos en todo**. Diseño: `memory/archivos/centavos/diseno.md` §4.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 *   · En la base la plata es `numeric(18,2)` (pesos con dos decimales).
 *   · En el código la plata es un `number` en **pesos** (`1234567.89`), igual
 *     que siempre: las firmas no cambian.
 *   · Toda cuenta que guarda o compara plata pasa por ACÁ: por dentro se
 *     calcula en **centavos enteros** (exactos en un `number` hasta 10^15
 *     centavos ≈ $10 billones), por fuera se recibe y se devuelve pesos.
 *     `0.1 + 0.2 !== 0.3`; `sumar(0.1, 0.2) === 0.3`.
 *   · Redondeo (P1 a): al centavo más cercano, la mitad se aleja del cero
 *     (0,005 → 0,01 y −0,005 → −0,01), simétrico para los negativos. Es la
 *     práctica contable. `Math.round` NO sirve: lleva −0,5 a −0.
 *
 * Fuera del módulo de plata no se redondea plata (`Math.round/floor/ceil/trunc`):
 * lo vigilan los guardianes del back y del micro; en el front, C3-FRONT.
 *
 * Este archivo es IGUAL en el back (`src/common/plata/plata.ts`), el micro
 * (`src/common/plata/plata.ts`) y el front (`src/lib/plata/plata.ts`), con las
 * mismas pruebas. Si cambias uno, cambia los tres. (En el front los imports
 * van sin `.js` y no hay `aDecimal`: el front no tiene Prisma.)
 */

/** Lo que puede llegar como plata: lo que el código, Prisma, el SQL crudo o un JSON entregan. */
export type ValorDePlata =
  | number
  | string
  | bigint
  /** `Prisma.Decimal` (decimal.js) o cualquier cosa con `toFixed()` sin argumentos. */
  | { toFixed(): string };

/** Por encima de esto un `number` ya no tiene resolución de centavo (≈ $10 billones). */
const MAXIMO_EXACTO_EN_CENTAVOS = 1e15;

export class PlataInvalida extends RangeError {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'PlataInvalida';
  }
}

export interface OpcionesDeCentavos {
  /**
   * «Tal cual»: si el valor trae más de dos decimales significativos, LANZA en
   * lugar de redondear (para lo que llega de un archivo o de una persona: un
   * 1.234,567 no se adivina, se frena con su frase — P14 a).
   */
  talCual?: boolean;
}

/**
 * Redondea un número de centavos (que puede traer fracción de centavo) al
 * centavo entero, la mitad lejos del cero. Limpia el ruido del flotante antes
 * (`28.999999999999996` → `29`): con 15 cifras significativas basta para
 * cualquier valor por debajo de `MAXIMO_EXACTO_EN_CENTAVOS`.
 */
function centavoEntero(centavos: number, talCual: boolean, origen: unknown): number {
  if (!Number.isFinite(centavos)) {
    throw new PlataInvalida(`«${String(origen)}» no es un valor de plata.`);
  }
  const limpio =
    Math.abs(centavos) < MAXIMO_EXACTO_EN_CENTAVOS
      ? Number(centavos.toPrecision(15))
      : centavos;
  if (Number.isInteger(limpio)) return limpio === 0 ? 0 : limpio;
  if (talCual) {
    throw new PlataInvalida(
      `«${String(origen)}» trae más de dos decimales: la plata va hasta el centavo.`,
    );
  }
  const r = Math.sign(limpio) * Math.floor(Math.abs(limpio) + 0.5);
  return r === 0 ? 0 : r;
}

/** `"-1234.567"` → centavos, exacto (sin pasar por el flotante). */
function centavosDeTexto(texto: string, talCual: boolean, origen: unknown): number {
  const t = texto.trim();
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(t);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) {
    // Notación científica u otra forma rara de un número: que la lea `Number`.
    const n = Number(t);
    if (t === '' || !Number.isFinite(n)) {
      throw new PlataInvalida(`«${String(origen)}» no es un valor de plata.`);
    }
    return centavoEntero(n * 100, talCual, origen);
  }
  const signo = m[1] === '-' ? -1 : 1;
  const entero = m[2] === '' ? '0' : m[2];
  const fraccion = m[3] ?? '';
  const dos = (fraccion + '00').slice(0, 2);
  const resto = fraccion.slice(2);
  const enteroEnCentavos = Number(entero) * 100;
  let centavos = enteroEnCentavos + Number(dos);
  if (!Number.isSafeInteger(centavos) || centavos >= MAXIMO_EXACTO_EN_CENTAVOS) {
    throw new PlataInvalida(
      `«${String(origen)}» está fuera del rango exacto de la plata (hasta $10 billones).`,
    );
  }
  if (/[1-9]/.test(resto)) {
    if (talCual) {
      throw new PlataInvalida(
        `«${String(origen)}» trae más de dos decimales: la plata va hasta el centavo.`,
      );
    }
    if (resto[0] >= '5') centavos += 1;
  }
  const r = signo * centavos;
  return r === 0 ? 0 : r;
}

/**
 * Cualquier valor de plata → **centavos enteros** (`1234.56` → `123456`).
 *
 *   · `number` (pesos, quizás con ruido de flotante): `1.005` → `101`,
 *     `0.29` → `29`.
 *   · `string` (SQL crudo, JSON): exacto, sin pasar por el flotante.
 *   · `bigint` (las columnas `int8` mientras no se migren): pesos enteros.
 *   · `Prisma.Decimal` (columnas `numeric`, `_sum`, `$queryRaw`): exacto.
 *
 * `null`/`undefined` LANZA: un «$ 0» callado es peor que un error. Para lo que
 * puede faltar, `pesos(x)` devuelve `null`.
 */
export function aCentavos(valor: ValorDePlata, opciones: OpcionesDeCentavos = {}): number {
  const talCual = opciones.talCual === true;
  if (typeof valor === 'number') return centavoEntero(valor * 100, talCual, valor);
  if (typeof valor === 'string') return centavosDeTexto(valor, talCual, valor);
  if (typeof valor === 'bigint') {
    const centavos = Number(valor) * 100;
    if (!Number.isSafeInteger(centavos) || Math.abs(centavos) >= MAXIMO_EXACTO_EN_CENTAVOS) {
      throw new PlataInvalida(
        `«${valor.toString()}» está fuera del rango exacto de la plata (hasta $10 billones).`,
      );
    }
    return centavos === 0 ? 0 : centavos;
  }
  if (valor !== null && typeof valor === 'object' && typeof valor.toFixed === 'function') {
    return centavosDeTexto(valor.toFixed(), talCual, valor);
  }
  throw new PlataInvalida(`«${String(valor)}» no es un valor de plata.`);
}

/**
 * Cualquier valor de plata → **pesos** como `number`, exacto al centavo
 * (`Prisma.Decimal('1234.5')` → `1234.5`; `1234n` → `1234`). Es lo que se usa
 * al LEER una columna. `null` y `undefined` pasan tal cual.
 */
export function pesos(valor: ValorDePlata): number;
export function pesos(valor: ValorDePlata | null): number | null;
export function pesos(valor: ValorDePlata | undefined): number | undefined;
export function pesos(valor: ValorDePlata | null | undefined): number | null | undefined;
export function pesos(valor: ValorDePlata | null | undefined): number | null | undefined {
  if (valor === null || valor === undefined) return valor;
  return aCentavos(valor) / 100;
}

/** Pesos con cualquier fracción → pesos al centavo (P1 a: la mitad lejos del cero). */
export function alCentavo(valorEnPesos: ValorDePlata): number {
  return aCentavos(valorEnPesos) / 100;
}

/**
 * Pesos → pesos ENTEROS, la mitad lejos del cero. Es el redondeo de hoy
 * («en COP no hay centavos») para lo que todavía va al peso: lo que la sonda
 * de C3 deje al peso y lo que la norma pida entero (la exógena, la PILA).
 */
export function alPeso(valorEnPesos: ValorDePlata): number {
  const c = aCentavos(valorEnPesos);
  const r = Math.sign(c) * Math.floor(Math.abs(c) / 100 + 0.5);
  return r === 0 ? 0 : r;
}

/** Suma exacta al centavo: `sumar(0.1, 0.2) === 0.3`. */
export function sumar(...valores: ValorDePlata[]): number {
  let c = 0;
  for (const v of valores) c += aCentavos(v);
  return c / 100;
}

/** Resta exacta al centavo. */
export function restar(a: ValorDePlata, b: ValorDePlata): number {
  return (aCentavos(a) - aCentavos(b)) / 100;
}

/** ¿Es la misma plata, al centavo? (`1234.5` vs `Decimal('1234.50')` → `true`). */
export function mismaPlata(a: ValorDePlata, b: ValorDePlata): boolean {
  return aCentavos(a) === aCentavos(b);
}

/** `base × pct / 100`, al centavo. `porcentaje(1_000_000, 19)` → `190_000`. */
export function porcentaje(base: ValorDePlata, pct: number): number {
  return centavoEntero((aCentavos(base) * pct) / 100, false, base) / 100;
}

/** `base × x / 1.000`, al centavo (reteICA y GMF se publican «por mil»). */
export function porMil(base: ValorDePlata, x: number): number {
  return centavoEntero((aCentavos(base) * x) / 1_000, false, base) / 100;
}

/** `base × bps / 10.000`, al centavo (100 bps = 1 %). */
export function porBps(base: ValorDePlata, bps: number): number {
  return centavoEntero((aCentavos(base) * bps) / 10_000, false, base) / 100;
}

/**
 * Reparte `total` en partes proporcionales a `pesos` (pesos, bps o cualquier
 * peso no negativo) **al centavo**, por el método del resto mayor: la suma de
 * las partes es SIEMPRE el total exacto. Los empates del resto van a la parte
 * que viene primero (determinista). Sirve para los copropietarios, el
 * prorrateo y las cuotas.
 *
 * `repartir(100, [1, 1, 1])` → `[33.34, 33.33, 33.33]`.
 */
export function repartir(total: ValorDePlata, pesosDeLasPartes: readonly number[]): number[] {
  if (pesosDeLasPartes.length === 0) {
    throw new PlataInvalida('No hay entre quiénes repartir.');
  }
  for (const p of pesosDeLasPartes) {
    if (!Number.isFinite(p) || p < 0) {
      throw new PlataInvalida(`El peso «${String(p)}» de una parte no sirve para repartir.`);
    }
  }
  const sumaDePesos = pesosDeLasPartes.reduce((a, b) => a + b, 0);
  if (sumaDePesos <= 0) {
    throw new PlataInvalida('Todas las partes pesan cero: no hay cómo repartir.');
  }
  const t = aCentavos(total);
  const signo = t < 0 ? -1 : 1;
  const absoluto = Math.abs(t);
  const exactas = pesosDeLasPartes.map((p) => {
    const x = (absoluto * p) / sumaDePesos;
    return Math.abs(x) < MAXIMO_EXACTO_EN_CENTAVOS ? Number(x.toPrecision(15)) : x;
  });
  const partes = exactas.map((x) => Math.floor(x));
  let faltan = absoluto - partes.reduce((a, b) => a + b, 0);
  const orden = exactas
    .map((x, i) => ({ i, resto: x - Math.floor(x) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (let k = 0; faltan > 0; k = (k + 1) % orden.length, faltan--) {
    partes[orden[k].i] += 1;
  }
  return partes.map((c) => {
    const r = (signo * c) / 100;
    return r === 0 ? 0 : r;
  });
}

/**
 * Pesos → centavos para los archivos de los bancos, que llevan «dos decimales
 * implícitos» (`1234.56` → `"123456"`; `1500000` → `"150000000"`). El relleno
 * a la izquierda es cosa de cada formato. Negativo LANZA: no se gira plata
 * negativa.
 */
export function conDosDecimalesImplicitos(valorEnPesos: ValorDePlata): string {
  const c = aCentavos(valorEnPesos);
  if (c < 0) {
    throw new PlataInvalida(`El valor ${String(valorEnPesos)} es negativo: no va en un archivo del banco.`);
  }
  return String(c);
}

/**
 * Pesos → `amount_in_cents` de Wompi: entero POSITIVO de centavos, exacto
 * (`1234567.29` → `123456729`; nunca `pesos * 100` en flotante:
 * `0.29 * 100 === 28.999999999999996`).
 */
export function aCentavosWompi(valorEnPesos: ValorDePlata): number {
  const c = aCentavos(valorEnPesos);
  if (c <= 0) {
    throw new PlataInvalida(`Wompi sólo cobra valores positivos; llegó ${String(valorEnPesos)}.`);
  }
  return c;
}
