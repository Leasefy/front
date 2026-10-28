/**
 * Los tres pasos para ACTIVAR la cuenta que vino del marketplace, al pagar (Nico, 27-10-2026: «si paga le aparecen esos
 * pasos según lo que eligió, propietario, inmobiliaria y agente inmobiliario»; «sus datos, cuenta y factura»).
 *
 *   1. «Tus datos» (agente: nombre, cédula y celular) / «Tu empresa» (inmobiliaria: razón social, representante legal,
 *      su cédula y celular).
 *   2. «Dónde recibes la plata»: la cuenta donde le llegan el arriendo y sus comisiones (un medio de pago TRANSFERENCIA).
 *   3. «Tu factura»: NIT, correo, dirección, municipio, si cobra IVA y los Términos → ACTIVA la cuenta
 *      (`activar-la-cuenta.ts`: lo mismo que el asistente largo, sin sus pantallas).
 *
 * No hay tabla nueva: los datos van a la inmobiliaria (`PUT /inmobiliaria/agency`), la cuenta a sus medios de pago
 * (`/inmobiliaria/medios-de-pago`) y la activación por el alta de siempre (`POST /users/me/onboarding`).
 * El propietario tiene los suyos (`pasos-del-propietario.ts`).
 */
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';
import type { EstadoDelAcceso } from './acceso';
import { digitoDeVerificacion } from '@/lib/onboarding/nit';

export type PasoParaActivar = 'datos' | 'cuenta' | 'factura';
export const PASOS_PARA_ACTIVAR: readonly PasoParaActivar[] = ['datos', 'cuenta', 'factura'];

/** Quién se activa: el agente (persona natural) o la inmobiliaria (empresa). */
export type PerfilQueSeActiva = 'agente' | 'inmobiliaria';

const lleno = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** La cuenta donde recibe: el primer medio TRANSFERENCIA activo con número. */
export function cuentaDondeRecibe(medios: readonly MedioDePago[] | null | undefined): MedioDePago | null {
  return (medios ?? []).find((m) => m.activo && m.tipo === 'TRANSFERENCIA' && lleno(m.numeroDeCuenta)) ?? null;
}

export function pasoListo(
  paso: PasoParaActivar,
  agency: AgencyProfile,
  medios: readonly MedioDePago[] | null | undefined,
  perfil: PerfilQueSeActiva = 'agente',
  modoComercial = false,
): boolean {
  if (paso === 'datos') {
    const base = lleno(agency.legalRepresentative) && lleno(agency.legalDocumentNumber) && lleno(agency.phone);
    return perfil === 'inmobiliaria' ? base && lleno(agency.razonSocial) : base;
  }
  if (paso === 'cuenta') return cuentaDondeRecibe(medios) !== null;
  // La factura queda lista con sus datos Y la cuenta activa (fuera del modo comercial).
  return (
    !modoComercial &&
    lleno(agency.nit) &&
    lleno(agency.email) &&
    lleno(agency.address) &&
    lleno(agency.city) &&
    (agency.responsableIva === true || agency.responsableIva === false)
  );
}

export function pasosQueFaltan(
  agency: AgencyProfile,
  medios: readonly MedioDePago[] | null | undefined,
  perfil: PerfilQueSeActiva = 'agente',
  modoComercial = false,
): PasoParaActivar[] {
  return PASOS_PARA_ACTIVAR.filter((p) => !pasoListo(p, agency, medios, perfil, modoComercial));
}

/**
 * ¿A quién y cuándo? Sólo a las cuentas que vinieron del marketplace (el agente o la inmobiliaria del registro rápido;
 * las de siempre ya se registraron con el asistente) y a su administrador (es quien paga y quien recibe).
 *   · `sola`: se abre sola al pagar.
 *   · `aPedido`: el botón «Activar mi cuenta» también la abre en el mes gratis del aliado (ve todo, y lo que usa a los
 *     agentes pide activar).
 * Devuelve el perfil, o `null` si no le toca.
 */
export function quienSeActiva(
  o: { cuentaDeAgente?: boolean; vinoDelMarketplace?: boolean; rol?: string | null; estado?: EstadoDelAcceso | null },
  como: 'sola' | 'aPedido' = 'sola',
): PerfilQueSeActiva | null {
  if (o.rol !== 'ADMIN') return null;
  const estados: readonly (EstadoDelAcceso | null | undefined)[] = como === 'sola' ? ['pagado'] : ['pagado', 'prueba'];
  if (!estados.includes(o.estado)) return null;
  if (o.cuentaDeAgente === true) return 'agente';
  if (o.vinoDelMarketplace === true) return 'inmobiliaria';
  return null;
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
