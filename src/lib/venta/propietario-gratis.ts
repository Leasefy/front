/**
 * El propietario independiente en el plan gratis (Nico, 20-10-2026): gratis
 * publicar, los interesados y las visitas; lo demás lo ve en demo, con nuestro
 * WhatsApp para que Leasefy le administre el inmueble.
 */

const ABIERTAS: readonly string[] = [
  '/panel/propiedades',
  '/panel/candidatos',
  '/panel/visitas',
  '/panel/mensajes',
  '/panel/perfil',
  '/panel/configuracion',
  '/panel/notificaciones',
];

/** Las demás rutas de primer nivel del panel del propietario (no son la ficha de un inmueble). */
const DE_PRIMER_NIVEL: readonly string[] = [
  'contratos',
  'leases',
  'estado-de-cuenta',
  'aprobaciones',
  'escoger-inquilino',
  'revisar-canon',
  'solicitudes',
  'giros',
  'informes',
  'certificados',
  'checkout',
  'upgrade',
];

function esOdebajo(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(`${base}/`);
}

export function abiertaParaElPropietarioGratis(ruta: string): boolean {
  const limpia = ruta.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (ABIERTAS.some((a) => esOdebajo(limpia, a))) return true;
  // `/panel/<id>`: la ficha de SU inmueble (publicar es gratis).
  const partes = limpia.split('/').filter(Boolean);
  return partes[0] === 'panel' && partes.length >= 2 && !DE_PRIMER_NIVEL.includes(partes[1]!) && partes[1] !== '';
}

/** Qué demo mostrar (`demoDelPropietario`). */
export function claveDeDemoDelPropietario(ruta: string): string | null {
  const segundo = ruta.split('/').filter(Boolean)[1] ?? '';
  if (segundo === 'contratos') return 'contratos';
  if (['leases', 'estado-de-cuenta', 'aprobaciones', 'revisar-canon', 'giros'].includes(segundo)) return 'cobro';
  if (segundo === 'escoger-inquilino') return 'estudio';
  return null;
}
