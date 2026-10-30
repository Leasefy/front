import { abiertaEnModoComercial } from '@/lib/nav/modo-comercial';
import { estaEnModoDemo } from './modo-demo-estado';

/**
 * ¿Esta pestaña está mostrando una parte cerrada del panel en modo demo? Lo preguntan los dos clientes: el del back
 * (`api/client.ts`, que sirve los datos de ejemplo y frena las escrituras) y el del micro (`api/agent-fetch.ts`).
 */
export function enLaDemo(): boolean {
  if (typeof window === 'undefined' || !estaEnModoDemo()) return false;
  const ruta = window.location.pathname;
  return ruta.startsWith('/panel/inmobiliaria') && !abiertaEnModoComercial(ruta);
}
