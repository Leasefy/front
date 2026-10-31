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
  /*
   * 🔴 31-10-2026 (Nico: «en cuenta gratis propietario debe quedar prendido, no con demo»): todo el panel del
   * propietario queda ABIERTO en el plan gratis, con sus datos de verdad (o su vacío). La regla de abajo —lo
   * que abría y lo que se veía en demo (20-10)— se deja escrita por si se vuelve a cerrar algo.
   */
  if (ruta.startsWith('/panel')) return true;
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
  // Ronda 30: Giros, Aprobaciones, Revisar el canon, Informes, Certificados y Solicitudes tienen su propia demo.
  if (['giros', 'aprobaciones', 'revisar-canon', 'informes', 'certificados', 'solicitudes'].includes(segundo)) return segundo;
  if (['leases', 'estado-de-cuenta'].includes(segundo)) return 'cobro';
  if (segundo === 'escoger-inquilino') return 'estudio';
  return null;
}

/** Cómo se nombra cada sección en la franja de la demo («Así se ven tus giros con Leasefy»), por su clave de demo. */
export const QUE_ES_CADA_SECCION_DEL_PROPIETARIO: Readonly<Record<string, string>> = {
  contratos: 'tus contratos',
  cobro: 'el cobro de tu arriendo',
  estudio: 'los candidatos de tu inmueble',
  giros: 'tus giros',
  aprobaciones: 'las reparaciones por aprobar',
  'revisar-canon': 'la revisión de tu canon',
  informes: 'tus informes',
  certificados: 'tus certificados',
  solicitudes: 'tus solicitudes',
};
