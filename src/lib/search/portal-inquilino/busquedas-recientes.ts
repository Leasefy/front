/**
 * Búsquedas recientes del portal (BU-11, 04-10-2026): antes eran FIJAS
 * («pago febrero», «contrato», «recibo») e iguales para todo el mundo. Ahora
 * son las de ESTA persona, en ESTE navegador: se guarda lo que buscó cuando
 * abrió un resultado. Sin almacenamiento (privado, bloqueado), no hay
 * recientes: nunca se inventan.
 */
const TOPE = 5;

function clave(usuario: string): string {
  return `leasefy-busquedas-recientes:${usuario}`;
}

export function leerRecientes(usuario: string | null | undefined): string[] {
  if (!usuario) return [];
  try {
    const crudo = window.localStorage.getItem(clave(usuario));
    const lista: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista)
      ? lista.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, TOPE)
      : [];
  } catch {
    return [];
  }
}

/** Pone `consulta` de primera (sin repetirla) y devuelve la lista nueva. */
export function guardarReciente(usuario: string | null | undefined, consulta: string): string[] {
  const limpia = consulta.trim();
  if (!usuario || limpia.length < 2) return leerRecientes(usuario);
  const lista = [limpia, ...leerRecientes(usuario).filter((x) => x.toLowerCase() !== limpia.toLowerCase())].slice(0, TOPE);
  try {
    window.localStorage.setItem(clave(usuario), JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: la lista vive mientras la pestaña esté abierta.
  }
  return lista;
}
