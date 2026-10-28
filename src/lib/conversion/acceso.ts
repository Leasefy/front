/**
 * Qué ve cada cuenta (Nico, 27-10-2026) — espejo del back `inmobiliaria/conversion/acceso-de-la-cuenta.ts`.
 *   · `pagado` y `prueba` (el mes gratis de un aliado): ve todo.
 *   · `gratis`: vino del marketplace y no paga: marketplace + Arrendamientos; lo demás con candado e invitación a pagar.
 *   · `cliente`: la inmobiliaria de siempre: ve todo, nada le cambia.
 * Sin `acceso` (back viejo o sin poder saberlo) manda el modo comercial, como antes.
 */
import type { Agency } from '@/lib/auth/types';
import { enModoComercial } from '@/lib/nav/modo-comercial';

export type EstadoDelAcceso = 'pagado' | 'prueba' | 'gratis' | 'cliente';

export interface VistaDeLaPrueba {
  aliado: string | null;
  empieza: string;
  termina: string;
  diasQueQuedan: number;
  vencida: boolean;
}

export interface AccesoDeLaCuenta {
  estado: EstadoDelAcceso;
  veTodo: boolean;
  faltaActivar: boolean;
  prueba: VistaDeLaPrueba | null;
}

export interface CotizacionDelPlan {
  tier: string;
  nombre: string;
  /** COP al mes, antes de IVA, con la misma cuenta del cobro. */
  monto: number;
  porInmueble: boolean;
  inmuebles: number;
  usuarios: number;
}

export interface AccesoConCotizacion extends AccesoDeLaCuenta {
  cotizacion: CotizacionDelPlan | null;
}

type ConAcceso = Pick<Agency, 'modoComercial'> & { acceso?: AccesoDeLaCuenta | null };

/** ¿Lo que no es comercial lleva candado? Con `acceso`, sólo en `gratis`; sin él, el modo comercial de siempre. */
export function conCandadoDelPlan(agency: ConAcceso | null | undefined): boolean {
  if (agency?.acceso) return agency.acceso.estado === 'gratis';
  return enModoComercial(agency);
}

/** Ve todo (pagó o está en su mes gratis) pero sigue sin activar: lo que usa a los agentes pide activar. */
export function faltaActivarParaVerTodo(agency: ConAcceso | null | undefined): boolean {
  return Boolean(agency?.acceso?.veTodo && agency.acceso.faltaActivar);
}

/** Los días del mes gratis desde los que la barra se pone seria (Nico: «unos 10 días antes»). */
export const DIAS_PARA_INSISTIR = 10;

/** La llave del enlace de aliado que quedó pendiente de usar (antes de registrarse). */
export const LLAVE_DEL_ALIADO = 'leasefy:aliado-pendiente';

export function guardarAliadoPendiente(codigo: string): void {
  try {
    window.localStorage.setItem(LLAVE_DEL_ALIADO, JSON.stringify({ codigo, en: Date.now() }));
  } catch {
    /* sin almacenamiento: el enlace se usa al volver a abrirlo */
  }
}

/** El código pendiente si es de los últimos 30 días; si no, nada. */
export function aliadoPendiente(ahora = Date.now()): string | null {
  try {
    const crudo = window.localStorage.getItem(LLAVE_DEL_ALIADO);
    if (!crudo) return null;
    const { codigo, en } = JSON.parse(crudo) as { codigo?: unknown; en?: unknown };
    if (typeof codigo !== 'string' || typeof en !== 'number') return null;
    return ahora - en < 30 * 24 * 60 * 60 * 1000 ? codigo : null;
  } catch {
    return null;
  }
}

export function olvidarAliadoPendiente(): void {
  try {
    window.localStorage.removeItem(LLAVE_DEL_ALIADO);
  } catch {
    /* nada */
  }
}

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function precioDelMes(monto: number): string {
  return pesos.format(monto).replace(/\s/g, ' ');
}
