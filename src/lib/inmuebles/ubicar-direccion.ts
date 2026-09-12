/**
 * Ubicar una dirección colombiana en el mapa, o decir honestamente que no se
 * pudo.
 *
 * 🔴 Nico, 2026-09-12: «en la migración se debió de haber encontrado la
 * ubicación, y los creó sin que se hubiera encontrado, porque es muy
 * importante para el marketplace».
 *
 * ── Lo que estaba pasando, medido sobre los 2.824 inmuebles reales ──────────
 * La búsqueda mandaba la dirección CRUDA y se quedaba con el primer
 * resultado, sin mirar dónde había caído:
 *
 *   · 1.442 quedaron SIN punto — su municipio (Caldas, La Estrella, Amagá…)
 *     no estaba en la tabla de 32 ciudades que hacía de red de seguridad.
 *   · De los 1.382 que sí tenían punto, **548 estaban a más de 15 km de su
 *     propio municipio**: un inmueble de Amagá en Santa Marta (618 km), uno
 *     de Sabaneta en Villavicencio (314 km), uno de Medellín en Barranquilla
 *     (525 km). «CALLE 37#64A-64» existe en media Colombia.
 *   · Y ~679 de los que quedaban estaban APILADOS en el centroide de su
 *     ciudad, todos en el mismo punto.
 *
 * ── Las tres cosas que cambian, y cuánto mueven ─────────────────────────────
 * Medido sobre 60 filas reales tomadas al azar de las que no tenían punto:
 *
 *   1. **Se expande la nomenclatura** («CR»→Carrera, «CLL»→Calle) y se
 *      RECORTA lo que viene después de la dirección («APTO 304», «INT 611»,
 *      «EDIFICIO SANTA ANA»). Un geocodificador no sabe qué hacer con el
 *      interior y devuelve cualquier cosa.
 *   2. **Se agrega el municipio y el departamento.** Sin eso, «CALLE 132 SUR
 *      55 19» es una calle de Bogotá tanto como una de Caldas.
 *   3. **Se VERIFICA que el resultado cayó dentro del municipio.** Es la que
 *      más importa: sin este paso los 548 de arriba pasan igual.
 *
 *   Resultado sobre 120 filas: 32 no son direcciones (son referencias: «LAS
 *   ACACIAS», «DETRÁS DE LA ESCUELA», «SECTOR EL CEMENTERIO») y 88 sí. De
 *   esas 88 → **84 caen dentro de su municipio**, 1 cae fuera y la guarda la
 *   rechaza, 3 no dan resultado. Antes, sobre una muestra equivalente, 5 de 8
 *   no daban nada y una dirección de Caldas caía en Bogotá.
 *
 * ── Qué precisión se consigue, dicho sin adornos ────────────────────────────
 * `direccion` NO quiere decir «la puerta exacta». LocationIQ devuelve el
 * negocio o el punto de interés más cercano («Catedral Nuestra Señora de las
 * Mercedes», «Madame Purita»), así que el punto cae en la cuadra, no en el
 * portal. Para un mapa de marketplace alcanza; para mandar a alguien a
 * tocar el timbre, no. Por eso la precisión viaja con el resultado en vez de
 * quedar implícita: quien la use decide qué hacer con ella.
 */

import { geocodeApi } from '@/lib/api/geocode.service';
import { getCityCoordinates } from '@/lib/constants/map';

/**
 * Hasta dónde puede caer un punto de su municipio antes de darlo por
 * equivocado. 12 km cubre con holgura cualquier municipio del Valle de
 * Aburrá medido desde su centro, y deja afuera al vecino de al lado.
 */
export const RADIO_DEL_MUNICIPIO_KM = 12;

/** El techo de LocationIQ: ~2 por segundo. */
export const ESPERA_ENTRE_BUSQUEDAS_MS = 550;

export type PrecisionDeUbicacion = 'direccion' | 'municipio' | 'ninguna';

export interface Ubicacion {
  lat?: number;
  lng?: number;
  precision: PrecisionDeUbicacion;
  /** Lo que devolvió el buscador, para poder auditar después qué se aceptó. */
  etiqueta?: string;
}

export interface DireccionAUbicar {
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
}

/* ─────────────────────────── La dirección ─────────────────────────────── */

/** «CR», «KRA», «Cll.»… cada vía escrita como la conoce el geocodificador. */
const VIAS: [RegExp, string][] = [
  [/\b(?:CLL?E?|CALL?E)\b\.?/gi, 'Calle'],
  [/\b(?:CR|CRA|KRA|KR|CARR|CARRERA)\b\.?/gi, 'Carrera'],
  [/\b(?:DG|DIAG|DIAGONAL)\b\.?/gi, 'Diagonal'],
  [/\b(?:TV|TRV|TRANSV|TRANSVERSAL)\b\.?/gi, 'Transversal'],
  [/\b(?:AV|AVDA|AVENIDA)\b\.?/gi, 'Avenida'],
  [/\b(?:CIRC|CIRCULAR)\b\.?/gi, 'Circular'],
];

/**
 * Lo que viene DESPUÉS de la dirección y sólo confunde: el apartamento, la
 * torre, el nombre del edificio.
 *
 * Se corta desde la marca hasta el FINAL, no sólo la marca y la palabra que
 * la sigue. Un edificio se llama «SANTA ANA» y borrar «EDIFICIO SANTA» dejaba
 * un «ANA» suelto pegado a la dirección, que es peor que no haber tocado
 * nada. En una dirección colombiana el interior siempre va al final.
 */
const UNIDAD =
  /\b(?:AP|APT|APTO|APARTAMENTO|INT|INTERIOR|TORRE|CASA|PISO|LOCAL|OFICINA|OF|BLOQUE|BL|MZ|MANZANA|ETAPA|EDIFICIO|EDIF|ED|UNIDAD|URB|URBANIZACION|CONJUNTO|PARCELACION|BODEGA|GARAJE|PARQUEADERO|DEPOSITO|CELDA)\b/i;

/** Las vías, para preguntar si un texto es una dirección o una referencia. */
const HAY_VIA =
  /\b(?:CLL?E?|CALL?E|CR|CRA|KRA|KR|CARR|CARRERA|DG|DIAG|DIAGONAL|TV|TRV|TRANSV|TRANSVERSAL|AV|AVDA|AVENIDA|CIRC|CIRCULAR)\b/i;

/**
 * ¿Esto es una dirección, o una referencia de barrio?
 *
 * En el portafolio real conviven las dos: «CL 131 SUR 51 30» y «DETRÁS DE LA
 * ESCUELA 9902». 18 de cada 60 filas son del segundo tipo. Buscarlas es
 * gastar una llamada para que el geocodificador devuelva cualquier cosa
 * lejos — que es exactamente cómo un inmueble de Caldas terminó en Bogotá.
 * Sin vía o sin número, no se busca: se queda en el municipio.
 */
export function pareceDireccion(bruta?: string | null): boolean {
  const s = (bruta ?? '').trim();
  if (!s) return false;
  return HAY_VIA.test(s) && /\d/.test(s);
}

/**
 * Corta la dirección donde empieza el interior.
 *
 * La marca se busca DESPUÉS de la vía, no desde el principio: hay direcciones
 * que arrancan con el edificio («EDIFICIO SANTA ANA, CALLE 10 # 20-30») y
 * cortar ahí borraría la dirección entera.
 */
function recortarEnElInterior(s: string): string {
  const via = s.match(HAY_VIA);
  const desde = via?.index != null ? via.index + via[0].length : 0;
  const marca = s.slice(desde).match(UNIDAD);
  if (marca?.index == null) return s;
  return s.slice(0, desde + marca.index).trim();
}

/** La dirección como conviene buscarla: vías expandidas y sin el interior. */
export function direccionParaBuscar(bruta?: string | null): string {
  let s = recortarEnElInterior((bruta ?? '').replace(/\s+/g, ' ').trim());
  for (const [re, con] of VIAS) s = s.replace(re, con);
  s = s.replace(/\b(?:No|Nº|N°|N\.)\s*/gi, '# ');
  s = s
    .replace(/[,;()]+/g, ' ')
    .replace(/\s*#\s*/g, ' # ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.replace(/[-–.]+$/, '').trim();
}

/** La consulta completa. Sin municipio y país, la calle es de cualquier lado. */
export function consultaDeDireccion(d: DireccionAUbicar): string {
  return [direccionParaBuscar(d.direccion), d.ciudad, d.departamento, 'Colombia']
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

/* ─────────────────────────── La distancia ─────────────────────────────── */

const RADIO_DE_LA_TIERRA_KM = 6371;

/** Haversine. Alcanza de sobra para preguntar «¿cayó en este municipio?». */
export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_DE_LA_TIERRA_KM * Math.asin(Math.sqrt(x));
}

/* ─────────────────────────── El municipio ─────────────────────────────── */

export interface PuntoDelMunicipio {
  lat: number;
  lng: number;
}

/**
 * El centro del municipio, buscado UNA vez y recordado.
 *
 * Reemplaza a la tabla de 32 ciudades, que es la razón por la que 1.442
 * inmuebles de Caldas, La Estrella y Amagá quedaron sin punto: ninguno de
 * esos municipios estaba en la lista, y no hay lista que cubra los 1.103
 * municipios del país. Buscar «Caldas, Antioquia, Colombia» sí los cubre a
 * todos, y es una sola llamada por municipio para un portafolio entero.
 *
 * La tabla sigue como red de seguridad para cuando el buscador no contesta.
 */
const centros = new Map<string, PuntoDelMunicipio | null>();

function claveDelMunicipio(ciudad?: string | null, departamento?: string | null): string {
  return `${(ciudad ?? '').trim().toLowerCase()}|${(departamento ?? '').trim().toLowerCase()}`;
}

/** Sólo para los tests: cada caso arranca sin lo recordado del anterior. */
export function olvidarMunicipios(): void {
  centros.clear();
}

export async function centroDelMunicipio(
  ciudad?: string | null,
  departamento?: string | null,
): Promise<PuntoDelMunicipio | null> {
  const nombre = (ciudad ?? '').trim();
  if (!nombre) return null;

  const clave = claveDelMunicipio(ciudad, departamento);
  const recordado = centros.get(clave);
  if (recordado !== undefined) return recordado;

  let punto: PuntoDelMunicipio | null = null;
  try {
    const consulta = [nombre, (departamento ?? '').trim(), 'Colombia'].filter(Boolean).join(', ');
    const primero = (await geocodeApi.autocomplete(consulta))[0];
    if (primero) punto = { lat: primero.lat, lng: primero.lon };
  } catch {
    // Sin buscador queda la tabla de abajo. Un municipio sin centro no puede
    // tumbar la carga entera del portafolio.
  }

  if (!punto) {
    const deLaTabla = getCityCoordinates(nombre);
    if (deLaTabla) punto = { lat: deLaTabla.lat, lng: deLaTabla.lng };
  }

  centros.set(clave, punto);
  return punto;
}

/* ─────────────────────────── La ubicación ─────────────────────────────── */

/** Sin acentos, sin mayúsculas y sin espacios de más: «Itagüí» ≡ «itagui». */
function comoNombre(v?: string | null): string {
  return (v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const espera = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Dónde queda este inmueble, y con cuánta precisión.
 *
 * Nunca lanza y nunca devuelve un punto en el que no crea: o cayó dentro de
 * su municipio (`direccion`), o es el centro del municipio (`municipio`), o
 * no hay punto (`ninguna`). Lo que NO vuelve a pasar es lo de antes: un
 * punto a 500 km presentado como si fuera la dirección.
 *
 * ── Se verifica por NOMBRE primero, y por distancia después ─────────────────
 * 🔴 La primera versión pedía el centro del municipio y DESPUÉS la dirección,
 * las dos seguidas. Al crear un inmueble suelto eso son dos llamadas en el
 * mismo instante, y LocationIQ admite dos por segundo: la segunda —la de la
 * dirección, la que importa— volvía rechazada y el inmueble quedaba clavado
 * en el centro del pueblo. Se vio en vivo, creando un inmueble de Caldas cuya
 * dirección el buscador resuelve perfecto cuando se la pide sola.
 *
 * Ahora la dirección va PRIMERA y sola. El buscador ya dice en qué municipio
 * cayó su resultado, así que comparar ese nombre con el municipio esperado
 * alcanza para aceptarlo, sin una segunda llamada. El centro sólo se busca
 * cuando hace falta de verdad: para medir un resultado que no se pudo
 * verificar por nombre, o como punto de respaldo.
 */
export async function ubicarDireccion(d: DireccionAUbicar): Promise<Ubicacion> {
  let centro: PuntoDelMunicipio | null = null;
  let centroBuscado = false;
  const traerCentro = async (): Promise<PuntoDelMunicipio | null> => {
    if (centroBuscado) return centro;
    centroBuscado = true;
    centro = await centroDelMunicipio(d.ciudad, d.departamento);
    return centro;
  };

  if (pareceDireccion(d.direccion)) {
    try {
      const primero = (await geocodeApi.autocomplete(consultaDeDireccion(d)))[0];
      if (primero) {
        const punto = { lat: primero.lat, lng: primero.lon };

        // 1. Por nombre: el buscador ya dijo en qué municipio cayó.
        if (
          primero.city &&
          d.ciudad &&
          comoNombre(primero.city) === comoNombre(d.ciudad)
        ) {
          return { ...punto, precision: 'direccion', etiqueta: primero.label };
        }

        // 2. Por distancia, cuando el nombre no vino o no coincide. La espera
        //    es el techo de LocationIQ: sin ella esta segunda llamada sale
        //    pegada a la de arriba y vuelve rechazada.
        await espera(ESPERA_ENTRE_BUSQUEDAS_MS);
        const ce = await traerCentro();
        if (ce && distanciaKm(ce, punto) <= RADIO_DEL_MUNICIPIO_KM) {
          return { ...punto, precision: 'direccion', etiqueta: primero.label };
        }
        // Sin centro no hay contra qué verificar, y aceptar a ciegas es
        // justamente lo que puso 548 inmuebles en otro departamento.
      }
    } catch {
      // Buscador caído: queda el municipio.
    }
  }

  const ce = await traerCentro();
  if (ce) return { ...ce, precision: 'municipio' };
  return { precision: 'ninguna' };
}
