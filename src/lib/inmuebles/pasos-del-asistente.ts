/**
 * Los pasos de «Nuevo inmueble» (`ConsignacionWizard`) y en qué orden van.
 *
 * 🔴 Juan y Nico, 27-10-2026 (reunión con Sara, agente con 108 inmuebles que no pudo publicar): «para cuando es
 * captación evitemos colocar [el propietario] como obligatorio de primero, más bien que suba toda la información
 * del inmueble»; «las fotos sí, pero el inventario es opcional»; «separaría fotos y por allá otro que sea
 * inventario». Antes: Propietario → Inmueble → Comisión → Agente → Inventario y fotos → Confirmar.
 * Ahora el inmueble va primero, las fotos aparte y el propietario y el inventario son opcionales.
 *
 * El borrador guardado lleva `ordenDePasos`: uno de antes de este orden retoma desde el primer paso (su número de
 * paso hablaba de otro orden).
 */

export const PASO = {
  inmueble: 1,
  fotos: 2,
  propietario: 3,
  comision: 4,
  agente: 5,
  inventario: 6,
  confirmar: 7,
} as const;

export type ClaveDelPaso = keyof typeof PASO;
export type NumeroDelPaso = (typeof PASO)[ClaveDelPaso];

export const PRIMER_PASO = PASO.inmueble;
export const ULTIMO_PASO = PASO.confirmar;
export const TOTAL_DE_PASOS = 7;

/** La versión del orden de los pasos. Cambia si el orden vuelve a cambiar. */
export const ORDEN_DE_PASOS = 2;

export function claveDelPaso(numero: number): ClaveDelPaso | null {
  const par = (Object.entries(PASO) as [ClaveDelPaso, number][]).find(([, n]) => n === numero);
  return par ? par[0] : null;
}

export interface QuienCrea {
  /** El asesor (rol AGENTE) no elige agente: queda él. */
  esAsesor: boolean;
  /** Sólo en venta (no «arriendo y venta») no hay acta de entrega ni inventario. */
  soloVenta: boolean;
}

/** ¿Este paso se salta para quien crea? */
export function pasoSeSalta(numero: number, quien: QuienCrea): boolean {
  if (numero === PASO.agente && quien.esAsesor) return true;
  if (numero === PASO.inventario && quien.soloVenta) return true;
  return false;
}

export function pasoSiguiente(numero: number, quien: QuienCrea): number {
  let siguiente = numero + 1;
  while (siguiente < ULTIMO_PASO && pasoSeSalta(siguiente, quien)) siguiente += 1;
  return Math.min(siguiente, ULTIMO_PASO);
}

export function pasoAnterior(numero: number, quien: QuienCrea): number {
  let anterior = numero - 1;
  while (anterior > PRIMER_PASO && pasoSeSalta(anterior, quien)) anterior -= 1;
  return Math.max(anterior, PRIMER_PASO);
}

/**
 * El paso donde retomar un borrador: uno guardado con otro orden vuelve al primero; uno que cae en un paso que
 * ahora se salta, al siguiente que sí está.
 */
export function pasoParaRetomar(
  guardado: { paso: number; ordenDePasos?: number },
  quien: QuienCrea,
): number {
  if (guardado.ordenDePasos !== ORDEN_DE_PASOS) return PRIMER_PASO;
  const paso = Math.min(Math.max(Math.trunc(guardado.paso) || PRIMER_PASO, PRIMER_PASO), ULTIMO_PASO);
  return pasoSeSalta(paso, quien) ? pasoSiguiente(paso, quien) : paso;
}
