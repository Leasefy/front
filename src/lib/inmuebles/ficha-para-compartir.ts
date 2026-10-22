/**
 * La «mini ficha» del inmueble para compartirlo (Juan y Nico, 21-10-2026:
 * «cuando se comparta el enlace la idea es que genere una mini ficha como
 * esta», con la de Portofino de ejemplo).
 *
 * Son dos piezas que salen de los mismos datos:
 *  - la VISTA PREVIA del enlace (lo que WhatsApp, iMessage o Facebook pintan
 *    debajo del enlace): título, una línea con el lugar y el precio, y la
 *    primera foto. La arma `layout.tsx` de `/propiedades/[id]`.
 *  - el TEXTO de la ficha que se pega en un chat: el título, el precio, los
 *    m², las habitaciones y los baños, y el enlace al final. Es el formato de
 *    «Copiar ficha» de Portofino, que es el que Juan mandó de ejemplo.
 *
 * Pura y sin `'use client'`: la usan el servidor (la vista previa) y el botón
 * de compartir (el texto).
 *
 * Regla: nada que el inmueble no tenga. Un dato vacío o en cero no sale —ni
 * «0 habitaciones» ni «$ 0»—, que es lo normal en lo migrado.
 */

import { formatCurrency } from '@/lib/format';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';

export type IdiomaDeLaFicha = 'es' | 'en';

export interface InmuebleParaCompartir {
  titulo?: string | null;
  /** `'sale'` = venta; cualquier otra cosa, arriendo (como en todo el front). */
  tipoDeNegocio?: 'rent' | 'sale' | null;
  canon?: number | null;
  precioDeVenta?: number | null;
  administracion?: number | null;
  ciudad?: string | null;
  barrio?: string | null;
  area?: number | null;
  habitaciones?: number | null;
  banos?: number | null;
  parqueaderos?: number | null;
  /** El estrato (1–6); sólo la vista previa lo usa, cuando faltan las demás cifras. */
  estrato?: number | null;
}

/** Los campos del inmueble del front (`Property`) que la ficha usa. */
export interface InmuebleDelFront {
  title?: string | null;
  listingType?: 'rent' | 'sale' | null;
  monthlyRent?: number | null;
  salePrice?: number | null;
  adminFee?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
}

/** Del inmueble del front (`useProperty`) a los datos de la ficha. */
export function fichaDelInmueble(p: InmuebleDelFront): InmuebleParaCompartir {
  return {
    titulo: p.title,
    tipoDeNegocio: p.listingType === 'sale' ? 'sale' : 'rent',
    canon: p.monthlyRent,
    precioDeVenta: p.salePrice,
    administracion: p.adminFee,
    ciudad: p.city,
    barrio: p.neighborhood,
    area: p.area,
    habitaciones: p.bedrooms,
    banos: p.bathrooms,
    parqueaderos: p.parkingSpaces,
  };
}

/** Palabras que van en minúscula dentro de un nombre propio («Barrio de la Paz»). */
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'e', 'a', 'al']);

/**
 * «EL YERBAL» → «El Yerbal». Lo migrado trae barrios y ciudades en mayúsculas
 * sostenidas, que en la vista previa se leen como un grito. Sólo toca lo que
 * viene TODO en mayúscula: «La Estrella» o «Laureles» quedan como están.
 */
export function nombrePropio(texto: string | null | undefined): string {
  const limpio = (texto ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) return '';
  if (limpio !== limpio.toLocaleUpperCase('es-CO') || !/\p{L}/u.test(limpio)) return limpio;
  return limpio
    .toLocaleLowerCase('es-CO')
    .split(' ')
    .map((palabra, i) => {
      if (i > 0 && MENORES.has(palabra)) return palabra;
      // Números romanos sueltos («ETAPA II») siguen en mayúscula.
      if (/^[ivxl]+$/.test(palabra) && palabra.length <= 4 && i > 0) return palabra.toUpperCase();
      return palabra.charAt(0).toLocaleUpperCase('es-CO') + palabra.slice(1);
    })
    .join(' ');
}

const esVenta = (d: InmuebleParaCompartir) => d.tipoDeNegocio === 'sale';
const positivo = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

/** «El Yerbal, Envigado»; vacío si no hay ninguno de los dos. */
export function lugarDelInmueble(d: InmuebleParaCompartir): string {
  return barrioYCiudad(nombrePropio(d.barrio), nombrePropio(d.ciudad));
}

/** «$ 12.000.000 / mes» (arriendo) o «$ 450.000.000» (venta); `null` si no hay precio. */
export function precioDelInmueble(d: InmuebleParaCompartir, idioma: IdiomaDeLaFicha = 'es'): string | null {
  if (esVenta(d)) return positivo(d.precioDeVenta) ? formatCurrency(d.precioDeVenta, idioma) : null;
  if (!positivo(d.canon)) return null;
  return `${formatCurrency(d.canon, idioma)} / ${idioma === 'en' ? 'month' : 'mes'}`;
}

function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Las cifras que el inmueble SÍ tiene, en el orden de Portofino: m², habitaciones, baños, parqueaderos. */
export function cifrasDelInmueble(d: InmuebleParaCompartir, idioma: IdiomaDeLaFicha = 'es'): string[] {
  const en = idioma === 'en';
  const cifras: string[] = [];
  if (positivo(d.area)) cifras.push(`${Math.round(d.area).toLocaleString(en ? 'en-US' : 'es-CO')} m²`);
  if (positivo(d.habitaciones))
    cifras.push(cuantos(d.habitaciones, en ? 'bedroom' : 'habitación', en ? 'bedrooms' : 'habitaciones'));
  if (positivo(d.banos)) cifras.push(cuantos(d.banos, en ? 'bathroom' : 'baño', en ? 'bathrooms' : 'baños'));
  if (positivo(d.parqueaderos))
    cifras.push(cuantos(d.parqueaderos, en ? 'parking spot' : 'parqueadero', en ? 'parking spots' : 'parqueaderos'));
  return cifras;
}

/** El título del inmueble; si no tiene, uno armado con el negocio y el lugar. */
export function tituloParaCompartir(d: InmuebleParaCompartir, idioma: IdiomaDeLaFicha = 'es'): string {
  const titulo = (d.titulo ?? '').trim();
  if (titulo) return titulo;
  const lugar = lugarDelInmueble(d);
  const en = idioma === 'en';
  const negocio = esVenta(d) ? (en ? 'Property for sale' : 'Inmueble en venta') : en ? 'Property for rent' : 'Inmueble en arriendo';
  return lugar ? `${negocio} ${en ? 'in' : 'en'} ${lugar}` : negocio;
}

/** Cuántas cifras caben en la vista previa (la tarjeta de la imagen y su línea de texto). */
const CIFRAS_DE_LA_VISTA_PREVIA = 4;

/**
 * Las cifras cortas de la vista previa, en el orden en que se buscan:
 * «2 hab · 2 baños · 50 m² · 1 parq.». Si faltan, el estrato completa
 * («Estrato 4»), que es lo único que trae mucho de lo migrado.
 */
export function cifrasCortas(d: InmuebleParaCompartir, idioma: IdiomaDeLaFicha = 'es'): string[] {
  const en = idioma === 'en';
  const cifras: string[] = [];
  if (positivo(d.habitaciones)) cifras.push(`${d.habitaciones} ${en ? 'bd' : 'hab'}`);
  if (positivo(d.banos)) cifras.push(en ? `${d.banos} ba` : cuantos(d.banos, 'baño', 'baños'));
  if (positivo(d.area)) cifras.push(`${Math.round(d.area).toLocaleString(en ? 'en-US' : 'es-CO')} m²`);
  if (positivo(d.parqueaderos)) cifras.push(`${d.parqueaderos} ${en ? 'parking' : 'parq.'}`);
  if (cifras.length < CIFRAS_DE_LA_VISTA_PREVIA && positivo(d.estrato) && d.estrato <= 6) {
    cifras.push(`${en ? 'Stratum' : 'Estrato'} ${d.estrato}`);
  }
  return cifras;
}

/**
 * La línea de texto de la vista previa (debajo del título, en WhatsApp):
 * «$ 1.200.000 / mes · 2 hab · 2 baños · 50 m² · Poblado, Medellín». Es la
 * que Nico vio en las simulaciones del 21-10-2026. En venta el precio va
 * solo, así que empieza con «Venta».
 */
export function descripcionParaLaVistaPrevia(d: InmuebleParaCompartir, idioma: IdiomaDeLaFicha = 'es'): string {
  const en = idioma === 'en';
  const partes = [
    esVenta(d) ? (en ? 'For sale' : 'Venta') : '',
    precioDelInmueble(d, idioma) ?? '',
    ...cifrasCortas(d, idioma),
    lugarDelInmueble(d),
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : en ? 'For rent' : 'Arriendo';
}

/**
 * El texto de la ficha para pegar en un chat, con el enlace al final (al
 * pegarlo en WhatsApp, el enlace arma además la vista previa con la foto):
 *
 *   APARTAMENTO EN EL YERBAL, ENVIGADO
 *   El Yerbal, Envigado
 *   Precio: $ 12.000.000 / mes
 *   Administración: $ 300.000
 *   80 m²
 *   3 habitaciones
 *   2 baños
 *
 *   Conoce más detalles aquí:
 *   https://leasefy.co/propiedades/…
 */
export function textoDeLaFicha(d: InmuebleParaCompartir, url: string, idioma: IdiomaDeLaFicha = 'es'): string {
  const en = idioma === 'en';
  const lugar = lugarDelInmueble(d);
  const precio = precioDelInmueble(d, idioma);
  const lineas = [
    tituloParaCompartir(d, idioma).toLocaleUpperCase(en ? 'en-US' : 'es-CO'),
    lugar,
    precio ? `${en ? 'Price' : 'Precio'}: ${precio}` : '',
    !esVenta(d) && positivo(d.administracion)
      ? `${en ? 'HOA fee' : 'Administración'}: ${formatCurrency(d.administracion, idioma)}`
      : '',
    ...cifrasDelInmueble(d, idioma),
  ].filter(Boolean);
  return [...lineas, '', en ? 'See more details here:' : 'Conoce más detalles aquí:', url].join('\n');
}
