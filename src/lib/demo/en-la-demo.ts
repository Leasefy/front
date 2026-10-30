import { abiertaEnModoComercial } from '@/lib/nav/modo-comercial';
import { abiertaParaElPropietarioGratis } from '@/lib/venta/propietario-gratis';
import { estaEnModoDemo } from './modo-demo-estado';

/**
 * ¿Esta pestaña está mostrando una parte cerrada del panel en modo demo? Lo preguntan los dos clientes: el del back
 * (`api/client.ts`, que sirve los datos de ejemplo y frena las escrituras) y el del micro (`api/agent-fetch.ts`).
 * Las partes cerradas son las de la inmobiliaria (y el agente) en lo gratis y, desde el 30-10-2026, las del
 * propietario independiente en lo gratis (`/panel/<sección>`).
 */
export function enLaDemo(): boolean {
  if (typeof window === 'undefined' || !estaEnModoDemo()) return false;
  const ruta = window.location.pathname;
  if (ruta.startsWith('/panel/inmobiliaria')) return !abiertaEnModoComercial(ruta);
  return ruta.startsWith('/panel/') && !abiertaParaElPropietarioGratis(ruta);
}
