/**
 * El reparto de la plata del propietario entre varias cuentas (22-09), del
 * lado de la pantalla.
 *
 * «Mi dinero me lo ponen, ejemplo, el 50 % en Bancolombia, otro 20 % en Nubank
 * y otro 30 % en Banco de Occidente» (Nico).
 *
 * ESPEJO de `back/src/inmobiliaria/propietarios/reparto-de-cuentas.ts`: la
 * regla manda allá (el back vuelve a validar todo); acá está para que el botón
 * diga ANTES de enviar cuánto falta o sobra, en vez de esperar un 400. Si allá
 * cambia un tope, cambia acá.
 *
 * Porcentajes ENTEROS de 1 a 100 que suman exactamente 100; máximo 5 cuentas;
 * la misma cuenta no puede estar dos veces.
 */

export const MAXIMO_DE_CUENTAS = 5;

export interface CuentaParaRevisar {
  /** El banco (código o nombre): con el número, identifica la cuenta. */
  banco: string;
  numero: string;
  /** Lo que la persona escribió; `''` = vacío. */
  porcentaje: string;
}

export type ProblemaDelReparto =
  | { tipo: 'porcentaje'; indice: number; mensaje: string }
  | { tipo: 'suma'; mensaje: string }
  | { tipo: 'repetida'; indice: number; mensaje: string }
  | { tipo: 'cantidad'; mensaje: string };

/** El porcentaje escrito, como entero; `null` si no es un entero de 1 a 100. */
export function porcentajeEntero(texto: string): number | null {
  const limpio = texto.trim();
  if (!/^\d{1,3}$/.test(limpio)) return null;
  const n = Number(limpio);
  return n >= 1 && n <= 100 ? n : null;
}

/** La suma de lo escrito (lo que no es un número cuenta 0). */
export function sumaDePorcentajes(cuentas: readonly CuentaParaRevisar[]): number {
  return cuentas.reduce((s, c) => s + (porcentajeEntero(c.porcentaje) ?? 0), 0);
}

/** «Suman 80 %: falta repartir 20 %.» — la misma frase que el back. */
export function fraseDeLaSuma(suma: number): string {
  if (suma === 100) return 'Suman 100 %.';
  return suma < 100
    ? `Los porcentajes suman ${suma} %: falta repartir ${100 - suma} %.`
    : `Los porcentajes suman ${suma} %: sobran ${suma - 100} %.`;
}

/** El primer problema del reparto, o `null` si se puede enviar. */
export function problemaDelReparto(cuentas: readonly CuentaParaRevisar[]): ProblemaDelReparto | null {
  if (cuentas.length < 2 || cuentas.length > MAXIMO_DE_CUENTAS) {
    return {
      tipo: 'cantidad',
      mensaje: `Un reparto tiene entre 2 y ${MAXIMO_DE_CUENTAS} cuentas.`,
    };
  }
  for (const [i, c] of cuentas.entries()) {
    if (porcentajeEntero(c.porcentaje) === null) {
      return {
        tipo: 'porcentaje',
        indice: i,
        mensaje: `El porcentaje de la cuenta ${i + 1} tiene que ser un número entero entre 1 y 100.`,
      };
    }
  }
  const suma = sumaDePorcentajes(cuentas);
  if (suma !== 100) return { tipo: 'suma', mensaje: fraseDeLaSuma(suma) };
  const vistas = new Map<string, number>();
  for (const [i, c] of cuentas.entries()) {
    const numero = c.numero.replace(/\D/g, '');
    if (!c.banco || !numero) continue;
    const llave = `${c.banco}|${numero}`;
    const antes = vistas.get(llave);
    if (antes !== undefined) {
      return {
        tipo: 'repetida',
        indice: i,
        mensaje: `La cuenta ${i + 1} es la misma que la cuenta ${antes + 1}: súmales el porcentaje en una sola.`,
      };
    }
    vistas.set(llave, i);
  }
  return null;
}

/** «50 % · Bancolombia · Ahorros · •••• 4521», para la tarjeta del cambio. */
export function cuentaDelRepartoEnUnaLinea(c: {
  porcentaje: number;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
}): string {
  const numero = c.bankAccountNumber ? `•••• ${c.bankAccountNumber.replace(/\s+/g, '').slice(-4)}` : null;
  return [`${c.porcentaje} %`, c.bankName, c.bankAccountType, numero].filter(Boolean).join(' · ');
}
