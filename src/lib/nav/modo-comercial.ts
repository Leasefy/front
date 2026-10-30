import type { Agency } from '@/lib/auth/types';

/**
 * 🔴 El modo comercial de la inmobiliaria que se registró desde el marketplace
 * (Juan, 19-10-2026: «este solo quería publicar, pero entró a TODO y ya no sabe
 * qué hacer» → «que solo vea lo comercial y a punta de pop ups le empezamos a
 * meter todo»). Lo decide el back (`modoComercial`, la regla en
 * `back/src/inmobiliaria/agency/modo-comercial.ts`: sin NIT y sin traspaso al
 * micro). Al «Activar» (el asistente: NIT, razón social y segundo factor) sale
 * solo y se abre todo el panel.
 *
 * Abierto: lo que necesita quien sólo quiere publicar y atender interesados.
 * Cerrado: todo lo demás, y además lo que depende de los agentes de IA, que no
 * conocen a esta inmobiliaria hasta que se activa.
 */

export const INICIO_DEL_MODO_COMERCIAL = '/panel/inmobiliaria/inmuebles';

/**
 * El asistente largo (NIT, razón social; después el segundo factor). Desde el 27-10-2026 la cuenta del marketplace se
 * activa en los tres pasos cortos (`PasosParaActivar`); esto queda para «¿Ya eres cliente?».
 */
export const RUTA_PARA_ACTIVAR = '/onboarding/inmobiliaria';

const ABIERTAS: readonly string[] = [
  // Pagar desde el panel (Nico, 27-10-2026): «Tu plan» y el pago SIEMPRE abiertos, o no hay cómo pagar.
  '/panel/inmobiliaria/upgrade',
  '/panel/inmobiliaria/checkout',
  '/panel/inmobiliaria/inmuebles',
  '/panel/inmobiliaria/pipeline',
  '/panel/inmobiliaria/postulaciones',
  '/panel/inmobiliaria/agenda',
  '/panel/inmobiliaria/mensajes',
  '/panel/inmobiliaria/configuracion/tu-pagina',
  // Firmas (28-10-2026): todas las cuentas, también las gratis.
  '/panel/inmobiliaria/firmas',
  // Nico 29-10-2026 (reunión con Juan, el CRM gratis): «los inquilinos deben estar gratis también para los que entren por
  // el marketplace sin la demo».
  '/panel/inmobiliaria/inquilinos',
];

/**
 * El chat (Nico, 30-10-2026: «no veo el chat para la cuenta gratuita y debería de estar»): también en la cuenta gratis,
 * con 5 preguntas de una vez; al acabarse, recarga o paga el plan. Vive en el inicio EXACTO del panel (no lo de debajo)
 * y en `/beta`, que es el mismo chat. El micro no necesita la cuenta activada: reconoce al equipo por el back.
 */
const EL_CHAT = '/panel/inmobiliaria';
const EL_CHAT_TAMBIEN_EN = '/panel/inmobiliaria/beta';

/** Dentro de lo abierto, lo que hacen los agentes de IA. */
const CERRADAS_ADENTRO: readonly string[] = [
  '/panel/inmobiliaria/inmuebles/avaluos',
  '/panel/inmobiliaria/postulaciones/matching',
  '/panel/inmobiliaria/postulaciones/asegurabilidad',
  '/panel/inmobiliaria/postulaciones/estudio',
];

function esOdebajo(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(`${base}/`);
}

/** ¿Esta ruta del panel se usa sin activar la cuenta? */
export function abiertaEnModoComercial(ruta: string): boolean {
  const limpia = ruta.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (limpia === EL_CHAT || esOdebajo(limpia, EL_CHAT_TAMBIEN_EN)) return true;
  if (CERRADAS_ADENTRO.some((c) => esOdebajo(limpia, c))) return false;
  return ABIERTAS.some((a) => esOdebajo(limpia, a));
}

export function enModoComercial(agency: Pick<Agency, 'modoComercial'> | null | undefined): boolean {
  return agency?.modoComercial === true;
}

/**
 * 🔴 Nico, 27-10-2026: el aliado en su mes gratis (y quien ya pagó) VE TODO aunque no haya activado la cuenta. Sin
 * activar sólo piden «Activar mi cuenta» (los tres pasos cortos, 2 minutos):
 *   · los agentes de IA: el micro no conoce la cuenta hasta activarla (el chat no: está abierto, ver `EL_CHAT`);
 *   · lo que mueve plata (pagos, giros, facturación, contabilidad, nómina, conciliación): ahí entra el segundo factor.
 * Lo demás (contratos, propietarios, inquilinos, mantenimientos, reportes…) se usa de una.
 */
const PIDEN_ACTIVAR: readonly string[] = [
  '/panel/inmobiliaria/pagos',
  '/panel/inmobiliaria/facturacion',
  '/panel/inmobiliaria/contabilidad',
  '/panel/inmobiliaria/nomina',
  '/panel/inmobiliaria/conciliacion',
  '/panel/inmobiliaria/retencion',
  '/panel/inmobiliaria/reportes/ia',
  '/panel/inmobiliaria/dispersiones',
  '/panel/inmobiliaria/tesoreria',
  ...CERRADAS_ADENTRO,
];

/** ¿Esta ruta pide activar la cuenta a quien ve todo (mes gratis o pagando) sin haberla activado? */
export function pideActivar(ruta: string): boolean {
  const limpia = ruta.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (abiertaEnModoComercial(limpia)) return false;
  return PIDEN_ACTIVAR.some((p) => esOdebajo(limpia, p));
}
