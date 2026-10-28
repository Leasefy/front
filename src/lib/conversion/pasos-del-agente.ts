/**
 * Los tres pasos del agente inmobiliario al pagar (Nico, 27-10-2026: «sus datos, cuenta y factura»).
 *
 *   1. «Tus datos»: nombre completo, cédula y celular.
 *   2. «Dónde recibes tu plata»: la cuenta donde le llegan sus comisiones (un medio de pago TRANSFERENCIA).
 *   3. «Para facturarte»: NIT del RUT, nombre en la factura, correo, dirección, ciudad y si cobra IVA.
 *
 * No hay tabla nueva: los datos van a la inmobiliaria (`PUT /inmobiliaria/agency`) y la cuenta a sus medios de pago
 * (`/inmobiliaria/medios-de-pago`), que es lo que ya leen los contratos, las cuentas de cobro y la factura.
 */
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';
import type { EstadoDelAcceso } from './acceso';
import { digitoDeVerificacion } from '@/lib/onboarding/nit';

export type PasoDelAgente = 'datos' | 'cuenta' | 'factura';
export const PASOS_DEL_AGENTE: readonly PasoDelAgente[] = ['datos', 'cuenta', 'factura'];

const lleno = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** La cuenta donde recibe: el primer medio TRANSFERENCIA activo con número. */
export function cuentaDelAgente(medios: readonly MedioDePago[] | null | undefined): MedioDePago | null {
  return (medios ?? []).find((m) => m.activo && m.tipo === 'TRANSFERENCIA' && lleno(m.numeroDeCuenta)) ?? null;
}

export function pasoListo(paso: PasoDelAgente, agency: AgencyProfile, medios: readonly MedioDePago[] | null | undefined): boolean {
  if (paso === 'datos') return lleno(agency.legalRepresentative) && lleno(agency.legalDocumentNumber) && lleno(agency.phone);
  if (paso === 'cuenta') return cuentaDelAgente(medios) !== null;
  return (
    lleno(agency.nit) &&
    lleno(agency.razonSocial) &&
    lleno(agency.email) &&
    lleno(agency.address) &&
    lleno(agency.city) &&
    (agency.responsableIva === true || agency.responsableIva === false)
  );
}

export function pasosQueFaltan(agency: AgencyProfile, medios: readonly MedioDePago[] | null | undefined): PasoDelAgente[] {
  return PASOS_DEL_AGENTE.filter((p) => !pasoListo(p, agency, medios));
}

/** Sólo la cuenta de agente, ya pagada y su administrador (es quien paga y quien recibe). */
export function tocaPedirLosPasos(o: { cuentaDeAgente?: boolean; rol?: string | null; estado?: EstadoDelAcceso | null }): boolean {
  return o.cuentaDeAgente === true && o.rol === 'ADMIN' && o.estado === 'pagado';
}

// ── Validaciones (las mismas reglas que el back, para frenar acá y no con un 400) ──────────────────────────────

export const soloDigitos = (s: string) => s.replace(/\D+/g, '');

/** Cédula de ciudadanía o de extranjería: de 6 a 10 dígitos. */
export function errorDeLaCedula(s: string): string | null {
  const d = soloDigitos(s);
  if (!d) return 'Escribe tu número de cédula.';
  return d.length < 6 || d.length > 10 ? 'La cédula tiene entre 6 y 10 dígitos.' : null;
}

/** Celular colombiano: 10 dígitos y empieza por 3. */
export function errorDelCelular(s: string): string | null {
  const d = soloDigitos(s);
  if (!d) return 'Escribe tu celular.';
  return /^3\d{9}$/.test(d) ? null : 'El celular tiene 10 dígitos y empieza por 3.';
}

export function errorDelNombre(s: string): string | null {
  const t = s.trim();
  if (!t) return 'Escribe tu nombre completo.';
  return t.split(/\s+/).length < 2 ? 'Escribe nombre y apellido, como en tu cédula.' : null;
}

/** El NIT como lo acepta el back (`NIT_DE_LA_INMOBILIARIA`): 6 a 10 dígitos y, si va, el DV tras el guion. */
export function errorDelNit(s: string): string | null {
  const t = s.trim();
  if (!t) return 'Escribe el NIT de tu RUT.';
  return /^\d{6,10}(?:-\d)?$/.test(t) ? null : 'El NIT tiene entre 6 y 10 dígitos y el dígito de verificación tras el guion (1020304050-7).';
}

export function errorDelCorreo(s: string): string | null {
  const t = s.trim();
  if (!t) return 'Escribe el correo donde te llegan las facturas.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? null : 'Revisa el correo: le falta algo.';
}

export function errorDeLaCuenta(s: string): string | null {
  const d = soloDigitos(s);
  if (!d) return 'Escribe el número de tu cuenta.';
  return d.length < 6 || d.length > 20 ? 'El número de cuenta tiene entre 6 y 20 dígitos.' : null;
}

/** «1020304050» → «1020304050-7». */
export function nitDeLaCedula(cedula: string): string {
  const d = soloDigitos(cedula);
  if (d.length < 6 || d.length > 10) return '';
  // La persona natural tiene de NIT su cédula + el dígito de verificación de la DIAN: se le llena sin pedírselo.
  return `${d}-${digitoDeVerificacion(d)}`;
}
