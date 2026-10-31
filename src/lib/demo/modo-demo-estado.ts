/**
 * EL MODO DEMO (Nico, 28-10-2026: las demos con «Ver con datos demo», que pinta la sección con datos de ejemplo;
 * 29-10-2026: «sólo en lo cerrado»). Quien todavía no es cliente toca «Ver con datos demo» en una parte cerrada y la ve
 * funcionando: las LECTURAS de esa sección salen de `datos-demo/` (escritos a mano, siempre los mismos) y ninguna
 * escritura sale de la pestaña (`apiClient` responde «En la demo no se guarda nada»).
 *
 * Vive por pestaña (`sessionStorage`): cerrar la pestaña o «Salir de la demo» lo apaga. Sin `sessionStorage` (modo
 * privado estricto), simplemente no se prende.
 */

const LLAVE = 'leasefy:modo-demo';

export const CODIGO_DEL_MODO_DEMO = 'MODO_DEMO';
export const MENSAJE_DEL_MODO_DEMO = 'En la demo no se guarda nada: son datos de ejemplo.';
/** Un PDF o un Excel de la demo saldría del back con ids de ejemplo (un 404): se frena con su frase. */
export const MENSAJE_DE_DESCARGA_EN_LA_DEMO = 'En la demo no se descargan documentos: son datos de ejemplo.';

const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

export function estaEnModoDemo(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(LLAVE) === '1';
  } catch {
    return false;
  }
}

export function entrarAlModoDemo(): void {
  try {
    window.sessionStorage.setItem(LLAVE, '1');
  } catch {
    // Sin almacenamiento no hay demo: la parte cerrada se sigue viendo como siempre.
  }
  avisar();
}

export function salirDelModoDemo(): void {
  try {
    window.sessionStorage.removeItem(LLAVE);
  } catch {
    // Nada que borrar.
  }
  avisar();
}

export function suscribirAlModoDemo(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
