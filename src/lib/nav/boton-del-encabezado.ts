/**
 * boton-del-encabezado — qué botón de la barra de arriba es «dónde estás».
 *
 * Nico (08-10-2026): «no se entiende de dónde viene, dónde está o qué hace».
 * El barrido de las 165 pantallas del panel dejó tres sin ninguna marca: el
 * Centro de procesos, Notificaciones y Mi perfil. No cuelgan del menú lateral
 * —se abren desde la barra de arriba (el ícono de procesos, la campana y el
 * avatar)—, así que ninguna fila se marcaba y nada decía de dónde venías. Con
 * esto el botón que las abre queda marcado mientras estás ahí, igual que una
 * fila del menú (`fila-activa-del-menu.ts`).
 *
 * Configuración también se abre desde el avatar: marca el avatar, y adentro
 * tiene su propio menú de secciones.
 */

export type BotonDelEncabezado = 'procesos' | 'notificaciones' | 'cuenta';

const RUTAS: Record<BotonDelEncabezado, readonly string[]> = {
  procesos: ['/panel/inmobiliaria/procesos'],
  notificaciones: ['/panel/inmobiliaria/notificaciones', '/panel/notificaciones', '/inquilino/notificaciones'],
  cuenta: [
    '/panel/inmobiliaria/perfil',
    '/panel/inmobiliaria/configuracion',
    '/panel/perfil',
    '/panel/configuracion',
    '/inquilino/perfil',
    '/inquilino/configuracion',
  ],
};

/** El botón de la barra que abre la pantalla actual, o null si ninguno. Por prefijo, con borde de segmento; ignora la query. */
export function botonDelEncabezadoActivo(pathname: string | null | undefined): BotonDelEncabezado | null {
  const ruta = (pathname ?? '').split('?')[0] ?? '';
  for (const boton of Object.keys(RUTAS) as BotonDelEncabezado[]) {
    if (RUTAS[boton].some((r) => ruta === r || ruta.startsWith(`${r}/`))) return boton;
  }
  return null;
}
