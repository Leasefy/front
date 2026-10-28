/**
 * El logo de cada aliado del mes gratis (Nico, 28-10-2026: «sumar en los que invitan el logo de ellos, sea de Fianly,
 * La Lonja o Fenalco, que se vea súper top»). Los archivos y su procedencia: `public/aliados/`.
 *
 * El panel conoce al aliado por su NOMBRE (`acceso.prueba.aliado`) y el enlace por su CÓDIGO (`la-lonja`): los dos
 * se comparan sin tildes, mayúsculas ni espacios. Un aliado sin logo devuelve `null` y se escribe su nombre.
 */
export interface LogoDelAliado {
  src: string;
  /** Proporción del archivo (ancho / alto), para reservar el espacio sin saltos. */
  proporcion: number;
  /** Vertical (símbolo arriba, nombre abajo) o horizontal. */
  forma: 'vertical' | 'horizontal';
}

export const LOGOS_DE_LOS_ALIADOS: Record<string, LogoDelAliado> = {
  fianly: { src: '/aliados/fianly.webp', proporcion: 1, forma: 'vertical' },
  fenalco: { src: '/aliados/fenalco.png', proporcion: 1080 / 880, forma: 'vertical' },
  'la-lonja': { src: '/aliados/la-lonja.png', proporcion: 206 / 73, forma: 'horizontal' },
};

/** «La Lonja» → `la-lonja`; «Fenalco Antioquia» → `fenalco-antioquia`. */
export function claveDelAliado(nombreOCodigo: string): string {
  return nombreOCodigo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function logoDelAliado(nombreOCodigo: string | null | undefined): LogoDelAliado | null {
  if (!nombreOCodigo) return null;
  const clave = claveDelAliado(nombreOCodigo);
  if (LOGOS_DE_LOS_ALIADOS[clave]) return LOGOS_DE_LOS_ALIADOS[clave];
  // «Fenalco Antioquia», «Lonja de Medellín»: el que empiece por un aliado conocido.
  const conocido = Object.keys(LOGOS_DE_LOS_ALIADOS).find((k) => clave === k || clave.startsWith(`${k}-`) || clave.replace(/^la-/, '').startsWith(k.replace(/^la-/, '')));
  return conocido ? LOGOS_DE_LOS_ALIADOS[conocido] : null;
}
