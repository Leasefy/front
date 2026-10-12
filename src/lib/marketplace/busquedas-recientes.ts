/**
 * «Tus búsquedas» del marketplace (opción 1, Nico 09-10-2026): el lado
 * izquierdo, como en ChatGPT. Viven SÓLO en este navegador: es una comodidad
 * de quien busca, no un dato de Leasefy (sin cuenta no hay dónde más
 * guardarlas). El almacenamiento puede fallar (ventana privada, bloqueado):
 * entonces simplemente no hay lista.
 */

const CLAVE = 'leasefy-marketplace-busquedas';
const MAXIMO = 8;

export interface BusquedaReciente {
  /** La dirección de la búsqueda (`escribirBusqueda`), sin `vista`. */
  qs: string;
  /** Cómo se lee en la lista: lo que escribió la persona o el título. */
  titulo: string;
  cuando: number;
}

function valida(x: unknown): x is BusquedaReciente {
  const r = x as BusquedaReciente;
  return !!r && typeof r.qs === 'string' && r.qs.length > 0 && typeof r.titulo === 'string' && typeof r.cuando === 'number';
}

export function leerRecientes(): BusquedaReciente[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    const lista: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter(valida).slice(0, MAXIMO) : [];
  } catch {
    return [];
  }
}

/** La pone de primera; si ya estaba (misma dirección o misma pregunta), la sube. Devuelve la lista nueva. */
export function guardarReciente(qs: string, titulo: string): BusquedaReciente[] {
  const limpio = qs.trim();
  if (!limpio) return leerRecientes();
  const nombre = titulo.trim().slice(0, 120) || 'Búsqueda';
  // Una conversación que se va afinando es UNA búsqueda: misma pregunta, otra dirección.
  const lista = [
    { qs: limpio, titulo: nombre, cuando: Date.now() },
    ...leerRecientes().filter((r) => r.qs !== limpio && r.titulo !== nombre),
  ].slice(0, MAXIMO);
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: la lista vive sólo mientras la página esté abierta.
  }
  return lista;
}
