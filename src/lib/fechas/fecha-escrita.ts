/**
 * 🔴 LA FECHA QUE ESCRIBE UNA PERSONA, como la escribe (Nico, 02-10-2026: «¿no
 * tenemos parsers que solucionan eso? si no lo tenemos, constrúyelos»). PURA.
 *
 * Hasta ese día la fecha de vigencia de la carta de incremento tenía que venir
 * EXACTAMENTE como «2026-12-01»: «01/12/2026» o «1 de diciembre de 2026»
 * volvían un 400 en inglés («fechaDeVigencia debe tener el formato
 * YYYY-MM-DD»). Los lectores de fechas que ya había no servían para esto:
 *
 *   · los de la migración (`lib/contratos/leer-celdas.ts::comoFecha`,
 *     `lib/migracion/valores-de-origen.ts::fechaDeOrigen` y, en el back,
 *     `leerDia`) leen AAAA-MM-DD y
 *     DD/MM/AAAA y NADA más A PROPÓSITO: un archivo de 30.000 filas no se
 *     adivina («la migración no inventa nada»), un año de dos dígitos o un mes
 *     escrito quedan como faltante visible;
 *   · una persona que escribe en un formulario está ahí para corregir: si la
 *     fecha no se entiende se le dice cómo escribirla, con un ejemplo.
 *
 * Por eso éste es un lector APARTE, sólo para lo que escribe una persona, y no
 * toca los de la migración.
 *
 * ── Lo que entiende ───────────────────────────────────────────────────────
 *
 *   · «2026-12-01», «2026/12/01», «2026.12.01» y con hora («2026-12-01T10:00»);
 *   · el día PRIMERO, siempre (convención colombiana): «01/12/2026»,
 *     «1/12/2026», «1-12-2026», «1.12.2026», «1 12 2026», «1/12/26»;
 *   · el mes en letras, en español o en inglés, completo o abreviado, en
 *     cualquier orden con el día: «1 de diciembre de 2026», «1 dic 2026»,
 *     «01-dic-2026», «dic 1 2026», «diciembre 1, 2026», «martes 1 de
 *     diciembre del 2026», «1º de diciembre de 2026», «Dec 1, 2026».
 *
 * ── Lo que NO adivina (y la frase dice cómo escribirla) ───────────────────
 *
 *   · «12/25/2026»: no existe el mes 25. No se voltea a mes/día: se le dice
 *     que el día va primero, con SU fecha escrita bien («25/12/2026»);
 *   · «31/02/2026»: febrero de 2026 no tiene 31 días;
 *   · sin año («1/12», «1 de diciembre») o sin día («12/2026», «diciembre de
 *     2026»): falta un dato, no se inventa;
 *   · un número suelto («46357», un serial de Excel) o un texto que no es
 *     fecha.
 *
 * ── El año de dos dígitos ─────────────────────────────────────────────────
 *
 * «1/12/26» es 2026. Se resuelve con una ventana alrededor de HOY: el año cae
 * entre hoy − 79 y hoy + 20 (la ventana de siempre de los calendarios: en
 * 2026, «46» es 2046 y «47» es 1947). Así una fecha de nacimiento «15/03/85»
 * es 1985 y una vigencia «1/12/30» es 2030.
 *
 * 🔁 Espejo EXACTO del back: `src/common/fechas/fecha-escrita.ts` (mismas
 * reglas, mismas frases). Si cambias algo acá, cámbialo allá; los dos bancos
 * de pruebas tienen los mismos casos. El front la usa para decir el problema
 * bajo el campo ANTES de mandar y para mandar el día ya en AAAA-MM-DD; el back
 * la vuelve a aplicar (no confía en el navegador).
 */

/** Por qué no se pudo leer. */
export type MotivoDeLaFecha =
  | 'VACIA'
  | 'NO_ENTENDIDA'
  | 'NO_EXISTE'
  | 'SIN_ANIO'
  | 'SIN_DIA';

export type LecturaDeLaFecha =
  | { ok: true; iso: string }
  | { ok: false; motivo: MotivoDeLaFecha; mensaje: string };

export interface OpcionesDeLaFecha {
  /**
   * Cómo se llama el campo, con su artículo y en mayúscula inicial: «La fecha
   * de vigencia». Abre la frase de error. Por defecto, «La fecha».
   */
  etiqueta?: string;
  /** Para resolver el año de dos dígitos. Por defecto, ahora. */
  hoy?: Date;
}

/** El ejemplo que va en las frases: siempre el mismo día, en los dos formatos. */
export const EJEMPLO_DE_FECHA = '01/12/2026';
export const EJEMPLO_DE_FECHA_EN_LETRAS = '1 de diciembre de 2026';

const MESES: Record<string, number> = {
  enero: 1,
  ene: 1,
  january: 1,
  jan: 1,
  febrero: 2,
  feb: 2,
  february: 2,
  marzo: 3,
  mar: 3,
  march: 3,
  abril: 4,
  abr: 4,
  april: 4,
  apr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  june: 6,
  julio: 7,
  jul: 7,
  july: 7,
  agosto: 8,
  ago: 8,
  august: 8,
  aug: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  set: 9,
  september: 9,
  octubre: 10,
  oct: 10,
  october: 10,
  noviembre: 11,
  nov: 11,
  november: 11,
  diciembre: 12,
  dic: 12,
  december: 12,
  dec: 12,
};

const NOMBRE_DEL_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Palabras que acompañan una fecha y no cambian nada. */
const PALABRAS_DE_RELLENO = new Set([
  'de',
  'del',
  'el',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, '0')}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** El año de dos dígitos, en la ventana [hoy − 79, hoy + 20]. */
function anioCompleto(crudo: string, hoy: Date): number {
  const n = Number(crudo);
  if (crudo.length !== 2) return n;
  const actual = hoy.getUTCFullYear();
  const siglo = Math.floor(actual / 100) * 100;
  let anio = siglo + n;
  if (anio > actual + 20) anio -= 100;
  else if (anio < actual - 79) anio += 100;
  return anio;
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function enMinuscula(etiqueta: string): string {
  return etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1);
}

/** «El inicio del contrato» → «escríbelo»; «La fecha de vigencia» → «escríbela». */
function esMasculina(etiqueta: string): boolean {
  return /^(el|los)\s/i.test(etiqueta.trim());
}

/** «a» + la etiqueta, con la contracción: «a la fecha», «al inicio del contrato». */
function aLa(etiqueta: string): string {
  const minuscula = enMinuscula(etiqueta);
  return /^el\s/.test(minuscula)
    ? `al ${minuscula.slice(3)}`
    : `a ${minuscula}`;
}

interface Contexto {
  etiqueta: string;
  texto: string;
}

function escribela(etiqueta: string): string {
  return esMasculina(etiqueta) ? 'Escríbelo' : 'Escríbela';
}

function noEntendida({ etiqueta, texto }: Contexto): LecturaDeLaFecha {
  return {
    ok: false,
    motivo: 'NO_ENTENDIDA',
    mensaje: `No entendimos ${enMinuscula(etiqueta)} «${texto}». ${escribela(etiqueta)} con el día primero, por ejemplo ${EJEMPLO_DE_FECHA} o «${EJEMPLO_DE_FECHA_EN_LETRAS}».`,
  };
}

function sinAnio({ etiqueta }: Contexto): LecturaDeLaFecha {
  const completa = esMasculina(etiqueta) ? 'completo' : 'completa';
  return {
    ok: false,
    motivo: 'SIN_ANIO',
    mensaje: `${conMayuscula(aLa(etiqueta))} le falta el año. ${escribela(etiqueta)} ${completa}, por ejemplo ${EJEMPLO_DE_FECHA}.`,
  };
}

function sinDia({ etiqueta }: Contexto): LecturaDeLaFecha {
  const completa = esMasculina(etiqueta) ? 'completo' : 'completa';
  return {
    ok: false,
    motivo: 'SIN_DIA',
    mensaje: `${conMayuscula(aLa(etiqueta))} le falta el día. ${escribela(etiqueta)} ${completa}, por ejemplo ${EJEMPLO_DE_FECHA}.`,
  };
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Arma la fecha si existe en el calendario; si no, dice qué no existe.
 * `diaPrimero` = se escribió con números y el día primero («12/25/2026»): ahí
 * un mes > 12 es casi siempre un mes/día volteado, y la frase lo dice con SU
 * fecha bien escrita. Con el año primero no se sugiere nada: no se sabe cuál
 * de los dos números se volteó.
 */
function armar(
  anio: number,
  mes: number,
  dia: number,
  ctx: Contexto,
  diaPrimero: boolean,
): LecturaDeLaFecha {
  if (mes < 1 || mes > 12) {
    const volteada =
      diaPrimero && dia >= 1 && dia <= 12 && mes <= 31
        ? ` En Colombia el día va primero: ${escribela(ctx.etiqueta).toLowerCase()} como ${dosDigitos(mes)}/${dosDigitos(dia)}/${anio}.`
        : ` ${escribela(ctx.etiqueta)} con el día primero, por ejemplo ${EJEMPLO_DE_FECHA}.`;
    return {
      ok: false,
      motivo: 'NO_EXISTE',
      mensaje: `${ctx.etiqueta} no tiene un mes válido (${mes}).${volteada}`,
    };
  }
  const tope = diasDelMes(anio, mes);
  if (dia < 1 || dia > tope) {
    return {
      ok: false,
      motivo: 'NO_EXISTE',
      mensaje: `${ctx.etiqueta} no es un día real del calendario: ${NOMBRE_DEL_MES[mes - 1]} de ${anio} tiene ${tope} días.`,
    };
  }
  return { ok: true, iso: iso(anio, mes, dia) };
}

/**
 * Lee la fecha como la escribió una persona. `ok: true` trae el día en
 * `AAAA-MM-DD`; `ok: false`, por qué no y la frase para esa persona.
 */
export function leerFechaEscrita(
  valor: unknown,
  opciones: OpcionesDeLaFecha = {},
): LecturaDeLaFecha {
  const etiqueta = opciones.etiqueta ?? 'La fecha';
  const hoy = opciones.hoy ?? new Date();

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? noEntendida({ etiqueta, texto: String(valor) })
      : { ok: true, iso: valor.toISOString().slice(0, 10) };
  }
  if (typeof valor !== 'string') {
    if (valor === null || valor === undefined) {
      return {
        ok: false,
        motivo: 'VACIA',
        mensaje: `Falta ${enMinuscula(etiqueta)}.`,
      };
    }
    // Un número suelto (un serial de Excel) no es una fecha que alguien escribió.
    return noEntendida({ etiqueta, texto: textoDeOtroValor(valor) });
  }

  const texto = valor.trim();
  if (!texto) {
    return {
      ok: false,
      motivo: 'VACIA',
      mensaje: `Falta ${enMinuscula(etiqueta)}.`,
    };
  }
  const ctx: Contexto = { etiqueta, texto };
  const limpio = sinTildes(texto.toLowerCase()).replace(/\s+/g, ' ');

  // 1. Año primero: «2026-12-01», con o sin hora.
  const anioPrimero =
    /^(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})(?:(?:t|\s)\d{1,2}:\d{2}.*)?$/.exec(
      limpio,
    );
  if (anioPrimero) {
    return armar(
      Number(anioPrimero[1]),
      Number(anioPrimero[2]),
      Number(anioPrimero[3]),
      ctx,
      false,
    );
  }

  // 2. Día primero, con números: «01/12/2026», «1-12-26», «1 12 2026».
  const diaPrimero =
    /^(\d{1,2})\s*([-/.\s])\s*(\d{1,2})\s*\2\s*(\d{4}|\d{2})(?:\s+\d{1,2}:\d{2}.*)?$/.exec(
      limpio,
    );
  if (diaPrimero) {
    return armar(
      anioCompleto(diaPrimero[4], hoy),
      Number(diaPrimero[3]),
      Number(diaPrimero[1]),
      ctx,
      true,
    );
  }

  // Números a los que les falta un pedazo: «1/12», «12/2026», «2026-12».
  if (/^\d{1,2}\s*[-/.]\s*\d{1,2}$/.test(limpio)) return sinAnio(ctx);
  if (/^(\d{1,2}\s*[-/.]\s*\d{4}|\d{4}\s*[-/.]\s*\d{1,2})$/.test(limpio)) {
    return sinDia(ctx);
  }

  // 3. El mes en letras, en cualquier orden con el día.
  const piezas = limpio
    .replace(/(\d)\s*[º°]/g, '$1')
    .split(/[\s,./-]+/)
    .filter((p) => p !== '' && !PALABRAS_DE_RELLENO.has(p));
  const meses = piezas.filter((p) => MESES[p] !== undefined);
  const numeros = piezas.filter((p) => /^\d+$/.test(p));
  const otras = piezas.filter(
    (p) => MESES[p] === undefined && !/^\d+$/.test(p),
  );
  if (meses.length !== 1 || otras.length > 0 || numeros.length === 0) {
    return noEntendida(ctx);
  }
  const mes = MESES[meses[0]];
  if (numeros.length === 1) {
    // «diciembre de 2026» o «1 de diciembre»: falta el día o el año.
    return numeros[0].length === 4 ? sinDia(ctx) : sinAnio(ctx);
  }
  if (numeros.length > 2) return noEntendida(ctx);
  const [a, b] = numeros;
  let diaCrudo: string;
  let anioCrudo: string;
  if (a.length === 4 && b.length <= 2) {
    [anioCrudo, diaCrudo] = [a, b];
  } else if (b.length === 4 && a.length <= 2) {
    [diaCrudo, anioCrudo] = [a, b];
  } else if (a.length <= 2 && b.length <= 2) {
    // Dos números cortos: el primero es el día y el segundo el año
    // («1 dic 26», «dic 1 26»).
    [diaCrudo, anioCrudo] = [a, b];
  } else {
    return noEntendida(ctx);
  }
  return armar(anioCompleto(anioCrudo, hoy), mes, Number(diaCrudo), ctx, false);
}

/** Lo que se le muestra a la persona de un valor que no es texto. */
function textoDeOtroValor(valor: unknown): string {
  return typeof valor === 'number' ||
    typeof valor === 'bigint' ||
    typeof valor === 'boolean'
    ? String(valor)
    : '…';
}

/** El día en `AAAA-MM-DD`, o `null` si no se entiende. */
export function fechaEscritaComoIso(
  valor: unknown,
  opciones: OpcionesDeLaFecha = {},
): string | null {
  const lectura = leerFechaEscrita(valor, opciones);
  return lectura.ok ? lectura.iso : null;
}
