/**
 * El título que se le PROPONE a la persona cuando el archivo no trae uno.
 *
 * Ninguna inmobiliaria guarda «títulos» en su sistema: guarda dirección, clase
 * y municipio. Por eso esto no pide un dato nuevo — arma el título con lo que
 * la fila ya tiene, en la forma que usan de verdad: «Apartamento en Sabaneta»,
 * «Casa finca en Sopetrán», «Lote en Cisneros» — y con el barrio cuando lo
 * hay: «Apartamento en Sierra Morena, Sabaneta».
 *
 * 🔴 DOS ARREGLOS respecto de lo que hacía antes (2026-09-10):
 *
 *   1. Usaba el BARRIO antes que el municipio, y salían cosas como «Bodega en
 *      HOSPITAL» — el barrio de una celda de parqueadero. El título va con el
 *      municipio, que es lo que ubica de verdad.
 *   2. Traducía el tipo a siete etiquetas del enum, así que una «Casa Finca» o
 *      un «Lote» —que el enum no tiene— salían como «Casa» o «Bodega». Ahora
 *      la clase del archivo manda cuando es una clase de inmueble de verdad.
 *
 * La lista blanca no es capricho: la columna «Clase» del archivo real trae
 * «Queja», «Sugerencia», «Comentario», «Responsable del IVA». Sin filtro, el
 * título de un inmueble sería «Queja en Medellín».
 *
 * 🔴 Espeja `tituloDelInmueble` del back (`src/properties/titulo.ts`), que es
 * lo que se GUARDA si la persona no escribe otro. Si cambia una, cambia la
 * otra: lo que se propone en pantalla tiene que ser lo que termina guardado.
 */

/** Los siete valores del enum `PropertyType`, en palabras. */
const ETIQUETA_DEL_ENUM: Record<string, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  studio: 'Apartaestudio',
  room: 'Habitación',
  commercial: 'Local',
  office: 'Oficina',
  warehouse: 'Bodega',
};

/** Clases que SÍ nombran un inmueble, sin tildes y en minúscula. */
const CLASE_CONOCIDA: Record<string, string> = {
  apartamento: 'Apartamento',
  apto: 'Apartamento',
  apartaestudio: 'Apartaestudio',
  estudio: 'Apartaestudio',
  casa: 'Casa',
  'casa finca': 'Casa finca',
  finca: 'Finca',
  'finca productiva': 'Finca',
  cabana: 'Cabaña',
  local: 'Local',
  'local comercial': 'Local',
  oficina: 'Oficina',
  bodega: 'Bodega',
  lote: 'Lote',
  edificio: 'Edificio',
  parqueadero: 'Parqueadero',
  'celda parqueadero': 'Parqueadero',
  garaje: 'Parqueadero',
  habitacion: 'Habitación',
  penthouse: 'Penthouse',
  duplex: 'Dúplex',
  amoblados: 'Inmueble amoblado',
  amoblado: 'Inmueble amoblado',
};

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cómo llamar al inmueble, o `null` si lo que vino no nombra ninguno. */
export function etiquetaDelTipo(tipo?: string | null): string | null {
  const crudo = (tipo ?? '').trim();
  if (!crudo) return null;
  return (
    ETIQUETA_DEL_ENUM[crudo.toLowerCase()] ??
    CLASE_CONOCIDA[normalizar(crudo)] ??
    null
  );
}

/**
 * Un barrio legible. Los archivos reales lo traen en MAYÚSCULA SOSTENIDA
 * («UNIDAD SIERRA MORENA») y un título gritado no es un título. Sólo se toca
 * lo que viene todo en mayúsculas; si ya está bien escrito, se respeta.
 */
const ENLACES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en']);

export function barrioLegible(barrio?: string | null): string {
  const crudo = (barrio ?? '').trim().replace(/\s+/g, ' ');
  if (!crudo) return '';
  if (crudo !== crudo.toUpperCase()) return crudo;

  return crudo
    .toLowerCase()
    .split(' ')
    .map((palabra, i) =>
      i > 0 && ENLACES.has(palabra)
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1),
    )
    .join(' ');
}

/**
 * El título propuesto. Cada pieza entra sólo si está: nunca «Apartamento en
 * undefined», y nunca el barrio solo —eso daba «Bodega en HOSPITAL»—.
 */
export function tituloSugerido(
  tipo?: string | null,
  ciudad?: string | null,
  barrio?: string | null,
): string {
  const clase = etiquetaDelTipo(tipo);
  const municipio = (ciudad ?? '').trim();
  const vecindario = barrioLegible(barrio);

  const lugar =
    vecindario && vecindario.toLowerCase() !== municipio.toLowerCase()
      ? municipio
        ? `${vecindario}, ${municipio}`
        : vecindario
      : municipio;

  if (clase && lugar) return `${clase} en ${lugar}`;
  if (clase) return clase;
  if (lugar) return `Inmueble en ${lugar}`;
  return 'Inmueble';
}
