/**
 * Los inmuebles YA publicados a los que todavía les falta el punto en el mapa
 * (Nico, 20-10-2026: que publicar se sienta rápido). Publicar no espera al
 * buscador de direcciones; el punto se pone después. Esta lista, en el
 * navegador, hace que una pestaña cerrada a mitad no deje inmuebles sin pin:
 * al volver al publicador se retoma.
 */

export interface PorUbicar {
  /** El id del inmueble publicado. */
  id: string;
  direccion: string;
  ciudad: string;
}

const CLAVE = 'leasefy.publica.por-ubicar.v1';

function leer(usuario: string): PorUbicar[] {
  try {
    const crudo = window.localStorage.getItem(`${CLAVE}:${usuario}`);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return Array.isArray(lista) ? (lista as PorUbicar[]).filter((x) => x && typeof x.id === 'string') : [];
  } catch {
    return [];
  }
}

function escribir(usuario: string, lista: PorUbicar[]): void {
  try {
    if (lista.length === 0) window.localStorage.removeItem(`${CLAVE}:${usuario}`);
    else window.localStorage.setItem(`${CLAVE}:${usuario}`, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: el punto se pone mientras la página siga abierta.
  }
}

export function leerPorUbicar(usuario: string): PorUbicar[] {
  return leer(usuario);
}

export function anotarPorUbicar(usuario: string, item: PorUbicar): void {
  const lista = leer(usuario).filter((x) => x.id !== item.id);
  escribir(usuario, [...lista, item]);
}

export function quitarPorUbicar(usuario: string, id: string): void {
  escribir(
    usuario,
    leer(usuario).filter((x) => x.id !== id),
  );
}
