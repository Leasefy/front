/**
 * El nombre corto de la inmobiliaria: su página vive en `leasefy.co/i/<nombre>`
 * (Nico, 09-10-2026). Nace del nombre de la agencia y ella lo cambia en
 * Configuración. La migración `20261009220000_marketplace_de_inmobiliarias`
 * llena el de las que ya existen con esta MISMA regla (`raizDelNombreCorto`).
 *
 * Espejo del back (`src/marketplace/nombre-corto.ts`), copiado tal cual: si cambias
 * algo acá, cámbialo allá.
 */

export const LARGO_MINIMO_DEL_NOMBRE_CORTO = 3;
export const LARGO_MAXIMO_DEL_NOMBRE_CORTO = 50;

/** Palabras que no puede tomar una inmobiliaria: confundirían a quien lee el enlace. */
export const NOMBRES_CORTOS_RESERVADOS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'ayuda',
  'configuracion',
  'editar',
  'i',
  'inmobiliaria',
  'inmobiliarias',
  'leasefy',
  'login',
  'marketplace',
  'nueva',
  'nuevo',
  'panel',
  'propiedades',
  'registro',
  'soporte',
]);

export const MENSAJE_DEL_NOMBRE_CORTO =
  'El nombre corto va en minúsculas, sin tildes ni espacios (usa guiones), entre 3 y 50 letras. Ejemplo: nogal-inmobiliaria.';
export const MENSAJE_NOMBRE_CORTO_RESERVADO =
  'Ese nombre corto está reservado. Prueba con el nombre de tu inmobiliaria.';
export const MENSAJE_NOMBRE_CORTO_OCUPADO =
  'Ese nombre corto ya lo tiene otra inmobiliaria. Prueba con otro.';

const FORMA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CON_TILDE = 'ÁÉÍÓÚÜÑáéíóúüñ';
const SIN_TILDE = 'AEIOUUNaeiouun';

function sinTildes(texto: string): string {
  let r = '';
  for (const c of texto) {
    const i = CON_TILDE.indexOf(c);
    r += i >= 0 ? SIN_TILDE[i] : c;
  }
  return r;
}

function sinGuionesALosLados(texto: string): string {
  return texto.replace(/^-+/, '').replace(/-+$/, '');
}

/**
 * «Inmobiliaria Nogal S.A.S.» → `inmobiliaria-nogal-s-a-s`. Igual que el SQL de
 * la migración: tildes fuera, minúsculas, todo lo que no sea letra o número a
 * un guion, hasta 50. Si no queda nada, `inmobiliaria`.
 */
export function raizDelNombreCorto(nombre: string): string {
  const base = sinGuionesALosLados(
    sinTildes(nombre ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-'),
  );
  const recortada = sinGuionesALosLados(base.slice(0, LARGO_MAXIMO_DEL_NOMBRE_CORTO));
  return recortada || 'inmobiliaria';
}

/** Lo que escribe una persona, llevado a la forma: «Nogal Inmobiliaria» → `nogal-inmobiliaria`. */
export function normalizarNombreCorto(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  if (!limpio) return null;
  return sinGuionesALosLados(
    sinTildes(limpio)
      .toLowerCase()
      .replace(/[\s_.]+/g, '-')
      .replace(/-{2,}/g, '-'),
  );
}

export type ProblemaDelNombreCorto = 'forma' | 'reservado';

/** `null` si sirve; si no, por qué. */
export function problemaDelNombreCorto(valor: unknown): ProblemaDelNombreCorto | null {
  if (typeof valor !== 'string') return 'forma';
  if (
    valor.length < LARGO_MINIMO_DEL_NOMBRE_CORTO ||
    valor.length > LARGO_MAXIMO_DEL_NOMBRE_CORTO ||
    !FORMA.test(valor)
  ) {
    return 'forma';
  }
  if (NOMBRES_CORTOS_RESERVADOS.has(valor)) return 'reservado';
  return null;
}

/**
 * Para una agencia nueva: la raíz de su nombre si nadie la tiene; si no, la
 * raíz con 6 letras de su id (igual que la migración), que no choca nunca.
 */
export async function nombreCortoLibre(
  nombre: string,
  agencyId: string,
  ocupado: (nombreCorto: string) => Promise<boolean>,
): Promise<string> {
  const raiz = raizDelNombreCorto(nombre);
  if (!NOMBRES_CORTOS_RESERVADOS.has(raiz) && !(await ocupado(raiz))) return raiz;
  return `${raiz}-${agencyId.replace(/-/g, '').slice(0, 6)}`;
}
