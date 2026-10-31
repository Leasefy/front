/**
 * Ver los precios de Leasefy en otra moneda (Nico, 31-10-2026: «tienes que dejar claro que esto se cobra en pesos
 * colombianos, o sea que lo puedan ver en varias monedas»). Se cobra SIEMPRE en COP; USD, EUR, MXN y CLP son una
 * referencia con la tasa del día (back `GET /config/tasas-de-cambio`). Sin tasa, sólo pesos: nunca un número inventado.
 */
import { precioDelMes } from '@/lib/conversion/acceso';

export const MONEDAS = ['COP', 'USD', 'EUR', 'MXN', 'CLP'] as const;
export type Moneda = (typeof MONEDAS)[number];
export type MonedaDeReferencia = Exclude<Moneda, 'COP'>;

export const NOMBRE_DE_LA_MONEDA: Record<Moneda, string> = {
  COP: 'pesos colombianos',
  USD: 'dólares',
  EUR: 'euros',
  MXN: 'pesos mexicanos',
  CLP: 'pesos chilenos',
};

export interface TasasDeCambio {
  disponible: true;
  /** Cuánto vale UN peso colombiano en cada moneda. */
  porPeso: Record<MonedaDeReferencia, number>;
  /** `YYYY-MM-DD`. */
  fecha: string;
  fuente: { nombre: string; url: string };
}

export type RespuestaDeTasas = TasasDeCambio | { disponible: false };

/** Lo que viene del back, revisado: cada moneda con un número positivo, o nada. */
export function leerLasTasas(crudo: unknown): TasasDeCambio | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const c = crudo as Partial<TasasDeCambio> & { disponible?: unknown };
  if (c.disponible !== true || !c.porPeso || typeof c.fecha !== 'string' || !c.fuente) return null;
  for (const m of MONEDAS) {
    if (m === 'COP') continue;
    const v = c.porPeso[m];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  }
  return c as TasasDeCambio;
}

/** Cómo se escribe una cifra en pantalla. */
export type FormatoDePlata = (pesos: number) => string;

const NBSP = ' ';

/**
 * «≈ 165 USD», «≈ 0,52 EUR», «≈ 23.671 CLP». El peso chileno va sin decimales; las demás, con dos por debajo de 100.
 * Siempre con «≈»: es una referencia, no lo que se cobra.
 */
export function enOtraMoneda(pesos: number, moneda: MonedaDeReferencia, tasas: TasasDeCambio): string {
  const valor = pesos * tasas.porPeso[moneda];
  const decimales = moneda === 'CLP' || Math.abs(valor) >= 100 ? 0 : 2;
  const numero = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor);
  return `≈${NBSP}${numero}${NBSP}${moneda}`;
}

/** El formato de la moneda elegida; COP (o sin tasa) es el de siempre. */
export function formatoDe(moneda: Moneda, tasas: TasasDeCambio | null): FormatoDePlata {
  if (moneda === 'COP' || !tasas) return precioDelMes;
  return (pesos) => enOtraMoneda(pesos, moneda, tasas);
}

const LLAVE = 'leasefy:moneda-de-referencia';

export function monedaGuardada(): Moneda {
  try {
    const v = window.localStorage.getItem(LLAVE);
    return (MONEDAS as readonly string[]).includes(v ?? '') ? (v as Moneda) : 'COP';
  } catch {
    return 'COP';
  }
}

export function guardarMoneda(moneda: Moneda): void {
  try {
    window.localStorage.setItem(LLAVE, moneda);
  } catch {
    /* sin almacenamiento: vale para esta visita */
  }
}
